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
