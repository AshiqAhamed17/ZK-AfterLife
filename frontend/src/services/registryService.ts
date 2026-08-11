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
