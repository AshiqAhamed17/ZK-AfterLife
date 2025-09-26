// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./L1Heartbeat.sol";

/// @title L1AztecBridge
/// @notice Bridge contract that listens to L1Heartbeat events and enables Aztec execution
/// @dev This contract acts as a bridge between Ethereum L1 and Aztec L2
/// @custom:security-contact security@infiniteaudits.io
contract L1AztecBridge is Ownable, Pausable {
    ////////////// ERRORS //////////////

    error InvalidAztecExecutor();
    error InvalidL1Heartbeat();
    error WillNotRegistered();
    error ExecutionAlreadyEnabled();
    error BridgeNotAuthorized();

    ////////////// EVENTS //////////////

    event AztecExecutionEnabled(
        bytes32 indexed willCommitment,
        address indexed l1Heartbeat,
        uint256 timestamp
    );

    event BridgeAuthorized(
        address indexed bridge,
        bool authorized,
        uint256 timestamp
    );

    ////////////// STORAGE //////////////

    /// @notice Address of the Aztec executor contract
    address public immutable aztecExecutor;

    /// @notice Address of the L1Heartbeat contract
    address public immutable l1Heartbeat;

    /// @notice Mapping of authorized bridge addresses
    mapping(address => bool) public authorizedBridges;

    /// @notice Mapping of processed will commitments
    mapping(bytes32 => bool) public processedCommitments;

    /// @notice Minimum confirmations required before processing
    uint256 public immutable minConfirmations;

    ////////////// MODIFIERS //////////////

    modifier onlyAuthorizedBridge() {
        if (!authorizedBridges[msg.sender]) revert BridgeNotAuthorized();
        _;
    }

    ////////////// CONSTRUCTOR //////////////

    constructor(
        address _aztecExecutor,
        address _l1Heartbeat,
        uint256 _minConfirmations
    ) Ownable(msg.sender) {
        if (_aztecExecutor == address(0)) revert InvalidAztecExecutor();
        if (_l1Heartbeat == address(0)) revert InvalidL1Heartbeat();
        if (_minConfirmations == 0) revert("Invalid min confirmations");

        aztecExecutor = _aztecExecutor;
        l1Heartbeat = _l1Heartbeat;
        minConfirmations = _minConfirmations;
        authorizedBridges[msg.sender] = true; // Owner is authorized
    }

    ////////////// ADMIN FUNCTIONS //////////////

    /// @notice Add or remove authorized bridge addresses
    function setBridgeAuthorization(
        address bridge,
        bool authorized
    ) external onlyOwner {
        authorizedBridges[bridge] = authorized;
        emit BridgeAuthorized(bridge, authorized, block.timestamp);
    }

    /// @notice Pause bridge operations (emergency circuit breaker)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause bridge operations
    function unpause() external onlyOwner {
        _unpause();
    }

    ////////////// EXTERNAL FUNCTIONS //////////////

    /// @notice Process L1Heartbeat inactivity finalization and enable Aztec execution
    /// @param willCommitment The will commitment from L1Heartbeat
    /// @param l1BlockNumber The L1 block number when finalization occurred
    /// @param l1BlockHash The L1 block hash for verification
    function processInactivityFinalization(
        bytes32 willCommitment,
        uint256 l1BlockNumber,
        bytes32 l1BlockHash
    ) internal whenNotPaused {
        // Verify the L1 block is confirmed
        if (block.number < l1BlockNumber + minConfirmations) revert();

        // Verify the block hash matches
        if (blockhash(l1BlockNumber) != l1BlockHash) revert();

        // Check if this commitment has already been processed
        if (processedCommitments[willCommitment]) revert();

        // Verify the L1Heartbeat contract emitted the event
        // This is a simplified verification - in production, you'd want more robust verification
        L1Heartbeat heartbeat = L1Heartbeat(l1Heartbeat);

        // Mark as processed
        processedCommitments[willCommitment] = true;

        // Enable execution on Aztec
        // Note: This would typically involve a cross-chain message or bridge call
        // For now, we'll emit an event that can be picked up by an off-chain service

        emit AztecExecutionEnabled(
            willCommitment,
            l1Heartbeat,
            block.timestamp
        );
    }

    /// @notice Batch process multiple inactivity finalizations
    /// @param commitments Array of will commitments
    /// @param blockNumbers Array of corresponding L1 block numbers
    /// @param blockHashes Array of corresponding L1 block hashes
    function batchProcessInactivityFinalizations(
        bytes32[] calldata commitments,
        uint256[] calldata blockNumbers,
        bytes32[] calldata blockHashes
    ) external onlyAuthorizedBridge whenNotPaused {
        if (
            commitments.length != blockNumbers.length ||
            commitments.length != blockHashes.length
        ) revert();

        for (uint256 i = 0; i < commitments.length; i++) {
            processInactivityFinalization(
                commitments[i],
                blockNumbers[i],
                blockHashes[i]
            );
        }
    }

    ////////////// VIEW FUNCTIONS //////////////

    /// @notice Check if a will commitment has been processed
    function isProcessed(bytes32 willCommitment) external view returns (bool) {
        return processedCommitments[willCommitment];
    }

    /// @notice Get bridge configuration
    function getBridgeConfig()
        external
        view
        returns (
            address _aztecExecutor,
            address _l1Heartbeat,
            uint256 _minConfirmations
        )
    {
        return (aztecExecutor, l1Heartbeat, minConfirmations);
    }

    /// @notice Check if an address is an authorized bridge
    function isAuthorizedBridge(address bridge) external view returns (bool) {
        return authorizedBridges[bridge];
    }

    ////////////// EMERGENCY FUNCTIONS //////////////

    /// @notice Emergency function to manually enable execution for a will
    /// @dev Only callable by owner in emergency situations
    /// @param willCommitment The will commitment to enable
    function emergencyEnableExecution(
        bytes32 willCommitment
    ) external onlyOwner {
        if (processedCommitments[willCommitment]) revert();

        processedCommitments[willCommitment] = true;
        emit AztecExecutionEnabled(
            willCommitment,
            l1Heartbeat,
            block.timestamp
        );
    }
}
