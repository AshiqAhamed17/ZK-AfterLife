// frontend/src/services/registryService.ts
// Real on-chain integration for InheritanceRegistry. Replaces blockchain.ts +
// onChainVerifier.ts, which targeted contracts deleted in Phase 1c.

import { getContractAddresses, getCurrentNetwork } from "@/config/contracts";
import { INHERITANCE_REGISTRY_ABI } from "@/config/abi/inheritanceRegistry";
import { ERC20_ABI } from "@/config/abi/erc20";
import { MOCK_SELF_VERIFIER_ABI, SELF_HUMAN_VERIFIER_ABI } from "@/config/abi/selfHumanVerifier";
import {
  Address,
  Hex,
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
} from "viem";
import { baseSepolia, hardhat, mainnet, sepolia, zkSyncSepoliaTestnet } from "viem/chains";

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
  inactivityPeriod: bigint;
  gracePeriod: bigint;
  vetoThreshold: number;
  vetoMembers: Address[];
}

export interface MyWill {
  commitment: Hex;
  will: WillRecord;
}

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

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
    inactivityPeriod: raw.inactivityPeriod,
    gracePeriod: raw.gracePeriod,
    vetoThreshold: Number(raw.vetoThreshold),
    vetoMembers: raw.vetoMembers,
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
        // viem's `localhost` preset has id 1337 (Ganache-era convention);
        // Anvil/Hardhat actually use 31337, which is `hardhat` in viem/chains.
        return hardhat;
      case 11155111:
        return sepolia;
      case 84532:
        return baseSepolia;
      case 300:
        return zkSyncSepoliaTestnet;
      case 1:
        return mainnet;
      default:
        return hardhat;
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

  /**
   * Simulate a write before sending it. If the call would revert (e.g. a
   * timing gate like `StillActive`), this throws a decoded error *before*
   * any transaction is sent — no gas spent, and no doomed transaction ever
   * reaches gas estimation. Sending a doomed transaction directly can make
   * some wallet/RPC combinations fall back to a huge, bogus gas estimate,
   * which providers like Infura then reject outright ("gas limit too
   * high") — a confusing infra-level error that hides the real, useful
   * revert reason. Simulating first avoids that class of failure entirely.
   */
  private async simulateThenWrite(params: {
    address: Address;
    abi: any;
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
  }): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");
    // A call to an address with no contract code (like the zero address
    // fallback in contracts.ts for undeployed networks) doesn't revert at
    // the EVM level — it just returns success with empty data — so
    // simulateContract below would NOT catch this and would happily hand
    // back a request that sends a real transaction to the burn address.
    if (params.address.toLowerCase() === ZERO_ADDRESS) {
      throw new Error(
        "No contract is deployed on the network your wallet is connected to. Switch MetaMask to Sepolia or Base Sepolia and try again."
      );
    }
    const { request } = await this.publicClient.simulateContract({
      ...params,
      account: this.walletClient.account,
    });
    return (await this.walletClient.writeContract(request)) as Hex;
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
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`Transaction ${hash} reverted on-chain.`);
    }
    return receipt;
  }

  async getTransactionStatus(hash: Hex): Promise<"pending" | "success" | "failed"> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash });
      return receipt.status === "success" ? "success" : "failed";
    } catch {
      return "pending";
    }
  }

  /**
   * Testnet-only: mark an address verified on MockSelfVerifier, which has no
   * access control (setVerified is permissionless by design as a test double).
   * Only meaningful when getCurrentNetwork().selfVerifierIsMock is true — the
   * real Self hub has no such function and this call would simply fail there.
   */
  async mockVerifySelf(address: Address): Promise<Hex> {
    const hash = await this.simulateThenWrite({
      address: this.selfVerifierAddress,
      abi: MOCK_SELF_VERIFIER_ABI,
      functionName: "setVerified",
      args: [address, true],
    });
    await this.waitForTransaction(hash);
    return hash;
  }

  async isSelfVerified(address: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.selfVerifierAddress,
      abi: SELF_HUMAN_VERIFIER_ABI,
      functionName: "isFullyVerified",
      args: [address],
    })) as boolean;
  }

  async isVetoMemberOf(commitment: Hex, who: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "isVetoMemberOf",
      args: [commitment, who],
    })) as boolean;
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
    // Scan from the current network's deploy block (falls back to genesis
    // if unset) — most RPC providers don't restrict eth_getLogs range when a
    // specific contract address is given, so 0n is safe, just slower.
    const deployBlock = getCurrentNetwork().deployBlock;

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
        fromBlock: deployBlock,
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
    totalUsdcBaseUnits: bigint,
    inactivityPeriod: bigint,
    gracePeriod: bigint,
    vetoMembers: Address[],
    vetoThreshold: bigint
  ): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");

    if (totalUsdcBaseUnits > 0n) {
      const approveHash = await this.simulateThenWrite({
        address: this.usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [this.registryAddress, totalUsdcBaseUnits],
      });
      await this.waitForTransaction(approveHash);
    }

    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "register",
      args: [
        commitment,
        merkleRoot,
        totalEthWei,
        totalUsdcBaseUnits,
        0n,
        inactivityPeriod,
        gracePeriod,
        vetoMembers,
        vetoThreshold,
      ],
      value: totalEthWei,
    });
  }

  async checkIn(commitment: Hex): Promise<Hex> {
    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "checkIn",
      args: [commitment],
    });
  }

  async triggerGracePeriod(commitment: Hex): Promise<Hex> {
    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "triggerGracePeriod",
      args: [commitment],
    });
  }

  async veto(commitment: Hex): Promise<Hex> {
    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "veto",
      args: [commitment],
    });
  }

  async executeWill(commitment: Hex, proof: Hex): Promise<Hex> {
    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "executeWill",
      args: [commitment, proof],
    });
  }

  async claim(
    commitment: Hex,
    ethAmountWei: bigint,
    usdcAmountBaseUnits: bigint,
    leafIndex: bigint,
    siblings: [Hex, Hex, Hex]
  ): Promise<Hex> {
    return await this.simulateThenWrite({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "claim",
      args: [commitment, ethAmountWei, usdcAmountBaseUnits, leafIndex, siblings],
    });
  }
}

export const registryService = new RegistryService();
