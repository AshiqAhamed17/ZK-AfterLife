# ZK-AfterLife

**ZK-AfterLife** is a privacy-preserving digital inheritance protocol design that explores how zero-knowledge proofs can be used to enable automated crypto asset distribution upon user inactivity, without revealing will contents, beneficiary identities, or asset allocations.

The project focuses on protocol architecture, zero-knowledge circuit design, and system-level integration for private inheritance, with Aztec Network considered as the target private execution environment.

---

## Motivation

Crypto inheritance today is either:
- fully custodial,
- publicly revealing,
- manually executed, or
- dependent on trusted intermediaries.

ZK-AfterLife approaches inheritance as a **verifiable conditional execution problem**, where correctness and intent are enforced cryptographically using zero-knowledge proofs rather than trust.

---

## High-Level Idea

A user commits to a digital will during their lifetime.  
If the user becomes inactive for a predefined period, a zero-knowledge proof can be generated to demonstrate that execution conditions are met without revealing private data.

The protocol enforces:
- correctness of beneficiary allocations,
- validity of execution conditions,
- privacy of all sensitive information.

---

## Core Features

### Zero-Knowledge Privacy

- Will contents remain private through cryptographic commitments.
- Beneficiary lists are represented using Poseidon-based Merkle trees.
- Allocation sums are verified inside ZK circuits.
- Noir circuits enforce execution constraints without disclosure.

### Conditional Execution via Inactivity

- Heartbeat-based liveness signaling.
- User-defined inactivity thresholds.
- Grace period with optional veto via multi-signature.
- Explicitly models inactivity-based consent, not proof of death.

### Document and Identity Binding (Optional)

- Support for uploading signed PDF wills.
- Cryptographic binding of document hashes to on-chain commitments.
- Optional identity and age verification using zero-knowledge proofs.
- External attestations are treated as auxiliary inputs, not core trust assumptions.

---

## Architecture Overview

### Smart Contracts (Solidity)

- Will commitment registration.
- Inactivity tracking and execution gating.
- Zero-knowledge proof verification.

### Zero-Knowledge Layer (Noir)

- Commitment validation.
- Merkle inclusion proofs for beneficiaries.
- Allocation consistency checks.
- Execution condition enforcement.

### Backend Services (Rust + SP1)

- PDF preprocessing and hashing.
- Beneficiary data extraction.
- Generation of zero-knowledge proofs for document binding.
- Mocked and experimental ZK-PDF workflows.

### Private Execution (Planned)

- Aztec Network is the intended private execution layer.
- Private UTXO-based asset distribution is a design target.
- Full private execution is not yet implemented.

---

## Execution Flow (Simplified)

1. User defines a will (manual input or PDF-based).
2. Will data is converted into cryptographic commitments.
3. Commitments are registered on-chain.
4. User periodically submits heartbeat signals.
5. Inactivity triggers a grace period.
6. A zero-knowledge proof of valid execution is produced.
7. Assets are distributed according to verified constraints.

---

## Design Philosophy

- Zero-knowledge proofs enforce correctness, not storage.
- Privacy is a first-class requirement.
- Execution should be verifiable without trusted executors.
- Legal documents are treated as human-readable artifacts bound cryptographically.
- The protocol remains meaningful even if optional identity layers are removed.

---

## Limitations

- Inactivity is not equivalent to death.
- PDF verification is scoped to cryptographic binding, not legal interpretation.
- Some components (including private execution) are architectural designs rather than full implementations.
- The system has not been audited.

---

## Status

This repository represents an experimental protocol design and proof-of-work project focused on zero-knowledge systems, circuit design, and privacy-preserving architecture.

---

## License

MIT
