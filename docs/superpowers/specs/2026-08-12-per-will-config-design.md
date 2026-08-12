# Per-Will Configuration (Timing + Veto Committee) — Design

## Goal

Today, `InheritanceRegistry`'s `inactivityPeriod`, `gracePeriod`, `vetoThreshold`,
and veto committee membership are all set **once, at contract deployment**, as
constructor immutables shared by every will ever registered against that
instance. This redesign moves all four onto each individual will, chosen by
its owner at `register()` time: how long they can go inactive, how long the
grace/veto window is, and who their own trusted circle is.

This blocks the Phase 1e Sepolia/Base Sepolia deploys — those are paused
until this lands, so we deploy the per-will version once instead of deploying
twice.

The circuit (`noir/will/src/main.nr`) is untouched. Timing and veto are pure
Solidity lifecycle logic, never proven in ZK.

## Storage: extend `Will`, don't add a second struct

`Will` gains four new fields directly:

```solidity
struct Will {
    address owner;
    uint256 merkleRoot;
    uint256 totalEth;
    uint256 totalUsdc;
    uint64 registeredAt;
    uint64 lastCheckIn;
    uint64 graceStart;
    uint32 graceEpoch;
    uint32 vetoCount;
    bool executed;
    bool exists;
    // New:
    uint64 inactivityPeriod;
    uint64 gracePeriod;
    uint8 vetoThreshold;
    address[] vetoMembers;
}
```

One struct, one storage read (`getWill()`) gives the frontend everything —
state and configuration together — instead of juggling a second
`WillConfig` mapping kept in sync with the first.

`veto()`'s membership check becomes a linear scan of `w.vetoMembers` (capped
at 8 — see below — so this is a few comparisons, not a real cost) instead of
a lookup into a global `isVetoMember` mapping. No separate per-will
membership mapping is needed.

**Gotcha:** Solidity's auto-generated getter for a `public` mapping silently
*drops* array-typed struct members from its return tuple. `wills` is
currently `public`; it becomes `private`, and the existing hand-written
`getWill(bytes32) external view returns (Will memory)` remains the only way
to read a will. The frontend already calls `getWill()` exclusively (never
the auto-getter `wills(...)`), so this is a no-op for callers.

## Constructor shrinks

```solidity
constructor(
    address _willVerifier,
    address _selfVerifier,
    address _usdc,
    address _poseidonT3,
    address _poseidonT5
)
```

`_inactivityPeriod`, `_gracePeriod`, `_vetoMemberList`, `_vetoThreshold` are
gone — there is no longer a global concept for any of them. Two new
`constant`s replace them as safety rails, not deploy-time parameters:

```solidity
uint256 public constant MIN_INACTIVITY_PERIOD = 60; // seconds
uint256 public constant MIN_GRACE_PERIOD = 60;       // seconds
uint256 public constant MAX_VETO_MEMBERS = 8;
```

60 seconds is a footgun guard, not a realistic default — real users will
choose months/years. It's low enough that local E2E tests and live demos
stay reasonably fast. There is deliberately no *maximum* on either period; a
very long period is just a patient will, not a security issue.

## `register()` signature and validation

```solidity
function register(
    bytes32 willCommitment,
    uint256 merkleRoot,
    uint256 totalEth,
    uint256 totalUsdc,
    uint256 totalNftCount,
    uint256 inactivityPeriod,
    uint256 gracePeriod,
    address[] calldata vetoMembers,
    uint256 vetoThreshold
) external payable
```

New validation, alongside every existing `register()` check (Self-verified,
not already registered, non-zero merkle root, no NFTs, ETH deposit matches,
non-empty will):

- `inactivityPeriod >= MIN_INACTIVITY_PERIOD`
- `gracePeriod >= MIN_GRACE_PERIOD`
- `vetoMembers.length >= 1 && vetoMembers.length <= MAX_VETO_MEMBERS`
- no zero-address entries, no duplicate entries in `vetoMembers` (same
  loop-based check the constructor does today, moved into `register()`)
- `vetoThreshold >= 1 && vetoThreshold <= vetoMembers.length`

New errors: `InactivityPeriodTooShort`, `GracePeriodTooShort`,
`TooManyVetoMembers` (join the existing `NoVetoMembers`,
`InvalidVetoThreshold`, `ZeroAddressVeto`, `DuplicateVetoMember`, which move
from constructor-time to register()-time but keep their meaning).

## Lifecycle functions: read from the will, not an immutable

`checkIn`, `triggerGracePeriod`, `executeWill` change from reading the
removed global immutables to reading `w.inactivityPeriod` / `w.gracePeriod`
off the will they're operating on. One-line-per-site changes; no logic
changes.

`veto()` changes its membership check from `isVetoMember[msg.sender]`
(global mapping, removed) to scanning `w.vetoMembers` for `msg.sender`. The
existing `hasVetoed[commitment][graceEpoch][member]` mapping is unchanged —
it already tracks per-will, per-epoch, per-member state and doesn't care
whether membership itself is global or per-will.

## Read surface changes

Removed: `getVetoMembers()` (global list) and `isVetoMember(address)`
(global check) — both were global-committee concepts that no longer exist.

Added: `isVetoMemberOf(bytes32 commitment, address who) view returns (bool)`
— a cheap per-will convenience check, so the frontend doesn't need to fetch
the whole will just to answer "can this address veto this will."

`getWill()` is unchanged in interface, just returns a larger struct.

## Frontend impact

- **`config/abi/inheritanceRegistry.ts`**: update `register`'s signature and
  `Will`'s return shape; remove `getVetoMembers`/`isVetoMember`; add
  `isVetoMemberOf`.
- **`registryService.ts`**: `register()` gains 4 params
  (`inactivityPeriod`, `gracePeriod`, `vetoMembers`, `vetoThreshold`);
  `WillRecord` gains the same 4 fields; `getGraceConfig()` is removed
  (it was only ever a global-config read — there's nothing global left to
  read); `getVetoMembers()`/`isVetoMember()` removed, `isVetoMemberOf()`
  added.
- **`WalletContext.tsx`**: thread the new `register()` params through; drop
  `getGraceConfig`/`getVetoMembers`/`isVetoMember`; add `isVetoMemberOf`.
- **`register/page.tsx`**: new wizard step — inactivity period, grace
  period (human-friendly duration inputs, e.g. "days", converted to
  seconds before the call), and a trusted-circle input (address list +
  threshold), following the same list-editor pattern the beneficiary step
  already uses.
- **`checkin/page.tsx`**: replaces its `getGraceConfig()` call with
  `myWill.will.inactivityPeriod` — it already loads `myWill`, so this is a
  simplification, not an addition.
- **`execute/page.tsx`**: `isGraceElapsed` stops being an approximation — it
  can now compute the real elapsed check client-side using
  `will.will.gracePeriod`, matching what the contract itself enforces.
- **`veto/page.tsx`**: **behavior change, not just a refactor.** Today, any
  global veto member sees and can veto *every* will in grace. After this
  change, a will is only visible-to-veto by *its own* committee — the page
  filters "wills I can veto" down to wills where `isVetoMemberOf(commitment,
  account)` is true, not a global membership flag.

## Deploy scripts

`Deploy.s.sol`, `DeployTestnet.s.sol`, `DeployLocalE2E.s.sol` all drop
`INACTIVITY_PERIOD`/`GRACE_PERIOD`/`VETO_THRESHOLD`/`VETO_MEMBER_2` env vars
— the constructor call shrinks to the 5 remaining addresses. Nothing else
about these scripts changes (MockUSDC/MockSelfVerifier deployment, Poseidon
deployment, address logging all stay as-is).

## Testing impact

The 33 tests in `contracts/test/InheritanceRegistry.t.sol` need real rework,
not just a signature patch:

- `setUp()` stops constructing `InheritanceRegistry` with global
  inactivity/grace/veto args (constructor shrinks to 5 args).
- `_register()` / `_registerFixtureWill()` / the reentrancy test's inline
  registry all move their inactivity/grace/veto values from constructor
  args to `register()` call args.
- New tests: `register()` rejects sub-minimum inactivity/grace periods, an
  oversized veto committee, zero/duplicate veto members, and an
  out-of-range threshold — mirroring what the constructor's tests check
  today, since those exact checks moved.
- Existing lifecycle tests (`test_FullLifecycle`, `test_VetoAtThreshold...`,
  etc.) keep their assertions, just source timing/veto from the registered
  will's own config instead of a shared constant.

## E2E harness impact

`frontend/e2e/anvil-e2e.js` passes `inactivityPeriod`/`gracePeriod`/
`vetoMembers`/`vetoThreshold` as part of its register step now, instead of
relying on `DeployLocalE2E.s.sol`'s env-configured globals. Direct
consequence of the 60-second minimums: the harness's real-time wait grows
from ~35 seconds (20s + 15s demo timers) to **at least ~120 seconds** (60s +
60s, the new floor) — accepted as part of choosing that floor, not a new
problem to solve here.

## Out of scope

- Editing a will's veto committee or timing after registration (fixed at
  registration — see brainstorming discussion; simpler mental model, no new
  attack surface for an owner being tricked into changing their committee
  mid-grace-period).
- A maximum bound on inactivity/grace periods (only a minimum).
- Any change to the `WillRegistered` event (still just
  commitment/owner/totalEth/totalUsdc — config is read via `getWill()`,
  not worth duplicating into the event).
- Any circuit change (`main.nr` doesn't reference timing or veto at all).
