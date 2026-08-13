# ZK-AfterLife — Pages, Flow, and End-to-End Testing Guide

This is a learning + testing guide for the actual, real V1 app: every page,
what it does, exactly which on-chain calls it makes, and step-by-step
instructions to test each feature yourself. Nothing here is mocked except
the two things called out explicitly in "What's real vs. mocked" below.

---

## 1. The core idea, in one paragraph

You seal a will: lock ETH (and optionally USDC) into a single smart
contract, `InheritanceRegistry`, along with a **commitment** (a Poseidon
hash of your beneficiaries and a secret salt — not the beneficiary data
itself). Nobody, including the contract, ever learns who your beneficiaries
are or what they get, until you (or anyone) executes the will later. As
long as you check in periodically, nothing happens. If you go quiet for
longer than the inactivity period *you* chose when sealing the will, anyone
can open a grace period. During grace, people you named as your trusted
circle can veto (cancel) it if you're just on vacation, not gone. If grace
ends with no veto, anyone can execute the will by supplying a real
zero-knowledge proof (generated in your browser) that proves the
beneficiary data hashes to the commitment you sealed — without revealing
that data on-chain. Beneficiaries then each individually claim their exact
share by proving Merkle-tree inclusion.

The privacy property that makes this interesting: **beneficiary identities
and amounts are never public**, before or after execution (claiming does
reveal your own claimed amount, since it's a real transfer — that's a
disclosed, deliberate trade-off, not a bug).

---

## 2. Architecture at a glance

- **Circuit** (`noir/will/src/main.nr`, Noir/UltraHonk ZK-SNARK): proves
  "these 4 will-data fields + this salt hash to this commitment, and these
  beneficiary allocations sum to these totals and hash into this Merkle
  root" — without revealing the beneficiary data itself.
- **Contract** (`contracts/src/InheritanceRegistry.sol`): the single
  on-chain contract. Holds every sealed will's state (owner, escrowed
  totals, commitment, Merkle root, timing, trusted circle) and the escrowed
  funds. Verifies the real ZK proof on execute, verifies real Merkle proofs
  on claim.
- **Frontend** (Next.js + viem): 7 pages, each a thin UI over one part of
  the contract's lifecycle. All writes go through `registryService.ts`,
  which now **simulates every write before sending it** (see §8) so a
  transaction that would revert never actually gets sent — you get a clear,
  decoded error instead of spending gas on something doomed to fail.

### What's real vs. mocked

Only two things are stand-ins, both because of what they'd otherwise
require, not because they're unfinished:

1. **Self Protocol identity verification is mocked on every testnet.** Self's
   real identity hub only exists on Celo/Celo Sepolia, and the contract
   checks verification with a plain same-chain call — so real Self-gating
   is physically impossible on Sepolia/Base Sepolia without cross-chain
   messaging (out of scope for this phase). The deployed `MockSelfVerifier`
   has a permissionless `setVerified` — the register page's **"Skip
   verification (testnet mock)"** button uses exactly that, openly labeled
   as a testnet bypass. On a real Self-enabled chain (Celo), the real QR
   flow would run instead.
2. **USDC is a `MockUSDC`** (a plain mintable ERC-20), not real Circle USDC.
   `MockUSDC.mint()` is public — if you want to test the USDC allocation
   path, you can mint yourself test USDC directly via Etherscan's "Write
   Contract" tab on the deployed `MockUSDC` address (see §9).

Everything else — the circuit, the Poseidon hashing, the UltraHonk proof
generation and verification, the escrow, the Merkle claim math, the
lifecycle state machine — is the real, production system.

---

## 3. Concepts you need before testing

| Term | What it actually is |
|---|---|
| **Commitment** | `Poseidon.hash_5(willData[0..3], salt)`. Your will's on-chain identity/key. Shown once, on the sealed-success screen. |
| **Will salt** | A random secret string generated when you start sealing. Combined with your description to make the commitment. **You must keep this** — there's no recovery. |
| **Merkle root** | A Poseidon hash tree over up to 8 beneficiary leaves (`Poseidon.hash_4(address, ethAmount, usdcAmount, 0)`), padded with zero-leaves. Proves your beneficiary set without revealing it. |
| **Inactivity period** | Seconds of no check-in before anyone can open a grace period. **You choose this per-will**, minimum 60 seconds (contract-enforced floor). |
| **Grace period** | Seconds after grace opens during which your trusted circle can veto. **You choose this per-will**, minimum 60 seconds. |
| **Trusted circle / veto members** | Up to 8 addresses **you name at sealing time**. Fixed forever once sealed — no update function, by design. |
| **Veto threshold** | How many of your trusted circle must veto to cancel a false-alarm grace period. |
| **Leaf index / siblings** | The beneficiary's position (0-7) in the Merkle tree and the 3 sibling hashes needed to recompute the root from their leaf — this is what a beneficiary needs from the owner to claim. |

---

## 4. Page-by-page

### `/app` — Dashboard

**What it does:** Landing page after connecting a wallet. Shows your own
most-recently-registered will's status (`None` / `Active` / `Grace` /
`Executed`), your ETH balance, and shortcut cards to the other 4 action
pages. Purely a read — no writes here.

**How to test:**
1. Open the app, click **Connect wallet**, approve in MetaMask.
2. Confirm your wallet address and ETH balance display correctly (compare
   against MetaMask's own balance display).
3. If you have no will yet, **Status** should read `None` and **Wills
   sealed** should read `0`.
4. After sealing a will (§ Register below), refresh this page and confirm
   **Status** flips to `Active`, **ETH sealed** shows the amount you locked.

---

### `/register` — Seal a will

**What it does:** A 6-step wizard (Verify → Details → Beneficiaries →
Trusted circle → Review → Sealed) that ends in one real on-chain
`register()` transaction. This is the only place a will is created.

**Step-by-step, what happens under the hood:**

| Step | What you do | What happens technically |
|---|---|---|
| 0. Verify | Real Self QR flow, or **"Skip verification (testnet mock)"** on testnets | Reads `SelfHumanVerifier.isFullyVerified(you)`. The mock button calls `MockSelfVerifier.setVerified(you, true)` directly — a real transaction. |
| 1. Details | Write a description | Purely local state — becomes one of the 4 "will data" fields hashed into your commitment. |
| 2. Beneficiaries | Name, address, ETH amount, USDC amount, up to 8 | Local state — becomes the leaves of your Merkle tree. |
| 3. Trusted circle | Inactivity period (days), grace period (days), up to 8 trusted addresses, veto threshold | Client-side validated against the contract's real floors (60s minimum each), max 8 members, valid distinct addresses, threshold in range. |
| 4. Review | Confirm everything | Nothing on-chain yet — just a summary. |
| 5. Sealed | — | The actual `register()` transaction: computes your Poseidon commitment and Merkle root **in your browser**, then calls `register(commitment, merkleRoot, totalEth, totalUsdc, 0, inactivityPeriod, gracePeriod, vetoMembers, vetoThreshold)`, sending exactly `totalEth` as `msg.value` (and pre-approving/pulling `totalUsdc` if any). |

**What you get at the end:** two prominent cards — your **commitment** and
your **will salt** — each with a show/hide toggle and a copy button.
**Write both down.** Combined with your description and beneficiary
details, this is everything you'll need to execute the will later. The
chain never stores any of it except the commitment and Merkle root.

**How to test:**
1. Connect a fresh (or already-verified) wallet, go to `/register`.
2. Step 0: click **Skip verification (testnet mock)** (on a testnet) —
   confirm it turns into "You're verified" after the transaction confirms.
3. Step 1: type any description, click **Next**.
4. Step 2: add 1-2 beneficiaries — use a **different address than your own**
   for at least one, so you can test claiming from a second account later.
   Give at least one of them a nonzero ETH amount. Click **Next**.
5. Step 3 — **for testing, use short periods**: `0.001` for both
   "Inactivity period (days)" and "Grace period (days)" (≈86 seconds each,
   comfortably above the 60s floor) so you don't have to wait hours/days.
   Add yourself as the sole trusted circle member, threshold `1`. Click
   **Next**.
6. Step 4: review the numbers, click **Seal will**. Confirm the transaction
   in MetaMask.
7. On the success screen: click the eye icon on **both** cards, confirm the
   commitment and will salt are both clearly visible (not buried). **Copy
   both somewhere safe** — you'll need them in the Execute test below.
8. Go to `/app` and confirm your new will shows up with the correct ETH
   amount.

---

### `/checkin` — Prove you're still here

**What it does:** Shows your most recent will's liveness status and a
"Check in" button. This is the heartbeat — call it periodically to reset
your inactivity clock and prevent (or cancel) a grace period.

**Under the hood:** reads `getMyWill(you)` (scans `WillRegistered` events,
picks the newest one you own), derives "time until grace-eligible" from
`lastCheckIn + inactivityPeriod` (your will's own values, not a global
setting). The button calls `checkIn(commitment)`.

**How to test:**
1. Right after sealing a will, go to `/checkin`. You should see a live
   countdown ("Next check-in due in X minutes") matching the inactivity
   period you chose.
2. Click **Check in**. Confirm the transaction. The countdown should reset
   to the full inactivity period.
3. **Cancel-grace test:** wait past your inactivity period (with the short
   test timers, ~90 seconds), go to `/execute` and trigger the grace period
   (see below) so the will shows "Grace period active" on `/checkin`. Then
   come back to `/checkin` and click **Check in** again — confirm the
   status flips back to "Active" and grace is cancelled (this exercises
   `checkIn`'s grace-cancellation path, not just the simple heartbeat).

---

### `/execute` — Distribute a sealed will

**What it does:** Browse every will on the contract (existence and status
are intentionally public; beneficiary data is not), trigger a grace period
once a will's owner has gone quiet long enough, and execute a will once
grace ends with no veto — generating a real ZK proof in your browser to do
so.

**Under the hood, three real actions on this page:**

1. **Trigger grace period** — only shown once the will's own
   `lastCheckIn + inactivityPeriod` has actually passed (client-side gate
   mirroring the contract's own check). Calls `triggerGracePeriod(commitment)`.
   If you click before that resolves as true, the simulate-first flow
   throws a clean `StillActive` error instead of a confusing gas error, but
   normally the button simply won't be there yet — you'll see **"Not yet
   eligible — available in X"** instead.
2. **Execute** (only shown once a will is in grace) — opens a modal asking
   for the exact **will salt, description, and every beneficiary's address
   + ETH + USDC** the owner sealed with. The app recomputes the commitment
   and Merkle root from what you type and checks it matches the selected
   will's on-chain values *before* attempting anything — a typo fails
   instantly with a clear message, not a wasted transaction. If it matches,
   it generates a real UltraHonk proof **in your browser** (this takes real
   time — tens of seconds) and calls `executeWill(commitment, proof)`. The
   contract verifies the proof; if it's invalid, or if grace hasn't actually
   elapsed yet, you get a clean decoded error (`InvalidProof`,
   `GraceNotElapsed`), not a raw RPC failure.
3. Stat tiles and filters (Total wills / In grace / Executed, "All wills" /
   "In grace") are pure reads for browsing.

**How to test (continuing from the Register test above):**
1. Go to `/execute`. Find your will's card (search by owner address or
   commitment). It should show **"Not yet eligible — available in ~86
   seconds"**.
2. Wait past that (with the short test timers, under 2 minutes), click
   **Refresh**. The card should now show a clickable **"Trigger grace
   period"** button.
3. Click it, confirm the transaction. Toast: "Grace period opened." The
   card now shows **Execute** instead.
4. **Negative test (recommended):** immediately click **Execute** and fill
   in the correct salt/description/beneficiaries, then **Generate proof &
   execute**. Since grace just started, this should fail with a clean
   `GraceNotElapsed` message after the proof generates — confirming errors
   are decoded, not raw RPC noise. Then wait past your grace period.
5. Once grace has actually elapsed, click **Execute** again, fill in the
   *exact* same salt, description, and every beneficiary's address/ETH/USDC
   you sealed with, click **Generate proof & execute**. Wait for the real
   proof to generate (watch the button's loading state — this can take a
   while). Confirm the transaction. Toast: "Will executed. Assets
   distributed." The card now shows status "Executed".
6. **Mismatch test (recommended):** on a *different*, still-unexecuted will,
   open Execute and deliberately type the wrong salt or a wrong beneficiary
   amount. Confirm you get an immediate, clear "doesn't match this will's
   commitment / Merkle root" error **before** any proof generation or
   transaction — this is the pre-flight check working.

---

### `/veto` — Stop a premature execution

**What it does:** Shows only the wills currently in grace **where you are
personally on that will's trusted circle** — not a global list. Lets you
cast a veto.

**Under the hood:** fetches all wills, filters to `graceStart !== 0`, then
calls `isVetoMemberOf(commitment, you)` per candidate and keeps only the
ones where that's true. The veto button calls `veto(commitment)`.

**How to test:**
1. Using the same account you named as your own trusted circle member: seal
   a new will, wait for grace to open (or use one already in grace from the
   Execute test above, if you added yourself as a veto member on it).
2. Go to `/veto`. You should see that will's card (assuming you're on its
   trusted circle) — and only that one, not other people's wills unless
   you're also on their committee.
3. Click **Veto execution**, type any reason (it's a personal note, not
   stored on-chain — the modal says so explicitly), click **Confirm veto**.
4. Confirm the transaction. Toast: "Veto cast. Grace period extended."
5. Go to `/checkin` for that will's owner account and confirm grace is now
   cancelled (since your threshold was 1) and the inactivity clock restarted.
6. **Access-control test:** connect a *different* account not on any will's
   trusted circle, go to `/veto` — confirm you see **no wills at all**, even
   if other wills are genuinely in grace right now (this is the per-will
   scoping — you can't browse committees you're not on).

---

### `/claims` — Claim your share

**What it does:** A manual claim-entry form — deliberately **not** a
browsable list. Beneficiary data is never public, so there's nothing to
browse; the will owner has to give each beneficiary their claim details
directly (commitment, their exact ETH/USDC share, their leaf index, and 3
sibling hashes) out of band, the same way they'd share any other secret.

**Under the hood:** calls `claim(commitment, ethAmount, usdcAmount,
leafIndex, siblings)`. The contract recomputes your leaf
(`Poseidon.hash_4(you, ethAmount, usdcAmount, 0)`) and walks it up the tree
using the siblings you provide; if it doesn't land on the will's stored
Merkle root, the claim reverts (`InvalidMerkleProof`). Each beneficiary can
only claim once (`AlreadyClaimed` guards double-claims).

**How to compute your leaf index and siblings (as the will owner, to hand
to a beneficiary):** for a single-beneficiary will, leaf index is `0` and
all three siblings are the zero hash `0x0000...0000` repeated 3 times, since
every other slot in the 8-leaf tree is empty. For multiple beneficiaries,
you need the actual Poseidon tree — this is exactly the math the
`InheritanceRegistry.t.sol` test file's `_buildTree()` helper does; for
manual testing, keep it to **one beneficiary per test will** to keep this
step trivial.

**How to test:**
1. Using the will you executed in the `/execute` test (single beneficiary,
   a different address than the owner): switch MetaMask to that
   beneficiary's account.
2. Go to `/claims`. Enter: the will's **commitment**, your exact **ETH
   share** and **USDC share** (must match exactly what was sealed for you),
   **leaf index `0`**, and all **three sibling fields as
   `0x0000000000000000000000000000000000000000000000000000000000000000`**
   (32 bytes of zero, i.e. `0x` + 64 zeros).
3. Click **Claim**, confirm the transaction. Toast: "Claim sent."
4. Check that account's ETH balance increased by roughly your share (minus
   its own gas cost).
5. **Double-claim test:** submit the exact same claim again — confirm it
   fails cleanly with `AlreadyClaimed`, not a silent success.
6. **Wrong-amount test:** try claiming with a slightly wrong ETH amount —
   confirm it fails with `InvalidMerkleProof` (the leaf hash won't match).

---

### `/withdraw` — Honest dead end (by design)

**What it does:** Nothing. It's a static explainer page — there is no
`withdraw` function on `InheritanceRegistry` and there never will be. Once
you seal a will, you cannot unilaterally unseal it. This is a deliberate
trust property (explained on the page itself), not a missing feature.

**How to test:** just read it — confirm it correctly explains why, and that
its buttons link to `/execute`, `/claims`, and `/checkin` rather than
pretending a withdraw exists.

---

## 5. Full end-to-end test script (single session, ~10 minutes)

Using the short test timers throughout (0.001 days ≈ 86s for both periods):

1. **Account A** (owner): connect, `/register` → skip-verify → seal a will
   with **Account B** as the sole beneficiary (some ETH), **Account A**
   itself as the sole trusted-circle member, threshold 1. Save the
   commitment + salt.
2. Wait ~90s. `/checkin` as Account A — confirm the countdown hit zero /
   grace-eligible.
3. `/execute` as Account A — trigger grace period. Confirm toast.
4. Immediately try Execute (should cleanly fail — grace not elapsed).
5. Wait ~90s more (past the grace period). `/execute` again — Execute for
   real with the correct salt/description/beneficiary, generate the proof,
   confirm the transaction succeeds.
6. Switch to **Account B**. `/claims` — enter the commitment, B's exact
   share, leaf index 0, three zero-siblings. Claim. Confirm B's balance rose.
7. Try claiming again as B — confirm `AlreadyClaimed`.
8. Switch back to Account A, `/app` — confirm the will shows status
   "Executed".

If every step above behaves as described, the whole real lifecycle —
identity gate, ZK commitment, liveness heartbeat, grace/veto safety net,
real UltraHonk proof, real Merkle claim, real fund transfer — is working
end to end.

---

## 6. Things that are correct behavior, not bugs

- **"No wills in recent blocks"** right after a fresh deploy, or on a
  network whose `NEXT_PUBLIC_*_DEPLOY_BLOCK` isn't set correctly — the app
  scans `WillRegistered` events starting from that block; if it's wrong
  (too high), older/other wills won't show up. Not a contract bug.
- **Veto page shows nothing for you** even though wills are in grace — you
  simply aren't on their trusted circle. This is intentional privacy/access
  scoping, not a broken filter.
- **Claims page has no list to browse** — by design (see §4 above).
- **"Not yet eligible" persists even past your expected time by a few
  seconds** — real transaction/block latency; the client-side check and the
  contract's own on-chain check can disagree by a handful of seconds around
  the exact boundary. Wait a little longer.
- **The Self verification flow only ever shows the testnet mock button on
  Sepolia/Base Sepolia/zkSync Sepolia** — expected; see §2.

## 7. Real bugs already found and fixed this round (for reference)

See `Issues.md` (the report) and `IssueFix.md` (the root-cause writeup) at
the repo root. Summary: triggering an ineligible action used to surface a
confusing "gas limit too high" RPC error instead of the real reason, and
that error used to persist across page navigation until a hard refresh.
Both are fixed — actions now simulate before sending (clean decoded errors,
no wasted gas) and the error banner clears automatically on navigation.

## 8. Where to look in code if something seems off

| Symptom | Look here |
|---|---|
| Wrong/zero contract address | `frontend/.env.local` and `frontend/src/config/contracts.ts` |
| A write fails with a raw RPC message instead of a clean error | `frontend/src/services/registryService.ts` (`simulateThenWrite`) |
| Wrong eligibility timing shown | `frontend/src/app/execute/page.tsx` / `checkin/page.tsx` (both read `will.will.inactivityPeriod`/`gracePeriod` per-will, not a global) |
| Contract lifecycle rules | `contracts/src/InheritanceRegistry.sol` (`register`, `checkIn`, `triggerGracePeriod`, `veto`, `executeWill`, `claim`) |
| Circuit rules | `noir/will/src/main.nr` |

## 9. Minting yourself test USDC (optional, for testing the USDC path)

1. Find the deployed `MockUSDC` address for your network (see `.env.local`
   or the deployment records in `contracts/broadcast/DeployTestnet.s.sol/`).
2. Open it on Etherscan/Basescan → **Contract** → **Write Contract** →
   connect your wallet → `mint(address to, uint256 amount)` — `to` = your
   address, `amount` = e.g. `1000000000` for 1,000 USDC (6 decimals).
3. Submit. You now have test USDC to allocate in `/register`'s Beneficiaries
   step.
