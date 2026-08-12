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
  // True when `contracts.selfVerifier` is a MockSelfVerifier (no real Self
  // Protocol hub on this chain), not a genuine Self-gated deployment. Self's
  // real IdentityVerificationHub only exists on Celo/Celo Sepolia today, and
  // InheritanceRegistry.register() calls selfVerifier same-chain — so a real
  // Self gate can't work on any of these EVM testnets without cross-chain
  // messaging. The frontend uses this to show a testnet-only verify bypass
  // instead of the real (here, unusable) Self QR flow.
  selfVerifierIsMock: boolean;
  // Block InheritanceRegistry was deployed at on this chain — bounds the
  // WillRegistered event scan so it doesn't rescan from genesis on every load.
  deployBlock: bigint;
}

const ZERO = "0x0000000000000000000000000000000000000000";

function contractsFor(prefix: string): ContractAddresses {
  return {
    inheritanceRegistry: process.env[`NEXT_PUBLIC_${prefix}_REGISTRY_ADDRESS`] || ZERO,
    usdc: process.env[`NEXT_PUBLIC_${prefix}_USDC_ADDRESS`] || ZERO,
    selfVerifier: process.env[`NEXT_PUBLIC_${prefix}_SELF_VERIFIER_ADDRESS`] || ZERO,
  };
}

function deployBlockFor(prefix: string): bigint {
  const raw = process.env[`NEXT_PUBLIC_${prefix}_DEPLOY_BLOCK`];
  return raw ? BigInt(raw) : 0n;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: "Localhost",
    rpcUrl: "http://localhost:8545",
    blockExplorer: "",
    contracts: contractsFor("LOCALHOST"),
    selfVerifierIsMock: true,
    deployBlock: deployBlockFor("LOCALHOST"),
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
    contracts: contractsFor("SEPOLIA"),
    selfVerifierIsMock: true,
    deployBlock: deployBlockFor("SEPOLIA"),
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: contractsFor("BASE_SEPOLIA"),
    selfVerifierIsMock: true,
    deployBlock: deployBlockFor("BASE_SEPOLIA"),
  },
  zkSyncSepolia: {
    chainId: 300,
    name: "zkSync Era Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC_URL || "https://sepolia.era.zksync.dev",
    blockExplorer: "https://sepolia.explorer.zksync.io",
    contracts: contractsFor("ZKSYNC_SEPOLIA"),
    selfVerifierIsMock: true,
    deployBlock: deployBlockFor("ZKSYNC_SEPOLIA"),
  },
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com",
    blockExplorer: "https://etherscan.io",
    contracts: contractsFor("MAINNET"),
    selfVerifierIsMock: false,
    deployBlock: deployBlockFor("MAINNET"),
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
