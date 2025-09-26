// Will verification circuit for zk-afterlife-agent - Poseidon-based hashing
use dep::poseidon;
use dep::std;

// Max beneficiaries supported by this circuit
global MAX_BENEFICIARIES: Field = 8;

// Public inputs are passed as `pub` parameters to `main`.
// Private inputs are unannotated parameters.

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
    assert(beneficiary_count as u32 <= MAX_BENEFICIARIES as u32);

    // 1) Commitment check using Poseidon
    // commitment = Poseidon(will_data[0], will_data[1], will_data[2], will_data[3], will_salt)
    let computed_will_commit = poseidon::poseidon::bn254::hash_5([
        will_data[0],
        will_data[1],
        will_data[2],
        will_data[3],
        will_salt,
    ]);
    
    // Debug: print the computed commitment
    std::println(f"Computed will commitment: {computed_will_commit}");
    std::println(f"Expected will commitment: {will_commitment}");
    
    assert(computed_will_commit == will_commitment);

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
            assert(addr != 0);

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
    assert(sum_eth == total_eth);
    assert(sum_usdc == total_usdc);
    assert(sum_nfts == total_nft_count);

    // 4) At least one non-zero allocation overall
    let total_alloc = sum_eth + sum_usdc + sum_nfts;
    assert(total_alloc != 0);

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
    
    // Debug: print the computed root
    std::println(f"Computed merkle root: {computed_root}");
    std::println(f"Expected merkle root: {merkle_root}");
    
    assert(computed_root == merkle_root);
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
        will_salt
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
fn test_get_values() {
    let (will_commitment, merkle_root) = get_correct_values();
    std::println(f"Will commitment: {will_commitment}");
    std::println(f"Merkle root: {merkle_root}");
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

