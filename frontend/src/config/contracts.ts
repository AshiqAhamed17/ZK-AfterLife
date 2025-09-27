
export interface ContractAddresses {
  noirIntegration: string;
  l1Heartbeat: string;
  aztecExecutor: string;
  l1AztecBridge: string;
  willVerifier: string;
  willExecutor: string;
  selfHumanVerifier: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  rpcUrls?: string[]; // Fallback RPC URLs
  blockExplorer: string;
  contracts: ContractAddresses;
}

// Network configurations
export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: '',
    contracts: {
      noirIntegration: '0x0000000000000000000000000000000000000000',
      l1Heartbeat: '0x0000000000000000000000000000000000000000',
      aztecExecutor: '0x0000000000000000000000000000000000000000',
      l1AztecBridge: '0x0000000000000000000000000000000000000000',
      willVerifier: '0x0000000000000000000000000000000000000000',
      willExecutor: '0x0000000000000000000000000000000000000000',
      selfHumanVerifier: '0x0000000000000000000000000000000000000000',
    }
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/K-dyWLoE75nGD_Z3Cv2Bg0tvUY67mYUw',
    rpcUrls: [
      'https://eth-sepolia.g.alchemy.com/v2/K-dyWLoE75nGD_Z3Cv2Bg0tvUY67mYUw',

      'https://sepolia.infura.io/v3/e72ac8bced0f45b586f6eb9e42642aef',
      'https://rpc.sepolia.org',
      'https://sepolia.gateway.tenderly.co'
    ],
    blockExplorer: 'https://sepolia.etherscan.io',
    contracts: {
      noirIntegration: '0x5CBa8f717a4eAfA0d933bB6A4d79e8d846A7B7a1',
      l1Heartbeat: '0x7Fa088F570dfB4878F72D666eaBB5e3f629f64Af',
      aztecExecutor: '0x629A83dD1aB7323759f7a26f0Dc18Df7814E625f',
      l1AztecBridge: '0xE4Ee7a0ed33c9e024e0bE9E061901e0C6CA95107',
      willVerifier: '0x0Ddcac19C955abBa465AC748c287fd4CFf6CB88d',
      willExecutor: '0x98545459892861c3d757d351CF2722947CC15cda',
      selfHumanVerifier: '0x0000000000000000000000000000000000000000', // Not deployed on Sepolia
    }
  },
  'celo-sepolia': {
    chainId: 11142220,
    name: 'Celo Sepolia',
    rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
    blockExplorer: 'https://celo-sepolia.blockscout.com/',
    contracts: {
      noirIntegration: '0x0000000000000000000000000000000000000000',
      l1Heartbeat: '0x0000000000000000000000000000000000000000',
      aztecExecutor: '0x0000000000000000000000000000000000000000',
      l1AztecBridge: '0x0000000000000000000000000000000000000000',
      willVerifier: '0x0000000000000000000000000000000000000000',
      willExecutor: '0x0000000000000000000000000000000000000000',
      selfHumanVerifier: '0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B', // Deployed Self Human Verifier
    }
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/HT-LaOGKJPuPsrbQ7y5waFEpqOh6DX-n', // Update with your key
    blockExplorer: 'https://etherscan.io',
    contracts: {
      noirIntegration: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Update after deployment
      l1Heartbeat: '0xef11D1c2aA48826D4c41e54ab82D1Ff5Ad8A64Ca',
      aztecExecutor: '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37',
      l1AztecBridge: '0x76ca03a67C049477FfB09694dFeF00416dB69746',
      willVerifier: '0x0000000000000000000000000000000000000000', // Update after deployment
      willExecutor: '0x0000000000000000000000000000000000000000', // Update after deployment
      selfHumanVerifier: '0x0000000000000000000000000000000000000000', // Update after deployment
    }
  }
};

// Default network
export const DEFAULT_NETWORK = 'sepolia';

// Get current network configuration
export function getCurrentNetwork(): NetworkConfig {
  if (typeof window !== 'undefined') {
    const chainId = window.ethereum?.chainId;
    if (chainId) {
      const network = Object.values(NETWORKS).find(n => n.chainId === parseInt(chainId));
      if (network) return network;
    }
  }

  return NETWORKS[DEFAULT_NETWORK];
}

// Get contract addresses for current network
export function getContractAddresses(): ContractAddresses {
  return getCurrentNetwork().contracts;
}

// Check if network is supported
export function isNetworkSupported(chainId: number): boolean {
  return Object.values(NETWORKS).some(n => n.chainId === chainId);
}

// Get network by chain ID
export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(NETWORKS).find(n => n.chainId === chainId) || null;
}
