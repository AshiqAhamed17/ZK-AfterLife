# InheritanceRegistry.claim — Design Spec

> Phase 1c box 3. Adds per-beneficiary claiming to the registry from boxes 1-2.
> Written 2026-08-09.

## Purpose

After a will is executed, each beneficiary claims their exact ETH + USDC share
by proving Merkle inclusion of their leaf in the will's Poseidon tree — the same
tree the on-chain ZK proof already validated (via `merkleRoot`). Claiming
performs the real asset transfer.

## Key finding: Poseidon compatibility (verified)

The circuit uses `noir-lang/poseidon` `bn254::hash_2/hash_4`. This is
**byte-for-byte identical to circomlibjs Poseidon** — verified:

- `hash_2([0,0])   = 0x2098f5fb9e239eab3ceac3f27b81e481dc3124d55ffed523a839ee8446b64864`
- `hash_4([1,2,3,4]) = 0x299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465`

Both computed in the circuit (`nargo`) and in circomlibjs match exactly. So an
on-chain Poseidon derived from circomlib matches the circuit's tree, and a
keccak claim-tree is unnecessary (and would be wrong — it wouldn't be bound to
what the proof attests).

## On-chain Poseidon (decision: generate from circomlibjs)

`contracts/poseidon/generate.js` uses circomlibjs `poseidon_gencontract` to emit
EVM bytecode for `PoseidonT3` (2 inputs → hash_2) and `PoseidonT5`
(4 inputs → hash_4), committed as `PoseidonT3.bin` / `PoseidonT5.bin`
(init bytecode, ~9.7KB / ~16.3KB). Each is deployed as a standalone contract;
the registry holds their addresses as immutables. ABI:
`poseidon(bytes32[N] input) view returns (bytes32)`.

A Foundry test asserts the deployed `PoseidonT3.poseidon([0,0])` equals the
value above, pinning on-chain ↔ circuit equivalence.

## Tree recap (frozen, from the circuit)

Fixed 8-leaf, 3-layer binary tree:
- `leaf_i = hash_4([addr, eth, usdc, nft])` for active slots; inactive slots are
  the literal `0` (not a hash of zeros).
- `addr` is the beneficiary address as a field = `uint256(uint160(address))`.
- `nft = 0` in V1.
- `layer1[i] = hash_2([bh[2i], bh[2i+1]])`, `layer2[i] = hash_2([layer1[2i], layer1[2i+1]])`,
  `root = hash_2([layer2[0], layer2[1]])`.

## claim

```
claim(bytes32 willCommitment, uint256 ethAmount, uint256 usdcAmount,
      uint256 leafIndex, bytes32[3] siblings)  nonReentrant
```
1. Require will exists and `executed`; `leafIndex < 8`; not already claimed by
   `msg.sender`; `(ethAmount, usdcAmount)` not both zero.
2. `node = PoseidonT5.poseidon([uint160(msg.sender), ethAmount, usdcAmount, 0])`.
3. For each of 3 levels: if the current index bit is 0, `node = T3([node, sib])`,
   else `node = T3([sib, node])`; shift the index right.
4. Require `uint256(node) == merkleRoot`, else `InvalidMerkleProof`.
5. Effects: mark `claimed[commitment][msg.sender] = true`.
6. Interactions: send `ethAmount` via `call`, `usdc.safeTransfer(usdcAmount)`.
   Emit `Claimed`.

**Double-claim key** `(commitment, msg.sender)` — assumes one beneficiary
address per will (a reasonable V1 constraint; documented). Sum of all
beneficiary shares equals the deposited totals (circuit-guaranteed), so escrow
is exactly drained.

## Security
- `nonReentrant` (OZ ReentrancyGuard) + checks-effects-interactions: claimed
  flag set before any transfer; ETH via `call`, USDC via SafeERC20.
- Constructor validates non-zero PoseidonT3/T5 addresses.

## Testing
Foundry, extending the box 1-2 suite:
- Poseidon equivalence: `T3.poseidon([0,0])` == the pinned value.
- On-chain tree of the fixture beneficiary set reproduces the circuit's
  `merkleRoot` (0x2a14…5962) — ties Poseidon to the real fixture.
- Happy path: register → execute (real proof) → each of the 3 beneficiaries
  claims exact ETH+USDC; balances move; escrow fully drained.
- Reverts: claim before execute, wrong amount (bad proof), wrong leafIndex,
  double claim, non-beneficiary.

## Out of scope
Box 4: delete redundant contracts (incl. L1Heartbeat) + full lifecycle test +
wire the registry into the deploy script.
