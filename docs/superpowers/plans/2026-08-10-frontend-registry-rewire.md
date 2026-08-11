# Frontend Registry Rewire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's dead contract-integration layer (still targeting `WillExecutor`/`L1Heartbeat`, deleted in Phase 1c) with real calls to `InheritanceRegistry`, remove all mock proof fallbacks, and fix the two named boxes (no-mock-proofs, poseidon-commitment) as part of the larger rewire.

**Architecture:** New `registryService.ts` (viem-based, mirrors the real `InheritanceRegistry` ABI) replaces `blockchain.ts` + `onChainVerifier.ts`. `noirService.ts` is cleaned to prove-only (no chain calls, no mock fallback). `WalletContext.tsx` exposes a smaller, honest API. Each page keeps its existing design-system UI (VaultCard/DataRow/Button/etc. — unchanged) and gets new data-fetching/action functions wired to the new service.

**Tech Stack:** Next.js 14, viem 2.x, `@noir-lang/noir_js` + `@aztec/bb.js`, existing design-system primitives (no new UI components needed).

## Global Constraints

- No proof is needed at `register` — only at `executeWill`. Confirmed from `InheritanceRegistry.sol`: `register(bytes32 willCommitment, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint256 totalNftCount) payable` takes no proof param.
- `totalNftCount` must always be `0` — the registry reverts `NftsNotSupported()` otherwise. Every beneficiary's nft field is hardcoded `0`.
- Frontend calls exactly 3 contracts directly: `InheritanceRegistry`, the USDC `IERC20`, and `SelfHumanVerifier` (read-only `isFullyVerified`). `WillVerifier`/`HonkVerifier`/Poseidon are internal to the registry, never called from the frontend.
- No JS test framework exists in `frontend/` (confirmed: `package.json` has no jest/vitest/testing-library). Verification per task is `npx tsc --noEmit`, `npm run build`, and for pages with real UI risk, a headless-Chrome screenshot via `playwright-core` (the pattern already used throughout this project — see prior session's `restraint2.js`-style scripts). Every task specifies exact commands.
- Claims: manual claim-entry form, no discovery/browsing (beneficiary data is intentionally off-chain).
- Withdraw: becomes an honest explainer page; route and nav link kept.
- All addresses default to the zero address (`0x0000000000000000000000000000000000000000`) with `NEXT_PUBLIC_*` env var overrides — nothing is deployed yet (Phase 1e).
- Contract error names, event names, and struct fields quoted in this plan are copied verbatim from `/Users/ashiq/Documents/code/ZK-AfterLife/contracts/src/InheritanceRegistry.sol` (read directly, not from memory).

---

## Task 1: ABI layer + config/contracts.ts rewrite

**Files:**
- Create: `frontend/src/config/abi/inheritanceRegistry.ts`
- Create: `frontend/src/config/abi/erc20.ts`
- Create: `frontend/src/config/abi/selfHumanVerifier.ts`
- Modify: `frontend/src/config/contracts.ts` (full rewrite)

**Interfaces:**
- Produces: `INHERITANCE_REGISTRY_ABI`, `ERC20_ABI`, `SELF_HUMAN_VERIFIER_ABI` (all `const` arrays from `parseAbi`, typed via viem's `Abi` inference — every later task that touches the chain imports one of these).
- Produces: `ContractAddresses { inheritanceRegistry: string; usdc: string; selfVerifier: string }`, `getContractAddresses(): ContractAddresses`, `getCurrentNetwork(): NetworkConfig`, `isNetworkSupported(chainId): boolean` (same names as today, new shape) — consumed by Task 2.

- [ ] **Step 1: Write the InheritanceRegistry ABI**

```ts
// frontend/src/config/abi/inheritanceRegistry.ts
import { parseAbi } from "viem";

// Verbatim from contracts/src/InheritanceRegistry.sol. Frozen interface —
// keep in lockstep with the deployed contract (see docs/superpowers/specs/
// 2026-08-09-inheritance-registry-design.md).
export const INHERITANCE_REGISTRY_ABI = parseAbi([
  "function register(bytes32 willCommitment, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint256 totalNftCount) payable",
  "function checkIn(bytes32 willCommitment)",
  "function triggerGracePeriod(bytes32 willCommitment)",
  "function veto(bytes32 willCommitment)",
  "function executeWill(bytes32 willCommitment, bytes proof)",
  "function claim(bytes32 willCommitment, uint256 ethAmount, uint256 usdcAmount, uint256 leafIndex, bytes32[3] siblings)",
  "function getWill(bytes32 willCommitment) view returns ((address owner, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint64 registeredAt, uint64 lastCheckIn, uint64 graceStart, uint32 graceEpoch, uint32 vetoCount, bool executed, bool exists))",
  "function getVetoMembers() view returns (address[])",
  "function isVetoMember(address) view returns (bool)",
  "function inactivityPeriod() view returns (uint256)",
  "function gracePeriod() view returns (uint256)",
  "function vetoThreshold() view returns (uint256)",
  "event WillRegistered(bytes32 indexed willCommitment, address indexed owner, uint256 totalEth, uint256 totalUsdc)",
  "error NotVerifiedHuman()",
  "error WillAlreadyRegistered()",
  "error InvalidMerkleRoot()",
  "error NftsNotSupported()",
  "error EmptyWill()",
  "error EthDepositMismatch()",
  "error WillNotRegistered()",
  "error WillAlreadyExecuted()",
  "error NotWillOwner()",
  "error StillActive()",
  "error GraceAlreadyActive()",
  "error GraceNotStarted()",
  "error GraceNotElapsed()",
  "error GracePeriodOver()",
  "error NotVetoMember()",
  "error AlreadyVetoed()",
  "error InvalidProof()",
  "error NotExecuted()",
  "error AlreadyClaimed()",
  "error NothingToClaim()",
  "error InvalidLeafIndex()",
  "error InvalidMerkleProof()",
  "error TransferFailed()",
]);
```

- [ ] **Step 2: Write the ERC20 and SelfHumanVerifier ABIs**

```ts
// frontend/src/config/abi/erc20.ts
import { parseAbi } from "viem";

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
```

```ts
// frontend/src/config/abi/selfHumanVerifier.ts
import { parseAbi } from "viem";

export const SELF_HUMAN_VERIFIER_ABI = parseAbi([
  "function isFullyVerified(address userAddress) view returns (bool)",
]);
```

- [ ] **Step 3: Rewrite config/contracts.ts**

```ts
// frontend/src/config/contracts.ts
export interface ContractAddresses {
  inheritanceRegistry: string;
  usdc: string;
  selfVerifier: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  rpcUrls?: string[];
  blockExplorer: string;
  contracts: ContractAddresses;
}

const ZERO = "0x0000000000000000000000000000000000000000";

// Single shared address set — one deployment target at a time (Phase 1e
// wires real addresses per network when contracts are actually deployed).
const CONTRACTS: ContractAddresses = {
  inheritanceRegistry: process.env.NEXT_PUBLIC_INHERITANCE_REGISTRY_ADDRESS || ZERO,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || ZERO,
  selfVerifier: process.env.NEXT_PUBLIC_SELF_VERIFIER_ADDRESS || ZERO,
};

export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: "Localhost",
    rpcUrl: "http://localhost:8545",
    blockExplorer: "",
    contracts: CONTRACTS,
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    rpcUrls: [
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://rpc.sepolia.org",
      "https://sepolia.gateway.tenderly.co",
    ].filter(Boolean) as string[],
    blockExplorer: "https://sepolia.etherscan.io",
    contracts: CONTRACTS,
  },
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com",
    blockExplorer: "https://etherscan.io",
    contracts: CONTRACTS,
  },
};

export const DEFAULT_NETWORK = "sepolia";

export function getCurrentNetwork(): NetworkConfig {
  if (typeof window !== "undefined") {
    const chainId = (window as any).ethereum?.chainId;
    if (chainId) {
      const network = Object.values(NETWORKS).find((n) => n.chainId === parseInt(chainId));
      if (network) return network;
    }
  }
  return NETWORKS[DEFAULT_NETWORK];
}

export function getContractAddresses(): ContractAddresses {
  return getCurrentNetwork().contracts;
}

export function isNetworkSupported(chainId: number): boolean {
  return Object.values(NETWORKS).some((n) => n.chainId === chainId);
}

export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(NETWORKS).find((n) => n.chainId === chainId) || null;
}
```

Note: dropped `celo-sepolia` — it only ever held a `selfHumanVerifier` address in the old shape and nothing else meaningful; Self verification now flows through the single `selfVerifier` address in the shared `CONTRACTS` set. If a real cross-chain Self deployment is needed later, that's a Phase 1e deployment concern, not a frontend config concern.

- [ ] **Step 4: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `config/abi` or `config/contracts`. (Errors from `blockchain.ts`/`onChainVerifier.ts` importing the OLD `ContractAddresses` shape are EXPECTED at this point — they get deleted in Task 4. Confirm the only errors are in those two files.)

- [ ] **Step 5: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/config/abi frontend/src/config/contracts.ts
git commit -m "$(cat <<'EOF'
feat(frontend): registry ABI + config layer

New frontend/src/config/abi/{inheritanceRegistry,erc20,selfHumanVerifier}.ts —
hand-written viem parseAbi ABIs matching the real InheritanceRegistry.sol
verbatim (functions, events, custom errors). Rewrote config/contracts.ts:
new minimal ContractAddresses { inheritanceRegistry, usdc, selfVerifier } —
the only three contracts the frontend calls directly (WillVerifier/
HonkVerifier/Poseidon are internal to the registry). All addresses default to
the zero address with NEXT_PUBLIC_* env overrides; nothing is deployed yet
(Phase 1e). Part of the Phase 1d frontend registry rewire.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: registryService.ts

**Files:**
- Create: `frontend/src/services/registryService.ts`

**Interfaces:**
- Consumes: `INHERITANCE_REGISTRY_ABI`, `ERC20_ABI`, `SELF_HUMAN_VERIFIER_ABI` (Task 1), `getContractAddresses`, `getCurrentNetwork` (Task 1).
- Produces (consumed by Task 4 WalletContext, and indirectly every page task):
  ```ts
  export interface WillRecord {
    owner: Address; merkleRoot: bigint; totalEth: bigint; totalUsdc: bigint;
    registeredAt: bigint; lastCheckIn: bigint; graceStart: bigint;
    graceEpoch: number; vetoCount: number; executed: boolean; exists: boolean;
  }
  export interface MyWill { commitment: Hex; will: WillRecord }
  export interface GraceConfig { inactivityPeriod: bigint; gracePeriod: bigint; vetoThreshold: bigint }

  class RegistryService {
    connectWallet(): Promise<Address>
    initializeWithProvider(account: Address): void
    getBalance(address?: Address): Promise<string>
    waitForTransaction(hash: Hex): Promise<any>
    getTransactionStatus(hash: Hex): Promise<'pending'|'success'|'failed'>
    isSelfVerified(address: Address): Promise<boolean>
    isVetoMember(address: Address): Promise<boolean>
    getVetoMembers(): Promise<Address[]>
    getGraceConfig(): Promise<GraceConfig>
    getWill(commitment: Hex): Promise<WillRecord>
    getAllWills(): Promise<MyWill[]>
    getMyWill(owner: Address): Promise<MyWill | null>
    register(commitment: Hex, merkleRoot: bigint, totalEthWei: bigint, totalUsdcBaseUnits: bigint): Promise<Hex>
    checkIn(commitment: Hex): Promise<Hex>
    triggerGracePeriod(commitment: Hex): Promise<Hex>
    veto(commitment: Hex): Promise<Hex>
    executeWill(commitment: Hex, proof: Hex): Promise<Hex>
    claim(commitment: Hex, ethAmountWei: bigint, usdcAmountBaseUnits: bigint, leafIndex: bigint, siblings: [Hex, Hex, Hex]): Promise<Hex>
  }
  export const registryService: RegistryService
  ```

- [ ] **Step 1: Write registryService.ts**

```ts
// frontend/src/services/registryService.ts
// Real on-chain integration for InheritanceRegistry. Replaces blockchain.ts +
// onChainVerifier.ts, which targeted contracts deleted in Phase 1c.

import { getContractAddresses, getCurrentNetwork } from "@/config/contracts";
import { INHERITANCE_REGISTRY_ABI } from "@/config/abi/inheritanceRegistry";
import { ERC20_ABI } from "@/config/abi/erc20";
import { SELF_HUMAN_VERIFIER_ABI } from "@/config/abi/selfHumanVerifier";
import {
  Address,
  Hex,
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
} from "viem";
import { localhost, mainnet, sepolia } from "viem/chains";

export interface WillRecord {
  owner: Address;
  merkleRoot: bigint;
  totalEth: bigint;
  totalUsdc: bigint;
  registeredAt: bigint;
  lastCheckIn: bigint;
  graceStart: bigint;
  graceEpoch: number;
  vetoCount: number;
  executed: boolean;
  exists: boolean;
}

export interface MyWill {
  commitment: Hex;
  will: WillRecord;
}

export interface GraceConfig {
  inactivityPeriod: bigint;
  gracePeriod: bigint;
  vetoThreshold: bigint;
}

function toWillRecord(raw: any): WillRecord {
  return {
    owner: raw.owner,
    merkleRoot: raw.merkleRoot,
    totalEth: raw.totalEth,
    totalUsdc: raw.totalUsdc,
    registeredAt: raw.registeredAt,
    lastCheckIn: raw.lastCheckIn,
    graceStart: raw.graceStart,
    graceEpoch: Number(raw.graceEpoch),
    vetoCount: Number(raw.vetoCount),
    executed: raw.executed,
    exists: raw.exists,
  };
}

class RegistryService {
  private publicClient: any;
  private walletClient: any;
  private account: Address | null = null;

  constructor() {
    const network = getCurrentNetwork();
    this.publicClient = createPublicClient({
      chain: this.getChain(network.chainId),
      transport: http(network.rpcUrl),
    });
  }

  private getChain(chainId: number) {
    switch (chainId) {
      case 31337:
        return localhost;
      case 11155111:
        return sepolia;
      case 1:
        return mainnet;
      default:
        return localhost;
    }
  }

  private get registryAddress(): Address {
    return getContractAddresses().inheritanceRegistry as Address;
  }

  private get usdcAddress(): Address {
    return getContractAddresses().usdc as Address;
  }

  private get selfVerifierAddress(): Address {
    return getContractAddresses().selfVerifier as Address;
  }

  initializeWithProvider(account: Address) {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not found");
    }
    this.walletClient = createWalletClient({
      account,
      chain: this.getChain(getCurrentNetwork().chainId),
      transport: custom(window.ethereum),
    });
    this.account = account;
  }

  async connectWallet(): Promise<Address> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not found");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0] as Address;
    this.initializeWithProvider(account);
    return account;
  }

  async getBalance(address?: Address): Promise<string> {
    const target = address || this.account;
    if (!target) throw new Error("No address provided");
    const balance = await this.publicClient.getBalance({ address: target });
    return formatEther(balance);
  }

  async waitForTransaction(hash: Hex): Promise<any> {
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async getTransactionStatus(hash: Hex): Promise<"pending" | "success" | "failed"> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash });
      return receipt.status === "success" ? "success" : "failed";
    } catch {
      return "pending";
    }
  }

  async isSelfVerified(address: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.selfVerifierAddress,
      abi: SELF_HUMAN_VERIFIER_ABI,
      functionName: "isFullyVerified",
      args: [address],
    })) as boolean;
  }

  async isVetoMember(address: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "isVetoMember",
      args: [address],
    })) as boolean;
  }

  async getVetoMembers(): Promise<Address[]> {
    return (await this.publicClient.readContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "getVetoMembers",
    })) as Address[];
  }

  async getGraceConfig(): Promise<GraceConfig> {
    const [inactivityPeriod, gracePeriod, vetoThreshold] = await Promise.all([
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: INHERITANCE_REGISTRY_ABI,
        functionName: "inactivityPeriod",
      }),
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: INHERITANCE_REGISTRY_ABI,
        functionName: "gracePeriod",
      }),
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: INHERITANCE_REGISTRY_ABI,
        functionName: "vetoThreshold",
      }),
    ]);
    return { inactivityPeriod, gracePeriod, vetoThreshold } as GraceConfig;
  }

  async getWill(commitment: Hex): Promise<WillRecord> {
    const raw = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "getWill",
      args: [commitment],
    });
    return toWillRecord(raw);
  }

  /**
   * Scan WillRegistered events and return every will with its current state.
   * Public existence/status is not private (only beneficiary data is) — this
   * is the same pattern execute/veto need to browse candidate wills.
   */
  async getAllWills(): Promise<MyWill[]> {
    const currentBlock = await this.publicClient.getBlockNumber();
    const fromBlock = currentBlock > 9n ? currentBlock - 9n : 0n;

    let logs;
    try {
      logs = await this.publicClient.getLogs({
        address: this.registryAddress,
        event: {
          type: "event",
          name: "WillRegistered",
          inputs: [
            { name: "willCommitment", type: "bytes32", indexed: true },
            { name: "owner", type: "address", indexed: true },
            { name: "totalEth", type: "uint256", indexed: false },
            { name: "totalUsdc", type: "uint256", indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });
    } catch (err) {
      console.error("Failed to fetch WillRegistered logs:", err);
      return [];
    }

    const results: MyWill[] = [];
    for (const log of logs) {
      const commitment = log.args.willCommitment as Hex;
      try {
        const will = await this.getWill(commitment);
        if (will.exists) results.push({ commitment, will });
      } catch (err) {
        console.error("Failed to load will details for", commitment, err);
      }
    }
    return results;
  }

  /** Most recently registered will owned by `owner`, or null if none. */
  async getMyWill(owner: Address): Promise<MyWill | null> {
    const all = await this.getAllWills();
    const mine = all.filter((w) => w.will.owner.toLowerCase() === owner.toLowerCase());
    if (mine.length === 0) return null;
    return mine.reduce((latest, w) => (w.will.registeredAt > latest.will.registeredAt ? w : latest));
  }

  async register(
    commitment: Hex,
    merkleRoot: bigint,
    totalEthWei: bigint,
    totalUsdcBaseUnits: bigint
  ): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");

    if (totalUsdcBaseUnits > 0n) {
      const approveHash = await this.walletClient.writeContract({
        address: this.usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [this.registryAddress, totalUsdcBaseUnits],
        account: this.walletClient.account,
        chain: this.walletClient.chain,
      });
      await this.waitForTransaction(approveHash);
    }

    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "register",
      args: [commitment, merkleRoot, totalEthWei, totalUsdcBaseUnits, 0n],
      value: totalEthWei,
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }

  async checkIn(commitment: Hex): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "checkIn",
      args: [commitment],
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }

  async triggerGracePeriod(commitment: Hex): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "triggerGracePeriod",
      args: [commitment],
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }

  async veto(commitment: Hex): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "veto",
      args: [commitment],
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }

  async executeWill(commitment: Hex, proof: Hex): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "executeWill",
      args: [commitment, proof],
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }

  async claim(
    commitment: Hex,
    ethAmountWei: bigint,
    usdcAmountBaseUnits: bigint,
    leafIndex: bigint,
    siblings: [Hex, Hex, Hex]
  ): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "claim",
      args: [commitment, ethAmountWei, usdcAmountBaseUnits, leafIndex, siblings],
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }
}

export const registryService = new RegistryService();
```

- [ ] **Step 2: Verify it compiles standalone**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors from `services/registryService.ts` (errors from `blockchain.ts`/`onChainVerifier.ts` still expected until Task 4).

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/services/registryService.ts
git commit -m "$(cat <<'EOF'
feat(frontend): registryService

New services/registryService.ts — real viem integration for
InheritanceRegistry (register/checkIn/triggerGracePeriod/veto/executeWill/
claim), the USDC ERC20 (approve, called automatically inside register when
totalUsdc > 0), and SelfHumanVerifier (isFullyVerified read). getAllWills/
getMyWill scan the WillRegistered event log (will existence/status is public;
only beneficiary data is private, so this scan is not a privacy leak) —
replaces the old getAllRegisteredWills pattern from the deleted blockchain.ts.
Part of the Phase 1d frontend registry rewire.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: noirService.ts cleanup (closes box "no mock proofs")

**Files:**
- Modify: `frontend/src/services/noirService.ts` (full rewrite of the class body; keep `WillData`/`WillProof`/`BeneficiaryAllocation` interfaces as-is)

**Interfaces:**
- Produces (unchanged signatures, consumed by every page task that proves):
  `generateWillCommitmentAsync(willData): Promise<string>`,
  `generateMerkleRootAsync(willData): Promise<string>`,
  `generateWillProof(willData): Promise<WillProof>` (now throws instead of
  ever returning a mock proof), `validateWillData(willData): string[]`,
  `getStatus(): { isInitialized: boolean; mode: string }`.
- Removed (no longer exist — confirmed zero external callers via grep before
  this task): `verifyProof`, `initializeOnChainVerifier`, `registerWillOnChain`,
  `verifyProofOnChain`, `executeWillOnChain`, `testOnChainVerification`,
  `testZKFlow`, the `OnChainVerifierService` import.

- [ ] **Step 1: Rewrite noirService.ts**

```ts
// frontend/src/services/noirService.ts
// Real ZK proof service for zk-afterlife-agent. Proves only — chain calls
// live in registryService.ts. No mock fallback: if a real proof cannot be
// generated, this throws. A silently-returned mock proof is exactly the bug
// this file used to have.

import { hash2Async, hash4Async, hash5Async, toHex32 } from '@/lib/poseidon';

type NoirModule = typeof import('@noir-lang/noir_js');

export interface WillData {
  willSalt: string;
  willData: string[];
  beneficiaryCount: string;
  beneficiaryAddresses: string[];
  beneficiaryEth: string[];
  beneficiaryUsdc: string[];
  beneficiaryNfts: string[];
  calculatedTotals?: {
    totalEth: string;
    totalUsdc: string;
    totalNfts: string;
  };
}

export interface WillProof {
  willCommitment: string;
  merkleRoot: string;
  totalEth: string;
  totalUsdc: string;
  totalNftCount: string;
  proof: string;
  publicInputs: string[];
}

export interface BeneficiaryAllocation {
  address: string;
  ethAmount: string;
  usdcAmount: string;
  nftCount: string;
}

export class NoirService {
  private isInitialized = false;
  private noir: any | null = null;
  private backend: any | null = null;
  private acir: any | null = null;

  // Safely convert arbitrary strings (hex, decimal, or text) to a 256-bit bigint
  private stringToBigInt(value: string | undefined | null): bigint {
    if (value === undefined || value === null) return BigInt(0);
    const trimmed = value.trim();
    if (trimmed.length === 0) return BigInt(0);

    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      try { return BigInt(trimmed); } catch { /* fallthrough */ }
    }
    if (/^[+-]?\d+$/.test(trimmed)) {
      try { return BigInt(trimmed); } catch { /* fallthrough */ }
    }

    let hash = BigInt(0);
    const MOD_256 = (BigInt(1) << BigInt(256)) - BigInt(1);
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash * BigInt(131)) + BigInt(trimmed.charCodeAt(i));
      hash &= MOD_256;
    }
    return hash;
  }

  private bytesToHex(bytes: Uint8Array): string {
    let hex = '0x';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Load the circuit artifact and the real UltraHonk proving backend.
   * Throws on any failure — no fallback mode. Idempotent.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const res = await fetch('/circuits/will_circuit.json');
    if (!res.ok) throw new Error('Failed to load circuit artifact');
    this.acir = await res.json();

    const noirMod: NoirModule = await import('@noir-lang/noir_js');
    const { Noir } = noirMod as any;

    const bbModule = await import('@aztec/bb.js');
    const { UltraHonkBackend } = bbModule as any;
    if (!UltraHonkBackend) {
      throw new Error('UltraHonkBackend not found in @aztec/bb.js');
    }

    this.noir = new Noir(this.acir);
    const acirBytes = this.acir?.bytecode || this.acir?.acir || this.acir;
    this.backend = new UltraHonkBackend(acirBytes);

    this.isInitialized = true;
  }

  // Generate will commitment hash (Poseidon-based). Pure hashing — does not
  // require initialize() (no wasm/backend dependency).
  async generateWillCommitmentAsync(willData: WillData): Promise<string> {
    const dataFields = willData.willData.map((d) => this.stringToBigInt(d));
    const salt = this.stringToBigInt(willData.willSalt);
    const commitment = await hash5Async(dataFields[0] || 0n, dataFields[1] || 0n, dataFields[2] || 0n, dataFields[3] || 0n, salt);
    return toHex32(commitment);
  }

  // Generate merkle root (Poseidon-based). Same: pure hashing, no backend.
  async generateMerkleRootAsync(willData: WillData): Promise<string> {
    const leaves: bigint[] = [];
    const count = parseInt(willData.beneficiaryCount || '0');
    for (let i = 0; i < Math.min(8, count); i++) {
      const addr = this.stringToBigInt(willData.beneficiaryAddresses[i]);
      const eth = this.stringToBigInt(willData.beneficiaryEth[i]);
      const usdc = this.stringToBigInt(willData.beneficiaryUsdc[i]);
      const nft = this.stringToBigInt(willData.beneficiaryNfts[i]);
      leaves.push(await hash4Async(addr, eth, usdc, nft));
    }
    while (leaves.length < 8) leaves.push(0n);
    const l1 = [
      await hash2Async(leaves[0], leaves[1]),
      await hash2Async(leaves[2], leaves[3]),
      await hash2Async(leaves[4], leaves[5]),
      await hash2Async(leaves[6], leaves[7]),
    ];
    const l2 = [await hash2Async(l1[0], l1[1]), await hash2Async(l1[2], l1[3])];
    const root = await hash2Async(l2[0], l2[1]);
    return toHex32(root);
  }

  /**
   * Generate a real ZK proof for will execution. Throws if the backend is
   * unavailable or proving fails — never returns a mock proof.
   */
  async generateWillProof(willData: WillData): Promise<WillProof> {
    await this.initialize();

    const willCommitment = await this.generateWillCommitmentAsync(willData);
    const merkleRoot = await this.generateMerkleRootAsync(willData);

    const totalEth = willData.beneficiaryEth.reduce((sum, eth) => sum + this.stringToBigInt(eth), BigInt(0)).toString();
    const totalUsdc = willData.beneficiaryUsdc.reduce((sum, usdc) => sum + this.stringToBigInt(usdc), BigInt(0)).toString();
    const totalNftCount = willData.beneficiaryNfts.reduce((sum, nft) => sum + this.stringToBigInt(nft), BigInt(0)).toString();

    if (!this.noir || !this.backend) {
      throw new Error('Noir/UltraHonk backend not initialized — cannot generate a real proof.');
    }

    const asField = (b: bigint) => '0x' + b.toString(16);
    const inputs = {
      will_commitment: asField(BigInt(willCommitment)),
      merkle_root: asField(BigInt(merkleRoot)),
      total_eth: asField(BigInt(totalEth)),
      total_usdc: asField(BigInt(totalUsdc)),
      total_nft_count: asField(BigInt(totalNftCount)),
      will_salt: asField(this.stringToBigInt(willData.willSalt)),
      will_data: willData.willData.map((d) => asField(this.stringToBigInt(d))),
      beneficiary_count: asField(BigInt(parseInt(willData.beneficiaryCount || '0'))),
      beneficiary_addresses: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryAddresses[i] || '0'))),
      beneficiary_eth: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryEth[i] || '0'))),
      beneficiary_usdc: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryUsdc[i] || '0'))),
      beneficiary_nfts: Array.from({ length: 8 }, (_, i) => asField(this.stringToBigInt(willData.beneficiaryNfts[i] || '0'))),
    };

    const exec = await this.noir.execute(inputs);
    const witness = exec.witness ?? exec;

    const generated = await this.backend.generateProof(witness);
    const proofBytes: Uint8Array = (generated as any).proof;
    const pubInputsRaw: any[] = (generated as any).publicInputs || [];
    const proofHex = this.bytesToHex(proofBytes);
    const pubInputs: string[] = pubInputsRaw.map((x: any) => typeof x === 'bigint' ? asField(x) : String(x));

    const isValid = await this.backend.verifyProof(generated);
    if (!isValid) {
      throw new Error('Generated proof failed local verification.');
    }

    return {
      willCommitment,
      merkleRoot,
      totalEth,
      totalUsdc,
      totalNftCount,
      proof: proofHex,
      publicInputs: pubInputs.length > 0 ? pubInputs : [willCommitment, merkleRoot],
    };
  }

  // Validate will data
  validateWillData(willData: WillData): string[] {
    const errors: string[] = [];
    const beneficiaryCount = parseInt(willData.beneficiaryCount);

    if (beneficiaryCount <= 0 || beneficiaryCount > 8) {
      errors.push('Beneficiary count must be between 1 and 8');
    }
    if (willData.beneficiaryAddresses.length < beneficiaryCount) {
      errors.push('Insufficient beneficiary data provided');
    }

    let totalEth = BigInt(0);
    let totalUsdc = BigInt(0);
    let totalNfts = BigInt(0);

    for (let i = 0; i < beneficiaryCount; i++) {
      const eth = this.stringToBigInt(willData.beneficiaryEth[i] || '0');
      const usdc = this.stringToBigInt(willData.beneficiaryUsdc[i] || '0');
      const nft = this.stringToBigInt(willData.beneficiaryNfts[i] || '0');

      totalEth += eth;
      totalUsdc += usdc;
      totalNfts += nft;

      if (eth < BigInt(0) || usdc < BigInt(0) || nft < BigInt(0)) {
        errors.push(`Negative allocation found for beneficiary ${i}`);
      }
    }

    if (totalNfts !== BigInt(0)) {
      errors.push('NFTs are not supported in V1 — every beneficiary NFT count must be 0');
    }
    if (totalEth === BigInt(0) && totalUsdc === BigInt(0)) {
      errors.push('At least one beneficiary must have a non-zero allocation');
    }

    return errors;
  }

  getStatus(): { isInitialized: boolean; mode: string } {
    return {
      isInitialized: this.isInitialized,
      mode: this.backend ? 'real-zk' : 'uninitialized',
    };
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `services/noirService.ts`. Errors from `execute/page.tsx` calling the now-removed on-chain-verifier pass-through methods are NOT expected yet — grep confirmed `noirService.verifyProof`/`initializeOnChainVerifier`/etc. have zero external callers (only `WalletContext.tsx` and `execute/page.tsx` import `NoirService`/`noirService`, and neither calls those methods — confirmed in Task 4/8 by re-checking before editing).

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/services/noirService.ts
git commit -m "$(cat <<'EOF'
fix(frontend): no mock proofs

Removes the mock-proof fallback from noirService.generateWillProof — it used
to catch any proving failure and silently return { proof: '0x' }, with a
console.warn as the only signal. Now throws with the real error. Same for
initialize(): loading the circuit artifact, noir_js, or the UltraHonk backend
now throws on failure instead of swallowing into a fake "initialized"
success state.

Deleted the dead always-true verifyProof() (zero external callers, confirmed
by grep) and the OnChainVerifierService pass-through methods
(initializeOnChainVerifier/registerWillOnChain/verifyProofOnChain/
executeWillOnChain/testOnChainVerification) — chain calls now live in
registryService.ts; this file proves, nothing else. Also deleted testZKFlow
(only exercised the now-removed pass-throughs).

Closes Phase 1d box "Remove mock fallbacks in noirService; fail loudly."

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: WalletContext.tsx rewrite + delete blockchain.ts/onChainVerifier.ts

**Files:**
- Modify: `frontend/src/lib/WalletContext.tsx` (full rewrite)
- Delete: `frontend/src/services/blockchain.ts`
- Delete: `frontend/src/services/onChainVerifier.ts`

**Interfaces:**
- Consumes: `registryService` + `WillRecord`/`MyWill`/`GraceConfig` (Task 2), `NoirService` (Task 3).
- Produces (the new `useWallet()` context value — every page task after this one is written against exactly this surface):
  ```ts
  interface WalletContextType {
    isConnected: boolean;
    account: Address | null;
    balance: string;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    isSelfVerified: (address: Address) => Promise<boolean>;
    isVetoMember: (address: Address) => Promise<boolean>;
    getVetoMembers: () => Promise<Address[]>;
    getGraceConfig: () => Promise<GraceConfig>;
    getWill: (commitment: Hex) => Promise<WillRecord>;
    getAllWills: () => Promise<MyWill[]>;
    getMyWill: (owner: Address) => Promise<MyWill | null>;
    register: (commitment: Hex, merkleRoot: bigint, totalEthWei: bigint, totalUsdcBaseUnits: bigint) => Promise<Hex>;
    checkIn: (commitment: Hex) => Promise<Hex>;
    triggerGracePeriod: (commitment: Hex) => Promise<Hex>;
    veto: (commitment: Hex) => Promise<Hex>;
    executeWill: (commitment: Hex, proof: Hex) => Promise<Hex>;
    claim: (commitment: Hex, ethAmountWei: bigint, usdcAmountBaseUnits: bigint, leafIndex: bigint, siblings: [Hex,Hex,Hex]) => Promise<Hex>;
    noirService: NoirService;
    isLoading: boolean;
    error: string | null;
  }
  ```

- [ ] **Step 1: Write the new WalletContext.tsx**

```tsx
// frontend/src/lib/WalletContext.tsx
'use client';

import { registryService, type WillRecord, type MyWill, type GraceConfig } from '@/services/registryService';
import { NoirService } from '@/services/noirService';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Address, Hex } from 'viem';

interface WalletContextType {
  isConnected: boolean;
  account: Address | null;
  balance: string;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  isSelfVerified: (address: Address) => Promise<boolean>;
  isVetoMember: (address: Address) => Promise<boolean>;
  getVetoMembers: () => Promise<Address[]>;
  getGraceConfig: () => Promise<GraceConfig>;
  getWill: (commitment: Hex) => Promise<WillRecord>;
  getAllWills: () => Promise<MyWill[]>;
  getMyWill: (owner: Address) => Promise<MyWill | null>;

  register: (commitment: Hex, merkleRoot: bigint, totalEthWei: bigint, totalUsdcBaseUnits: bigint) => Promise<Hex>;
  checkIn: (commitment: Hex) => Promise<Hex>;
  triggerGracePeriod: (commitment: Hex) => Promise<Hex>;
  veto: (commitment: Hex) => Promise<Hex>;
  executeWill: (commitment: Hex, proof: Hex) => Promise<Hex>;
  claim: (
    commitment: Hex,
    ethAmountWei: bigint,
    usdcAmountBaseUnits: bigint,
    leafIndex: bigint,
    siblings: [Hex, Hex, Hex]
  ) => Promise<Hex>;

  noirService: NoirService;

  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noirService = new NoirService();

  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const connectedAccount = accounts[0] as Address;
            setAccount(connectedAccount);
            setIsConnected(true);
            try {
              registryService.initializeWithProvider(connectedAccount);
            } catch (e) {
              console.error('Failed to initialize registry service from existing connection:', e);
            }
            await updateBalance(connectedAccount);
          }
        } catch (err) {
          console.error('Failed to check existing connection:', err);
        }
      }
    };
    checkExistingConnection();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsConnected(false);
          setBalance('0');
        } else {
          const newAccount = accounts[0] as Address;
          setAccount(newAccount);
          setIsConnected(true);
          try {
            registryService.initializeWithProvider(newAccount);
          } catch (e) {
            console.error('Failed to reinitialize registry service after account change:', e);
          }
          await updateBalance(newAccount);
        }
      };
      const handleChainChanged = () => window.location.reload();

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const updateBalance = async (address: Address) => {
    try {
      setBalance(await registryService.getBalance(address));
    } catch (err) {
      console.error('Failed to update balance:', err);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const connectedAccount = await registryService.connectWallet();
      setAccount(connectedAccount);
      setIsConnected(true);
      await updateBalance(connectedAccount);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    setError(null);
  };

  const isSelfVerified = async (address: Address) => registryService.isSelfVerified(address);
  const isVetoMember = async (address: Address) => registryService.isVetoMember(address);
  const getVetoMembers = async () => registryService.getVetoMembers();
  const getGraceConfig = async () => registryService.getGraceConfig();
  const getWill = async (commitment: Hex) => registryService.getWill(commitment);
  const getAllWills = async () => registryService.getAllWills();
  const getMyWill = async (owner: Address) => registryService.getMyWill(owner);

  const register = async (
    commitment: Hex,
    merkleRoot: bigint,
    totalEthWei: bigint,
    totalUsdcBaseUnits: bigint
  ): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.register(commitment, merkleRoot, totalEthWei, totalUsdcBaseUnits);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to register will:', err);
      setError(err instanceof Error ? err.message : 'Failed to register will. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkIn = async (commitment: Hex): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.checkIn(commitment);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to check in:', err);
      setError(err instanceof Error ? err.message : 'Failed to check in. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGracePeriod = async (commitment: Hex): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.triggerGracePeriod(commitment);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to trigger grace period:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger grace period. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const veto = async (commitment: Hex): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.veto(commitment);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to cast veto:', err);
      setError(err instanceof Error ? err.message : 'Failed to cast veto. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const executeWill = async (commitment: Hex, proof: Hex): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.executeWill(commitment, proof);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to execute will:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute will. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const claim = async (
    commitment: Hex,
    ethAmountWei: bigint,
    usdcAmountBaseUnits: bigint,
    leafIndex: bigint,
    siblings: [Hex, Hex, Hex]
  ): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.claim(commitment, ethAmountWei, usdcAmountBaseUnits, leafIndex, siblings);
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to claim:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value: WalletContextType = {
    isConnected,
    account,
    balance,
    connectWallet,
    disconnectWallet,
    isSelfVerified,
    isVetoMember,
    getVetoMembers,
    getGraceConfig,
    getWill,
    getAllWills,
    getMyWill,
    register,
    checkIn,
    triggerGracePeriod,
    veto,
    executeWill,
    claim,
    noirService,
    isLoading,
    error,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
```

Note: dropped the `noirService.initialize()` eager-call-on-mount `useEffect` that existed in the old file. Rationale (from the spec's "Key realization"): register no longer needs the heavy proving stack at all, and initializing it eagerly on every page load (including `/checkin`, `/veto`, pages that never prove) was already flagged in this project as noisy. `initialize()` is still safe to call lazily — `generateWillProof` (Task 3) calls it internally before proving. Pages that prove (execute, Task 8) call it explicitly with their own loading state instead of relying on a global one.

- [ ] **Step 2: Delete the dead files**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git rm frontend/src/services/blockchain.ts frontend/src/services/onChainVerifier.ts
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: errors ONLY from pages not yet rewired to the new `useWallet()` surface (register/checkin/veto/execute/claims/withdraw/app dashboard — all fixed in Tasks 5-11). No errors from `lib/WalletContext.tsx`, `services/registryService.ts`, or `services/noirService.ts` themselves.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/WalletContext.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): WalletContext on registryService, delete dead services

Rewrote WalletContext.tsx's blockchain surface to wrap registryService
instead of the deleted blockchain.ts/onChainVerifier.ts. New context value:
isSelfVerified, isVetoMember, getVetoMembers, getGraceConfig, getWill,
getAllWills, getMyWill, register, checkIn, triggerGracePeriod, veto,
executeWill, claim — replacing 20+ old methods tied to WillExecutor/
L1Heartbeat/AztecExecutor/L1AztecBridge (all deleted in Phase 1c).

Deleted services/blockchain.ts (1682 lines) and services/onChainVerifier.ts
entirely — dead code, both hardcoded to contracts that no longer exist.

Dropped the eager noirService.initialize() call on every page mount: register
no longer needs the proving stack at all (no proof required until execute),
so loading noir_js/bb.js globally on every route was pure waste. Pages that
prove initialize explicitly with their own loading state (Task 8).

This intentionally leaves every page's build broken until Tasks 5-11 rewire
each one to the new useWallet() surface — tracked, expected, not a regression
introduced silently.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: register/page.tsx rewire (closes box "poseidon commitment", register half)

**Files:**
- Modify: `frontend/src/app/register/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useWallet()` → `isConnected, account, isSelfVerified, register, connectWallet, isLoading, error` (Task 4); `noirService.generateWillCommitmentAsync, generateMerkleRootAsync` (Task 3, via `useWallet().noirService`); design-system primitives `Button, Field, VaultCard, DataRow, StatusBadge, Stepper, Pulse` (unchanged, already in the codebase — no new primitives needed).
- No new exports — this is a leaf page.

- [ ] **Step 1: Write the new register/page.tsx**

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import { selfProtocolService, SelfVerificationResult } from "@/services/SelfProtocolService";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge from "@/components/ui/StatusBadge";
import Stepper from "@/components/ui/Stepper";
import Pulse from "@/components/ui/Pulse";
import { ArrowRight, Plus, Trash2, Eye, EyeOff, Copy, Loader2 } from "lucide-react";
import { parseEther, parseUnits, type Hex } from "viem";
import React, { useState } from "react";

interface Beneficiary {
  address: string;
  ethAmount: string;
  usdcAmount: string;
  name: string;
}

interface WillData {
  beneficiaries: Beneficiary[];
  description: string;
  willSalt: string;
}

const STEP_LABELS = ["Verify", "Details", "Beneficiaries", "Review"];
const USDC_DECIMALS = 6;

export default function RegisterWill() {
  const { isConnected, account, isSelfVerified, register, noirService, connectWallet, isLoading, error } =
    useWallet();
  const [step, setStep] = useState(0);
  const [isSelfVerifiedState, setIsSelfVerifiedState] = useState(false);
  const [selfVerificationMethod, setSelfVerificationMethod] = useState<
    "passport" | "aadhaar" | null
  >(null);
  const [verificationStep, setVerificationStep] = useState<
    "select" | "instructions" | "qr" | "verifying" | "completed"
  >("select");
  const [qrCode, setQrCode] = useState<string>("");
  const [deepLink, setDeepLink] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<string>("");
  const [willData, setWillData] = useState<WillData>({
    beneficiaries: [{ address: "", ethAmount: "", usdcAmount: "", name: "" }],
    description: "",
    willSalt: Math.random().toString(36).substring(2, 15),
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [localError, setLocalError] = useState("");
  const [sealedCommitment, setSealedCommitment] = useState("");

  const addBeneficiary = () => {
    if (willData.beneficiaries.length < 8) {
      setWillData((prev) => ({
        ...prev,
        beneficiaries: [...prev.beneficiaries, { address: "", ethAmount: "", usdcAmount: "", name: "" }],
      }));
    }
  };

  const removeBeneficiary = (index: number) => {
    if (willData.beneficiaries.length > 1) {
      setWillData((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, i) => i !== index),
      }));
    }
  };

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
    setWillData((prev) => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map((ben, i) => (i === index ? { ...ben, [field]: value } : ben)),
    }));
  };

  const validateForm = () => {
    if (willData.beneficiaries.some((b) => !b.address.trim() || !b.name.trim())) {
      return "Please fill in all beneficiary details";
    }
    if (willData.beneficiaries.some((b) => !b.ethAmount && !b.usdcAmount)) {
      return "Each beneficiary must have at least one asset allocation";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!isConnected || !account) {
      setLocalError("Please connect your wallet first");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      const verified = await isSelfVerified(account);
      if (!verified) {
        setLocalError("Your wallet isn't verified with Self yet. Complete identity verification first.");
        setIsProcessing(false);
        return;
      }

      const description = willData.description.trim() || "Digital Will";
      const willDataForProof = {
        willSalt: willData.willSalt,
        willData: [description, "0", "0", "0"],
        beneficiaryCount: willData.beneficiaries.length.toString(),
        beneficiaryAddresses: willData.beneficiaries.map((b) => b.address),
        beneficiaryEth: willData.beneficiaries.map((b) => b.ethAmount || "0"),
        beneficiaryUsdc: willData.beneficiaries.map((b) => b.usdcAmount || "0"),
        beneficiaryNfts: willData.beneficiaries.map(() => "0"),
      };

      // Register needs no proof — only the commitment, root, and totals
      // (InheritanceRegistry.register takes no proof parameter).
      const willCommitment = await noirService.generateWillCommitmentAsync(willDataForProof);
      const merkleRoot = await noirService.generateMerkleRootAsync(willDataForProof);

      const totalEthWei = willData.beneficiaries.reduce(
        (sum, b) => sum + parseEther(b.ethAmount || "0"),
        0n
      );
      const totalUsdcBaseUnits = willData.beneficiaries.reduce(
        (sum, b) => sum + parseUnits(b.usdcAmount || "0", USDC_DECIMALS),
        0n
      );
      const merkleRootBigInt = BigInt(merkleRoot);

      await register(willCommitment as Hex, merkleRootBigInt, totalEthWei, totalUsdcBaseUnits);

      setSealedCommitment(willCommitment);
      setStep(4);
    } catch (err) {
      console.error("Failed to register will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to register will");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleVerificationMethodSelect = (method: "passport" | "aadhaar") => {
    setSelfVerificationMethod(method);
    setVerificationStep("instructions");
  };

  const generateQRCode = async () => {
    if (!account || !selfVerificationMethod) return;
    setVerificationStep("qr");
    try {
      const qrResult = await selfProtocolService.generateQRCode(selfVerificationMethod, account);
      setQrCode(qrResult.qrCode);
      setDeepLink(qrResult.deepLink);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      setLocalError("Failed to generate QR code. Please try again.");
      setVerificationStep("instructions");
    }
  };

  const startVerification = async () => {
    if (!account || !selfVerificationMethod) return;
    setVerificationStep("verifying");
    setVerificationStatus("Waiting for verification...");
    try {
      const result: SelfVerificationResult = await selfProtocolService.waitForVerification(
        selfVerificationMethod,
        account,
        (status) => setVerificationStatus(status)
      );
      if (result.success) {
        setIsSelfVerifiedState(true);
        setVerificationStep("completed");
        setTimeout(() => setStep(1), 2000);
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setLocalError("Verification failed. Please try again.");
      setVerificationStep("qr");
    }
  };

  const resetVerification = () => {
    setVerificationStep("select");
    setSelfVerificationMethod(null);
    setQrCode("");
    setDeepLink("");
    setVerificationStatus("");
    setIsSelfVerifiedState(false);
  };

  React.useEffect(() => {
    const checkExistingVerification = async () => {
      if (account && step === 0) {
        try {
          const verified = await isSelfVerified(account);
          if (verified) {
            setIsSelfVerifiedState(true);
            setVerificationStep("completed");
          }
        } catch {
          // no existing verification
        }
      }
    };
    checkExistingVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, step]);

  const totalEthToLock = willData.beneficiaries
    .reduce((sum, ben) => sum + parseFloat(ben.ethAmount || "0"), 0)
    .toFixed(6);

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to seal a will</h1>
          <p className="t-body mb-8 text-ink-muted">
            Your wallet holds the assets and signs the sealing transaction.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[860px] px-6 py-12">
      <div className="t-eyebrow mb-3">SEAL A WILL</div>
      <h1 className="t-h1 mb-8">Turn your wishes into a proof.</h1>

      {step < 4 ? (
        <div className="mb-10">
          <Stepper steps={STEP_LABELS} current={step} />
        </div>
      ) : null}

      {/* Step 0 — Verify */}
      {step === 0 && isSelfVerifiedState ? (
        <VaultCard eyebrow="Identity" action={<StatusBadge tone="alive" dot>Verified</StatusBadge>}>
          <h2 className="t-h3 mb-2">You&apos;re verified</h2>
          <p className="t-body mb-6 text-ink-muted">
            Human and 18+ confirmed. Let&apos;s set up your will.
          </p>
          <Button onClick={() => setStep(1)}>
            Continue <ArrowRight size={16} />
          </Button>
        </VaultCard>
      ) : null}

      {step === 0 && !isSelfVerifiedState ? (
        <VaultCard eyebrow="Identity">
          <h2 className="t-h3 mb-2">Verify you&apos;re human and 18+</h2>
          <p className="t-body mb-6 text-ink-muted">
            Self Protocol proves humanity and age without revealing your documents.
          </p>

          {verificationStep === "select" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => handleVerificationMethodSelect("passport")}
                className="rounded-card border border-hairline p-5 text-left transition-colors hover:border-seal"
              >
                <div className="t-h3">Passport</div>
                <p className="t-body mt-1 text-ink-muted">International passport, NFC.</p>
              </button>
              <button
                onClick={() => handleVerificationMethodSelect("aadhaar")}
                className="rounded-card border border-hairline p-5 text-left transition-colors hover:border-seal"
              >
                <div className="t-h3">Aadhaar</div>
                <p className="t-body mt-1 text-ink-muted">Indian Aadhaar, QR.</p>
              </button>
            </div>
          ) : null}

          {verificationStep === "instructions" ? (
            <div>
              <ol className="space-y-3">
                {selfVerificationMethod &&
                  selfProtocolService.getInstructions(selfVerificationMethod).map((ins, i) => (
                    <li key={i} className="flex gap-3 rounded-card border border-hairline p-4">
                      <span className="font-mono text-[13px] text-seal">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="t-body text-ink-muted">{ins}</span>
                    </li>
                  ))}
              </ol>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={resetVerification}>
                  Back
                </Button>
                <Button onClick={generateQRCode}>Generate QR code</Button>
              </div>
            </div>
          ) : null}

          {verificationStep === "qr" ? (
            <div className="flex flex-col items-center gap-5">
              <div className="rounded-card bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="Self verification QR code" className="h-48 w-48" />
              </div>
              <p className="t-body text-center text-ink-muted">
                Open the Self app and scan to verify.
              </p>
              {deepLink ? (
                <Button variant="secondary" onClick={() => window.open(deepLink, "_blank")}>
                  Open in Self app
                </Button>
              ) : null}
              <Button onClick={startVerification}>I&apos;ve scanned it</Button>
            </div>
          ) : null}

          {verificationStep === "verifying" ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={28} className="animate-spin text-seal" />
              <p className="t-body text-ink-muted">{verificationStatus}</p>
            </div>
          ) : null}

          {verificationStep === "completed" ? (
            <div className="flex flex-col items-start gap-3">
              <StatusBadge tone="alive" dot>
                Verified
              </StatusBadge>
              <p className="t-body text-ink-muted">Proceeding to your will…</p>
            </div>
          ) : null}

          {localError ? <p className="t-caption mt-4 text-danger">{localError}</p> : null}
        </VaultCard>
      ) : null}

      {/* Step 1 — Details */}
      {step === 1 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Will details">
            <label className="t-eyebrow mb-2 block">Description</label>
            <textarea
              value={willData.description}
              onChange={(e) => setWillData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="A short note about this will and any instructions."
              rows={4}
              className="w-full rounded-control border border-hairline bg-surface-1 px-3 py-2.5 text-ink placeholder:text-ink-faint"
            />
            <p className="t-caption mt-4 max-w-[520px]">
              V1 supports ETH and USDC only. NFT allocations aren&apos;t
              supported yet — that&apos;s an additive follow-up.
            </p>
          </VaultCard>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!willData.description.trim()}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 2 — Beneficiaries */}
      {step === 2 ? (
        <div className="space-y-6">
          {willData.beneficiaries.map((b, index) => (
            <VaultCard
              key={index}
              eyebrow={`Beneficiary ${String(index + 1).padStart(2, "0")}`}
              action={
                willData.beneficiaries.length > 1 ? (
                  <button
                    onClick={() => removeBeneficiary(index)}
                    className="text-ink-faint transition-colors hover:text-danger"
                    aria-label="Remove beneficiary"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : undefined
              }
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Name"
                  placeholder="Beneficiary name"
                  value={b.name}
                  onChange={(e) => updateBeneficiary(index, "name", e.target.value)}
                />
                <Field
                  label="Address"
                  mono
                  placeholder="0x..."
                  value={b.address}
                  onChange={(e) => updateBeneficiary(index, "address", e.target.value)}
                />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field
                  label="ETH"
                  mono
                  type="number"
                  placeholder="0.0"
                  value={b.ethAmount}
                  onChange={(e) => updateBeneficiary(index, "ethAmount", e.target.value)}
                />
                <Field
                  label="USDC"
                  mono
                  type="number"
                  placeholder="0"
                  value={b.usdcAmount}
                  onChange={(e) => updateBeneficiary(index, "usdcAmount", e.target.value)}
                />
              </div>
            </VaultCard>
          ))}

          {willData.beneficiaries.length < 8 ? (
            <Button variant="secondary" onClick={addBeneficiary} className="w-full">
              <Plus size={16} /> Add beneficiary
            </Button>
          ) : null}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={willData.beneficiaries.some((b) => !b.address.trim() || !b.name.trim())}
            >
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 3 — Review */}
      {step === 3 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Review">
            <DataRow label="Description" value={willData.description || "Digital Will"} />
            <DataRow label="Beneficiaries" value={String(willData.beneficiaries.length)} />
            <DataRow label="ETH to lock" value={`${totalEthToLock} ETH`} />
          </VaultCard>

          <VaultCard eyebrow="Beneficiaries">
            {willData.beneficiaries.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <div>
                  <div className="t-body text-ink">{b.name}</div>
                  <div className="font-mono text-[13px] text-ink-faint">
                    {b.address.length > 12 ? `${b.address.slice(0, 6)}··${b.address.slice(-4)}` : b.address}
                  </div>
                </div>
                <div className="font-mono text-[13px] tabular-nums text-ink-muted">
                  {b.ethAmount || "0"} ETH · {b.usdcAmount || "0"} USDC
                </div>
              </div>
            ))}
          </VaultCard>

          <p className="t-caption max-w-[560px]">
            Sealing locks {totalEthToLock} ETH (and any declared USDC) in the
            contract until execution. Only the commitment is stored on-chain;
            your plan stays private. Keep your description, will salt, and
            beneficiary details safe — you&apos;ll need them again to execute.
          </p>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleSubmit} loading={isProcessing}>
              Seal will <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 4 — Success */}
      {step === 4 ? (
        <VaultCard eyebrow="Sealed" action={<StatusBadge tone="alive" dot>Active</StatusBadge>}>
          <h2 className="t-h2 mb-2">Your will is sealed.</h2>
          <p className="t-body mb-6 text-ink-muted">
            The commitment is on-chain; your plan stays private until execution.
          </p>

          <div className="rounded-card border border-hairline p-5">
            <div className="t-eyebrow mb-2">Commitment · keep this safe</div>
            <div className="flex items-center justify-between gap-3">
              <code className="truncate font-mono text-[13px] text-ink">
                {showPrivateKey ? sealedCommitment : "•".repeat(20)}
              </code>
              <div className="flex gap-3 text-ink-faint">
                <button onClick={() => setShowPrivateKey((v) => !v)} aria-label="Toggle commitment visibility" className="hover:text-ink">
                  {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => copyToClipboard(sealedCommitment)} aria-label="Copy commitment" className="hover:text-seal">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <p className="t-caption mt-4 max-w-[560px]">
            You&apos;ll need this commitment, your will salt (
            <code className="font-mono">{willData.willSalt}</code>), and the
            same description and beneficiary details to execute this will
            later — the chain never stores them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-hairline pt-6">
            <Button onClick={() => (window.location.href = "/checkin")}>
              Set up check-ins <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => (window.location.href = "/app")}>
              Back to dashboard
            </Button>
          </div>
        </VaultCard>
      ) : null}

      {(localError || error) && step !== 0 ? (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      ) : null}
    </main>
  );
}
```

Notes on what changed and why, precisely tied to the spec:
- Removed `totalEth`/`totalUsdc`/`totalNfts` step-1 fields and the per-beneficiary `nftCount` field entirely (they're derived from beneficiary allocations now, and NFTs are always 0 — no field to remove-but-hardcode, it never existed as an input).
- `willCommitment` is now the **real Poseidon commitment** from `noirService.generateWillCommitmentAsync`, computed and displayed on the success screen (design.md's original intent, now actually reachable).
- No `generateWillProof` call at register time — matches "Key realization: register needs no proof."
- The dead `Date.now()`-based fake commitment line is gone (this was the literal bug named in Phase 1d box 2).

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/register/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/register/page.tsx
git commit -m "$(cat <<'EOF'
fix(frontend): poseidon commitment (register)

Rewires /register onto the new useWallet() surface (registryService via
WalletContext). The will's commitment is now the real Poseidon value from
noirService.generateWillCommitmentAsync — computed and shown on the sealed-
success screen (design.md always specified "commitment shown once"; it
previously showed the salt because the real commitment was dead code — see
the deleted `willCommitment = "0x"+salt+Date.now()` line, which nothing
downstream ever read).

Register no longer calls noirService.generateWillProof at all:
InheritanceRegistry.register takes no proof parameter (confirmed from
InheritanceRegistry.sol), only commitment + merkleRoot + totals + deposit.
Proving now happens only at execute time (Task 8).

Removed the NFT input fields (step 1 total, per-beneficiary count) — the
registry rejects totalNftCount != 0 (NftsNotSupported), so leaving inputs
that always cause a revert was a real correctness bug, not a style choice.

The withdraw half of this box is superseded by withdraw's removal (Task 10).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: checkin/page.tsx rewire (per-will scoping)

**Files:**
- Modify: `frontend/src/app/checkin/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useWallet()` → `isConnected, account, getMyWill, getGraceConfig, checkIn, connectWallet, isLoading, error` (Task 4); design-system primitives unchanged.

- [ ] **Step 1: Write the new checkin/page.tsx**

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Pulse, { type PulseState } from "@/components/ui/Pulse";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hex } from "viem";

interface DerivedStatus {
  willCommitment: Hex | null;
  lastCheckIn: bigint;
  isInGracePeriod: boolean;
  gracePeriodStart: bigint;
  timeUntilGracePeriod: bigint;
  hasRegisteredWills: boolean;
}

export default function CheckIn() {
  const { isConnected, account, getMyWill, getGraceConfig, checkIn, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();
  const [status, setStatus] = useState<DerivedStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isConnected && account) {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadStatus = async () => {
    try {
      const my = await getMyWill(account!);
      if (!my) {
        setStatus({
          willCommitment: null,
          lastCheckIn: 0n,
          isInGracePeriod: false,
          gracePeriodStart: 0n,
          timeUntilGracePeriod: 0n,
          hasRegisteredWills: false,
        });
        return;
      }
      const { inactivityPeriod } = await getGraceConfig();
      const now = BigInt(Math.floor(Date.now() / 1000));
      const isInGracePeriod = my.will.graceStart !== 0n;
      const graceEligibleAt = my.will.lastCheckIn + inactivityPeriod;
      const timeUntilGracePeriod = isInGracePeriod
        ? 0n
        : graceEligibleAt > now
        ? graceEligibleAt - now
        : 0n;

      setStatus({
        willCommitment: my.commitment,
        lastCheckIn: my.will.lastCheckIn,
        isInGracePeriod,
        gracePeriodStart: my.will.graceStart,
        timeUntilGracePeriod,
        hasRegisteredWills: true,
      });
    } catch (err) {
      console.error("Failed to load check-in status:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!isConnected || !status?.willCommitment) {
      setLocalError("Connect your wallet first.");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      await checkIn(status.willCommitment);
      toast("Check-in recorded. You're active.", "alive");
      setTimeout(() => loadStatus(), 1800);
    } catch (err) {
      console.error("Failed to check in:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to check in.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatTimeRemaining = (seconds: bigint) => {
    const total = Number(seconds);
    const days = Math.floor(total / (24 * 60 * 60));
    const hours = Math.floor((total % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((total % (60 * 60)) / 60);
    if (days > 1) return `${days} days, ${hours} hours`;
    if (days === 1) return `1 day, ${hours} hours`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes`;
    return `${Math.max(0, minutes)} minutes`;
  };

  const getStatusColor = () => {
    if (!status) return "gray";
    if (!status.hasRegisteredWills) return "gray";
    if (status.isInGracePeriod) return "red";
    if (status.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "yellow";
    return "green";
  };

  const getStatusText = () => {
    if (!status) return "Loading";
    if (!status.hasRegisteredWills) return "No will sealed";
    if (status.isInGracePeriod) return "Grace period";
    if (status.timeUntilGracePeriod < 30n * 24n * 60n * 60n) return "Due soon";
    return "Active";
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to check in</h1>
          <p className="t-body mb-8 text-ink-muted">
            Checking in keeps your sealed will active.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const color = getStatusColor();
  const pulseState: PulseState = color === "red" ? "grace" : color === "gray" ? "flat" : "alive";
  const badgeTone: BadgeTone =
    color === "green" ? "alive" : color === "yellow" ? "grace" : color === "red" ? "danger" : "neutral";
  const noWills = status?.hasRegisteredWills === false;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="t-eyebrow mb-3">CHECK-IN</div>
      <h1 className="t-h1 mb-10">Prove you&apos;re still here.</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <VaultCard
          eyebrow="Liveness"
          action={<StatusBadge tone={badgeTone} dot={badgeTone === "alive"}>{getStatusText()}</StatusBadge>}
        >
          <Pulse state={pulseState} height={88} />

          <div className="mt-8">
            <div className="t-label mb-2">
              {status?.isInGracePeriod ? "Grace period active" : "Next check-in due in"}
            </div>
            <div className="font-mono text-[2.25rem] leading-none tabular-nums text-ink">
              {status ? formatTimeRemaining(status.timeUntilGracePeriod) : "—"}
            </div>
          </div>

          <div className="mt-8">
            {noWills ? (
              <div className="rounded-card border border-hairline p-5">
                <p className="t-body mb-4 text-ink-muted">
                  You have no sealed will yet. Seal one to start heartbeat monitoring.
                </p>
                <Link href="/register">
                  <Button>Seal a will</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={handleCheckIn} loading={isProcessing} disabled={isLoading}>
                Check in
              </Button>
            )}
          </div>

          {(localError || error) && !noWills ? (
            <p className="t-caption mt-4 text-danger">{localError || error}</p>
          ) : null}
        </VaultCard>

        <VaultCard
          eyebrow="Status"
          action={
            <button
              onClick={loadStatus}
              className="inline-flex items-center gap-1.5 t-caption text-ink-faint transition-colors hover:text-seal"
              aria-label="Refresh status"
            >
              <RefreshCw size={12} /> refresh
            </button>
          }
        >
          {status ? (
            <>
              <DataRow
                label="Last check-in"
                value={status.lastCheckIn > 0n ? formatDate(status.lastCheckIn) : "Never"}
              />
              <DataRow label="Grace period" value={status.isInGracePeriod ? "Active" : "Inactive"} />
              {status.isInGracePeriod ? (
                <DataRow label="Grace started" value={formatDate(status.gracePeriodStart)} />
              ) : null}
              {status.willCommitment ? (
                <DataRow label="Commitment" address={status.willCommitment} />
              ) : null}
            </>
          ) : (
            <p className="t-body text-ink-muted">Loading status…</p>
          )}
        </VaultCard>
      </div>

      <p className="t-caption mt-8 max-w-[640px]">
        Check in at least once a period to stay active. Missing a check-in
        opens a grace window during which a trusted circle can veto before
        anything executes.
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/checkin/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/checkin/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): rewire checkin to per-will registry calls

The old checkIn()/getCheckInStatus() were zero-arg, built against
L1Heartbeat's single-owner model (deleted in Phase 1c). InheritanceRegistry
scopes liveness per will, so this page now resolves "my will" via
getMyWill(account) (WillRegistered event scan, most recent registration) and
calls checkIn(commitment) against it. The derived-status shape
(lastCheckIn/isInGracePeriod/gracePeriodStart/timeUntilGracePeriod/
hasRegisteredWills) is computed client-side from the real Will struct +
getGraceConfig() (inactivityPeriod) — same fields the existing UI already
rendered, so the JSX is unchanged; only the data-fetching and action
functions are real now.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: veto/page.tsx rewire (real grace-window browsing)

**Files:**
- Modify: `frontend/src/app/veto/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useWallet()` → `isConnected, account, getAllWills, isVetoMember, veto, connectWallet, isLoading, error` (Task 4).

- [ ] **Step 1: Write the new veto/page.tsx**

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import Pulse from "@/components/ui/Pulse";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hex } from "viem";
import type { MyWill } from "@/services/registryService";

export default function Veto() {
  const { isConnected, account, getAllWills, isVetoMember, veto, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();
  const [vetoableWills, setVetoableWills] = useState<MyWill[]>([]);
  const [amIVetoMember, setAmIVetoMember] = useState(false);
  const [selectedWill, setSelectedWill] = useState<MyWill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [vetoReason, setVetoReason] = useState("");

  useEffect(() => {
    if (isConnected && account) loadVetoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const loadVetoData = async () => {
    try {
      const [all, member] = await Promise.all([getAllWills(), isVetoMember(account!)]);
      setAmIVetoMember(member);
      setVetoableWills(all.filter((w) => w.will.graceStart !== 0n && !w.will.executed));
    } catch (err) {
      console.error("Failed to load veto data:", err);
      setLocalError("Failed to load veto data. Please try again.");
    }
  };

  const handleVetoWill = async (will: MyWill, reason: string) => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setLocalError("");
    try {
      console.log("Casting veto with reason:", reason);
      await veto(will.commitment);
      toast("Veto cast. Grace period extended.", "grace");
      setShowVetoModal(false);
      setVetoReason("");
      setTimeout(() => loadVetoData(), 2000);
    } catch (err) {
      console.error("Failed to veto will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to veto will");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const statusFor = (w: MyWill): { tone: BadgeTone; label: string } => ({
    tone: "grace",
    label: `Grace · veto ${w.will.vetoCount}`,
  });

  const filteredWills = vetoableWills.filter((will) => {
    const q = searchTerm.toLowerCase();
    return (
      will.will.owner.toLowerCase().includes(q) || will.commitment.toLowerCase().includes(q)
    );
  });

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="grace" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to veto</h1>
          <p className="t-body mb-8 text-ink-muted">
            A trusted circle can stop a false alarm during grace.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">VETO</div>
      <h1 className="t-h1 mb-10">Stop a premature execution.</h1>

      {!amIVetoMember ? (
        <VaultCard className="mb-8">
          <p className="t-body text-ink-muted">
            Your connected address isn&apos;t part of the veto committee. You
            can see wills currently in grace, but only committee members can
            cast a veto.
          </p>
        </VaultCard>
      ) : null}

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by owner or commitment"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-control border border-hairline bg-surface-1 pl-9 pr-3 font-mono text-[14px] text-ink placeholder:text-ink-faint"
          />
        </div>
        <Button variant="secondary" onClick={loadVetoData}>
          Refresh
        </Button>
      </div>

      {filteredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">No wills in grace</h3>
          <p className="t-body text-ink-muted">
            Nothing is currently vetoable. A will appears here only while it
            is in its grace window.
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {filteredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.commitment}
                eyebrow="Will in grace"
                action={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
              >
                <DataRow label="Owner" address={will.will.owner} />
                <DataRow label="Last check-in" value={formatDate(will.will.lastCheckIn)} />
                <DataRow label="Grace started" value={formatDate(will.will.graceStart)} />
                <DataRow label="Commitment" address={will.commitment} />

                {amIVetoMember ? (
                  <div className="mt-6 border-t border-hairline pt-5">
                    <Button
                      variant="destructive"
                      disabled={isProcessing}
                      onClick={() => {
                        setSelectedWill(will);
                        setShowVetoModal(true);
                      }}
                    >
                      Veto execution
                    </Button>
                  </div>
                ) : null}
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && <p className="t-caption mt-6 text-danger">{localError || error}</p>}

      <p className="t-caption mt-8 max-w-[640px]">
        Only veto committee members can cast a veto, and only during a will&apos;s
        grace window. Reaching the veto threshold cancels grace and restarts
        the inactivity clock. Use it only when the owner is temporarily
        unavailable, not gone.
      </p>

      <Modal
        open={showVetoModal && !!selectedWill}
        onClose={() => setShowVetoModal(false)}
        title="Veto this execution?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowVetoModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isProcessing}
              disabled={!vetoReason.trim()}
              onClick={() => selectedWill && handleVetoWill(selectedWill, vetoReason)}
            >
              Confirm veto
            </Button>
          </>
        }
      >
        <p className="mb-4">
          This extends the grace period and cannot be undone. Note a reason for the record.
        </p>
        <textarea
          value={vetoReason}
          onChange={(e) => setVetoReason(e.target.value)}
          placeholder="Why are you vetoing this execution?"
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface-2 px-3 py-2.5 text-ink placeholder:text-ink-faint"
        />
      </Modal>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/veto/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/veto/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): rewire veto to real grace-window browsing

The old page called castVeto()/getVetoStatus() against the deleted
L1Heartbeat and its data-loading was already a stub
("No enumeration of all wills available yet; show empty state" —
setVetoableWills([]) unconditionally). Now genuinely functional: getAllWills()
scans the WillRegistered log (will existence/grace-status is public, not
private — no privacy issue), filtered client-side to graceStart != 0 and not
executed. isVetoMember(account) gates whether the veto button renders at all
for non-committee visitors, who still see the same list (transparency).
veto(commitment) is a real per-will call.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: execute/page.tsx rewire (proof generated at execute time)

**Files:**
- Modify: `frontend/src/app/execute/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useWallet()` → `isConnected, account, getAllWills, executeWill, noirService, connectWallet, isLoading, error` (Task 4); `noirService.generateWillProof` (Task 3).

- [ ] **Step 1: Write the new execute/page.tsx**

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import Field from "@/components/ui/Field";
import StatTile from "@/components/ui/StatTile";
import StatusBadge, { type BadgeTone } from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import Pulse from "@/components/ui/Pulse";
import { Search, RefreshCw, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hex } from "viem";
import type { MyWill } from "@/services/registryService";

interface WitnessBeneficiary {
  address: string;
  ethAmount: string;
  usdcAmount: string;
}

export default function ExecuteWill() {
  const { isConnected, account, getAllWills, executeWill, noirService, connectWallet, isLoading, error } =
    useWallet();
  const toast = useToast();

  const [allWills, setAllWills] = useState<MyWill[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "grace">("all");
  const [isLoadingWills, setIsLoadingWills] = useState(false);

  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedWill, setSelectedWill] = useState<MyWill | null>(null);
  const [witnessSalt, setWitnessSalt] = useState("");
  const [witnessDescription, setWitnessDescription] = useState("");
  const [witnessBeneficiaries, setWitnessBeneficiaries] = useState<WitnessBeneficiary[]>([
    { address: "", ethAmount: "", usdcAmount: "" },
  ]);

  useEffect(() => {
    if (isConnected) loadWills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const loadWills = async () => {
    setIsLoadingWills(true);
    setLocalError("");
    try {
      setAllWills(await getAllWills());
    } catch (err) {
      console.error("Failed to load wills:", err);
      setLocalError("Failed to load will data. Please try again.");
    } finally {
      setIsLoadingWills(false);
    }
  };

  const now = () => BigInt(Math.floor(Date.now() / 1000));

  const isGraceElapsed = (w: MyWill) => {
    // gracePeriod isn't known per-will here; approximate readiness client-side
    // is not reliable without the contract's gracePeriod, so "ready" just
    // means grace has started — the contract enforces the real elapsed check.
    return w.will.graceStart !== 0n;
  };

  const openExecuteModal = (will: MyWill) => {
    setSelectedWill(will);
    setWitnessSalt("");
    setWitnessDescription("");
    setWitnessBeneficiaries([{ address: "", ethAmount: "", usdcAmount: "" }]);
    setShowExecuteModal(true);
  };

  const addWitnessBeneficiary = () => {
    if (witnessBeneficiaries.length < 8) {
      setWitnessBeneficiaries((prev) => [...prev, { address: "", ethAmount: "", usdcAmount: "" }]);
    }
  };

  const removeWitnessBeneficiary = (index: number) => {
    if (witnessBeneficiaries.length > 1) {
      setWitnessBeneficiaries((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateWitnessBeneficiary = (index: number, field: keyof WitnessBeneficiary, value: string) => {
    setWitnessBeneficiaries((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleExecute = async () => {
    if (!selectedWill) return;
    setIsProcessing(true);
    setLocalError("");
    try {
      const willDataForProof = {
        willSalt: witnessSalt,
        willData: [witnessDescription || "Digital Will", "0", "0", "0"],
        beneficiaryCount: witnessBeneficiaries.length.toString(),
        beneficiaryAddresses: witnessBeneficiaries.map((b) => b.address),
        beneficiaryEth: witnessBeneficiaries.map((b) => b.ethAmount || "0"),
        beneficiaryUsdc: witnessBeneficiaries.map((b) => b.usdcAmount || "0"),
        beneficiaryNfts: witnessBeneficiaries.map(() => "0"),
      };

      const proofData = await noirService.generateWillProof(willDataForProof);

      if (proofData.willCommitment.toLowerCase() !== selectedWill.commitment.toLowerCase()) {
        throw new Error(
          "The supplied will data doesn't match this will's commitment. Check the salt, description, and beneficiaries."
        );
      }
      if (BigInt(proofData.merkleRoot) !== selectedWill.will.merkleRoot) {
        throw new Error(
          "The supplied beneficiary data doesn't match this will's Merkle root. Check every beneficiary's address, ETH, and USDC amount."
        );
      }

      await executeWill(selectedWill.commitment, proofData.proof as Hex);
      toast("Will executed. Assets distributed.", "seal");
      setShowExecuteModal(false);
      setTimeout(() => loadWills(), 2000);
    } catch (err) {
      console.error("Failed to execute will:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to execute will");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredWills = allWills.filter((will) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      will.will.owner.toLowerCase().includes(q) || will.commitment.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "ready" && isGraceElapsed(will) && !will.will.executed) ||
      (filter === "grace" && will.will.graceStart !== 0n && !will.will.executed);
    return matchesSearch && matchesFilter;
  });

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to execute</h1>
          <p className="t-body mb-8 text-ink-muted">
            Executing a will distributes its assets to beneficiaries.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const statusFor = (w: MyWill): { tone: BadgeTone; label: string } =>
    w.will.executed
      ? { tone: "neutral", label: "Executed" }
      : w.will.graceStart !== 0n
      ? { tone: "grace", label: "In grace" }
      : { tone: "alive", label: "Active" };

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <div className="t-eyebrow mb-3">EXECUTE</div>
      <h1 className="t-h1 mb-10">Distribute a sealed will.</h1>

      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Total wills" value={isLoadingWills ? "…" : String(allWills.length)} />
        <StatTile
          label="In grace"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.will.graceStart !== 0n && !w.will.executed).length)}
        />
        <StatTile
          label="Executed"
          value={isLoadingWills ? "…" : String(allWills.filter((w) => w.will.executed).length)}
        />
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by owner or commitment"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-control border border-hairline bg-surface-1 pl-9 pr-3 font-mono text-[14px] text-ink placeholder:text-ink-faint"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-11 rounded-control border border-hairline bg-surface-1 px-3 font-mono text-[13px] text-ink"
        >
          <option value="all">All wills</option>
          <option value="grace">In grace</option>
        </select>
        <Button variant="secondary" onClick={loadWills} disabled={isLoadingWills}>
          <RefreshCw size={15} className={isLoadingWills ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {isLoadingWills ? (
        <VaultCard>
          <p className="t-body text-ink-muted">Loading wills from the chain…</p>
        </VaultCard>
      ) : filteredWills.length === 0 ? (
        <VaultCard>
          <h3 className="t-h3 mb-2">{allWills.length === 0 ? "No wills found" : "No matches"}</h3>
          <p className="t-body text-ink-muted">
            {allWills.length === 0
              ? "No wills in recent blocks. Seal a will, then it appears here (RPC free tiers only index recent blocks)."
              : "Try a different search or filter."}
          </p>
        </VaultCard>
      ) : (
        <div className="space-y-5">
          {filteredWills.map((will) => {
            const s = statusFor(will);
            return (
              <VaultCard
                key={will.commitment}
                eyebrow="Will"
                action={<StatusBadge tone={s.tone} dot={s.tone === "alive"}>{s.label}</StatusBadge>}
              >
                <DataRow label="Owner" address={will.will.owner} />
                <DataRow label="Last check-in" value={formatDate(will.will.lastCheckIn)} />
                <DataRow label="Commitment" address={will.commitment} />

                {!will.will.executed && will.will.graceStart !== 0n ? (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline pt-5">
                    <Button onClick={() => openExecuteModal(will)}>
                      <Play size={15} /> Execute
                    </Button>
                  </div>
                ) : null}
              </VaultCard>
            );
          })}
        </div>
      )}

      {(localError || error) && (
        <p className="t-caption mt-6 text-danger">{localError || error}</p>
      )}

      <p className="t-caption mt-8 max-w-[640px]">
        A will becomes executable after the owner misses check-ins and the
        grace period ends with no veto. Executing requires the exact will
        data (salt, description, beneficiaries) the owner sealed with — the
        chain never stores it. Generating the proof happens in your browser.
      </p>

      <Modal
        open={showExecuteModal && !!selectedWill}
        onClose={() => setShowExecuteModal(false)}
        title="Execute this will"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowExecuteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute} loading={isProcessing}>
              Generate proof &amp; execute
            </Button>
          </>
        }
      >
        <p className="mb-4">
          Enter the exact salt, description, and beneficiary allocations this
          will was sealed with. A mismatch will fail before any transaction is sent.
        </p>
        <div className="space-y-4">
          <Field
            label="Will salt"
            mono
            placeholder="Salt from the sealed-success screen"
            value={witnessSalt}
            onChange={(e) => setWitnessSalt(e.target.value)}
          />
          <Field
            label="Description"
            placeholder="Digital Will"
            value={witnessDescription}
            onChange={(e) => setWitnessDescription(e.target.value)}
          />
          {witnessBeneficiaries.map((b, i) => (
            <div key={i} className="rounded-card border border-hairline p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="t-label">Beneficiary {String(i + 1).padStart(2, "0")}</span>
                {witnessBeneficiaries.length > 1 ? (
                  <button
                    onClick={() => removeWitnessBeneficiary(i)}
                    className="text-ink-faint hover:text-danger"
                    aria-label="Remove beneficiary"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Address"
                  mono
                  placeholder="0x..."
                  value={b.address}
                  onChange={(e) => updateWitnessBeneficiary(i, "address", e.target.value)}
                />
                <Field
                  label="ETH"
                  mono
                  type="number"
                  placeholder="0.0"
                  value={b.ethAmount}
                  onChange={(e) => updateWitnessBeneficiary(i, "ethAmount", e.target.value)}
                />
                <Field
                  label="USDC"
                  mono
                  type="number"
                  placeholder="0"
                  value={b.usdcAmount}
                  onChange={(e) => updateWitnessBeneficiary(i, "usdcAmount", e.target.value)}
                />
              </div>
            </div>
          ))}
          {witnessBeneficiaries.length < 8 ? (
            <Button variant="secondary" onClick={addWitnessBeneficiary} className="w-full">
              <Plus size={16} /> Add beneficiary
            </Button>
          ) : null}
        </div>
      </Modal>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/execute/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/execute/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): rewire execute — proof generated at execute time

InheritanceRegistry.register takes no proof; the witness (salt + beneficiary
allocations) is never on-chain, so whoever executes must supply it again to
regenerate the exact proof. Replaced the old executeWillSimple/
executeWillAlternative try-fallback hack with one real path: browse wills via
getAllWills() (public existence/grace-status, not beneficiary data), pick one
in grace, and a modal collects salt + description + beneficiaries to call
noirService.generateWillProof client-side. Before sending any transaction,
the generated commitment/merkleRoot are checked against the will's actual
on-chain values — a mismatch fails locally with a clear message instead of
wasting gas on a doomed executeWill call. On match, executeWill(commitment,
proof) is a real UltraHonk-verified call.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: claims/page.tsx rewire (manual claim-entry form)

**Files:**
- Modify: `frontend/src/app/claims/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useWallet()` → `isConnected, account, claim, connectWallet, isLoading, error` (Task 4).

- [ ] **Step 1: Write the new claims/page.tsx**

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import Field from "@/components/ui/Field";
import Pulse from "@/components/ui/Pulse";
import { Coins } from "lucide-react";
import { useState } from "react";
import { parseEther, parseUnits, type Hex } from "viem";

const USDC_DECIMALS = 6;

export default function Claims() {
  const { isConnected, claim, connectWallet, isLoading, error } = useWallet();
  const toast = useToast();

  const [willCommitment, setWillCommitment] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [leafIndex, setLeafIndex] = useState("0");
  const [siblings, setSiblings] = useState(["", "", ""]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState("");

  const updateSibling = (i: number, value: string) => {
    setSiblings((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };

  const isValidBytes32 = (v: string) => /^0x[0-9a-fA-F]{64}$/.test(v.trim());

  const handleClaim = async () => {
    setLocalError("");
    if (!isConnected) {
      setLocalError("Please connect your wallet first");
      return;
    }
    if (!isValidBytes32(willCommitment)) {
      setLocalError("Will commitment must be a 32-byte hex value (0x + 64 hex chars).");
      return;
    }
    if (siblings.some((s) => !isValidBytes32(s))) {
      setLocalError("All three sibling hashes must be 32-byte hex values.");
      return;
    }
    const idx = parseInt(leafIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 7) {
      setLocalError("Leaf index must be between 0 and 7.");
      return;
    }
    if (!ethAmount && !usdcAmount) {
      setLocalError("Enter your ETH and/or USDC share.");
      return;
    }

    setIsProcessing(true);
    try {
      const ethWei = ethAmount ? parseEther(ethAmount) : 0n;
      const usdcBaseUnits = usdcAmount ? parseUnits(usdcAmount, USDC_DECIMALS) : 0n;
      await claim(
        willCommitment as Hex,
        ethWei,
        usdcBaseUnits,
        BigInt(idx),
        siblings as [Hex, Hex, Hex]
      );
      toast("Claim sent. Your share is on the way.", "alive");
      setWillCommitment("");
      setEthAmount("");
      setUsdcAmount("");
      setLeafIndex("0");
      setSiblings(["", "", ""]);
    } catch (err) {
      console.error("Failed to claim:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to claim your share</h1>
          <p className="t-body mb-8 text-ink-muted">
            You&apos;ll need the claim details the will owner shared with you.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-12">
      <div className="t-eyebrow mb-3">CLAIMS</div>
      <h1 className="t-h1 mb-4">Claim your share.</h1>
      <p className="t-body mb-10 text-ink-muted">
        Beneficiary allocations are never public — only the will owner knows
        who you are and what you&apos;re owed. There&apos;s nothing to browse
        here; enter the claim details they gave you directly.
      </p>

      <VaultCard eyebrow="Claim details">
        <div className="space-y-5">
          <Field
            label="Will commitment"
            mono
            placeholder="0x..."
            value={willCommitment}
            onChange={(e) => setWillCommitment(e.target.value)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Your ETH share"
              mono
              type="number"
              placeholder="0.0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
            />
            <Field
              label="Your USDC share"
              mono
              type="number"
              placeholder="0"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
            />
          </div>
          <Field
            label="Leaf index (0-7)"
            mono
            type="number"
            placeholder="0"
            value={leafIndex}
            onChange={(e) => setLeafIndex(e.target.value)}
          />
          {siblings.map((s, i) => (
            <Field
              key={i}
              label={`Sibling hash ${i + 1} of 3`}
              mono
              placeholder="0x..."
              value={s}
              onChange={(e) => updateSibling(i, e.target.value)}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-hairline pt-5">
          <Button onClick={handleClaim} loading={isProcessing}>
            <Coins size={15} /> Claim
          </Button>
        </div>
      </VaultCard>

      {(localError || error) && <p className="t-caption mt-6 text-danger">{localError || error}</p>}

      <p className="t-caption mt-8 max-w-[640px]">
        Claiming verifies your exact share against the will&apos;s sealed
        Merkle root and transfers it to your connected wallet. On a public
        chain, claiming reveals the amount you claimed — that&apos;s the one
        privacy trade-off of this phase; full execution privacy is the Aztec track.
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/claims/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/claims/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): claims becomes a manual claim-entry form

Removes the executed-wills scanning list and the fake auto-execute-for-
anyone behavior (the old code's own comment: "For demo purposes: Allow
claiming from any executed will" — there was never a real eligibility check).
Beneficiary allocations are intentionally off-chain (privacy), so there is no
honest way to show "wills you might be in" — you either know your claim data
(the owner shared it with you) or you don't. The new page is a direct form:
willCommitment + ethAmount + usdcAmount + leafIndex + 3 sibling hashes,
submitted straight to registryService.claim. Validates bytes32 shape and leaf
index range client-side before sending.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: withdraw/page.tsx → honest explainer

**Files:**
- Modify: `frontend/src/app/withdraw/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: none from `useWallet()` — this is a static page now. No new exports.

- [ ] **Step 1: Write the new withdraw/page.tsx**

```tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function Withdraw() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-16 sm:py-24">
      <div className="t-eyebrow mb-3">WITHDRAW</div>
      <h1 className="t-h1 mb-6">There is no way to unseal a will.</h1>

      <p className="t-body-l mb-6 text-ink-muted">
        Earlier versions of this app let an owner pull ETH back out of a
        sealed will before it executed. That function is gone on purpose.
      </p>

      <p className="t-body mb-6 text-ink-muted">
        <code className="font-mono text-[14px] text-ink">InheritanceRegistry</code>{" "}
        has no owner-recall function once a will is registered. Once you seal
        a will, the assets stay locked until the protocol itself moves
        them — either back to beneficiaries after execution, or never. This
        is a deliberate trust property: a will you can unilaterally unseal
        isn&apos;t really sealed. The people counting on it should be able to
        trust that you can&apos;t change your mind under pressure, and that no
        bug or compromised key lets anyone else pull the funds back out early
        either.
      </p>

      <p className="t-body mb-10 text-ink-muted">
        If you sealed a will by mistake, the honest options are: keep checking
        in so it never lapses, or accept that it will eventually execute and
        distribute to the beneficiaries you named.
      </p>

      <div className="flex flex-wrap gap-3 border-t border-hairline pt-8">
        <Link href="/execute">
          <Button variant="secondary">
            Execute a will <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/claims">
          <Button variant="secondary">
            Claim your share <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/checkin">
          <Button>
            Check in <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/withdraw/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/withdraw/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): withdraw becomes an honest explainer

InheritanceRegistry has no owner-recall function once a will is registered —
by design, not by omission (a will you can unilaterally unseal isn't really
sealed). The old page's directWithdrawEth + hardcoded knownWillCommitments
guess-list targeted the deleted WillExecutor and have no equivalent. Route and
nav link kept (per plan); content replaced with a short, honest explanation
and links to /execute, /claims, /checkin.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: dashboard stat tiles (app/app/page.tsx)

**Files:**
- Modify: `frontend/src/app/app/page.tsx` (targeted edit — only the stat-tiles section and its data fetching change; hero/actions grid unchanged)

**Interfaces:**
- Consumes: `useWallet()` → adds `getMyWill` to the existing `isConnected, account, balance, connectWallet, isLoading` (Task 4).

- [ ] **Step 1: Add state + effect for the real will lookup**

In `frontend/src/app/app/page.tsx`, change the import and component body:

```tsx
"use client";

import { useWallet } from "@/lib/WalletContext";
import Button from "@/components/ui/Button";
import VaultCard from "@/components/ui/VaultCard";
import DataRow from "@/components/ui/DataRow";
import StatTile from "@/components/ui/StatTile";
import Pulse from "@/components/ui/Pulse";
import Link from "next/link";
import { ArrowRight, FileSignature, HeartPulse, PlayCircle, Ban } from "lucide-react";
import { useEffect, useState } from "react";
import type { MyWill } from "@/services/registryService";

const ACTIONS = [
  { href: "/register", title: "Seal a will", body: "Name beneficiaries and lock assets behind a commitment.", Icon: FileSignature },
  { href: "/checkin", title: "Check in", body: "Prove you are still here and reset the inactivity clock.", Icon: HeartPulse },
  { href: "/execute", title: "Execute", body: "After grace, prove and distribute the sealed shares.", Icon: PlayCircle },
  { href: "/veto", title: "Veto", body: "A trusted circle can stop a false alarm during grace.", Icon: Ban },
];

function truncate(a: string) {
  return `${a.slice(0, 6)}··${a.slice(-4)}`;
}

export default function AppHome() {
  const { isConnected, account, balance, getMyWill, connectWallet, isLoading } = useWallet();
  const [myWill, setMyWill] = useState<MyWill | null>(null);

  useEffect(() => {
    if (isConnected && account) {
      getMyWill(account).then(setMyWill).catch((err) => console.error("Failed to load my will:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-8 w-40">
            <Pulse state="flat" height={40} />
          </div>
          <h1 className="t-h1 mb-3">Connect to see your dashboard</h1>
          <p className="t-body mb-8 text-ink-muted">
            Your wallet is how you seal, check in on, and execute a will.
          </p>
          <Button onClick={connectWallet} loading={isLoading}>
            Connect wallet
          </Button>
        </div>
      </main>
    );
  }

  const status = !myWill ? "None" : myWill.will.executed ? "Executed" : myWill.will.graceStart !== 0n ? "Grace" : "Active";
  const ethSealed = myWill ? (Number(myWill.will.totalEth) / 1e18).toFixed(4) : "0";

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="t-eyebrow mb-3">DASHBOARD</div>
      <h1 className="t-h1 mb-10">Your inheritance, at a glance.</h1>

      {/* Liveness hero */}
      <VaultCard eyebrow="Liveness" className="mb-8">
        <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <Pulse state={myWill?.will.graceStart ? "grace" : myWill ? "alive" : "flat"} height={72} />
            <p className="t-body mt-5 text-ink-muted">
              Check in regularly to keep your will sealed. If you go quiet, a grace
              period begins before anything can execute.
            </p>
            <div className="mt-6">
              <Link href="/checkin">
                <Button>
                  Check in
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-card border border-hairline p-5">
            <DataRow label="Wallet" address={account ?? ""} />
            <DataRow label="Balance" value={`${parseFloat(balance || "0").toFixed(4)} ETH`} />
          </div>
        </div>
      </VaultCard>

      {/* Real stat tiles from the connected owner's will */}
      <div className="mb-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Wills sealed" value={myWill ? "1" : "0"} />
        <StatTile label="Status" value={status} />
        <StatTile label="ETH sealed" value={ethSealed} unit="ETH" />
        <StatTile label="Vetoes" value={myWill ? String(myWill.will.vetoCount) : "0"} />
      </div>

      {/* Actions */}
      <div className="t-eyebrow mb-5">ACTIONS</div>
      <div className="grid gap-5 sm:grid-cols-2">
        {ACTIONS.map(({ href, title, body, Icon }) => (
          <Link key={href} href={href} className="block">
            <VaultCard interactive className="h-full">
              <div className="flex items-start justify-between">
                <Icon size={22} strokeWidth={1.5} className="text-ink-muted" />
                <ArrowRight size={18} className="text-ink-faint" />
              </div>
              <h3 className="t-h3 mt-4">{title}</h3>
              <p className="t-body mt-2 text-ink-muted">{body}</p>
            </VaultCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

Note: swapped "Beneficiaries" for "ETH sealed" — beneficiary count isn't
retrievable on-chain (the registry never stores it, only the Merkle root),
so a "Beneficiaries" tile has no honest data source. "ETH sealed" and
"Vetoes" are both real `Will` struct fields.

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `app/app/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add frontend/src/app/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): wire real dashboard stat tiles

Replaces the four hardcoded "0" stat tiles (comment: "placeholder counts
until data wiring in Phase 1d") with real values from getMyWill(account):
Wills sealed (0/1), Status (None/Active/Grace/Executed), ETH sealed, Vetoes.
Dropped "Beneficiaries" — that count has no on-chain source at all (the
registry stores only the Merkle root, never a count or the beneficiary list;
that's the privacy design, not a gap) — showing it would mean inventing a
number.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Full verification pass

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Full type-check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: zero errors anywhere in the project.

- [ ] **Step 2: Full production build**

Run: `cd frontend && npm run build`
Expected: build succeeds (15/15 pages), no new warnings beyond the pre-existing `web-worker`/`ffjavascript` bundler warning (already present before this rewire, unrelated to it).

- [ ] **Step 3: Headless-browser smoke test of every touched page**

Start the dev server and screenshot each disconnected-state page (no wallet available in a headless sandbox, so this verifies the "connect wallet" gate renders correctly and nothing throws client-side) plus check console for errors:

```bash
cd frontend
(nohup npm run dev > /tmp/zk-afterlife-dev.log 2>&1 &)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q 200 && break
  sleep 1
done
```

Then, in the scratchpad directory, write and run a playwright-core script (Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, the pattern already used throughout this project) that navigates to `/`, `/app`, `/register`, `/checkin`, `/veto`, `/execute`, `/claims`, `/withdraw`, takes a screenshot of each, and collects `console` `error`/`warning` events. Read each screenshot. Expected: every page renders its "Connect to …" gate (or, for `/withdraw`, the explainer content) with no console errors.

Stop the dev server after: `pkill -f "next dev"`.

- [ ] **Step 4: Confirm no dead imports remain**

Run: `cd frontend && grep -rln "blockchainService\|OnChainVerifierService\|from '@/services/blockchain'\|from '@/services/onChainVerifier'" src/`
Expected: no output (zero matches).

- [ ] **Step 5: Final commit if verification uncovered fixes**

If any step above required a code fix, commit it separately with a message describing exactly what verification caught:

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add -A frontend/
git commit -m "fix(frontend): <exact issue found during verification>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

If verification passed clean, no commit is needed for this task.

---

## Task 13: Update newplan.md

**Files:**
- Modify: `/Users/ashiq/Documents/code/ZK-AfterLife/newplan.md`

**Interfaces:** none.

- [ ] **Step 1: Check off the two named Phase 1d boxes and note the expanded scope**

Read the current Phase 1d section, then check off:
```
- [x] Remove mock fallbacks in `noirService`; fail loudly. `(fix(frontend): no mock proofs)`
- [x] Fix commitment to Poseidon everywhere (register + withdraw). `(fix(frontend): poseidon commitment)`
```
Add a note directly under them (matching the style already used for Phase 1a-1c's "done on main" annotations) that this expanded into a full rewire of `blockchain.ts`/`onChainVerifier.ts`/`config/contracts.ts` to target `InheritanceRegistry` (contracts deleted in Phase 1c's collapse left the old integration layer dead), referencing `docs/superpowers/specs/2026-08-10-frontend-registry-rewire-design.md`. Leave the remaining two Phase 1d boxes ("real Self verification", "e2e test") unchecked — explicitly out of scope for this rewire per the spec.

- [ ] **Step 2: Commit**

```bash
cd /Users/ashiq/Documents/code/ZK-AfterLife
git add newplan.md
git commit -m "$(cat <<'EOF'
docs: update newplan.md for the frontend registry rewire

Checks off Phase 1d's two named boxes (no mock proofs, poseidon commitment),
which expanded into a full rewire of the frontend's contract-integration
layer once exploration found it still targeted contracts deleted in Phase
1c. See docs/superpowers/specs/2026-08-10-frontend-registry-rewire-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push everything**

```bash
git push origin main
```

---

## Self-review notes (already applied above)

- **Spec coverage:** every section of the design spec maps to a task —
  ABI/config (Task 1), registryService (Task 2), noirService cleanup (Task 3),
  WalletContext + deletions (Task 4), register (Task 5), checkin (Task 6),
  veto (Task 7), execute (Task 8), claims (Task 9), withdraw (Task 10),
  dashboard (Task 11). Verification (Task 12) and plan bookkeeping (Task 13)
  close the loop.
- **Type consistency checked:** `WillRecord`/`MyWill`/`GraceConfig` are
  defined once in Task 2 and imported (not redefined) in every later task.
  `useWallet()`'s surface is defined once in Task 4 and every page task
  destructures only names that exist on it. `Hex`/`Address` types from viem
  are used consistently for commitments/addresses throughout.
- **No placeholders:** every step has real, complete code — no
  "similar to Task N" shortcuts; each page task includes its full new file.
