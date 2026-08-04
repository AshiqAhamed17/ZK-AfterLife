# ZK-AfterLife — Project Context

> Working context document. Written 2026-08-04 after a full code walkthrough.
> Purpose: give anyone (including future-me) an accurate mental model of what this
> project **is**, what **actually works** vs. what is **stubbed**, and where to
> resume. Distinguishes real code from doc/marketing claims — the other `.md`
> files in this repo overstate completeness ("production-ready", "all requirements
> met"); this file is the ground truth.

---

## 1. What this project is

**ZK-AfterLife** is a privacy-preserving digital-inheritance ("crypto will") protocol.
A user commits to a will during their lifetime; if they go inactive for a defined
period, the will can be executed and assets distributed to beneficiaries — all
enforced by zero-knowledge proofs so that will contents, beneficiaries, and
allocations stay private.

Built for **ETHGlobal New Delhi 2025** (did not win a track). It targets several
partner integrations:
- **Noir / UltraHonk** ZK circuit for will validity (the core ZK story).
- **Self Protocol** for proof-of-humanity + age (18+) gating of registration.
- **ZK-PDF** (privacy-ethereum/zkpdf) for uploading a signed PDF will and proving
  its contents/authenticity — aspirational, mostly mocked.
- **Aztec Network** as the intended private L2 execution layer — design only, not
  implemented (the "AztecExecutor" is a plain EVM contract).

**Honest status: hackathon prototype.** The architecture is coherent and the
happy-path Ethereum flow (register → heartbeat → veto → withdraw) genuinely sends
transactions, but every *trust-critical* ZK component is a placeholder that
returns `true`/constants. Not audited, not secure, not production-ready.

---

## 2. Repository layout

```
ZK-AfterLife/
├── contracts/        Foundry (Solidity) — on-chain layer
├── noir/will/        Noir circuit — the real ZK proof of will validity
├── backend/          Rust axum server — PDF hashing/extraction (ZK parts mocked)
├── frontend/         Next.js 14 app (App Router) — the actual UI/product
├── lib/              openzeppelin-contracts (submodule)
└── *.md              Many status/marketing docs (over-optimistic — see note above)
```

Key doc files: `README.md` (best high-level overview), `zk-afterLife.md`
(narrative explainer), `zkpdf.md` (ZK-PDF integration idea), `SELF_*.md`
(Self Protocol status — note: claims "production-ready" but verification is faked).

---

## 3. Architecture & data flow

Two **parallel, not-fully-connected** execution paths exist on-chain:

**Path A (main, user-facing):** `WillExecutor` — holds ETH, gated by
`SelfHumanVerifier`, verifies will proof via `WillVerifier`.

**Path B (redundant):** `L1Heartbeat` → (event) → `L1AztecBridge` → `AztecExecutor`
← `NoirIntegration`. Represents the intended L1→L2 cross-chain execution.

These two paths are essentially redundant and **not wired to each other** — a
known design smell to resolve.

Intended end-to-end flow:
1. User verifies humanity/age via **Self Protocol** (QR / deep link).
2. User defines will (manual entry **or** PDF upload) → beneficiaries + allocations.
3. Frontend computes **Poseidon commitment** + **Merkle root** of beneficiaries.
4. `registerWill` on-chain with ETH deposited = total allocation.
5. User periodically calls `checkIn()` (heartbeat).
6. On inactivity → `triggerGracePeriod()` → veto window (multisig can cancel).
7. After grace, a **Noir/UltraHonk proof** of will validity is generated and
   submitted → assets distributed to beneficiaries.

---

## 4. Subsystem detail + WHAT ACTUALLY WORKS

### 4.1 Noir circuit — `noir/will/src/main.nr`  ✅ MOST COMPLETE ZK PIECE
- Real, **compiled** circuit (`target/will.json`, also copied to
  `frontend/public/circuits/will_circuit.json`). `MAX_BENEFICIARIES = 8`.
- **Public inputs (5):** `will_commitment`, `merkle_root`, `total_eth`,
  `total_usdc`, `total_nft_count`. Matches the contract's `uint256[5]` interface.
- **Private inputs:** salt, `will_data[4]`, `beneficiary_count`, and four
  `[Field;8]` arrays (addresses, eth, usdc, nfts).
- **Proves:** (1) bounds `1..=8`; (2) commitment = `Poseidon::hash_5(will_data, salt)`;
  (3) per-beneficiary leaf = `Poseidon::hash_4(...)`, active slots have addr≠0;
  (4) allocation sums equal declared public totals & total ≠ 0; (5) a fixed
  3-layer Poseidon binary Merkle root == `merkle_root`.
- ⚠️ **No age check** in the circuit (despite docs). `trees` dep declared but
  unused (tree built manually). Debug `std::println` still present.

### 4.2 Contracts — `contracts/src/` (Foundry, no tests)
| Contract | State | Notes |
|---|---|---|
| `L1Heartbeat.sol` | ✅ Real | Full grace/veto dead-man's-switch state machine. Soundest contract. Does not hold funds. |
| `SelfHumanVerifier.sol` | ✅ Real | Genuine Self Protocol V2 SDK integration (`SelfVerificationRoot`). Live on Celo Sepolia. Sets `verifiedHumans`, age≥18, nationality. |
| `WillExecutor.sol` | ⚠️ Partial | Holds ETH, `registerWill` works & gated by `onlyVerifiedHumans`. **BUT `_executeWillInternal` transfers NOTHING to beneficiaries (TODO L283-287).** `executeWillWithHeartbeat` does no heartbeat check. `withdrawEth`/`withdrawAllEth` duplicated. |
| `WillVerifier.sol` | ❌ Stub | Nominally Noir/UltraHonk (full `Proof` struct defined) but `_simplifiedVerification` just returns `true` on non-zero checks (TODO L115). No pairing, no VK. |
| `NoirIntegration.sol` | ❌ Stub | `verifyNoirProof` is `pure`, returns `true`. Forwards to AztecExecutor. |
| `AztecExecutor.sol` | ⚠️ Partial | Plain EVM (not Aztec). Distributes only ETH, ignores USDC/NFT. Proof check commented out. Inverted error in `registerWill` (L138). |
| `L1AztecBridge.sol` | ❌ Event-only | Never actually calls `AztecExecutor.enableExecution` — cross-chain msg is a TODO (L124-127). |

- **No on-chain ZK verification exists anywhere.** All three "verifiers" return
  true. No SP1/Groth16/bb-generated verifier contract in the repo.
- **No automated tests** — no `test/` dir; the `script/*.sol` "verify" files are
  print-only hackathon-checklist scripts. Deploy uses **demo timing** (inactivity
  30s, grace 15s) not the real 365d/30d.

### 4.3 Rust backend — `backend/` (axum, port 3002)  ⚠️ ZK PARTS MOCKED
- Real: axum server, SHA-256 PDF hashing, real text extraction via `pdf-extract`.
- **Mocked:** `parse_beneficiaries_from_text` is hardcoded to Alice/Bob demo data;
  `verify_pdf_signature` always returns `(true,true)`; `generate_mock_zk_proof`
  returns constant `"0x1234...cdef"`. **No SP1, no zkpdf-lib linked** — the SP1
  prover at `localhost:3001` is referenced but never contacted.

### 4.4 Frontend — `frontend/` (Next.js 14, App Router)  ← THE ACTUAL PRODUCT
- Stack: Next 14.2.5, React 18, TS, Tailwind v4, **viem** (primary; ethers only in
  dead code — no wagmi), `@noir-lang/noir_js` + `@aztec/bb.js` (UltraHonk),
  `@selfxyz/core`, `circomlibjs` (Poseidon). Wallet is a hand-rolled
  `window.ethereum` context (`lib/WalletContext.tsx`, real, ~535 lines).
- **Pages** (`src/app/`): `register/` (1189-line 5-step wizard — main flow),
  `checkin/`, `execute/`, `veto/`, `claims/`, `withdraw/`, dashboard `app/`,
  landing. `privacy/` + `terms/` are placeholders.
- **Real / wired:** wallet connect, `registerWill` tx (real ETH value), checkIn,
  veto, withdraw (`services/blockchain.ts`, 1682 lines — the workhorse); Poseidon
  commitment + Merkle root (`noirService.ts` + `lib/poseidon.ts`); **real
  UltraHonk proof generation** against the compiled circuit — *when the circuit
  backend loads*; Self QR/deep-link generation via real `@selfxyz/core`.
- **Stubbed / faked:**
  - **Self identity result is FAKED** — `SelfProtocolService.waitForVerification`
    always resolves `success:true` after a `setTimeout`; no on-chain check.
    `checkVerificationStatus` always false.
  - **On-chain proof verification disabled** — `onChainVerifier.verifyProofOnChain`
    returns `true` (real `readContract` commented out); dummy proof struct.
  - `noirService` silently **falls back to mock proof `'0x'`** if circuit fails;
    its `verifyProof` is always-true.
  - PDF proving needs the `localhost:3002` backend (not deployable as-is);
    in-repo `generateWillProofFromBeneficiaries` returns random hex.

---

## 5. Deployments (testnet)

**Ethereum Sepolia (chainId 11155111)** — will/heartbeat contracts:
- `L1Heartbeat`    `0x7Fa088F570dfB4878F72D666eaBB5e3f629f64Af`
- `WillExecutor`   `0x98545459892861c3d757d351CF2722947CC15cda`
- `WillVerifier`   `0x0Ddcac19C955abBa465AC748c287fd4CFf6CB88d`
- `AztecExecutor`  `0x629A83dD1aB7323759f7a26f0Dc18Df7814E625f`
- `L1AztecBridge`  `0xE4Ee7a0ed33c9e024e0bE9E061901e0C6ca95107`
- `NoirIntegration``0x5CBa8f717a4eAfA0d933bB6A4d79e8d846A7B7a1`
- ⚠️ WillExecutor deployed with `selfVerifier = address(0)` → **the Self gate is
  NOT wired on Sepolia** (`onlyVerifiedHumans` would misbehave).

**Celo Sepolia (chainId 11142220)** — Self only:
- `SelfHumanVerifier` latest `0x547C2767422c2fCFE2043a79DB43B4738918370F`
  (older stale: `0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B` — still referenced by
  several scripts and `config/self.ts`; **address inconsistency to fix**).
- Self hub: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`.

⚠️ **Cross-chain split:** will contracts on Sepolia, Self on Celo Sepolia — and
`SelfProtocolService.ts` hardcodes a *third* chainId (44787, Celo Alfajores).
Frontend `config/contracts.ts` hardcodes all addresses (not read from env) and
has **committed Alchemy/Infura RPC keys** (should be rotated + moved to env).

---

## 6. Known bugs & gaps (prioritized backlog to resume)

**Load-bearing (product doesn't truly work end-to-end):**
1. On-chain ZK verification is fake everywhere → replace `WillVerifier` /
   `NoirIntegration` stubs with a real bb-generated UltraHonk verifier contract
   (`bb write_vk` + `bb contract`), wire circuit's 5 public inputs.
2. `WillExecutor._executeWillInternal` transfers nothing to beneficiaries →
   implement actual ETH (and USDC/NFT) distribution.
3. Self verification result is faked in frontend + WillExecutor on Sepolia has
   `selfVerifier=address(0)` → do a real on-chain verification read; redeploy
   WillExecutor with the real Self verifier (and resolve the cross-chain split —
   Self is on Celo, will is on Sepolia).

**Functional bugs:**
4. **Commitment mismatch:** `register/page.tsx` builds `willCommitment = "0x"+salt+Date.now()`
   while `noirService`/circuit use a Poseidon commitment → registration/withdraw
   by commitment won't match. Unify on the Poseidon commitment.
5. `AztecExecutor.registerWill` inverted error (L138); `L1AztecBridge` never calls
   `enableExecution`; `executeWillWithHeartbeat` skips the heartbeat check.
6. Stale Self verifier address across scripts/`config/self.ts` vs latest deploy.

**Hygiene:**
7. No tests anywhere (contracts, frontend). Add Foundry `.t.sol` + basic e2e.
8. Committed RPC keys → rotate, move to env. `env.example` exists but
   `config/contracts.ts` ignores it.
9. Dead code to prune: `components/SelfVerification.tsx`, `WillRegistration.tsx`,
   `services/SelfService.ts`, `NoirIntegrationService.ts`, `lib/aztec.ts`,
   `lib/noir.ts` (all unimported).
10. Deploy timing is demo-scale (30s/15s) — parameterize for real vs demo.
11. Circuit: remove debug `println`, add the advertised age check if desired,
    drop unused `trees` dep.

---

## 7. How to run (dev)

- **Frontend:** `cd frontend && npm install && npm run dev`. Targets Sepolia by
  default; needs a wallet (MetaMask) on Sepolia. Addresses are hardcoded so it
  runs without `.env.local`, but PDF features need the backend.
- **Backend (PDF):** `cd backend && cargo run` → serves `localhost:3002`. Only
  needed for PDF upload path (which is mostly mocked anyway).
- **Circuit:** `cd noir/will && nargo compile` (Nargo/Noir). Compiled artifact must
  be copied to `frontend/public/circuits/will_circuit.json`.
- **Contracts:** Foundry — `cd contracts && forge build`. Deploy via
  `script/Deploy.s.sol` (Sepolia) and `script/DeploySelfHumanVerifier.s.sol` (Celo).

---

## 8. Suggested resumption order (my recommendation)

Pick a coherent, demoable slice rather than fixing everything:

**Option A — "Make the core ZK will actually verify on-chain" (highest value):**
Real UltraHonk verifier contract → real proof verification in WillExecutor →
real ETH distribution to beneficiaries → fix the commitment mismatch. This turns
the headline feature from mock to real.

**Option B — "Make Self gating real"**: same-chain deployment, real on-chain
verification read, remove the faked `waitForVerification`.

**Option C — polish/demo**: prune dead code, fix addresses/keys, add tests, unify
timing — lower risk, good before any resubmission.

Recommend **A first** (it's the project's whole thesis), then B, then C.
