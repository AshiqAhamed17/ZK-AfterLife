// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AztecExecutor.sol";

/// @title Noir Integration Contract
/// @notice Integrates Noir ZK proofs with will execution
/// @dev Handles proof verification and will execution coordination
contract NoirIntegration is Ownable, Pausable, ReentrancyGuard {
    // Events
    event WillProofVerified(
        bytes32 indexed willCommitment,
        address indexed executor,
        uint256 timestamp
    );
    event ProofVerificationFailed(
        bytes32 indexed willCommitment,
        string reason,
        uint256 timestamp
    );

    // Structs
    struct WillProof {
        bytes32 willCommitment;
        bytes32 merkleRoot;
        uint256 totalEth;
        uint256 totalUsdc;
        uint256 totalNftCount;
        bytes proof; // ZK proof data
        bytes32[] publicInputs; // Public inputs for verification
    }

    struct BeneficiaryAllocation {
        address beneficiary;
        uint256 ethAmount;
        uint256 usdcAmount;
        uint256 nftCount;
    }

    // State variables
    mapping(bytes32 => bool) public executedWills;
    mapping(bytes32 => WillProof) public willProofs;
    AztecExecutor public aztecExecutor;

    // Modifiers
    modifier willNotExecuted(bytes32 willCommitment) {
        require(!executedWills[willCommitment], "Will already executed");
        _;
    }

    modifier proofExists(bytes32 willCommitment) {
        require(
            willProofs[willCommitment].willCommitment != bytes32(0),
            "Proof not found"
        );
        _;
    }

    // Constructor
    constructor(address _aztecExecutor) Ownable(msg.sender) {
        aztecExecutor = AztecExecutor(payable(_aztecExecutor));
    }

    /// @notice Submit a will proof for verification and execution
    /// @param proof The will proof data
    /// @param beneficiaries Array of beneficiary allocations
    function submitWillProof(
        WillProof calldata proof,
        BeneficiaryAllocation[] calldata beneficiaries
    )
        external
        whenNotPaused
        nonReentrant
        willNotExecuted(proof.willCommitment)
    {
        // Store the proof
        willProofs[proof.willCommitment] = proof;

        // Verify the proof (this would integrate with your Noir circuit)
        bool proofValid = verifyNoirProof(proof);

        if (proofValid) {
            // Mark will as executed
            executedWills[proof.willCommitment] = true;

            // Execute the will through AztecExecutor
            _executeWill(proof, beneficiaries);

            emit WillProofVerified(
                proof.willCommitment,
                msg.sender,
                block.timestamp
            );
        } else {
            emit ProofVerificationFailed(
                proof.willCommitment,
                "Invalid proof",
                block.timestamp
            );
            revert("Invalid will proof");
        }
    }

    /// @notice Verify a Noir ZK proof
    /// @param proof The will proof to verify
    /// @return True if proof is valid
    function verifyNoirProof(
        WillProof calldata proof
    ) internal pure returns (bool) {
        // TODO: Integrate with actual Noir proof verification
        // For now, we'll do basic validation

        // Check that commitment is not zero
        if (proof.willCommitment == bytes32(0)) {
            return false;
        }

        // Check that merkle root is not zero
        if (proof.merkleRoot == bytes32(0)) {
            return false;
        }

        // Check that proof data exists
        if (proof.proof.length == 0) {
            return false;
        }

        // TODO: Add actual ZK proof verification here
        // This would involve:
        // 1. Calling the Noir verification function
        // 2. Checking the proof against the public inputs
        // 3. Verifying the circuit constraints

        return true;
    }

    /// @notice Execute a verified will
    /// @param proof The verified will proof
    /// @param beneficiaries Array of beneficiary allocations
    function _executeWill(
        WillProof calldata proof,
        BeneficiaryAllocation[] calldata beneficiaries
    ) internal {
        // Convert to AztecExecutor format
        AztecExecutor.BeneficiaryAllocation[]
            memory aztecBeneficiaries = new AztecExecutor.BeneficiaryAllocation[](
                beneficiaries.length
            );

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            aztecBeneficiaries[i] = AztecExecutor.BeneficiaryAllocation({
                beneficiary: beneficiaries[i].beneficiary,
                ethAmount: beneficiaries[i].ethAmount,
                usdcAmount: beneficiaries[i].usdcAmount,
                nftCount: beneficiaries[i].nftCount
            });
        }

        // Execute through AztecExecutor
        // Note: AztecExecutor has a payable receive function
        AztecExecutor(payable(address(aztecExecutor))).executeWill(
            proof.willCommitment,
            aztecBeneficiaries,
            proof.proof
        );
    }

    /// @notice Get will proof by commitment
    /// @param willCommitment The will commitment hash
    /// @return The stored will proof
    function getWillProof(
        bytes32 willCommitment
    ) external view returns (WillProof memory) {
        return willProofs[willCommitment];
    }

    /// @notice Check if a will has been executed
    /// @param willCommitment The will commitment hash
    /// @return True if will has been executed
    function isWillExecuted(
        bytes32 willCommitment
    ) external view returns (bool) {
        return executedWills[willCommitment];
    }

    /// @notice Pause the contract (emergency only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Update AztecExecutor address
    /// @param _aztecExecutor New AztecExecutor address
    function setAztecExecutor(address _aztecExecutor) external onlyOwner {
        aztecExecutor = AztecExecutor(payable(_aztecExecutor));
    }
}
