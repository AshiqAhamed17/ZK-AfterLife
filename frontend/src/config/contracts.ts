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

// Next.js's build-time NEXT_PUBLIC_* inlining only rewrites statically
// analyzable `process.env.NEXT_PUBLIC_X` member expressions — a dynamically
// built key like `process.env[`NEXT_PUBLIC_${prefix}_X`]` is never replaced,
// so in the browser bundle `process.env` doesn't carry it and every lookup
// silently returns undefined. These two helpers take the already-resolved
// (statically referenced) env values as arguments instead of building keys
// at runtime, so each `NEXT_PUBLIC_*` var below must be referenced literally
// at its call site.
function contracts(
  registry: string | undefined,
  usdc: string | undefined,
  selfVerifier: string | undefined
): ContractAddresses {
  return {
    inheritanceRegistry: registry || ZERO,
    usdc: usdc || ZERO,
    selfVerifier: selfVerifier || ZERO,
  };
}

function deployBlockOf(raw: string | undefined): bigint {
  return raw ? BigInt(raw) : 0n;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: "Localhost",
    rpcUrl: "http://localhost:8545",
    blockExplorer: "",
    contracts: contracts(
      process.env.NEXT_PUBLIC_LOCALHOST_REGISTRY_ADDRESS,
      process.env.NEXT_PUBLIC_LOCALHOST_USDC_ADDRESS,
      process.env.NEXT_PUBLIC_LOCALHOST_SELF_VERIFIER_ADDRESS
    ),
    selfVerifierIsMock: true,
    deployBlock: deployBlockOf(process.env.NEXT_PUBLIC_LOCALHOST_DEPLOY_BLOCK),
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
    contracts: contracts(
      process.env.NEXT_PUBLIC_SEPOLIA_REGISTRY_ADDRESS,
      process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS,
      process.env.NEXT_PUBLIC_SEPOLIA_SELF_VERIFIER_ADDRESS
    ),
    selfVerifierIsMock: true,
    deployBlock: deployBlockOf(process.env.NEXT_PUBLIC_SEPOLIA_DEPLOY_BLOCK),
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: contracts(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_REGISTRY_ADDRESS,
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS,
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_SELF_VERIFIER_ADDRESS
    ),
    selfVerifierIsMock: true,
    deployBlock: deployBlockOf(process.env.NEXT_PUBLIC_BASE_SEPOLIA_DEPLOY_BLOCK),
  },
  zkSyncSepolia: {
    chainId: 300,
    name: "zkSync Era Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC_URL || "https://sepolia.era.zksync.dev",
    blockExplorer: "https://sepolia.explorer.zksync.io",
    contracts: contracts(
      process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_REGISTRY_ADDRESS,
      process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_USDC_ADDRESS,
      process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_SELF_VERIFIER_ADDRESS
    ),
    selfVerifierIsMock: true,
    deployBlock: deployBlockOf(process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_DEPLOY_BLOCK),
  },
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com",
    blockExplorer: "https://etherscan.io",
    contracts: contracts(
      process.env.NEXT_PUBLIC_MAINNET_REGISTRY_ADDRESS,
      process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS,
      process.env.NEXT_PUBLIC_MAINNET_SELF_VERIFIER_ADDRESS
    ),
    selfVerifierIsMock: false,
    deployBlock: deployBlockOf(process.env.NEXT_PUBLIC_MAINNET_DEPLOY_BLOCK),
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
