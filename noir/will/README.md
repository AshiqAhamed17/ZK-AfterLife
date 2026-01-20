# Will Verification Noir Circuit

This directory contains the core **Noir zero-knowledge circuit** used in the ZK-AfterLife project to privately verify the correctness of a digital will without revealing beneficiary identities, asset allocations, or will contents.

The circuit enforces that:
- A committed will payload is authentic.
- Beneficiary allocations are internally consistent.
- Declared totals match the sum of individual allocations.
- A Merkle root correctly represents the beneficiary set.

The circuit is designed for clarity and correctness rather than maximal generality.

---

## Purpose

The goal of this circuit is to prove, in zero knowledge, that a digital will satisfies a set of execution constraints **without revealing any private data**.

Specifically, the prover demonstrates that:
- The will data matches a previously committed hash.
- Beneficiary allocations are well-formed and valid.
- Asset totals are conserved.
- The beneficiary set is correctly encoded in a Poseidon-based Merkle tree.

This circuit does **not** attempt to prove death or identity.  
It strictly enforces internal correctness of a committed will state.

---

## Public Inputs

The following values are exposed to the verifier and are safe to be public:

| Input | Description |
|------|------------|
| `will_commitment` | Poseidon hash of the will payload and salt |
| `merkle_root` | Root hash of the beneficiary Merkle tree |
| `total_eth` | Declared total ETH allocation |
| `total_usdc` | Declared total USDC allocation |
| `total_nft_count` | Declared total NFT allocation |

These values allow on-chain contracts to verify correctness without learning private details.

---

## Private Inputs

The following values remain private to the prover:

| Input | Description |
|------|------------|
| `will_salt` | Random salt used in the will commitment |
| `will_data` | Encoded will payload |
| `beneficiary_count` | Number of active beneficiaries (max 8) |
| `beneficiary_addresses` | Beneficiary identifiers |
| `beneficiary_eth` | ETH allocations per beneficiary |
| `beneficiary_usdc` | USDC allocations per beneficiary |
| `beneficiary_nfts` | NFT allocations per beneficiary |

None of this information is revealed during verification.

---

## Circuit Constraints

### 1. Will Commitment Verification

The circuit recomputes the will commitment using Poseidon hashing and enforces equality with the public commitment: commitment = Poseidon(will_data || will_salt)

This ensures the prover cannot alter will contents after committing.

---

### 2. Beneficiary Validation

- The number of beneficiaries must be within bounds (`1 ≤ count ≤ 8`).
- Active beneficiaries must have non-zero addresses.
- Inactive slots are explicitly zeroed to avoid ambiguity.

---

### 3. Allocation Conservation

For each active beneficiary, allocations are accumulated and validated:

- Sum of ETH allocations equals `total_eth`
- Sum of USDC allocations equals `total_usdc`
- Sum of NFT allocations equals `total_nft_count`
- At least one non-zero allocation must exist

This prevents asset inflation, underflow, or silent loss.

---

### 4. Merkle Tree Construction

Each beneficiary is hashed as: leaf = Poseidon(address, eth, usdc, nft)

The circuit constructs a fixed-depth Poseidon-based Merkle tree (depth = 3) and enforces that the computed root matches the public `merkle_root`.

This proves the beneficiary set is consistent with the committed root while hiding all leaf data.

---

## Design Choices

- **Poseidon hashing** is used for all commitments and Merkle nodes for ZK efficiency.
- **Fixed-size arrays** simplify constraint reasoning and circuit layout.
- **Explicit zero-padding** avoids ambiguous inactive slots.
- **No conditional branching on private data** beyond bounded iteration.

The circuit favors transparency and auditability over dynamic flexibility.

---

## Testing

The circuit includes unit tests that:

- Compute correct will commitments and Merkle roots.
- Validate a known-good will configuration.
- Assert that incorrect allocations or commitments cause failures.

These tests serve as executable documentation for expected behavior.

---

## Limitations

- Maximum of 8 beneficiaries (by design).
- Asset types are limited to ETH, USDC, and NFTs.
- No support for dynamic asset lists.
- No proof of liveness, death, or identity.
- Intended as a correctness proof, not a full execution engine.

---

## Role in the Overall System

This circuit acts as the **cryptographic gatekeeper** for will execution.  
Smart contracts and off-chain services rely on its proof to ensure that:

- A will was not tampered with.
- Assets are distributed exactly as declared.
- Private details remain undisclosed.

It is designed to be verifiable by on-chain contracts while keeping all sensitive data private.

---

## Status

This circuit is experimental and intended for research and proof-of-work purposes.  
It has not been formally audited.
