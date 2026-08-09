// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Real UltraHonk verifier adapter for the will circuit (Phase 1b).
interface IWillVerifier {
    function verifyWillProof(
        bytes calldata proof,
        uint256 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount
    ) external view returns (bool);
}

/// @notice Self Protocol humanity + age (18+) gate.
interface ISelfHumanVerifier {
    function isFullyVerified(address user) external view returns (bool);
}

/**
 * @title InheritanceRegistry
 * @notice The single execution contract for ZK-AfterLife. Holds ETH + one ERC20,
 *         tracks each will's lifecycle (register -> check-in -> grace -> veto ->
 *         execute), and gates execution on a real Noir/UltraHonk proof.
 *
 * Design: docs/superpowers/specs/2026-08-09-inheritance-registry-design.md
 *
 * This contract owns per-will liveness state (there is no external heartbeat),
 * uses a single global veto committee set at construction, and accepts only
 * ETH + ERC20 wills in V1 (NFTs rejected; deferred to a 1.5 follow-up).
 *
 * Boxes in this file:
 *   - register (Phase 1c box 1): implemented below.
 *   - checkIn / triggerGracePeriod / veto / executeWill (box 2): added next.
 *   - claim (box 3): not yet implemented; the stored merkleRoot + held balances
 *     already support it.
 */
contract InheritanceRegistry {
    using SafeERC20 for IERC20;

    ////////////// TYPES //////////////

    struct Will {
        address owner;
        uint256 merkleRoot;
        uint256 totalEth;
        uint256 totalUsdc;
        uint64 registeredAt;
        uint64 lastCheckIn;
        uint64 graceStart; // 0 = no active grace
        uint32 graceEpoch; // bumped whenever grace resets; scopes veto rounds
        uint32 vetoCount; // vetoes cast in the current epoch
        bool executed;
        bool exists;
    }

    ////////////// IMMUTABLES //////////////

    /// @notice Real UltraHonk proof verifier (WillVerifier -> HonkVerifier).
    IWillVerifier public immutable willVerifier;

    /// @notice Self Protocol humanity + age gate.
    ISelfHumanVerifier public immutable selfVerifier;

    /// @notice The single ERC20 (mock USDC) this registry escrows alongside ETH.
    IERC20 public immutable usdc;

    /// @notice Seconds of owner inactivity before grace can be triggered.
    uint256 public immutable inactivityPeriod;

    /// @notice Grace buffer (seconds) after inactivity during which vetoes apply.
    uint256 public immutable gracePeriod;

    /// @notice Minimum vetoes that cancel a grace period ("false alarm").
    uint256 public immutable vetoThreshold;

    ////////////// STORAGE //////////////

    /// @notice will commitment => will record.
    mapping(bytes32 => Will) public wills;

    /// @notice Global veto committee membership.
    mapping(address => bool) public isVetoMember;
    address[] private _vetoMembers;

    /// @notice commitment => graceEpoch => member => already vetoed this round.
    mapping(bytes32 => mapping(uint32 => mapping(address => bool)))
        public hasVetoed;

    ////////////// EVENTS //////////////

    event WillRegistered(
        bytes32 indexed willCommitment,
        address indexed owner,
        uint256 totalEth,
        uint256 totalUsdc
    );
    event CheckIn(bytes32 indexed willCommitment, uint256 timestamp);
    event GraceStarted(
        bytes32 indexed willCommitment,
        uint256 startTime,
        uint256 endTime
    );
    event GraceCancelled(bytes32 indexed willCommitment);
    event Vetoed(
        bytes32 indexed willCommitment,
        address indexed member,
        uint32 vetoCount
    );
    event WillExecuted(bytes32 indexed willCommitment, address indexed executor);

    ////////////// ERRORS //////////////

    error InvalidVerifier();
    error InvalidSelfVerifier();
    error InvalidToken();
    error InvalidInactivityPeriod();
    error InvalidGracePeriod();
    error NoVetoMembers();
    error InvalidVetoThreshold();
    error ZeroAddressVeto();
    error DuplicateVetoMember();

    error NotVerifiedHuman();
    error WillAlreadyRegistered();
    error InvalidMerkleRoot();
    error NftsNotSupported();
    error EmptyWill();
    error EthDepositMismatch();

    error WillNotRegistered();
    error WillAlreadyExecuted();
    error NotWillOwner();
    error StillActive();
    error GraceAlreadyActive();
    error GraceNotStarted();
    error GraceNotElapsed();
    error GracePeriodOver();
    error NotVetoMember();
    error AlreadyVetoed();
    error InvalidProof();

    ////////////// CONSTRUCTOR //////////////

    constructor(
        address _willVerifier,
        address _selfVerifier,
        address _usdc,
        uint256 _inactivityPeriod,
        uint256 _gracePeriod,
        address[] memory _vetoMemberList,
        uint256 _vetoThreshold
    ) {
        if (_willVerifier == address(0)) revert InvalidVerifier();
        if (_selfVerifier == address(0)) revert InvalidSelfVerifier();
        if (_usdc == address(0)) revert InvalidToken();
        if (_inactivityPeriod == 0) revert InvalidInactivityPeriod();
        if (_gracePeriod == 0) revert InvalidGracePeriod();
        if (_vetoMemberList.length == 0) revert NoVetoMembers();
        if (_vetoThreshold == 0 || _vetoThreshold > _vetoMemberList.length) {
            revert InvalidVetoThreshold();
        }

        willVerifier = IWillVerifier(_willVerifier);
        selfVerifier = ISelfHumanVerifier(_selfVerifier);
        usdc = IERC20(_usdc);
        inactivityPeriod = _inactivityPeriod;
        gracePeriod = _gracePeriod;
        vetoThreshold = _vetoThreshold;

        for (uint256 i = 0; i < _vetoMemberList.length; i++) {
            address member = _vetoMemberList[i];
            if (member == address(0)) revert ZeroAddressVeto();
            if (isVetoMember[member]) revert DuplicateVetoMember();
            isVetoMember[member] = true;
            _vetoMembers.push(member);
        }
    }

    ////////////// REGISTER (box 1) //////////////

    /**
     * @notice Seal a will: escrow ETH + USDC equal to the declared totals and
     *         record the commitment, Merkle root, and totals. Self-gated.
     * @dev The caller must have deposited exactly `totalEth` as msg.value and
     *      pre-approved `totalUsdc` to this contract. NFTs are not supported in
     *      V1, so `totalNftCount` must be 0.
     * @param willCommitment Poseidon commitment of the will payload + salt (a
     *        BN254 field element), used as the will's key.
     * @param merkleRoot Poseidon Merkle root over the beneficiary leaves.
     * @param totalEth Declared total ETH allocation (must equal msg.value).
     * @param totalUsdc Declared total USDC allocation (pulled via transferFrom).
     * @param totalNftCount Declared NFT count; must be 0 in V1.
     */
    function register(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount
    ) external payable {
        if (!selfVerifier.isFullyVerified(msg.sender)) revert NotVerifiedHuman();
        if (wills[willCommitment].exists) revert WillAlreadyRegistered();
        if (merkleRoot == 0) revert InvalidMerkleRoot();
        if (totalNftCount != 0) revert NftsNotSupported();
        if (totalEth == 0 && totalUsdc == 0) revert EmptyWill();
        if (msg.value != totalEth) revert EthDepositMismatch();

        wills[willCommitment] = Will({
            owner: msg.sender,
            merkleRoot: merkleRoot,
            totalEth: totalEth,
            totalUsdc: totalUsdc,
            registeredAt: uint64(block.timestamp),
            lastCheckIn: uint64(block.timestamp),
            graceStart: 0,
            graceEpoch: 0,
            vetoCount: 0,
            executed: false,
            exists: true
        });

        // Interaction last. Pulls exactly the declared USDC total (no-op if 0).
        if (totalUsdc > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), totalUsdc);
        }

        emit WillRegistered(willCommitment, msg.sender, totalEth, totalUsdc);
    }

    ////////////// LIFECYCLE + EXECUTE (box 2) //////////////

    /// @notice Owner proves liveness; resets the inactivity clock and cancels
    ///         any grace period in progress ("I'm still here").
    function checkIn(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (msg.sender != w.owner) revert NotWillOwner();

        w.lastCheckIn = uint64(block.timestamp);
        if (w.graceStart != 0) {
            w.graceStart = 0;
            w.vetoCount = 0;
            w.graceEpoch += 1;
            emit GraceCancelled(willCommitment);
        }
        emit CheckIn(willCommitment, block.timestamp);
    }

    /// @notice Anyone may open the grace period once the owner has been inactive
    ///         for `inactivityPeriod`.
    function triggerGracePeriod(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart != 0) revert GraceAlreadyActive();
        if (block.timestamp <= uint256(w.lastCheckIn) + inactivityPeriod) {
            revert StillActive();
        }

        w.graceStart = uint64(block.timestamp);
        emit GraceStarted(
            willCommitment,
            block.timestamp,
            block.timestamp + gracePeriod
        );
    }

    /// @notice A veto member blocks a premature execution during the grace
    ///         window. Reaching `vetoThreshold` is treated as a confirmed false
    ///         alarm: grace is cancelled and the inactivity clock restarts.
    function veto(bytes32 willCommitment) external {
        if (!isVetoMember[msg.sender]) revert NotVetoMember();
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp > uint256(w.graceStart) + gracePeriod) {
            revert GracePeriodOver();
        }
        if (hasVetoed[willCommitment][w.graceEpoch][msg.sender]) {
            revert AlreadyVetoed();
        }

        hasVetoed[willCommitment][w.graceEpoch][msg.sender] = true;
        w.vetoCount += 1;
        emit Vetoed(willCommitment, msg.sender, w.vetoCount);

        if (w.vetoCount >= vetoThreshold) {
            w.graceStart = 0;
            w.vetoCount = 0;
            w.graceEpoch += 1;
            w.lastCheckIn = uint64(block.timestamp);
            emit GraceCancelled(willCommitment);
        }
    }

    /// @notice Execute a will after the grace period elapses with no threshold
    ///         veto. Permissionless: the proof + stored public inputs are the
    ///         authority, not the caller. Verifies a real UltraHonk proof and
    ///         marks the will executable. Funds move at `claim` (box 3).
    function executeWill(bytes32 willCommitment, bytes calldata proof) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp <= uint256(w.graceStart) + gracePeriod) {
            revert GraceNotElapsed();
        }

        bool ok = willVerifier.verifyWillProof(
            proof,
            uint256(willCommitment),
            w.merkleRoot,
            w.totalEth,
            w.totalUsdc,
            0 // total_nft_count is always 0 in V1 (enforced at register)
        );
        if (!ok) revert InvalidProof();

        w.executed = true;
        emit WillExecuted(willCommitment, msg.sender);
    }

    ////////////// VIEWS //////////////

    /// @notice Full will record for a commitment.
    function getWill(bytes32 willCommitment) external view returns (Will memory) {
        return wills[willCommitment];
    }

    /// @notice The global veto committee.
    function getVetoMembers() external view returns (address[] memory) {
        return _vetoMembers;
    }
}
