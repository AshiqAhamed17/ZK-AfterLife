// Noir Integration Service for zk-afterlife-agent
// Handles communication between frontend, Noir circuit, and Solidity contracts

import { ethers } from 'ethers';

// Types for Noir circuit integration
export interface WillProof {
  willCommitment: string;
  merkleRoot: string;
  totalEth: string;
  totalUsdc: string;
  totalNftCount: string;
  proof: string; // ZK proof data
  publicInputs: string[]; // Public inputs for verification
}

export interface BeneficiaryAllocation {
  address: string;
  ethAmount: string;
  usdcAmount: string;
  nftCount: string;
}

export interface WillData {
  willSalt: string;
  willData: string[];
  beneficiaryCount: string;
  beneficiaryAddresses: string[];
  beneficiaryEth: string[];
  beneficiaryUsdc: string[];
  beneficiaryNfts: string[];
}

export class NoirIntegrationService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: {
    noirIntegration?: ethers.Contract;
    l1Heartbeat?: ethers.Contract;
    aztecExecutor?: ethers.Contract;
  } = {};

  // Contract ABIs (you'll need to generate these from your contracts)
  private readonly NOIR_INTEGRATION_ABI = [
    'function submitWillProof(tuple(bytes32,bytes32,uint256,uint256,uint256,bytes,bytes32[]), tuple(address,uint256,uint256,uint256)[]) external',
    'function getWillProof(bytes32) external view returns(tuple(bytes32,bytes32,uint256,uint256,uint256,bytes,bytes32[]))',
    'function isWillExecuted(bytes32) external view returns(bool)'
  ];

  private readonly L1_HEARTBEAT_ABI = [
    'function checkIn() external',
    'function getLastCheckIn(address) external view returns(uint256)',
    'function isInGracePeriod(address) external view returns(bool)'
  ];

  private readonly AZTEC_EXECUTOR_ABI = [
    'function registerWill(bytes32,bytes32,bytes) external',
    'function enableExecution(bytes32) external',
    'function executeWill(bytes32,tuple(address,uint256,uint256,uint256)[],bytes) external'
  ];

  constructor() { }

  // Initialize the service with Web3 provider
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      console.log('NoirIntegrationService initialized successfully');
    } else {
      throw new Error('Web3 provider not found');
    }
  }

  // Set contract addresses
  setContractAddresses(addresses: {
    noirIntegration: string;
    l1Heartbeat: string;
    aztecExecutor: string;
  }): void {
    if (!this.provider) {
      throw new Error('Service not initialized');
    }

    this.contracts.noirIntegration = new ethers.Contract(
      addresses.noirIntegration,
      this.NOIR_INTEGRATION_ABI,
      this.signer!
    );

    this.contracts.l1Heartbeat = new ethers.Contract(
      addresses.l1Heartbeat,
      this.L1_HEARTBEAT_ABI,
      this.signer!
    );

    this.contracts.aztecExecutor = new ethers.Contract(
      addresses.aztecExecutor,
      this.AZTEC_EXECUTOR_ABI,
      this.signer!
    );
  }

  // Generate will commitment hash (matches Noir circuit logic)
  generateWillCommitment(willData: WillData): string {
    // This should match the logic in your Noir circuit
    let willDataHash = BigInt(0);

    for (let i = 0; i < willData.willData.length; i++) {
      const data = BigInt(willData.willData[i]);
      const weight = BigInt(i + 1);
      willDataHash += data * weight;
    }

    const saltHash = BigInt(willData.willSalt) * BigInt(2) + BigInt(1);
    const commitment = willDataHash + saltHash;

    return '0x' + commitment.toString(16).padStart(64, '0');
  }

  // Generate merkle root (matches Noir circuit logic)
  generateMerkleRoot(willData: WillData): string {
    const beneficiaryHashes: bigint[] = [];

    // Generate hashes for each beneficiary
    for (let i = 0; i < 8; i++) {
      if (i < parseInt(willData.beneficiaryCount)) {
        const addr = BigInt(willData.beneficiaryAddresses[i]);
        const eth = BigInt(willData.beneficiaryEth[i]);
        const usdc = BigInt(willData.beneficiaryUsdc[i]);
        const nft = BigInt(willData.beneficiaryNfts[i]);

        // Leaf hash: addr * 1M + eth * 10K + usdc * 100 + nft
        const leafHash = addr * BigInt(1000000) + eth * BigInt(10000) + usdc * BigInt(100) + nft;
        beneficiaryHashes.push(leafHash);
      } else {
        // Empty leaf for inactive slots
        beneficiaryHashes.push(BigInt(0));
      }
    }

    // Build tree layers (simplified version matching your circuit)
    const layer1: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      const left = beneficiaryHashes[i * 2];
      const right = beneficiaryHashes[i * 2 + 1];
      layer1.push(left + right * BigInt(1000000));
    }

    const layer2: bigint[] = [];
    for (let i = 0; i < 2; i++) {
      const left = layer1[i * 2];
      const right = layer1[i * 2 + 1];
      layer2.push(left + right * BigInt(1000000000));
    }

    const root = layer2[0] + layer2[1] * BigInt(1000000000000);
    return '0x' + root.toString(16).padStart(64, '0');
  }

  // Submit will proof for execution
  async submitWillProof(
    willData: WillData,
    beneficiaries: BeneficiaryAllocation[]
  ): Promise<string> {
    if (!this.contracts.noirIntegration) {
      throw new Error('Contract not initialized');
    }

    // Generate commitment and merkle root
    const willCommitment = this.generateWillCommitment(willData);
    const merkleRoot = this.generateMerkleRoot(willData);

    // Create proof structure (placeholder for actual ZK proof)
    const proof: WillProof = {
      willCommitment,
      merkleRoot,
      totalEth: willData.beneficiaryEth.reduce((sum, eth) => sum + BigInt(eth), BigInt(0)).toString(),
      totalUsdc: willData.beneficiaryUsdc.reduce((sum, usdc) => sum + BigInt(usdc), BigInt(0)).toString(),
      totalNftCount: willData.beneficiaryNfts.reduce((sum, nft) => sum + BigInt(nft), BigInt(0)).toString(),
      proof: '0x', // TODO: Generate actual ZK proof
      publicInputs: [willCommitment, merkleRoot]
    };

    // Convert beneficiaries to contract format
    const contractBeneficiaries = beneficiaries.map(ben => ({
      beneficiary: ben.address,
      ethAmount: ben.ethAmount,
      usdcAmount: ben.usdcAmount,
      nftCount: ben.nftCount
    }));

    // Submit proof
    const tx = await this.contracts.noirIntegration.submitWillProof(
      proof,
      contractBeneficiaries
    );

    return tx.hash;
  }

  // Check in to L1Heartbeat
  async checkIn(): Promise<string> {
    if (!this.contracts.l1Heartbeat) {
      throw new Error('Contract not initialized');
    }

    const tx = await this.contracts.l1Heartbeat.checkIn();
    return tx.hash;
  }

  // Get last check-in time
  async getLastCheckIn(address: string): Promise<number> {
    if (!this.contracts.l1Heartbeat) {
      throw new Error('Contract not initialized');
    }

    const lastCheckIn = await this.contracts.l1Heartbeat.getLastCheckIn(address);
    return lastCheckIn.toNumber();
  }

  // Check if address is in grace period
  async isInGracePeriod(address: string): Promise<boolean> {
    if (!this.contracts.l1Heartbeat) {
      throw new Error('Contract not initialized');
    }

    return await this.contracts.l1Heartbeat.isInGracePeriod(address);
  }

  // Get will execution status
  async isWillExecuted(willCommitment: string): Promise<boolean> {
    if (!this.contracts.noirIntegration) {
      throw new Error('Contract not initialized');
    }

    return await this.contracts.noirIntegration.isWillExecuted(willCommitment);
  }

  // Get will proof
  async getWillProof(willCommitment: string): Promise<WillProof | null> {
    if (!this.contracts.noirIntegration) {
      throw new Error('Contract not initialized');
    }

    try {
      const proof = await this.contracts.noirIntegration.getWillProof(willCommitment);
      return proof;
    } catch (error) {
      console.error('Error getting will proof:', error);
      return null;
    }
  }
}

// Export singleton instance
export const noirIntegrationService = new NoirIntegrationService();
