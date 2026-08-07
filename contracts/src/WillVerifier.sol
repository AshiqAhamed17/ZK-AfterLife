// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal interface to the bb-generated UltraHonk verifier (`HonkVerifier.sol`).
/// @dev `_publicInputs.length` must equal the will circuit's public-input count (5);
///      the 8 pairing-point-accumulator fields ride inside `_proof`, not this array.
interface IHonkVerifier {
    function verify(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) external view returns (bool);
}

/**
 * @title WillVerifier
 * @notice Will-semantics adapter over the bb-generated UltraHonk `HonkVerifier`.
 *
 * This is a REAL verifier: it forwards the raw UltraHonk proof and the will
 * circuit's public inputs to `HonkVerifier.verify`, which performs genuine
 * BN254 UltraHonk verification, and returns its boolean result. There is no
 * "simplified" path — an invalid proof does not verify.
 *
 * The 5 public inputs are FROZEN and must match `noir/will/src/main.nr`
 * (and the circuit ABI in `noir/will/target/will.json`), in this exact order:
 *   [0] will_commitment
 *   [1] merkle_root
 *   [2] total_eth
 *   [3] total_usdc
 *   [4] total_nft_count
 */
contract WillVerifier {
    /// @notice Number of public inputs the will circuit exposes.
    uint256 public constant PUBLIC_INPUT_COUNT = 5;

    /// @notice BN254 scalar field modulus. Every public input must be a valid
    ///         field element; the underlying HonkVerifier also enforces this, but
    ///         we check up front to fail with a clearer error.
    uint256 internal constant FIELD_MODULUS =
        0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;

    /// @notice The bb-generated UltraHonk verifier this adapter delegates to.
    IHonkVerifier public immutable honkVerifier;

    error InvalidVerifierAddress();
    error PublicInputNotInField(uint256 index);

    constructor(address _honkVerifier) {
        if (_honkVerifier == address(0)) revert InvalidVerifierAddress();
        honkVerifier = IHonkVerifier(_honkVerifier);
    }

    /**
     * @notice Verify a will proof against its 5 public inputs.
     * @param proof Raw UltraHonk proof bytes for the will circuit (as produced by
     *              `bb prove` / `bb.js` against `will.json`).
     * @param publicInputs The 5 public inputs, in the frozen circuit order.
     * @return True iff `proof` is a valid UltraHonk proof for `publicInputs`.
     */
    function verifyProof(
        bytes calldata proof,
        uint256[5] memory publicInputs
    ) public view returns (bool) {
        return honkVerifier.verify(proof, _pack(publicInputs));
    }

    /**
     * @notice Convenience overload taking the 5 public inputs as named parameters.
     * @param proof Raw UltraHonk proof bytes for the will circuit.
     * @param willCommitment Poseidon commitment of the will payload + salt.
     * @param merkleRoot Poseidon Merkle root over the beneficiary leaves.
     * @param totalEth Declared total ETH allocation.
     * @param totalUsdc Declared total USDC allocation.
     * @param totalNftCount Declared total NFT count.
     * @return True iff the proof is valid for these inputs.
     */
    function verifyWillProof(
        bytes calldata proof,
        uint256 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount
    ) external view returns (bool) {
        uint256[5] memory publicInputs = [
            willCommitment,
            merkleRoot,
            totalEth,
            totalUsdc,
            totalNftCount
        ];
        return honkVerifier.verify(proof, _pack(publicInputs));
    }

    /**
     * @notice Pack the 5 uint256 public inputs into the `bytes32[]` the
     *         HonkVerifier expects, validating each is a BN254 field element.
     */
    function _pack(
        uint256[5] memory publicInputs
    ) internal pure returns (bytes32[] memory pubs) {
        pubs = new bytes32[](PUBLIC_INPUT_COUNT);
        for (uint256 i = 0; i < PUBLIC_INPUT_COUNT; i++) {
            if (publicInputs[i] >= FIELD_MODULUS) {
                revert PublicInputNotInField(i);
            }
            pubs[i] = bytes32(publicInputs[i]);
        }
    }
}
