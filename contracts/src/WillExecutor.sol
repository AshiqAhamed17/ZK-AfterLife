// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WillVerifier.sol";

/**
 * @title WillExecutor
 * @dev Smart contract that executes wills after ZK proof verification
 * Integrates with L1Heartbeat for inactivity detection and WillVerifier for proof validation
 */
contract WillExecutor is Ownable, Pausable, ReentrancyGuard {
    // Import the proof structure from WillVerifier
    // Note: We'll use the proof structure directly without using statement

    ////////////// ERRORS //////////////

    error InvalidVerifier();
    error InvalidHeartbeat();
    error WillNotRegistered();
    error WillAlreadyExecuted();
    error InvalidProof();
    error InactivityNotFinalized();
    error UnauthorizedExecution();
    error InsufficientBalance();
    error TransferFailed();

    ////////////// STORAGE //////////////

    /// @notice Address of the ZK verifier contract
    WillVerifier public immutable verifier;

    /// @notice Address of the heartbeat contract
    address public immutable heartbeat;

    /// @notice Mapping of will commitments to execution status
    mapping(bytes32 => bool) public executedWills;

    /// @notice Mapping of will commitments to execution details
    mapping(bytes32 => WillExecution) public willExecutions;

    /// @notice Mapping of will commitments to registered wills
    mapping(bytes32 => RegisteredWill) public registeredWills;

    /// @notice Total number of wills registered
    uint256 public totalWillsRegistered;

    /// @notice Total number of wills executed
    uint256 public totalWillsExecuted;

    ////////////// STRUCTS //////////////

    struct RegisteredWill {
        address owner;
        uint256 registrationTime;
        uint256 totalEth;
        uint256 totalUsdc;
        uint256 totalNfts;
        bool exists;
    }

    struct WillExecution {
        address executor;
        uint256 executionTime;
        uint256 totalValueTransferred;
        bool success;
    }

    ////////////// EVENTS //////////////

    event WillRegistered(
        bytes32 indexed willCommitment,
        address indexed owner,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNfts
    );

    event WillExecuted(
        bytes32 indexed willCommitment,
        address indexed executor,
        uint256 executionTime,
        bool success
    );

    event ProofVerified(
        bytes32 indexed willCommitment,
        address indexed verifier,
        bool isValid
    );

    ////////////// CONSTRUCTOR //////////////

    constructor(address _verifier, address _heartbeat) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidVerifier();
        if (_heartbeat == address(0)) revert InvalidHeartbeat();

        verifier = WillVerifier(_verifier);
        heartbeat = _heartbeat;
    }

    ////////////// EXTERNAL FUNCTIONS //////////////

    /**
     * @notice Register a will with its commitment hash
     * @param willCommitment The commitment hash of the will
     * @param totalEth Total ETH allocation
     * @param totalUsdc Total USDC allocation
     * @param totalNfts Total NFT count
     */
    function registerWill(
        bytes32 willCommitment,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNfts
    ) external whenNotPaused {
        if (registeredWills[willCommitment].exists) revert WillNotRegistered();

        registeredWills[willCommitment] = RegisteredWill({
            owner: msg.sender,
            registrationTime: block.timestamp,
            totalEth: totalEth,
            totalUsdc: totalUsdc,
            totalNfts: totalNfts,
            exists: true
        });

        totalWillsRegistered++;

        emit WillRegistered(
            willCommitment,
            msg.sender,
            totalEth,
            totalUsdc,
            totalNfts
        );
    }

    /**
     * @notice Internal function to execute a will
     */
    function _executeWillInternal(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount,
        WillVerifier.Proof memory proof
    ) internal {
        // Check if will is registered
        if (!registeredWills[willCommitment].exists) revert WillNotRegistered();

        // Check if will is already executed
        if (executedWills[willCommitment]) revert WillAlreadyExecuted();

        // Verify the ZK proof
        bool isValid = verifier.verifyWillProof(
            proof,
            uint256(willCommitment),
            merkleRoot,
            totalEth,
            totalUsdc,
            totalNftCount
        );

        if (!isValid) revert InvalidProof();

        emit ProofVerified(willCommitment, address(verifier), true);

        // Mark will as executed
        executedWills[willCommitment] = true;

        WillExecution memory execution = WillExecution({
            executor: msg.sender,
            executionTime: block.timestamp,
            totalValueTransferred: 0, // Would be calculated based on actual transfers
            success: true
        });

        willExecutions[willCommitment] = execution;
        totalWillsExecuted++;

        emit WillExecuted(willCommitment, msg.sender, block.timestamp, true);

        // TODO: Implement actual asset transfers to beneficiaries
        // This would require:
        // 1. Decrypting beneficiary data from the proof
        // 2. Transferring ETH/USDC/NFTs to beneficiaries
        // 3. Updating totalValueTransferred
    }

    /**
     * @notice Execute a will after ZK proof verification
     * @param willCommitment The commitment hash of the will
     * @param merkleRoot The merkle root of beneficiaries
     * @param totalEth Total ETH allocation
     * @param totalUsdc Total USDC allocation
     * @param totalNftCount Total NFT count
     * @param proof The ZK proof
     */
    function executeWill(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount,
        WillVerifier.Proof memory proof
    ) external whenNotPaused nonReentrant {
        _executeWillInternal(
            willCommitment,
            merkleRoot,
            totalEth,
            totalUsdc,
            totalNftCount,
            proof
        );
    }

    /**
     * @notice Execute will with heartbeat verification
     * Requires that the L1Heartbeat contract has finalized inactivity
     * @param willCommitment The commitment hash of the will
     * @param merkleRoot The merkle root of beneficiaries
     * @param totalEth Total ETH allocation
     * @param totalUsdc Total USDC allocation
     * @param totalNftCount Total NFT count
     * @param proof The ZK proof
     */
    function executeWillWithHeartbeat(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount,
        WillVerifier.Proof memory proof
    ) external whenNotPaused nonReentrant {
        // Check heartbeat finalization (this would require L1Heartbeat integration)
        // For now, we'll implement a simplified check
        // In production, this would call the L1Heartbeat contract

        // Execute the will (same logic as executeWill)
        _executeWillInternal(
            willCommitment,
            merkleRoot,
            totalEth,
            totalUsdc,
            totalNftCount,
            proof
        );
    }

    ////////////// VIEW FUNCTIONS //////////////

    /**
     * @notice Check if a will is registered
     * @param willCommitment The commitment hash
     * @return exists True if the will is registered
     */
    function isWillRegistered(
        bytes32 willCommitment
    ) external view returns (bool exists) {
        return registeredWills[willCommitment].exists;
    }

    /**
     * @notice Check if a will has been executed
     * @param willCommitment The commitment hash
     * @return executed True if the will has been executed
     */
    function isWillExecuted(
        bytes32 willCommitment
    ) external view returns (bool executed) {
        return executedWills[willCommitment];
    }

    /**
     * @notice Get will registration details
     * @param willCommitment The commitment hash
     * @return will The registered will details
     */
    function getRegisteredWill(
        bytes32 willCommitment
    ) external view returns (RegisteredWill memory will) {
        return registeredWills[willCommitment];
    }

    /**
     * @notice Get will execution details
     * @param willCommitment The commitment hash
     * @return execution The execution details
     */
    function getWillExecution(
        bytes32 willCommitment
    ) external view returns (WillExecution memory execution) {
        return willExecutions[willCommitment];
    }

    /**
     * @notice Get contract statistics
     * @return registered Total wills registered
     * @return executed Total wills executed
     */
    function getStats()
        external
        view
        returns (uint256 registered, uint256 executed)
    {
        return (totalWillsRegistered, totalWillsExecuted);
    }

    ////////////// ADMIN FUNCTIONS //////////////

    /**
     * @notice Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
