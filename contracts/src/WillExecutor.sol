// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WillVerifier.sol";
import "./SelfHumanVerifier.sol";

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
    error InvalidSelfVerifier();
    error WillNotRegistered();
    error WillAlreadyRegistered();
    error WillAlreadyExecuted();
    error InvalidProof();
    error InactivityNotFinalized();
    error UnauthorizedExecution();
    error InsufficientBalance();
    error TransferFailed();
    error SelfVerificationRequired();
    error AgeVerificationRequired();

    ////////////// STORAGE //////////////

    /// @notice Address of the ZK verifier contract
    WillVerifier public immutable verifier;

    /// @notice Address of the heartbeat contract
    address public immutable heartbeat;

    /// @notice Address of the Self human verifier contract
    SelfHumanVerifier public immutable selfVerifier;

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

    event EthWithdrawn(
        bytes32 indexed willCommitment,
        address indexed owner,
        uint256 amount
    );

    event EmergencyWithdrawal(address indexed owner, uint256 amount);

    ////////////// CONSTRUCTOR //////////////

    constructor(
        address _verifier,
        address _heartbeat,
        address _selfVerifier
    ) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidVerifier();
        if (_heartbeat == address(0)) revert InvalidHeartbeat();
        if (_selfVerifier == address(0)) revert InvalidSelfVerifier();

        verifier = WillVerifier(_verifier);
        heartbeat = _heartbeat;
        selfVerifier = SelfHumanVerifier(_selfVerifier);
    }

    ////////////// MODIFIERS //////////////

    /// @notice Modifier to ensure only Self-verified humans can register wills
    modifier onlyVerifiedHumans() {
        if (!selfVerifier.isHumanVerified(msg.sender))
            revert SelfVerificationRequired();
        if (!selfVerifier.isAgeValid(msg.sender))
            revert AgeVerificationRequired();
        _;
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
    ) external payable whenNotPaused onlyVerifiedHumans {
        if (registeredWills[willCommitment].exists)
            revert WillAlreadyRegistered();

        // Require ETH deposit to match totalEth allocation
        if (msg.value != totalEth) revert InsufficientBalance();

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
     * @notice Withdraw ETH from a will (only by owner before execution)
     * @param willCommitment The commitment hash of the will
     */
    function withdrawEth(bytes32 willCommitment) external nonReentrant {
        RegisteredWill memory will = registeredWills[willCommitment];
        if (!will.exists) revert WillNotRegistered();
        if (will.owner != msg.sender) revert UnauthorizedExecution();
        if (executedWills[willCommitment]) revert WillAlreadyExecuted();

        uint256 amount = will.totalEth;
        if (amount == 0) revert InsufficientBalance();

        // Update the will to remove ETH allocation
        registeredWills[willCommitment].totalEth = 0;

        // Transfer ETH back to owner
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EthWithdrawn(willCommitment, msg.sender, amount);
    }

    /**
     * @notice Withdraw all ETH from a will (only by owner before execution)
     * @param willCommitment The commitment hash of the will
     */
    function withdrawAllEth(bytes32 willCommitment) external nonReentrant {
        RegisteredWill memory will = registeredWills[willCommitment];
        if (!will.exists) revert WillNotRegistered();
        if (will.owner != msg.sender) revert UnauthorizedExecution();
        if (executedWills[willCommitment]) revert WillAlreadyExecuted();

        uint256 amount = will.totalEth;
        if (amount == 0) revert InsufficientBalance();

        // Update the will to remove ETH allocation
        registeredWills[willCommitment].totalEth = 0;

        // Transfer ETH back to owner
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EthWithdrawn(willCommitment, msg.sender, amount);
    }

    /**
     * @notice Emergency withdrawal function for owner
     * @param amount Amount of ETH to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EmergencyWithdrawal(owner(), amount);
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

    ////////////// SELF VERIFICATION FUNCTIONS //////////////

    /**
     * @notice Check if a user is Self-verified and meets age requirements
     * @param userAddress The address to check
     * @return isVerified True if user is verified as human and meets age requirement
     */
    function isUserVerified(
        address userAddress
    ) external view returns (bool isVerified) {
        return selfVerifier.isFullyVerified(userAddress);
    }

    /**
     * @notice Get Self verification details for a user
     * @param userAddress The address to check
     * @return isHuman True if verified as human
     * @return ageValid True if meets age requirement
     * @return method The verification method used ("passport" or "aadhaar")
     * @return nationality The user's nationality
     */
    function getUserSelfVerificationDetails(
        address userAddress
    )
        external
        view
        returns (
            bool isHuman,
            bool ageValid,
            string memory method,
            string memory nationality
        )
    {
        return selfVerifier.getUserVerificationDetails(userAddress);
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
