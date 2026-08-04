# ZK-AfterLife

**ZK-AfterLife** is a privacy-preserving digital-inheritance protocol: commit to a
crypto will during your lifetime, and — if you become inactive for a defined period
— have your assets distributed to beneficiaries, with zero-knowledge proofs keeping
will contents, beneficiary identities, and allocations private.

> **Status: active rebuild toward V1.** This project began as an ETHGlobal
> New Delhi 2025 prototype. It is being rebuilt into a fully real, verifiable
> system. For an honest, current picture of what works vs. what is still in
> progress, read **[`context.md`](./context.md)**. For the roadmap to V1, read
> **[`newplan.md`](./newplan.md)**.

---

## How it works

1. **Verify** — a user proves humanity + age (18+) via **Self Protocol**.
2. **Register** — the user defines a will (beneficiaries + allocations); the app
   computes a **Poseidon commitment** and a Merkle root over the beneficiary set
   and registers it on-chain, depositing the assets.
3. **Heartbeat** — the user periodically checks in.
4. **Inactivity** — a missed heartbeat starts a grace period with a veto window
   (a trusted multisig can cancel a false alarm).
5. **Execute** — after grace, a **Noir / UltraHonk** proof of will validity is
   generated client-side and verified on-chain; beneficiaries then claim their
   exact shares.

Zero-knowledge proofs enforce correctness — allocation sums, commitment integrity,
and Merkle inclusion — **without revealing the will's contents**.

---

## Architecture

- **Zero-knowledge circuit (Noir).** Proves commitment correctness, allocation-sum
  consistency, and a Poseidon Merkle root over up to 8 beneficiaries.
  See [`noir/will`](./noir/will).
- **Smart contracts (Solidity / Foundry).** Will registration, heartbeat/grace/veto,
  on-chain proof verification, and asset distribution. See [`contracts`](./contracts).
- **Identity (Self Protocol).** On-chain humanity + age gate for registration.
- **Frontend (Next.js 14).** Wallet integration, client-side proof generation
  (`@noir-lang/noir_js` + `@aztec/bb.js`), and the full user flow.
  See [`frontend`](./frontend). Proving runs entirely in the browser — there is
  no backend service.

The target private-execution layer (**Aztec**) is a Phase 2 goal; see `newplan.md`.

---

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Circuit
cd noir/will && nargo compile        # requires Noir/Nargo

# Contracts
cd contracts && forge build          # requires Foundry
```

Copy `frontend/env.example` to `frontend/.env.local` and fill in your own RPC URLs
(the app falls back to public endpoints if unset). **Never commit real API keys.**

---

## Limitations & honesty

- Inactivity is not equivalent to death; the protocol models inactivity-based
  consent, not proof of death.
- On a public rollup, individual claims reveal their own amounts at claim time.
  True execution privacy requires the Aztec track (Phase 2).
- The system is experimental and **has not been audited**.

See `context.md` for a precise, component-by-component status.

---

## License

MIT
