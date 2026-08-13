# Issue Fixes

## i1 — "gas limit too high" on Trigger Grace Period, error persists on navigation

### Root cause (three separate bugs, one symptom)

1. **No client-side eligibility check.** `execute/page.tsx` shows the "Trigger
   grace period" button for *any* will that isn't executed and isn't already
   in grace — it never checks whether the will's own `inactivityPeriod` has
   actually elapsed since `lastCheckIn`. The contract's `triggerGracePeriod`
   requires `block.timestamp > lastCheckIn + inactivityPeriod`; if it hasn't,
   the call reverts with `StillActive()`. In this report the check-in page
   confirms the will was still "Due soon... 4 hours, 41 minutes" — i.e. not
   yet eligible — so the button should never have been clickable.

2. **No pre-flight simulation before sending the transaction.**
   `registryService.triggerGracePeriod` (and every other write method) calls
   `walletClient.writeContract(...)` directly, with no `gas` and no prior
   `publicClient.simulateContract(...)`. When the underlying call is bound to
   revert, viem/the wallet still has to estimate gas before sending — and
   because the call reverts during estimation, something in that chain
   (MetaMask's own fallback behavior when `eth_estimateGas` fails) falls back
   to a huge, arbitrary gas value (21,000,000) instead of surfacing the
   revert. Infura's node then rejects the transaction outright for exceeding
   its per-tx gas cap (16,777,216) *before* it ever reaches the chain — so
   the user sees a confusing RPC infrastructure error instead of the actual,
   decodable reason (`StillActive`).

3. **Global error state isn't cleared on navigation.** `WalletContextType.error`
   is one shared piece of state across the whole app. Every write method sets
   it via `setError(...)` in its `catch` block, but nothing clears it when the
   user navigates to a different page — it only gets reset to `null` at the
   start of the *next* wallet write action. So the stale "gas limit too high"
   message from the execute page keeps showing on `/checkin` (which also
   reads `error` from the same context) until a full page refresh recreates
   the context from scratch — exactly what was observed.

### Fix

**A. `frontend/src/services/registryService.ts` — simulate before every write.**
Add a shared helper that calls `publicClient.simulateContract(...)` first and
passes its returned `request` straight into `walletClient.writeContract(request)`
— viem's standard simulate-then-write pattern. If the call would revert, this
throws a `ContractFunctionExecutionError` with the decoded custom error name
(e.g. `StillActive`) *before* a transaction is ever sent, so:
- The user gets a real, human-readable reason instead of an RPC-level gas error.
- No gas is spent and no bogus gas estimate ever reaches the RPC provider.
Apply this to every state-changing method: `checkIn`, `triggerGracePeriod`,
`veto`, `executeWill`, `claim`, `register`, `mockVerifySelf`. This is a
uniform, low-risk change (same call shape, just routed through simulate
first) and fixes the *class* of bug, not just this one instance.

**B. `frontend/src/app/execute/page.tsx` — client-side eligibility gate.**
Compute the same "is this will actually past its inactivity period" check the
checkin page already computes (`now() > lastCheckIn + inactivityPeriod`), and
use it to disable/hide the "Trigger grace period" button with a clear
"Not yet eligible — available in X" message when it isn't true yet. This is a
UX-level guard on top of fix A's contract-level guard — belt and suspenders,
and it means the user never even gets a chance to click a doomed action.

**C. `frontend/src/lib/WalletContext.tsx` — clear `error` on route change.**
Use `usePathname()` from `next/navigation` inside `WalletProvider` and clear
`error` in a `useEffect` keyed on the pathname. `WalletProvider` wraps the
whole app in `layout.tsx` and persists across navigations (Next's App Router
doesn't remount layouts), so this is the single, centralized place to fix it
for every page at once — no per-page changes needed.

---

## UI fix — will salt not visually prominent on the sealed-success screen

### Root cause

`register/page.tsx`'s Step 5 success screen puts the commitment in its own
bordered card with a show/hide toggle and a copy button — clearly the "keep
this safe" artifact. The will salt, which is *equally* required to execute
the will later, is buried as inline `<code>` text inside a small caption
paragraph below it. A user skimming the screen is very likely to notice the
commitment box and miss the salt entirely.

### Fix

Give the will salt its own bordered card, matching the commitment card's
visual treatment (label, mono text, copy button) — same component pattern,
so it reads as equally important, not a footnote. Keep the explanatory
caption below both cards, referencing them by name rather than re-embedding
the raw salt.

---

## Files touched

- `frontend/src/services/registryService.ts` — simulate-then-write helper,
  applied to all write methods.
- `frontend/src/app/execute/page.tsx` — eligibility gate for "Trigger grace period".
- `frontend/src/lib/WalletContext.tsx` — clear `error` on pathname change.
- `frontend/src/app/register/page.tsx` — will salt gets its own prominent card.
