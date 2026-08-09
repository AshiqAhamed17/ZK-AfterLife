// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoseidonT3, IPoseidonT5} from "./interfaces/IPoseidon.sol";

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
contract InheritanceRegistry is ReentrancyGuard {
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

    /// @notice Poseidon hash_2 (t=3), circomlib-compatible with the will circuit.
    IPoseidonT3 public immutable poseidonT3;

    /// @notice Poseidon hash_4 (t=5), circomlib-compatible with the will circuit.
    IPoseidonT5 public immutable poseidonT5;

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

    /// @notice commitment => beneficiary => already claimed.
    mapping(bytes32 => mapping(address => bool)) public claimed;

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
    event Claimed(
        bytes32 indexed willCommitment,
        address indexed beneficiary,
        uint256 ethAmount,
        uint256 usdcAmount
    );

    ////////////// ERRORS //////////////

    error InvalidVerifier();
    error InvalidSelfVerifier();
    error InvalidToken();
    error InvalidPoseidon();
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

    error NotExecuted();
    error AlreadyClaimed();
    error NothingToClaim();
    error InvalidLeafIndex();
    error InvalidMerkleProof();
    error TransferFailed();

    ////////////// CONSTRUCTOR //////////////

    constructor(
        address _willVerifier,
        address _selfVerifier,
        address _usdc,
        address _poseidonT3,
        address _poseidonT5,
        uint256 _inactivityPeriod,
        uint256 _gracePeriod,
        address[] memory _vetoMemberList,
        uint256 _vetoThreshold
    ) {
        if (_willVerifier == address(0)) revert InvalidVerifier();
        if (_selfVerifier == address(0)) revert InvalidSelfVerifier();
        if (_usdc == address(0)) revert InvalidToken();
        if (_poseidonT3 == address(0) || _poseidonT5 == address(0)) {
            revert InvalidPoseidon();
        }
        if (_inactivityPeriod == 0) revert InvalidInactivityPeriod();
        if (_gracePeriod == 0) revert InvalidGracePeriod();
        if (_vetoMemberList.length == 0) revert NoVetoMembers();
        if (_vetoThreshold == 0 || _vetoThreshold > _vetoMemberList.length) {
            revert InvalidVetoThreshold();
        }

        willVerifier = IWillVerifier(_willVerifier);
        selfVerifier = ISelfHumanVerifier(_selfVerifier);
        usdc = IERC20(_usdc);
        poseidonT3 = IPoseidonT3(_poseidonT3);
        poseidonT5 = IPoseidonT5(_poseidonT5);
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

    ////////////// CLAIM (box 3) //////////////

    /**
     * @notice Claim a beneficiary's exact share of an executed will by proving
     *         Merkle inclusion of their leaf in the will's Poseidon tree.
     * @dev The leaf is `Poseidon.hash_4([uint160(msg.sender), ethAmount,
     *      usdcAmount, 0])`. The 3-level inclusion proof is verified against the
     *      stored `merkleRoot` (the same root the ZK proof validated). Each
     *      beneficiary may claim once. Real ETH + USDC transfer.
     * @param willCommitment The executed will's commitment.
     * @param ethAmount The caller's ETH allocation (part of their leaf).
     * @param usdcAmount The caller's USDC allocation (part of their leaf).
     * @param leafIndex The caller's slot in the 8-leaf tree (0-7); its low 3
     *        bits give the left/right ordering at each level.
     * @param siblings The 3 sibling hashes from leaf to root.
     */
    function claim(
        bytes32 willCommitment,
        uint256 ethAmount,
        uint256 usdcAmount,
        uint256 leafIndex,
        bytes32[3] calldata siblings
    ) external nonReentrant {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (!w.executed) revert NotExecuted();
        if (leafIndex >= 8) revert InvalidLeafIndex();
        if (ethAmount == 0 && usdcAmount == 0) revert NothingToClaim();
        if (claimed[willCommitment][msg.sender]) revert AlreadyClaimed();

        // leaf = Poseidon.hash_4([addr, eth, usdc, nft==0])
        bytes32 node = poseidonT5.poseidon(
            [
                bytes32(uint256(uint160(msg.sender))),
                bytes32(ethAmount),
                bytes32(usdcAmount),
                bytes32(0)
            ]
        );

        // Walk 3 levels to the root; index bit selects sibling ordering.
        uint256 idx = leafIndex;
        for (uint256 i = 0; i < 3; i++) {
            node = (idx & 1 == 0)
                ? poseidonT3.poseidon([node, siblings[i]])
                : poseidonT3.poseidon([siblings[i], node]);
            idx >>= 1;
        }
        if (uint256(node) != w.merkleRoot) revert InvalidMerkleProof();

        // Effects before interactions.
        claimed[willCommitment][msg.sender] = true;

        if (ethAmount > 0) {
            (bool ok, ) = payable(msg.sender).call{value: ethAmount}("");
            if (!ok) revert TransferFailed();
        }
        if (usdcAmount > 0) {
            usdc.safeTransfer(msg.sender, usdcAmount);
        }

        emit Claimed(willCommitment, msg.sender, ethAmount, usdcAmount);
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
