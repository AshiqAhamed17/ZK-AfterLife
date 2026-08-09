# InheritanceRegistry — Design Spec

> Phase 1c of `newplan.md`. Covers boxes 1–2 (register + execute). Box 3 (claim)
> and box 4 (collapse/delete redundant contracts) are scoped but not implemented
> here. Written 2026-08-09.

## Purpose

`InheritanceRegistry.sol` is the single execution contract for the ZK-AfterLife
protocol. It holds ETH + one ERC20, tracks each will's full lifecycle
(register → check-in → grace → veto → execute), and gates execution on a real
Noir/UltraHonk proof verified on-chain. It replaces `WillExecutor` and absorbs
the liveness state machine of `L1Heartbeat` (which becomes redundant and is
deleted in box 4).

## Decisions (locked with the user)

1. **Per-will lifecycle owned by the registry.** Each will stores its own
   owner / lastCheckIn / graceStart / vetoCount. `L1Heartbeat` (single-owner,
   global) cannot track multiple wills, so its state machine is absorbed here.
   This amends the plan's "keep L1Heartbeat" → "delete L1Heartbeat" in box 4.
2. **Global veto committee**, set once at construction (members + threshold),
   applied to all wills. Per-will committees are a later addition.
3. **NFTs rejected in V1.** `register` requires `total_nft_count == 0`. V1 is
   ETH + one ERC20; NFT support is the additive 1.5 follow-up. No beneficiary
   ends up with an unclaimable NFT share.

## Interfaces consumed

- `WillVerifier.verifyWillProof(bytes proof, uint256 willCommitment, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint256 totalNftCount) view returns (bool)`
  — the real adapter over the bb-generated `HonkVerifier` (Phase 1b).
- `ISelfHumanVerifier.isFullyVerified(address) view returns (bool)` — humanity + 18+ gate.
- `IERC20` (OpenZeppelin `SafeERC20`) — the mock-USDC token.

## Constructor (all immutable)

`willVerifier`, `selfVerifier`, `usdc` (ERC20), `inactivityPeriod`,
`gracePeriod`, `vetoMembers[]`, `vetoThreshold`. Timing is constructor-set so
demo (e.g. 30s/15s) vs prod (365d/30d) is a deploy-time choice, not hardcoded.
Validates: non-zero periods, non-empty veto set, `0 < threshold <= members`,
no zero/duplicate members.

## Per-will state

Keyed by `bytes32 willCommitment`:

```
struct Will {
    address owner;
    uint256 merkleRoot;
    uint256 totalEth;
    uint256 totalUsdc;
    uint64  registeredAt;
    uint64  lastCheckIn;
    uint64  graceStart;   // 0 = no active grace
    uint32  graceEpoch;   // bumped whenever grace resets; scopes veto rounds
    uint32  vetoCount;    // vetoes in the current epoch
    bool    executed;
    bool    exists;
}
mapping(bytes32 => Will) public wills;
mapping(bytes32 => mapping(uint32 => mapping(address => bool))) public hasVetoed;
```

`willCommitment` and `merkleRoot` are BN254 field elements (< field modulus),
stored as-is; `willCommitment` is passed to the verifier as `uint256`.

## Behaviour

### register (box 1) — `payable`, Self-gated
1. `require(selfVerifier.isFullyVerified(msg.sender))`.
2. Reject: existing commitment, `merkleRoot == 0`, `totalNftCount != 0`,
   `totalEth + totalUsdc == 0` (zero will).
3. **Deposit == declared totals:** `require(msg.value == totalEth)`;
   `usdc.safeTransferFrom(msg.sender, address(this), totalUsdc)`.
4. Store the will (`owner = msg.sender`, `lastCheckIn = now`, `exists = true`).
   Emit `WillRegistered(commitment, owner, totalEth, totalUsdc)`.

### Lifecycle (the grace gate for box 2)
- `checkIn(commitment)` — owner only, not executed. Sets `lastCheckIn = now`,
  cancels any grace (`graceStart = 0`, `graceEpoch++`). Emits `CheckIn`.
- `triggerGracePeriod(commitment)` — anyone, if `now > lastCheckIn + inactivityPeriod`
  and no grace active and not executed. Sets `graceStart = now`. Emits `GraceStarted`.
- `veto(commitment)` — veto member only, during `[graceStart, graceStart+gracePeriod]`,
  once per epoch. On reaching `vetoThreshold`: cancel grace, `lastCheckIn = now`,
  `graceEpoch++`, `vetoCount = 0` ("false alarm, owner is fine"). Emits `Vetoed`.
- `executeWill(commitment, bytes proof)` — **permissionless**; requires exists,
  not executed, `graceStart != 0 && now > graceStart + gracePeriod`,
  `vetoCount < vetoThreshold`. Calls
  `willVerifier.verifyWillProof(proof, uint256(commitment), merkleRoot, totalEth, totalUsdc, 0)`;
  reverts on false. Sets `executed = true`. Emits `WillExecuted`. **No funds move
  here** — distribution is `claim` (box 3).

## Out of scope (later boxes)
- `claim(commitment, leaf, merkleProof)` → per-beneficiary Merkle-inclusion →
  real ETH/ERC20 transfer (box 3). The stored `merkleRoot` + held balances
  already support it.
- Deleting `WillExecutor`/`WillVerifier`-stub-era contracts + `L1Heartbeat`
  + `NoirIntegration`/`AztecExecutor`/`L1AztecBridge` (box 4).

## Testing

Foundry, with `MockUSDC` (mintable ERC20) and `MockSelfVerifier` (toggle
`isFullyVerified`). Reuses the real proof fixture from Phase 1b.

- **register:** happy path (state + balances); reverts — not verified,
  wrong ETH value, `nft != 0`, duplicate, zero will, ERC20 not approved.
- **execute:** verifies after grace with the real proof; reverts — before grace,
  during grace (too early), when vetoed to threshold, bad/tampered proof,
  already executed.
- **lifecycle:** checkIn cancels grace; veto below threshold accumulates; veto
  at threshold resets to active.

## Security notes
- Checks-effects-interactions in `register` (state before/around the single
  `safeTransferFrom`); no external calls in `executeWill`, so no reentrancy
  surface until `claim` (which will be `nonReentrant`).
- `executeWill` is permissionless by design — anyone may execute once the
  grace/veto conditions and the proof hold; the proof + stored public inputs are
  the authority, not the caller.
