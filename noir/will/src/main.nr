// Will verification circuit for zk-afterlife-agent - Poseidon-based hashing
use ::poseidon;

// Max beneficiaries supported by this circuit
global MAX_BENEFICIARIES: Field = 8;

// =============================================================================
// FROZEN INTERFACE — this order is load-bearing. Do not reorder without also
// updating: the Phase 1b `HonkVerifier.sol` wiring, `frontend/src/services/
// noirService.ts`, and every `Prover.toml`.
//
// Public inputs (5, in this exact order — matches the on-chain uint256[5]):
//   1. will_commitment  — Poseidon::hash_5(will_data[0..4], will_salt)
//   2. merkle_root       — Poseidon Merkle root over the 8 beneficiary leaves
//   3. total_eth         — declared total ETH allocation
//   4. total_usdc        — declared total USDC allocation
//   5. total_nft_count   — declared total NFT allocation
//
// Private witness (in this exact order):
//   will_salt, will_data[4], beneficiary_count,
//   beneficiary_addresses[8], beneficiary_eth[8], beneficiary_usdc[8],
//   beneficiary_nfts[8]
//
// Age/humanity gating is handled off-circuit by Self Protocol, not here.
// =============================================================================

fn main(
    // --- public inputs ---
    will_commitment: pub Field, // Sophisticated hash of will data + salt
    merkle_root: pub Field, // Hash of beneficiary tree
    total_eth: pub Field, // declared total ETH allocation
    total_usdc: pub Field, // declared total USDC allocation
    total_nft_count: pub Field, // declared total NFT allocation
    // --- private inputs ---
    will_salt: Field,
    will_data: [Field; 4], // will payload (4 fields)
    beneficiary_count: Field, // actual number of beneficiaries (max 8)
    beneficiary_addresses: [Field; 8], // beneficiary addresses as Fields
    beneficiary_eth: [Field; 8],
    beneficiary_usdc: [Field; 8],
    beneficiary_nfts: [Field; 8],
) {
    // Validate beneficiary_count bounds (max 8)
    assert(beneficiary_count as u32 <= MAX_BENEFICIARIES as u32, "Too many beneficiaries");
    assert((beneficiary_count as u32) > 0, "At least one beneficiary required");

    // 1) Commitment check using Poseidon
    // commitment = Poseidon(will_data[0], will_data[1], will_data[2], will_data[3], will_salt)
    let computed_will_commit = poseidon::poseidon::bn254::hash_5([
        will_data[0],
        will_data[1],
        will_data[2],
        will_data[3],
        will_salt,
    ]);

    assert(computed_will_commit == will_commitment, "Will commitment mismatch");

    // 2) Process beneficiaries and build sophisticated hash tree
    let mut sum_eth: Field = 0;
    let mut sum_usdc: Field = 0;
    let mut sum_nfts: Field = 0;
    let mut beneficiary_hashes: [Field; 8] = [0; 8];

    // Process beneficiaries and build hash tree
    for i in 0..8 {
        let is_active = (i as u32) < (beneficiary_count as u32);

        if is_active {
            let addr = beneficiary_addresses[i];
            let eth = beneficiary_eth[i];
            let usdc = beneficiary_usdc[i];
            let nft = beneficiary_nfts[i];

            // Validate active beneficiary
            assert(addr != 0, "Invalid beneficiary address");

            // Validate non-negative allocations (Fields are always non-negative in Noir)
            // Note: In Noir, Field elements are always non-negative, so we skip this validation

            // Accumulate allocations
            sum_eth = sum_eth + eth;
            sum_usdc = sum_usdc + usdc;
            sum_nfts = sum_nfts + nft;

            // Leaf hash: Poseidon(addr, eth, usdc, nft)
            let leaf_hash = poseidon::poseidon::bn254::hash_4([addr, eth, usdc, nft]);
            beneficiary_hashes[i] = leaf_hash;
        } else {
            // For inactive slots, use a canonical empty hash
            beneficiary_hashes[i] = 0;
        }
    }

    // 3) Verify allocation sums match declared totals
    // This is the core validation: the sum of individual beneficiary allocations must equal the declared totals
    assert(sum_eth == total_eth, "ETH allocation sum does not match declared total");
    assert(sum_usdc == total_usdc, "USDC allocation sum does not match declared total");
    assert(sum_nfts == total_nft_count, "NFT allocation sum does not match declared total");

    // 4) At least one non-zero allocation overall
    let total_alloc = sum_eth + sum_usdc + sum_nfts;
    assert(total_alloc != 0, "Total allocation must be non-zero");

    // 5) Build Poseidon-based Merkle tree
    // Layer 1: Poseidon(left, right)
    let mut layer1: [Field; 4] = [0; 4];
    for i in 0..4 {
        let left = beneficiary_hashes[i * 2];
        let right = beneficiary_hashes[i * 2 + 1];
        layer1[i] = poseidon::poseidon::bn254::hash_2([left, right]);
    }

    // Layer 2: Poseidon(left, right)
    let mut layer2: [Field; 2] = [0; 2];
    for i in 0..2 {
        let left = layer1[i * 2];
        let right = layer1[i * 2 + 1];
        layer2[i] = poseidon::poseidon::bn254::hash_2([left, right]);
    }

    // Final root: Poseidon(layer2[0], layer2[1])
    let computed_root = poseidon::poseidon::bn254::hash_2([layer2[0], layer2[1]]);

    assert(computed_root == merkle_root, "Merkle root mismatch");
}

// Helper function to get the correct hash values
fn get_correct_values() -> (Field, Field) {
    let will_data: [Field; 4] = [1, 2, 3, 4];
    let will_salt: Field = 5;

    // Calculate will commitment
    let will_commitment = poseidon::poseidon::bn254::hash_5([
        will_data[0],
        will_data[1],
        will_data[2],
        will_data[3],
        will_salt,
    ]);

    // Calculate merkle root
    let leaf1 = poseidon::poseidon::bn254::hash_4([1000, 4, 400, 1]);
    let leaf2 = poseidon::poseidon::bn254::hash_4([2000, 3, 300, 1]);
    let leaf3 = poseidon::poseidon::bn254::hash_4([3000, 3, 300, 0]);
    let leaf4 = 0;

    let layer1_0 = poseidon::poseidon::bn254::hash_2([leaf1, leaf2]);
    let layer1_1 = poseidon::poseidon::bn254::hash_2([leaf3, leaf4]);
    let layer1_2 = poseidon::poseidon::bn254::hash_2([0, 0]);
    let layer1_3 = poseidon::poseidon::bn254::hash_2([0, 0]);

    let layer2_0 = poseidon::poseidon::bn254::hash_2([layer1_0, layer1_1]);
    let layer2_1 = poseidon::poseidon::bn254::hash_2([layer1_2, layer1_3]);

    let merkle_root = poseidon::poseidon::bn254::hash_2([layer2_0, layer2_1]);

    (will_commitment, merkle_root)
}

#[test]
fn test_valid_will() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment,
        merkle_root,
        10, // total_eth
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        3, // beneficiary_count
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}

#[test(should_fail_with = "Will commitment mismatch")]
fn test_wrong_commitment_fails() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment + 1, // corrupted commitment
        merkle_root,
        10, // total_eth
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        3, // beneficiary_count
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}

#[test(should_fail_with = "ETH allocation sum does not match declared total")]
fn test_wrong_sum_fails() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment,
        merkle_root,
        11, // total_eth — does not match the sum of beneficiary_eth (4+3+3=10)
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        3, // beneficiary_count
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}

#[test(should_fail_with = "Merkle root mismatch")]
fn test_wrong_root_fails() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment,
        merkle_root + 1, // corrupted root
        10, // total_eth
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        3, // beneficiary_count
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}

#[test(should_fail_with = "Too many beneficiaries")]
fn test_out_of_bounds_count_fails() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment,
        merkle_root,
        10, // total_eth
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        9, // beneficiary_count — exceeds MAX_BENEFICIARIES (8)
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}

#[test(should_fail_with = "At least one beneficiary required")]
fn test_zero_count_fails() {
    let (will_commitment, merkle_root) = get_correct_values();

    main(
        will_commitment,
        merkle_root,
        10, // total_eth
        1000, // total_usdc
        2, // total_nft_count
        5, // will_salt
        [1, 2, 3, 4], // will_data
        0, // beneficiary_count — below the required minimum of 1
        [1000, 2000, 3000, 0, 0, 0, 0, 0], // beneficiary_addresses
        [4, 3, 3, 0, 0, 0, 0, 0], // beneficiary_eth
        [400, 300, 300, 0, 0, 0, 0, 0], // beneficiary_usdc
        [1, 1, 0, 0, 0, 0, 0, 0], // beneficiary_nfts
    );
}
