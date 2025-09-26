// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AztecExecutor
/// @notice Aztec L2 executor for zk-afterlife-agent will execution
/// @dev This contract handles will execution and asset distribution on Aztec
contract AztecExecutor is Ownable, Pausable, ReentrancyGuard {
    ////////////// ERRORS //////////////

    error WillNotRegistered();
    error WillAlreadyExecuted();
    error ExecutionNotEnabled();
    error InvalidProof();
    error InvalidBeneficiary();
    error InsufficientBalance();
    error TransferFailed();

    ////////////// EVENTS //////////////

    event WillRegistered(
        bytes32 indexed willCommitment,
        bytes32 indexed verificationKeyId,
        uint256 timestamp
    );

    event ExecutionEnabled(bytes32 indexed willCommitment, uint256 timestamp);

    event WillExecuted(
        bytes32 indexed willCommitment,
        address indexed executor,
        uint256 timestamp
    );

    event BeneficiaryPaid(
        bytes32 indexed willCommitment,
        address indexed beneficiary,
        uint256 ethAmount,
        uint256 usdcAmount,
        uint256 nftCount
    );

    ////////////// STRUCTS //////////////

    struct Will {
        bytes32 commitment;
        bytes32 verificationKeyId;
        bool isRegistered;
        bool isExecuted;
        bool executionEnabled;
        uint256 registrationTime;
        uint256 executionTime;
        address executor;
    }

    struct BeneficiaryAllocation {
        address beneficiary;
        uint256 ethAmount;
        uint256 usdcAmount;
        uint256 nftCount;
    }

    ////////////// STORAGE //////////////

    /// @notice Mapping from will commitment to will details
    mapping(bytes32 => Will) public wills;

    /// @notice Mapping from verification key ID to verification key data
    mapping(bytes32 => bytes) public verificationKeys;

    /// @notice List of all registered will commitments
    bytes32[] public registeredWills;

    /// @notice Minimum time between registration and execution (grace period)
    uint256 public immutable minExecutionDelay;

    /// @notice Addresses authorized to enable execution (L1 bridge, multisig)
    mapping(address => bool) public authorizedEnablers;

    ////////////// MODIFIERS //////////////

    modifier onlyAuthorizedEnabler() {
        if (!authorizedEnablers[msg.sender]) revert("Not authorized enabler");
        _;
    }

    modifier willExists(bytes32 willCommitment) {
        if (!wills[willCommitment].isRegistered) revert WillNotRegistered();
        _;
    }

    modifier willNotExecuted(bytes32 willCommitment) {
        if (wills[willCommitment].isExecuted) revert WillAlreadyExecuted();
        _;
    }

    ////////////// CONSTRUCTOR //////////////

    constructor(uint256 _minExecutionDelay) Ownable(msg.sender) {
        minExecutionDelay = _minExecutionDelay;
        authorizedEnablers[msg.sender] = true; // Owner can enable execution
    }

    ////////////// ADMIN FUNCTIONS //////////////

    /// @notice Add or remove authorized enablers
    function setAuthorizedEnabler(
        address enabler,
        bool authorized
    ) external onlyOwner {
        authorizedEnablers[enabler] = authorized;
    }

    /// @notice Pause contract (emergency circuit breaker)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }

    ////////////// EXTERNAL FUNCTIONS //////////////

    /// @notice Register a new will with verification key
    /// @param willCommitment Hash of the will
    /// @param verificationKeyId ID of the verification key
    /// @param verificationKeyData The actual verification key data
    function registerWill(
        bytes32 willCommitment,
        bytes32 verificationKeyId,
        bytes calldata verificationKeyData
    ) external whenNotPaused {
        if (wills[willCommitment].isRegistered) revert WillNotRegistered();

        wills[willCommitment] = Will({
            commitment: willCommitment,
            verificationKeyId: verificationKeyId,
            isRegistered: true,
            isExecuted: false,
            executionEnabled: false,
            registrationTime: block.timestamp,
            executionTime: 0,
            executor: address(0)
        });

        verificationKeys[verificationKeyId] = verificationKeyData;
        registeredWills.push(willCommitment);

        emit WillRegistered(willCommitment, verificationKeyId, block.timestamp);
    }

    /// @notice Enable execution for a will (called by L1 bridge after inactivity)
    /// @param willCommitment Hash of the will to enable execution for
    function enableExecution(
        bytes32 willCommitment
    )
        external
        onlyAuthorizedEnabler
        whenNotPaused
        willExists(willCommitment)
        willNotExecuted(willCommitment)
    {
        Will storage will = wills[willCommitment];

        // Check if enough time has passed since registration
        if (block.timestamp < will.registrationTime + minExecutionDelay)
            revert();

        will.executionEnabled = true;
        emit ExecutionEnabled(willCommitment, block.timestamp);
    }

    /// @notice Execute a will (distribute assets to beneficiaries)
    /// @param willCommitment Hash of the will to execute
    /// @param beneficiaries Array of beneficiary allocations
    /// @param proof ZK proof data (to be verified)
    function executeWill(
        bytes32 willCommitment,
        BeneficiaryAllocation[] calldata beneficiaries,
        bytes calldata proof
    )
        external
        whenNotPaused
        nonReentrant
        willExists(willCommitment)
        willNotExecuted(willCommitment)
    {
        Will storage will = wills[willCommitment];

        if (!will.executionEnabled) revert ExecutionNotEnabled();

        // TODO: Verify ZK proof using the verification key
        // This would integrate with Aztec's proof verification system
        // if (!verifyProof(will.verificationKeyId, proof, beneficiaries)) revert InvalidProof();

        // Mark will as executed
        will.isExecuted = true;
        will.executionTime = block.timestamp;
        will.executor = msg.sender;

        // Distribute assets to beneficiaries
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            BeneficiaryAllocation memory allocation = beneficiaries[i];

            if (allocation.beneficiary == address(0))
                revert InvalidBeneficiary();

            // Transfer ETH
            if (allocation.ethAmount > 0) {
                if (address(this).balance < allocation.ethAmount)
                    revert InsufficientBalance();
                (bool success, ) = allocation.beneficiary.call{
                    value: allocation.ethAmount
                }("");
                if (!success) revert TransferFailed();
            }
            emit BeneficiaryPaid(
                willCommitment,
                allocation.beneficiary,
                allocation.ethAmount,
                allocation.usdcAmount,
                allocation.nftCount
            );
        }

        emit WillExecuted(willCommitment, msg.sender, block.timestamp);
    }

    ////////////// VIEW FUNCTIONS //////////////

    /// @notice Get will details
    function getWill(
        bytes32 willCommitment
    ) external view returns (Will memory) {
        return wills[willCommitment];
    }

    /// @notice Get all registered will commitments
    function getRegisteredWills() external view returns (bytes32[] memory) {
        return registeredWills;
    }

    /// @notice Check if execution is enabled for a will
    function canExecute(bytes32 willCommitment) external view returns (bool) {
        Will memory will = wills[willCommitment];
        return
            will.isRegistered &&
            !will.isExecuted &&
            will.executionEnabled &&
            block.timestamp >= will.registrationTime + minExecutionDelay;
    }

    /// @notice Get verification key data
    function getVerificationKey(
        bytes32 verificationKeyId
    ) external view returns (bytes memory) {
        return verificationKeys[verificationKeyId];
    }

    ////////////// RECEIVE FUNCTION //////////////

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}
