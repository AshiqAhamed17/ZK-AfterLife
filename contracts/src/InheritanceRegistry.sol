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
        uint64 inactivityPeriod; // seconds of owner inactivity before grace can be triggered
        uint64 gracePeriod; // grace buffer (seconds) after inactivity during which vetoes apply
        uint8 vetoThreshold; // minimum vetoes that cancel a grace period ("false alarm")
        address[] vetoMembers; // this will's own trusted circle, fixed at registration
    }

    ////////////// CONSTANTS //////////////

    /// @notice Floor on owner-chosen inactivity/grace periods — guards against
    ///         an accidental or malicious near-zero window, not a realistic
    ///         default (real wills should choose months/years).
    uint256 public constant MIN_INACTIVITY_PERIOD = 60;
    uint256 public constant MIN_GRACE_PERIOD = 60;

    /// @notice Cap on a will's veto committee size, matching the beneficiary
    ///         cap, so register()/veto() gas cost stays bounded and predictable.
    uint256 public constant MAX_VETO_MEMBERS = 8;

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

    ////////////// STORAGE //////////////

    /// @notice will commitment => will record. Private: `Will` now contains a
    ///         dynamic array member, which Solidity's auto-generated public
    ///         getter would silently drop from its return tuple. `getWill()`
    ///         below is the only supported read path.
    mapping(bytes32 => Will) private wills;

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
    error InactivityPeriodTooShort();
    error GracePeriodTooShort();
    error NoVetoMembers();
    error TooManyVetoMembers();
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
        address _poseidonT5
    ) {
        if (_willVerifier == address(0)) revert InvalidVerifier();
        if (_selfVerifier == address(0)) revert InvalidSelfVerifier();
        if (_usdc == address(0)) revert InvalidToken();
        if (_poseidonT3 == address(0) || _poseidonT5 == address(0)) {
            revert InvalidPoseidon();
        }

        willVerifier = IWillVerifier(_willVerifier);
        selfVerifier = ISelfHumanVerifier(_selfVerifier);
        usdc = IERC20(_usdc);
        poseidonT3 = IPoseidonT3(_poseidonT3);
        poseidonT5 = IPoseidonT5(_poseidonT5);
    }

    /**
     * @notice Seal a will: escrow ETH + USDC equal to the declared totals,
     *         record the commitment/Merkle root/totals, and set this will's
     *         own inactivity period, grace period, and trusted veto circle.
     *         Self-gated.
     * @dev The caller must have deposited exactly `totalEth` as msg.value and
     *      pre-approved `totalUsdc` to this contract. NFTs are not supported in
     *      V1, so `totalNftCount` must be 0. `vetoMembers`/`vetoThreshold` are
     *      fixed for this will's lifetime — there is no update function.
     * @param willCommitment Poseidon commitment of the will payload + salt (a
     *        BN254 field element), used as the will's key.
     * @param merkleRoot Poseidon Merkle root over the beneficiary leaves.
     * @param totalEth Declared total ETH allocation (must equal msg.value).
     * @param totalUsdc Declared total USDC allocation (pulled via transferFrom).
     * @param totalNftCount Declared NFT count; must be 0 in V1.
     * @param inactivityPeriod Seconds of inactivity before grace can be triggered;
     *        must be >= MIN_INACTIVITY_PERIOD.
     * @param gracePeriod Grace buffer in seconds; must be >= MIN_GRACE_PERIOD.
     * @param vetoMembers This will's trusted circle (1-MAX_VETO_MEMBERS addresses,
     *        no zero address, no duplicates).
     * @param vetoThreshold Vetoes needed to cancel a grace period; 1-vetoMembers.length.
     */
    function register(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount,
        uint256 inactivityPeriod,
        uint256 gracePeriod,
        address[] calldata vetoMembers,
        uint256 vetoThreshold
    ) external payable {
        if (!selfVerifier.isFullyVerified(msg.sender)) revert NotVerifiedHuman();
        if (wills[willCommitment].exists) revert WillAlreadyRegistered();
        if (merkleRoot == 0) revert InvalidMerkleRoot();
        if (totalNftCount != 0) revert NftsNotSupported();
        if (totalEth == 0 && totalUsdc == 0) revert EmptyWill();
        if (msg.value != totalEth) revert EthDepositMismatch();
        if (inactivityPeriod < MIN_INACTIVITY_PERIOD) revert InactivityPeriodTooShort();
        if (gracePeriod < MIN_GRACE_PERIOD) revert GracePeriodTooShort();
        if (vetoMembers.length == 0) revert NoVetoMembers();
        if (vetoMembers.length > MAX_VETO_MEMBERS) revert TooManyVetoMembers();
        if (vetoThreshold == 0 || vetoThreshold > vetoMembers.length) {
            revert InvalidVetoThreshold();
        }

        address[] memory members = new address[](vetoMembers.length);
        for (uint256 i = 0; i < vetoMembers.length; i++) {
            address member = vetoMembers[i];
            if (member == address(0)) revert ZeroAddressVeto();
            for (uint256 j = 0; j < i; j++) {
                if (members[j] == member) revert DuplicateVetoMember();
            }
            members[i] = member;
        }

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
            exists: true,
            inactivityPeriod: uint64(inactivityPeriod),
            gracePeriod: uint64(gracePeriod),
            vetoThreshold: uint8(vetoThreshold),
            vetoMembers: members
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
    ///         for this will's own `inactivityPeriod`.
    function triggerGracePeriod(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart != 0) revert GraceAlreadyActive();
        if (block.timestamp <= uint256(w.lastCheckIn) + w.inactivityPeriod) {
            revert StillActive();
        }

        w.graceStart = uint64(block.timestamp);
        emit GraceStarted(
            willCommitment,
            block.timestamp,
            block.timestamp + w.gracePeriod
        );
    }

    /// @notice A member of this will's own trusted circle blocks a premature
    ///         execution during the grace window. Reaching `vetoThreshold` is
    ///         treated as a confirmed false alarm: grace is cancelled and the
    ///         inactivity clock restarts.
    function veto(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (!_isVetoMemberOf(w, msg.sender)) revert NotVetoMember();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp > uint256(w.graceStart) + w.gracePeriod) {
            revert GracePeriodOver();
        }
        if (hasVetoed[willCommitment][w.graceEpoch][msg.sender]) {
            revert AlreadyVetoed();
        }

        hasVetoed[willCommitment][w.graceEpoch][msg.sender] = true;
        w.vetoCount += 1;
        emit Vetoed(willCommitment, msg.sender, w.vetoCount);

        if (w.vetoCount >= w.vetoThreshold) {
            w.graceStart = 0;
            w.vetoCount = 0;
            w.graceEpoch += 1;
            w.lastCheckIn = uint64(block.timestamp);
            emit GraceCancelled(willCommitment);
        }
    }

    /// @notice Linear scan of a will's own (<=8-member) trusted circle.
    function _isVetoMemberOf(Will storage w, address who) internal view returns (bool) {
        for (uint256 i = 0; i < w.vetoMembers.length; i++) {
            if (w.vetoMembers[i] == who) return true;
        }
        return false;
    }

    function executeWill(bytes32 willCommitment, bytes calldata proof) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp <= uint256(w.graceStart) + w.gracePeriod) {
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

    /// @notice Full will record for a commitment, including its own timing
    ///         and trusted-circle configuration.
    function getWill(bytes32 willCommitment) external view returns (Will memory) {
        return wills[willCommitment];
    }

    /// @notice Whether `who` is on this specific will's trusted circle.
    function isVetoMemberOf(bytes32 willCommitment, address who) external view returns (bool) {
        return _isVetoMemberOf(wills[willCommitment], who);
    }
}
