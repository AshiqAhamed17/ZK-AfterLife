# ZK-AfterLife — Rebuild Plan to V1

> **Goal:** turn this ETHGlobal-New-Delhi hackathon prototype into a genuine
> flagship portfolio project — a fully real, verifiable, tested privacy-preserving
> crypto-inheritance protocol — strong enough to help land a ZK/protocol
> engineering role at **Aztec, zkSync, Polygon**, or similar.
>
> Written 2026-08-04. Read `context.md` first for the current ground-truth state.

---

## 0. North Star

**One thing that genuinely works beats five things that half-work.** Employers in
this space can spot a mocked demo in seconds. Every trust-critical component in V1
must be *real*: real ZK proofs, real on-chain verification, real asset transfers,
real tests. The current repo's biggest liability is that its headline feature (ZK
verification) returns `true` — V1 fixes exactly that.

**Positioning:** one clean codebase that signals to all three target ecosystems.
- **zkSync / Polygon** ← Phase 1: real Noir/UltraHonk proofs verified by a
  bb-generated Solidity verifier, deployed to their zkEVM testnets.
- **Aztec** ← Phase 2: genuine Aztec.nr private execution (private notes, L1↔L2
  messaging) — the real version of what the current "AztecExecutor" only pretends
  to be.

---

## 1. Guiding Principles

1. **Zero mocks in V1.** If a component can't be made real, it's cut, not faked.
2. **Reuse what's genuinely real** (see §2) — this is a rebuild of the broken
   parts, not a from-scratch rewrite.
3. **Depth over breadth.** One end-to-end flow, fully closed.
4. **Honest privacy narrative.** Be explicit about what a public rollup can and
   cannot hide — that honesty is itself a senior-level signal (see §7).
5. **Test everything trust-critical.** Foundry tests + `nargo test` + one e2e.
6. **Clean architecture.** Small, single-purpose contracts with clear interfaces;
   no redundant parallel paths.

---

## 2. Keep / Rebuild / Drop

### ✅ KEEP (already real — harden, don't rewrite)
| Asset | Action |
|---|---|
| Noir will circuit (`noir/will/src/main.nr`) | Remove debug `println`, drop unused `trees` dep, add `nargo test` cases, freeze the 5 public inputs. |
| `L1Heartbeat.sol` | Keep the grace/veto state machine; wire it properly into execution. |
| `SelfHumanVerifier.sol` | Keep the real Self SDK integration; deploy on the **same chain** as the registry and read it for real. |
| Frontend real paths: `lib/WalletContext.tsx`, `services/blockchain.ts`, `services/noirService.ts` (real UltraHonk path), Self QR generation, `lib/poseidon.ts` | Keep; strip the mock fallbacks. |

### 🔨 REBUILD (the load-bearing gaps)
| Gap | Fix |
|---|---|
| No real on-chain verification | Generate `HonkVerifier.sol` via `bb write_vk` + `bb contract`; call it for real. **Headline fix.** |
| `WillExecutor` transfers nothing to beneficiaries | Implement real ETH + ERC20 distribution via per-beneficiary Merkle-inclusion claims. |
| Self verification faked in frontend | Delete the `setTimeout` fake; do a real on-chain verification read. |
| Commitment mismatch (`"0x"+salt+Date.now()` vs Poseidon) | Use the Poseidon commitment everywhere. |
| Redundant/parallel contracts | Collapse `NoirIntegration` + `AztecExecutor` + `L1AztecBridge` into one clean flow. |

### ❌ DROP
- **ZK-PDF entirely** — delete the Rust `backend/`, `services/zkpdfService.ts`,
  `components/PDFUploader.tsx`. Mostly mock, tangential to the thesis. **Result: no
  backend at all — proving is 100% client-side (noir_js/bb.js).** Simpler story.
- **Dead frontend code** — `components/SelfVerification.tsx`, `WillRegistration.tsx`,
  `services/SelfService.ts`, `NoirIntegrationService.ts`, `lib/aztec.ts`,
  `lib/noir.ts` (all unimported).
- **Over-optimistic status docs** — `SELF_*.md`, `DEPLOYMENT_GUIDE.md`,
  `deploy_production.md`, `test_*.md`, `zkpdf.md`, `test_pdf_extraction.html`,
  `verify_deployment.js` → replace with one honest `README.md` + `docs/`.

---

## 3. Target Architecture

### 3.1 Phase 1 — Verifiable EVM core

```
                    ┌─────────────────────┐
 Self (Celo/EVM) ─► │ SelfHumanVerifier    │◄─ humanity + age(18+) gate
                    └─────────┬───────────┘
                              │ onlyVerifiedHumans
        register ETH+ERC20    ▼
 User ───────────────► ┌──────────────────────┐    checkIn()
                       │ InheritanceRegistry   │◄────────────── owner
                       │  (holds assets,       │
                       │   commitment+root+    │──┐ reads liveness
                       │   totals per will)    │  │
                       └───────┬──────────────┘  ▼
                               │           ┌──────────────┐
                  after grace  │           │ Heartbeat     │ grace/veto
              submit Noir proof▼           │ (L1Heartbeat) │
                       ┌──────────────────┐└──────────────┘
                       │ HonkVerifier.sol  │ ◄─ REAL UltraHonk verify
                       └───────┬──────────┘
                     verified  │
                               ▼
                    beneficiary claims (Merkle inclusion)
                    → REAL ETH/ERC20 transfer of exact share
```

**Contracts (clean set):**
- `HonkVerifier.sol` — bb-generated, real UltraHonk verification over BN254.
- `InheritanceRegistry.sol` — the one execution contract. Holds ETH + ERC20;
  `registerWill` (Self-gated, deposits = declared totals, stores
  commitment/merkleRoot/totals); reads `Heartbeat` for liveness; `executeWill`
  (verifies proof via `HonkVerifier`, marks executable after grace); `claim`
  (per-beneficiary Merkle inclusion → transfers exact share).
- `L1Heartbeat.sol` — kept; grace/veto; queried by the registry.
- `SelfHumanVerifier.sol` — kept; real gate.

**Circuit public inputs (frozen, 5):** `will_commitment`, `merkle_root`,
`total_eth`, `total_erc20`, `total_nft_count`. Private: salt, will_data,
beneficiary arrays. (Age is handled by Self, not the circuit.)

**Execution flow:**
1. **Register** — Self-gated; deposit ETH + ERC20 equal to declared totals; store
   commitment + Merkle root + totals.
2. **Heartbeat** — owner calls `checkIn()` periodically.
3. **Inactivity** — anyone triggers grace after inactivity period; veto multisig
   window.
4. **Execute** — after grace with no veto, submit the Noir proof; `HonkVerifier`
   verifies against the stored public inputs; will marked executable.
5. **Claim** — each beneficiary submits a Merkle-inclusion proof of their leaf →
   contract transfers their exact ETH/ERC20 share. Real transfers.

**Assets in V1:** ETH + one ERC20 (mock USDC). NFTs deferred to a 1.5 follow-up
(circuit already tracks the totals, so it's additive).

**Deploy targets:** Sepolia + **zkSync Era Sepolia** + **Polygon zkEVM Cardona**
(same contracts, three networks → claims all three ecosystems).

**Frontend:** keep real paths, remove mock fallbacks + dead code, fix commitment,
wire real on-chain verification, single hardcoded→env address config.

### 3.2 Phase 2 — Real Aztec private-execution track

- New `aztec/` workspace with **Aztec.nr** contracts. Beneficiary shares become
  **private notes**; execution performs private transfers → genuine *execution
  privacy* (individual payouts hidden on-chain).
- **L1↔L2 messaging**: an L1 portal contract relays the heartbeat/inactivity
  signal to the Aztec contract — the real version of the faked `L1AztecBridge`.
- Runs on the Aztec sandbox + PXE; documented setup.
- This is the differentiator for an Aztec application specifically.

---

## 4. Phased Roadmap & Milestones

> Time is open-ended; sequence is what matters. Each milestone ends in something
> demoable and committed. **Convention: every unchecked box below is one
> commit-sized task** (roughly one focused commit). Suggested commit prefix in
> `(...)`. Branch strategy in §4.0.

### 4.0 Sequencing & branches

- **Phase 0 — done** (merged to `main`, PR #3).
- **Phase D — Design system & full UI redesign — current focus.** Branch
  `design-system`. Do this now while ZK work is paused: it's the highest-visibility
  portfolio win, and the design *foundation* (tokens, styleguide, primitives, chrome)
  is pure presentation that Phase 1 cannot invalidate. See `design.md` for the spec.
- **Phase 1 (a–e) — resumes after design.** The reskin touches `register`,
  `execute`, `claims` as **presentation only**; Phase 1d then layers the real logic
  (commitment fix, real verification, real Self) onto those already-styled pages — a
  small, expected re-touch, not rework.
- Work `design-system` as an integration branch; land tasks as small commits (or
  sub-PRs), then one `design-system → main` merge when the reskin is coherent.

### Phase 0 — Cleanup & foundation ✅ DONE
- [x] Delete dropped code (`backend/`, ZK-PDF frontend, dead components/services, stale docs).
- [x] Env-driven address/RPC config; removed committed RPC keys (⚠ still rotate the old keys).
- [x] Honest `README.md`; added `context.md` + `newplan.md`.
- **Done:** frontend builds clean (14/14 pages), no dead imports, no secrets in source.

---

### Phase D — Design system & UI redesign  ·  branch `design-system`
Follows `design.md` §10 build order. Each box = one commit.

**D1 · Foundation** ✅ DONE
- [x] Design spec `design.md` committed. `(docs(design))`
- [x] Wire §4 tokens into Tailwind v4 `@theme` in `globals.css` (color, radius, fonts; dark-only). `(feat(ui): design tokens)`
- [x] Load fonts: Fraunces (serif) via next/font, Geist Sans/Mono via geist pkg; `--font-*` set. `(feat(ui): fonts)`
- [x] Add `/styleguide` route rendering every token + the full type scale. `(feat(ui): styleguide route)`

**D2 · Primitives** (each its own commit)
- [x] `Button` (primary/secondary/ghost/destructive) + focus ring. `(feat(ui): Button)`
- [x] `Field` (label/input/validation) + `StatusBadge`. `(feat(ui): Field + StatusBadge)`
- [x] `VaultCard` + `DataRow` (truncated address, click-to-copy) + `StatTile`. `(feat(ui): card primitives)`
- [x] **Signature:** `Pulse` (alive/grace/flat states, reduced-motion). `(feat(ui): Pulse)`
- [x] **Signature:** `Commitment` (sealed ↔ resolved redaction reveal). `(feat(ui): Commitment)`
- [x] `Stepper` + `Modal` + `Toast`. `(feat(ui): flow primitives)` — **D2 complete**

**D3 · Page reskins** (one commit per page; presentation only — no tx-logic changes)
- [x] Global chrome: `Header` (wordmark + Pulse chip + wallet) + `Footer`. `(feat(ui): chrome)`
- [ ] Landing `/` — cinematic hero, serif headline, numbered sequence. `(feat(ui): landing)`
- [ ] Dashboard `/app` — Pulse hero + stat tiles + sealed will. `(feat(ui): dashboard)`
- [ ] Check-in `/checkin` — Pulse + countdown + single action. `(feat(ui): checkin)`
- [ ] Register `/register` — stepper flow reskin. `(feat(ui): register)`
- [ ] Execute `/execute`. `(feat(ui): execute)`
- [ ] Veto `/veto`. `(feat(ui): veto)`
- [ ] Claims `/claims`. `(feat(ui): claims)`
- [ ] Withdraw `/withdraw`. `(feat(ui): withdraw)`
- [ ] Privacy + Terms — real copy. `(feat(ui): legal pages)`

**D4 · Polish & land**
- [ ] Remove remaining `GlassCard` translucency, gradient classes, and all emoji. `(refactor(ui): strip legacy styles)`
- [ ] Motion / reduced-motion / responsive (≤360px) / focus-state pass. `(polish(ui): a11y + motion)`
- [ ] Screenshot review vs `design.md`; "remove one accessory" per screen. `(polish(ui): restraint pass)`
- **Done when:** every page matches `design.md`, `/styleguide` is complete, a11y floor met → merge `design-system` → `main`.

---

### Phase 1a — Circuit hardening  ·  branch `phase-1a-circuit`
- [ ] Remove `println`; drop unused `trees` dep. `(chore(circuit): cleanup)`
- [ ] Freeze the 5 public inputs; document the witness format. `(docs(circuit): io spec)`
- [ ] Add `nargo test` cases (valid; wrong sum; wrong root; out-of-bounds count). `(test(circuit))`
- [ ] Recompile; sync artifact to `frontend/public/circuits/`. `(build(circuit): artifact)`
- **Done when:** `nargo test` passes; artifact regenerated.

### Phase 1b — Real on-chain verification  ·  branch `phase-1b-verifier`
- [ ] Generate `HonkVerifier.sol` via `bb write_vk` + `bb contract`. `(feat(contracts): HonkVerifier)`
- [ ] Replace `WillVerifier` stub; wire the 5 public inputs. `(feat(contracts): real verify)`
- [ ] Foundry test: real proof fixture verifies; tampered proof reverts. `(test(contracts): verifier)`
- **Done when:** a real Noir proof verifies on-chain in a Foundry test.

### Phase 1c — Registry + real distribution  ·  branch `phase-1c-registry`
- [ ] `InheritanceRegistry.sol`: register (Self-gated, deposit = totals). `(feat(contracts): registry register)`
- [ ] Execute (verify proof, Heartbeat-aware grace gate). `(feat(contracts): registry execute)`
- [ ] Claim: per-beneficiary Merkle-inclusion → real ETH + ERC20 transfer. `(feat(contracts): registry claim)`
- [ ] Delete redundant contracts (`NoirIntegration`/`AztecExecutor`/`L1AztecBridge`/`WillExecutor`). `(refactor(contracts): collapse)`
- [ ] Foundry lifecycle test (register→lapse→grace→veto→execute→claim) + access/reentrancy/double-claim. `(test(contracts): lifecycle)`
- **Done when:** end-to-end Foundry test moves real funds to the right beneficiaries.

### Phase 1d — Frontend made real  ·  branch `phase-1d-frontend`
- [ ] Remove mock fallbacks in `noirService`; fail loudly. `(fix(frontend): no mock proofs)`
- [ ] Fix commitment to Poseidon everywhere (register + withdraw). `(fix(frontend): poseidon commitment)`
- [ ] Real on-chain verify in `onChainVerifier` (uncomment `readContract`). `(feat(frontend): onchain verify)`
- [ ] Real Self verification (on-chain read; delete `setTimeout` fake). `(feat(frontend): real self)`
- [ ] E2E in-browser vs testnet: register → prove → verify → claim. `(test(frontend): e2e)`
- **Done when:** the deployed app performs a real end-to-end will with real proofs.

### Phase 1e — Deploy + polish  ·  branch `phase-1e-deploy`
- [ ] Deploy to Sepolia. `(chore(deploy): sepolia)`
- [ ] Deploy to zkSync Era Sepolia. `(chore(deploy): zksync)`
- [ ] Deploy to Polygon zkEVM Cardona. `(chore(deploy): polygon)`
- [ ] Live hosted frontend (Vercel) on a default testnet. `(chore(deploy): vercel)`
- [ ] Architecture diagram + threat-model doc + demo video + README refresh. `(docs: v1)`
- **Done when:** anyone can open the live app and complete a real will. **This is V1.**

### Phase 2 — Aztec track (post-V1, the differentiator)  ·  branch `phase-2-aztec`
- [ ] `aztec/` Aztec.nr workspace scaffold. `(feat(aztec): scaffold)`
- [ ] Private-note share model + private distribution. `(feat(aztec): private execution)`
- [ ] L1 portal contract for real inactivity → L2 messaging. `(feat(aztec): l1 portal)`
- [ ] Sandbox/PXE docs + private-execution demo. `(docs(aztec): demo)`
- **Done when:** individual payouts are provably hidden on Aztec.

---

## 5. Workstream Detail

### Circuit (`noir/will`)
Keep logic; harden + test. Public-input contract is the integration seam with
`HonkVerifier` — freeze it early so contracts and frontend build against a stable
interface.

### Contracts (`contracts/`, Foundry)
- New: `HonkVerifier.sol` (generated), `InheritanceRegistry.sol`.
- Keep: `L1Heartbeat.sol`, `SelfHumanVerifier.sol`.
- Delete: `WillVerifier.sol` (stub), `NoirIntegration.sol`, `AztecExecutor.sol`,
  `L1AztecBridge.sol`, `WillExecutor.sol` (replaced by `InheritanceRegistry`).
- **Tests are mandatory** (repo currently has zero). Cover the full lifecycle,
  access control, reentrancy, double-claim, wrong-proof rejection, veto path.
- Real deploy timing (params for demo vs prod), not the 30s/15s demo values.

### Frontend (`frontend/`, Next.js 14)
- Env-driven address config (no hardcoded addresses / no committed keys).
- Remove all mock fallbacks; surface real errors.
- Single web3 stack (viem); delete the ethers-only dead path.
- Fix the register/withdraw commitment mismatch.

### Backend
- **None.** Deleted with ZK-PDF. Proving is client-side.

### Docs & portfolio
- `README.md` (honest, with diagram + live link), `docs/architecture.md`,
  `docs/threat-model.md`, `docs/privacy-model.md`, short demo video.

---

## 6. Success Criteria — Definition of Done for V1

V1 is done when **all** are true:
1. A real Noir proof is generated client-side and **verified on-chain** by a real
   `HonkVerifier` (no stub returns `true`).
2. Executing a will performs **real ETH + ERC20 transfers** of exact shares to
   beneficiaries.
3. Registration is gated by **real** Self humanity/age verification.
4. Heartbeat → grace → veto → execute is fully wired and enforced.
5. **Zero mocks** remain in the critical path; failures fail loudly.
6. Foundry tests + `nargo test` pass and cover the lifecycle; CI runs them.
7. Deployed to Sepolia + zkSync Era Sepolia + Polygon zkEVM Cardona, with a live
   hosted frontend.
8. Honest README + architecture diagram + threat/privacy model + demo video.

---

## 7. Privacy Model (the honest narrative)

- **Phase 1 (public rollup):** provides *verifiable correctness* and
  *pre-execution privacy* — will contents and beneficiaries stay hidden as
  commitments until execution. **But** individual claims reveal amounts when
  claimed on a public chain. State this plainly.
- **Phase 2 (Aztec):** provides *execution privacy* — private notes hide
  individual payouts entirely.
- Documenting this trade-off (rather than overclaiming "fully private") is a
  deliberate signal of understanding the real limits of public zk-rollups.

---

## 8. Risks & Notes

- **bb / Noir version drift** — the installed `bb.js` (frontend) and `nargo`/`bb`
  CLI (verifier gen) versions must match the circuit's proving scheme, or
  on-chain verification silently fails. Pin versions early; this is the most
  likely time-sink.
- **zkSync Era Solidity quirks** — some low-level/opcode assumptions differ from
  vanilla EVM; verify the generated verifier deploys and runs on zkSync Era, not
  just Sepolia.
- **Self on a different chain** — Self currently lives on Celo Sepolia while the
  will contracts are on Sepolia. Decide V1's canonical chain and deploy Self there
  (or accept a documented cross-chain gate). Resolve the stale/duplicate Self
  address inconsistency noted in `context.md`.
- **Merkle-claim privacy leak** — per-beneficiary claims reveal that beneficiary's
  amount at claim time; acknowledged and addressed by Phase 2.

---

## 9. Immediate Next Steps

1. Confirm V1's canonical EVM chain for the Self gate.
2. Pin Noir/`bb` toolchain versions; regenerate the circuit artifact.
3. Start Phase 0 cleanup, then Phase 1b (real verifier) — that's the single change
   that flips the project from "mock" to "real."

When ready to execute, turn each phase above into a concrete implementation plan
(via the writing-plans workflow) and build phase-by-phase with tests as the gate.
