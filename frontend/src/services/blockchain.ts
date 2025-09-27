// Blockchain Service for zk-afterlife-agent
// Handles Ethereum L1 interactions using viem

import { getContractAddresses, getCurrentNetwork } from '@/config/contracts';
import { Address, Hex, createPublicClient, createWalletClient, custom, formatEther, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { localhost, mainnet, sepolia } from 'viem/chains';

// Contract ABIs (simplified for core functionality)
const L1_HEARTBEAT_ABI = [
  {
    inputs: [],
    name: 'checkIn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastCheckIn',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'graceStart',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'inactivityPeriod',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'gracePeriod',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'inactiveFinalized',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'veto',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vetoCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vetoThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'isVetoMember',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'hasVetoed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVetoMembers',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const AZTEC_EXECUTOR_ABI = [
  {
    inputs: [
      { name: 'willCommitment', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'proof', type: 'bytes' }
    ],
    name: 'registerWill',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'enableExecution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'willCommitment', type: 'bytes32' },
      { name: 'beneficiaries', type: 'tuple[]' },
      { name: 'proof', type: 'bytes' }
    ],
    name: 'executeWill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const L1_AZTEC_BRIDGE_ABI = [
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'sendToAztec',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const WILL_EXECUTOR_ABI = [
  {
    inputs: [
      { name: 'willCommitment', type: 'bytes32' },
      { name: 'totalEth', type: 'uint256' },
      { name: 'totalUsdc', type: 'uint256' },
      { name: 'totalNfts', type: 'uint256' }
    ],
    name: 'registerWill',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'withdrawEth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'withdrawAllEth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'isWillRegistered',
    outputs: [{ name: 'exists', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'isWillExecuted',
    outputs: [{ name: 'executed', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'willCommitment', type: 'bytes32' }],
    name: 'getRegisteredWill',
    outputs: [
      {
        name: 'will',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'registrationTime', type: 'uint256' },
          { name: 'totalEth', type: 'uint256' },
          { name: 'totalUsdc', type: 'uint256' },
          { name: 'totalNfts', type: 'uint256' },
          { name: 'exists', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStats',
    outputs: [
      { name: 'registered', type: 'uint256' },
      { name: 'executed', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'willCommitment', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'totalEth', type: 'uint256' },
      { name: 'totalUsdc', type: 'uint256' },
      { name: 'totalNftCount', type: 'uint256' },
      { name: 'proof', type: 'bytes' }
    ],
    name: 'executeWill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface CheckInStatus {
  lastCheckIn: bigint;
  isInGracePeriod: boolean;
  gracePeriodStart: bigint;
  timeUntilGracePeriod: bigint;
  hasRegisteredWills?: boolean;
  willCommitment?: string;
}

export interface WillRegistration {
  willCommitment: Hex;
  merkleRoot: Hex;
  proof: Hex;
}

export interface Beneficiary {
  address: Address;
  ethAmount: bigint;
  usdcAmount: bigint;
  nftCount: bigint;
}

export class BlockchainService {
  private publicClient: any;
  private walletClient: any;
  private account: any;
  private contracts: {
    l1Heartbeat?: any;
    aztecExecutor?: any;
    l1AztecBridge?: any;
    willExecutor?: any;
  } = {};

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    const network = getCurrentNetwork();

    // Create public client for reading
    this.publicClient = createPublicClient({
      chain: this.getChain(network.chainId),
      transport: http(network.rpcUrl),
    });

    // Wallet client will be initialized when user connects
  }

  // Initialize wallet client using an already-connected provider and known account
  initializeWithProvider(account: Address) {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }

    this.walletClient = createWalletClient({
      account,
      chain: this.getChain(getCurrentNetwork().chainId),
      transport: custom(window.ethereum),
    });

    this.account = account;
    this.initializeContracts();
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

  // Initialize wallet connection
  async connectWallet(): Promise<Address> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const account = accounts[0] as Address;

      // Create wallet client with proper transport
      this.walletClient = createWalletClient({
        account,
        chain: this.getChain(getCurrentNetwork().chainId),
        transport: custom(window.ethereum),
      });

      this.account = account;
      this.initializeContracts();

      return account;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Initialize contract instances
  private initializeContracts() {
    const addresses = getContractAddresses();

    this.contracts.l1Heartbeat = {
      address: addresses.l1Heartbeat as Address,
      abi: L1_HEARTBEAT_ABI,
    };

    this.contracts.aztecExecutor = {
      address: addresses.aztecExecutor as Address,
      abi: AZTEC_EXECUTOR_ABI,
    };

    this.contracts.l1AztecBridge = {
      address: addresses.l1AztecBridge as Address,
      abi: L1_AZTEC_BRIDGE_ABI,
    };

    this.contracts.willExecutor = {
      address: addresses.willExecutor as Address,
      abi: WILL_EXECUTOR_ABI,
    };
  }

  // Get current account
  getCurrentAccount(): Address | null {
    return this.account || null;
  }

  // Test contract connectivity
  async testContractConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.contracts.willExecutor) {
        return { success: false, message: 'WillExecutor contract not initialized' };
      }

      // Check if contract exists
      const contractCode = await this.publicClient.getCode({
        address: this.contracts.willExecutor.address as `0x${string}`
      });

      if (contractCode === '0x') {
        return { success: false, message: 'Contract not deployed at address' };
      }

      // Check if contract is paused
      const isPaused = await this.publicClient.readContract({
        address: this.contracts.willExecutor.address as `0x${string}`,
        abi: [{ name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'paused',
      });

      // Get contract stats
      const stats = await this.publicClient.readContract({
        address: this.contracts.willExecutor.address as `0x${string}`,
        abi: [{ name: 'getStats', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'registered', type: 'uint256' }, { name: 'executed', type: 'uint256' }] }],
        functionName: 'getStats',
      });

      return {
        success: true,
        message: 'Contract is accessible and working',
        details: {
          address: this.contracts.willExecutor.address,
          isPaused,
          stats: {
            registered: stats[0].toString(),
            executed: stats[1].toString()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Contract test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  // Fetch all registered wills from blockchain events
  async getAllRegisteredWills(): Promise<any[]> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    try {
      // Get current block number first
      const currentBlock = await this.publicClient.getBlockNumber();
      console.log('Current block number:', currentBlock);

      // For Alchemy free tier, we need to limit the block range to 10 blocks
      // We'll fetch logs from the last 9 blocks to ensure we stay within the 10-block limit
      const fromBlock = currentBlock > 9n ? currentBlock - 9n : 0n;

      console.log(`Fetching logs from block ${fromBlock} to ${currentBlock}`);

      // Get WillRegistered events from the contract
      const logs = await this.publicClient.getLogs({
        address: this.contracts.willExecutor.address as `0x${string}`,
        event: {
          type: 'event',
          name: 'WillRegistered',
          inputs: [
            { name: 'willCommitment', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'totalEth', type: 'uint256', indexed: false },
            { name: 'totalUsdc', type: 'uint256', indexed: false },
            { name: 'totalNfts', type: 'uint256', indexed: false }
          ]
        },
        fromBlock: fromBlock,
        toBlock: currentBlock
      });

      console.log('Found WillRegistered events:', logs.length);

      return this.processWillLogs(logs);
    } catch (error) {
      console.error('Error fetching registered wills:', error);

      // If the error is about block range, try with a smaller range
      if (error instanceof Error && (error.message.includes('block range') || error.message.includes('10 block range'))) {
        console.warn('Alchemy free tier limitation detected. Trying with smaller block range...');

        try {
          // Get current block number again for retry
          const currentBlock = await this.publicClient.getBlockNumber();
          // Try with even smaller range (5 blocks)
          const smallerFromBlock = currentBlock > 4n ? currentBlock - 4n : 0n;
          console.log(`Retrying with smaller range: ${smallerFromBlock} to ${currentBlock}`);

          const logs = await this.publicClient.getLogs({
            address: this.contracts.willExecutor.address as `0x${string}`,
            event: {
              type: 'event',
              name: 'WillRegistered',
              inputs: [
                { name: 'willCommitment', type: 'bytes32', indexed: true },
                { name: 'owner', type: 'address', indexed: true },
                { name: 'totalEth', type: 'uint256', indexed: false },
                { name: 'totalUsdc', type: 'uint256', indexed: false },
                { name: 'totalNfts', type: 'uint256', indexed: false }
              ]
            },
            fromBlock: smallerFromBlock,
            toBlock: currentBlock
          });

          console.log('Successfully fetched logs with smaller range:', logs.length);
          return this.processWillLogs(logs);
        } catch (retryError) {
          console.error('Retry with smaller range also failed:', retryError);
          console.warn('Alchemy free tier limitation: Unable to fetch logs. Please try registering a new will or upgrade your Alchemy plan.');
          return [];
        }
      }

      throw new Error(`Failed to fetch registered wills: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process will logs and return formatted will data
  private async processWillLogs(logs: any[]): Promise<any[]> {
    console.log(`Processing ${logs.length} will logs...`);
    const wills = [];
    for (const log of logs) {
      try {
        const willCommitment = log.args.willCommitment as `0x${string}`;
        const owner = log.args.owner as `0x${string}`;
        const totalEth = log.args.totalEth as bigint;
        const totalUsdc = log.args.totalUsdc as bigint;
        const totalNfts = log.args.totalNfts as bigint;

        console.log(`Processing will: ${willCommitment}, owner: ${owner}, totalEth: ${totalEth.toString()}`);

        // Get additional will details
        const isExecuted = await this.isWillExecuted(willCommitment);

        // Get the actual will details from the contract
        let registrationTime: bigint;
        try {
          const registeredWill = await this.publicClient.readContract({
            ...this.contracts.willExecutor,
            functionName: 'getRegisteredWill',
            args: [willCommitment]
          });
          registrationTime = BigInt(registeredWill.registrationTime);
        } catch (error) {
          console.warn('Could not get will details from contract, using current time as fallback:', error);
          // Fallback: use current time if we can't get registration time
          registrationTime = BigInt(Math.floor(Date.now() / 1000));
        }

        // Check if will is in grace period or executable
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const inactivityPeriod = BigInt(30); // 30 seconds for demo
        const gracePeriod = BigInt(15); // 15 seconds for demo

        const timeSinceRegistration = currentTime - registrationTime;
        const isInGracePeriod = timeSinceRegistration >= inactivityPeriod && timeSinceRegistration < (inactivityPeriod + gracePeriod);
        const isExecutable = timeSinceRegistration >= (inactivityPeriod + gracePeriod) && !isExecuted;

        wills.push({
          willCommitment,
          owner,
          totalEth: totalEth.toString(),
          totalUsdc: totalUsdc.toString(),
          totalNfts: totalNfts.toString(),
          registrationTime: registrationTime,
          isExecuted,
          isInGracePeriod,
          isExecutable,
          lastCheckIn: registrationTime, // For demo, using registration time
          gracePeriodStart: registrationTime + inactivityPeriod
        });
        console.log(`Successfully processed will: ${willCommitment}`);
      } catch (error) {
        console.error('Error processing will log:', error);
      }
    }

    console.log(`Successfully processed ${wills.length} wills`);
    return wills;
  }

  // Alternative method to get wills using contract storage instead of events
  async getAllRegisteredWillsFromStorage(): Promise<any[]> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    try {
      // Get the total number of registered wills
      const stats = await this.getWillExecutorStats();
      const totalWills = Number(stats.registered);

      console.log('Total registered wills from contract:', totalWills);

      if (totalWills === 0) {
        return [];
      }

      // For demo purposes, we'll create mock wills based on the stats
      // In production, you'd need to implement a way to enumerate all wills
      // This could be done by storing will commitments in an array in the contract
      const wills: any[] = [];

      // Since we can't enumerate all wills easily with the current contract design,
      // we'll return an empty array and suggest the user register a new will
      console.log('Note: Will enumeration requires contract modification for full functionality');

      return wills;
    } catch (error) {
      console.error('Error fetching wills from storage:', error);
      return [];
    }
  }

  // Get wills where current user is a beneficiary
  async getWillsForBeneficiary(userAddress: string): Promise<any[]> {
    const allWills = await this.getAllRegisteredWills();

    // For demo purposes, we'll show all wills since we don't have beneficiary data in events
    // In production, you'd need to store beneficiary data in events or use a different approach
    return allWills.filter(will =>
      will.owner.toLowerCase() !== userAddress.toLowerCase() &&
      (will.isInGracePeriod || will.isExecutable)
    );
  }

  // Check if user can claim from a specific will
  async canUserClaimFromWill(willCommitment: Hex, userAddress: string): Promise<boolean> {
    try {
      // For demo purposes, we'll allow any user to claim from any executable will
      // In production, you'd need to verify the user is actually a beneficiary
      const willDetails = await this.getWillDetails(willCommitment);
      const isExecuted = await this.isWillExecuted(willCommitment);

      return !isExecuted && willDetails.exists;
    } catch (error) {
      console.error('Error checking claim eligibility:', error);
      return false;
    }
  }

  // Claim ETH from a will (for beneficiaries)
  async claimFromWill(willCommitment: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    // Check if user can claim
    const canClaim = await this.canUserClaimFromWill(willCommitment, this.account);
    if (!canClaim) {
      throw new Error('You are not eligible to claim from this will');
    }

    // For demo purposes, we'll use the withdrawEth function
    // In production, this would be a proper claim function
    const hash = await this.walletClient.writeContract({
      ...this.contracts.willExecutor,
      functionName: 'withdrawEth',
      args: [willCommitment],
    });

    return hash;
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return !!this.account;
  }

  // Get account balance
  async getBalance(address?: Address): Promise<string> {
    const targetAddress = address || this.account;
    if (!targetAddress) throw new Error('No address provided');

    const balance = await this.publicClient.getBalance({ address: targetAddress });
    return formatEther(balance);
  }

  // Check-in to L1Heartbeat
  async checkIn(): Promise<Hex> {
    if (!this.account || !this.contracts.l1Heartbeat) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.l1Heartbeat,
      functionName: 'checkIn',
    });

    return hash;
  }

  // Get check-in status
  async getCheckInStatus(address?: Address): Promise<CheckInStatus> {
    if (!this.contracts.l1Heartbeat) {
      throw new Error('Contracts not initialized');
    }

    const userAddress = address || this.account;
    if (!userAddress) {
      throw new Error('No address provided');
    }

    console.log('Getting check-in status for user:', userAddress);

    // First, check if user has any registered wills
    const userWills = await this.getUserRegisteredWills(userAddress);
    console.log('User wills found:', userWills.length);

    if (userWills.length === 0) {
      console.log('No registered wills found, returning default status');
      // Return default status for user with no wills
      return {
        lastCheckIn: BigInt(0),
        isInGracePeriod: false,
        gracePeriodStart: BigInt(0),
        timeUntilGracePeriod: BigInt(0),
        hasRegisteredWills: false
      };
    }

    // Get the most recent will for this user
    const mostRecentWill = userWills[0]; // Assuming they're sorted by registration time
    console.log('Using most recent will:', mostRecentWill.willCommitment);

    const [lastCheckIn, graceStart, inactivityPeriod, gracePeriod, inactiveFinalized] = await Promise.all([
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'lastCheckIn'
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'graceStart'
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'inactivityPeriod'
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'gracePeriod'
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'inactiveFinalized'
      }),
    ]);

    console.log('Heartbeat contract data:', {
      lastCheckIn: lastCheckIn.toString(),
      graceStart: graceStart.toString(),
      inactivityPeriod: inactivityPeriod.toString(),
      gracePeriod: gracePeriod.toString(),
      inactiveFinalized: inactiveFinalized.toString()
    });

    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    // Check if in grace period
    const isInGracePeriod = graceStart > 0 && currentTime <= graceStart + gracePeriod;

    // Calculate time until grace period starts
    const timeUntilGracePeriod = lastCheckIn + inactivityPeriod - currentTime;

    const result = {
      lastCheckIn,
      isInGracePeriod,
      gracePeriodStart: graceStart,
      timeUntilGracePeriod: timeUntilGracePeriod > 0 ? timeUntilGracePeriod : BigInt(0),
      hasRegisteredWills: true,
      willCommitment: mostRecentWill.willCommitment
    };

    console.log('Check-in status result:', {
      ...result,
      lastCheckIn: result.lastCheckIn.toString(),
      gracePeriodStart: result.gracePeriodStart.toString(),
      timeUntilGracePeriod: result.timeUntilGracePeriod.toString()
    });

    return result;
  }

  // Get wills registered by a specific user
  async getUserRegisteredWills(userAddress: Address): Promise<any[]> {
    try {
      // Get all registered wills from the last 10 blocks
      const allWills = await this.getAllRegisteredWills();

      // Filter for this specific user
      return allWills.filter(will =>
        will.owner.toLowerCase() === userAddress.toLowerCase()
      );
    } catch (error) {
      console.error('Error fetching user wills:', error);
      return [];
    }
  }

  // Check if a specific will exists by commitment (doesn't rely on event logs)
  async checkWillExists(willCommitment: string): Promise<boolean> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    try {
      return await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillRegistered',
        args: [willCommitment as `0x${string}`]
      });
    } catch (error) {
      console.error('Error checking will existence:', error);
      return false;
    }
  }

  // Check if a will is executable (grace period has passed)
  async isWillExecutable(willCommitment: string): Promise<boolean> {
    if (!this.contracts.willExecutor || !this.contracts.l1Heartbeat) {
      throw new Error('Contracts not initialized');
    }

    try {
      // Check if will is registered and not executed
      const [isRegistered, isExecuted] = await Promise.all([
        this.publicClient.readContract({
          ...this.contracts.willExecutor,
          functionName: 'isWillRegistered',
          args: [willCommitment as `0x${string}`]
        }),
        this.publicClient.readContract({
          ...this.contracts.willExecutor,
          functionName: 'isWillExecuted',
          args: [willCommitment as `0x${string}`]
        })
      ]);

      if (!isRegistered || isExecuted) {
        return false;
      }

      // Check if grace period has passed
      const [lastCheckIn, graceStart, inactivityPeriod, gracePeriod] = await Promise.all([
        this.publicClient.readContract({
          ...this.contracts.l1Heartbeat,
          functionName: 'lastCheckIn'
        }),
        this.publicClient.readContract({
          ...this.contracts.l1Heartbeat,
          functionName: 'graceStart'
        }),
        this.publicClient.readContract({
          ...this.contracts.l1Heartbeat,
          functionName: 'inactivityPeriod'
        }),
        this.publicClient.readContract({
          ...this.contracts.l1Heartbeat,
          functionName: 'gracePeriod'
        })
      ]);

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const totalWaitTime = inactivityPeriod + gracePeriod;

      // Will is executable if grace period has started and passed
      if (graceStart > 0) {
        return currentTime >= graceStart + gracePeriod;
      } else {
        // Grace period hasn't started yet, check if inactivity period has passed
        return currentTime >= lastCheckIn + totalWaitTime;
      }
    } catch (error) {
      console.error('Error checking will executability:', error);
      return false;
    }
  }

  // Execute a will (simplified version for demo)
  async executeWillSimple(willCommitment: string): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    try {
      console.log('Executing will with commitment:', willCommitment);

      // Get the actual will details first
      let willDetails;
      try {
        willDetails = await this.getWillDetails(willCommitment as `0x${string}`);
        if (!willDetails || !willDetails.exists) {
          throw new Error('Will not found or does not exist');
        }
        console.log('Will details:', willDetails);
      } catch (error) {
        console.error('Failed to get will details, trying alternative approach:', error);

        // Alternative: Try to get will details using getRegisteredWill
        try {
          const registeredWill = await this.publicClient.readContract({
            ...this.contracts.willExecutor,
            functionName: 'getRegisteredWill',
            args: [willCommitment as `0x${string}`]
          });

          if (!registeredWill.exists) {
            throw new Error('Will not found or does not exist');
          }

          willDetails = {
            exists: true,
            owner: registeredWill.owner,
            totalEth: registeredWill.totalEth,
            totalUsdc: registeredWill.totalUsdc,
            totalNfts: registeredWill.totalNfts,
            registrationTime: registeredWill.registrationTime
          };

          console.log('Will details from getRegisteredWill:', willDetails);
        } catch (altError) {
          console.error('Alternative approach also failed:', altError);
          throw new Error('Will not found or does not exist');
        }
      }

      // Create a proper merkleRoot (32 bytes of zeros for demo)
      const merkleRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';

      // Create a mock proof structure that matches the expected ABI
      const mockProof = {
        a: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000'],
        b: [
          ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000']
        ],
        c: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000']
      };

      console.log('Calling executeWill with:', {
        willCommitment,
        merkleRoot,
        totalEth: willDetails.totalEth,
        totalUsdc: willDetails.totalUsdc,
        totalNfts: willDetails.totalNfts,
        proof: mockProof
      });

      const hash = await this.walletClient.writeContract({
        ...this.contracts.willExecutor,
        functionName: 'executeWill',
        args: [
          willCommitment as `0x${string}`,
          merkleRoot as `0x${string}`,
          willDetails.totalEth,
          willDetails.totalUsdc,
          willDetails.totalNfts,
          mockProof
        ]
      });

      console.log('Execution transaction submitted, tx hash:', hash);

      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log('Execution successful, tx confirmed:', hash);
        return hash;
      } else {
        throw new Error('Transaction failed: execution reverted');
      }
    } catch (error) {
      console.error('Error executing will:', error);
      throw new Error(`Failed to execute will: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get executed wills for a user (beneficiary) - Enhanced version that works around Alchemy limitations
  async getExecutedWillsForBeneficiary(userAddress: string): Promise<any[]> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    try {
      console.log('Getting executed wills for beneficiary:', userAddress);

      // Method 1: Try to get from event logs (limited by Alchemy)
      const eventWills = await this.getAllRegisteredWills();
      console.log('Wills from events:', eventWills.length);

      // Method 2: Check specific will commitments that we know exist
      // This is a workaround for Alchemy limitations - we'll check known will commitments
      const knownWillCommitments = [
        '0x06ecb45ac40d9b09be15cf448ee3a5b2c73ba07ee2948dbb5fcc4b44417d7b90', // New will from logs
        '0x15a7f53aa83b747f82626993c29aeaa61819864086b68a3cb63a0c599b83d925', // Your will from console
        '0x2d7c52135eb2ae75eaa93d36268571575a632a7340aefe97af8025e5c34c2f70', // Previous will
        '0x279597a979e43225e84ac83f27351459c4690b4ca6030d4a5c71d44bd50bac47', // Another will
        '0x2f1968ac4dd60060271bc2697f92bc773b63856bfc59b54622ddd80889503131', // Another will
        '0x174bd33d68608ac4f2c9bc21f21ea01173619f99d6dcc832a397de3c7024276f', // Another will
      ];

      const allWills = [...eventWills];

      // Check known will commitments directly
      for (const commitment of knownWillCommitments) {
        try {
          const isRegistered = await this.isWillRegistered(commitment as `0x${string}`);
          if (isRegistered) {
            console.log('Found registered will via direct check:', commitment);

            // Get will details
            const willDetails = await this.getWillDetails(commitment as `0x${string}`);
            if (willDetails && willDetails.exists) {
              allWills.push({
                willCommitment: commitment,
                owner: willDetails.owner,
                totalEth: willDetails.totalEth,
                totalUsdc: willDetails.totalUsdc,
                totalNfts: willDetails.totalNfts,
                registrationTime: willDetails.registrationTime,
                isExecuted: false, // Will be checked below
                isInGracePeriod: false,
                isExecutable: false,
                lastCheckIn: willDetails.registrationTime,
                gracePeriodStart: BigInt(0)
              });
            }
          }
        } catch (error) {
          console.log('Will not found or error checking:', commitment, error);
        }
      }

      console.log('Total wills found (events + direct):', allWills.length);

      // Filter for executed wills where user is a beneficiary
      const executedWills = [];

      for (const will of allWills) {
        try {
          // Check if will is executed
          const isExecuted = await this.isWillExecuted(will.willCommitment);

          if (isExecuted) {
            console.log('Found executed will:', will.willCommitment);

            // For demo purposes: Allow claiming from any executed will
            // In production, you'd check the actual beneficiary list from the will data
            console.log('Adding executed will for claiming:', will.willCommitment);
            executedWills.push({
              willCommitment: will.willCommitment,
              owner: will.owner,
              executionTime: BigInt(Math.floor(Date.now() / 1000)), // Mock execution time
              totalEth: will.totalEth,
              totalUsdc: will.totalUsdc,
              totalNfts: will.totalNfts,
              canClaim: true
            });
          } else {
            // Check if will is ready to execute
            const isExecutable = await this.isWillExecutable(will.willCommitment);
            if (isExecutable) {
              console.log('Will is ready to execute:', will.willCommitment);
              // Auto-execute the will
              try {
                await this.executeWillSimple(will.willCommitment);
                console.log('Auto-executed will:', will.willCommitment);

                // Add to executed wills for claiming (demo: allow any user to claim)
                console.log('Adding auto-executed will for claiming:', will.willCommitment);
                executedWills.push({
                  willCommitment: will.willCommitment,
                  owner: will.owner,
                  executionTime: BigInt(Math.floor(Date.now() / 1000)),
                  totalEth: will.totalEth,
                  totalUsdc: will.totalUsdc,
                  totalNfts: will.totalNfts,
                  canClaim: true
                });
              } catch (error) {
                console.error('Failed to auto-execute will:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error checking will execution status:', error);
        }
      }

      console.log('Found executed wills for beneficiary:', executedWills.length);
      return executedWills;
    } catch (error) {
      console.error('Error getting executed wills:', error);
      return [];
    }
  }

  // Check and execute wills that are ready for execution
  async checkAndExecuteWills(): Promise<void> {
    if (!this.account || !this.contracts.willExecutor || !this.contracts.l1Heartbeat) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    try {
      console.log('Checking for wills ready to execute...');

      // Get all registered wills
      const allWills = await this.getAllRegisteredWills();
      console.log('Checking', allWills.length, 'registered wills');

      for (const will of allWills) {
        try {
          // Check if will is already executed
          const isExecuted = await this.isWillExecuted(will.willCommitment);
          if (isExecuted) {
            console.log('Will already executed:', will.willCommitment);
            continue;
          }

          // Check if will is executable
          const isExecutable = await this.isWillExecutable(will.willCommitment);
          if (isExecutable) {
            console.log('Will is executable, executing:', will.willCommitment);

            // Execute the will
            await this.executeWillSimple(will.willCommitment);
            console.log('Successfully executed will:', will.willCommitment);
          } else {
            console.log('Will not yet executable:', will.willCommitment);
          }
        } catch (error) {
          console.error('Error processing will:', will.willCommitment, error);
        }
      }
    } catch (error) {
      console.error('Error checking and executing wills:', error);
    }
  }

  // Alternative execution method using withdrawEth (simpler approach)
  async executeWillAlternative(willCommitment: string): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    try {
      console.log('Executing will using alternative method (withdrawEth):', willCommitment);

      // First check if will is registered
      const isRegistered = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillRegistered',
        args: [willCommitment as `0x${string}`]
      });

      if (!isRegistered) {
        throw new Error('Will not found or not registered');
      }

      // Check if will is already executed
      const isExecuted = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillExecuted',
        args: [willCommitment as `0x${string}`]
      });

      if (isExecuted) {
        throw new Error('Cannot execute an already executed will');
      }

      // Get will details to validate ownership and assets
      const registeredWill = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'getRegisteredWill',
        args: [willCommitment as `0x${string}`]
      });

      if (!registeredWill.exists) {
        throw new Error('Will not found in contract storage');
      }

      // Check if the user is the owner
      if (registeredWill.owner.toLowerCase() !== this.account.toLowerCase()) {
        throw new Error('Only the will owner can execute the will');
      }

      // Check if there's any ETH to withdraw
      if (registeredWill.totalEth === 0n) {
        throw new Error('No ETH to execute from this will');
      }

      console.log('Will execution details:', {
        owner: registeredWill.owner,
        totalEth: registeredWill.totalEth.toString(),
        totalUsdc: registeredWill.totalUsdc.toString(),
        totalNfts: registeredWill.totalNfts.toString()
      });

      // For demo purposes, we'll use withdrawEth which doesn't require ZK proof
      // This effectively "executes" the will by withdrawing the ETH
      const hash = await this.walletClient.writeContract({
        ...this.contracts.willExecutor,
        functionName: 'withdrawEth',
        args: [willCommitment as `0x${string}`]
      });

      console.log('Alternative execution transaction submitted, tx hash:', hash);

      // Wait for transaction confirmation
      console.log('Waiting for alternative execution confirmation...');
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log('Alternative execution successful, tx confirmed:', hash);
        return hash;
      } else {
        throw new Error('Alternative execution failed: transaction reverted');
      }
    } catch (error) {
      console.error('Error executing will with alternative method:', error);
      throw new Error(`Failed to execute will: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Direct withdrawal method - bypasses execution entirely
  async directWithdrawEth(willCommitment: string): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    try {
      console.log('Direct ETH withdrawal for will:', willCommitment);

      // First check if will is registered
      const isRegistered = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillRegistered',
        args: [willCommitment as `0x${string}`]
      });

      if (!isRegistered) {
        throw new Error('Will not found or not registered');
      }

      // Check if will is already executed
      const isExecuted = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillExecuted',
        args: [willCommitment as `0x${string}`]
      });

      if (isExecuted) {
        throw new Error('Cannot withdraw from an executed will');
      }

      // Get will details to show what we're withdrawing
      let willDetails;
      try {
        const registeredWill = await this.publicClient.readContract({
          ...this.contracts.willExecutor,
          functionName: 'getRegisteredWill',
          args: [willCommitment as `0x${string}`]
        });

        if (!registeredWill.exists) {
          throw new Error('Will not found in contract storage');
        }

        willDetails = {
          exists: true,
          owner: registeredWill.owner,
          totalEth: registeredWill.totalEth,
          totalUsdc: registeredWill.totalUsdc,
          totalNfts: registeredWill.totalNfts,
          registrationTime: registeredWill.registrationTime
        };

        // Check if the user is the owner
        if (willDetails.owner.toLowerCase() !== this.account.toLowerCase()) {
          throw new Error('Only the will owner can withdraw ETH');
        }

        // Check if there's any ETH to withdraw
        if (willDetails.totalEth === 0n) {
          throw new Error('No ETH to withdraw from this will');
        }

        console.log('Withdrawing ETH amount:', willDetails.totalEth.toString());
      } catch (error) {
        console.error('Failed to get will details:', error);
        throw new Error(`Failed to get will details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const hash = await this.walletClient.writeContract({
        ...this.contracts.willExecutor,
        functionName: 'withdrawEth',
        args: [willCommitment as `0x${string}`]
      });

      console.log('Direct withdrawal transaction submitted, tx hash:', hash);

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log('Direct withdrawal successful, tx confirmed:', hash);
        return hash;
      } else {
        throw new Error('Direct withdrawal failed: transaction reverted');
      }
    } catch (error) {
      console.error('Error in direct withdrawal:', error);
      throw new Error(`Failed to withdraw ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Claim ETH from executed will (for beneficiaries)
  async claimFromExecutedWill(willCommitment: string): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    try {
      console.log('Claiming from executed will:', willCommitment);

      // First check if will is registered
      const isRegistered = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillRegistered',
        args: [willCommitment as `0x${string}`]
      });

      if (!isRegistered) {
        throw new Error('Will not found or not registered');
      }

      // Check if will is executed
      const isExecuted = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'isWillExecuted',
        args: [willCommitment as `0x${string}`]
      });

      if (!isExecuted) {
        throw new Error('Will must be executed before beneficiaries can claim');
      }

      // Get will details to check if there are any assets to claim
      const registeredWill = await this.publicClient.readContract({
        ...this.contracts.willExecutor,
        functionName: 'getRegisteredWill',
        args: [willCommitment as `0x${string}`]
      });

      if (!registeredWill.exists) {
        throw new Error('Will not found in contract storage');
      }

      // Check if there are any assets to claim
      if (registeredWill.totalEth === 0n && registeredWill.totalUsdc === 0n && registeredWill.totalNfts === 0) {
        throw new Error('No assets available to claim from this will');
      }

      console.log('Will execution details:', {
        totalEth: registeredWill.totalEth.toString(),
        totalUsdc: registeredWill.totalUsdc.toString(),
        totalNfts: registeredWill.totalNfts.toString()
      });

      // TODO: In a production system, this would call a proper beneficiary claim function
      // For now, we'll throw an error since the contract doesn't have beneficiary claim functionality
      throw new Error('Beneficiary claiming functionality not yet implemented in the contract. This feature requires additional contract development.');

    } catch (error) {
      console.error('Error claiming from executed will:', error);
      throw new Error(`Failed to claim from will: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Register will with ETH deposit
  async registerWill(willRegistration: any): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    console.log('Registering will with data:', willRegistration);

    // Calculate total ETH from beneficiaries (in ETH, not wei)
    const totalEthInEth = willRegistration.beneficiaries?.reduce((sum: number, ben: any) => {
      return sum + parseFloat(ben.ethAmount || '0');
    }, 0) || 0;

    const totalUsdc = willRegistration.beneficiaries?.reduce((sum: number, ben: any) => {
      return sum + parseFloat(ben.usdcAmount || '0');
    }, 0) || 0;

    const totalNfts = willRegistration.beneficiaries?.reduce((sum: number, ben: any) => {
      return sum + parseInt(ben.nftCount || '0');
    }, 0) || 0;

    console.log('Calculated totals:', { totalEthInEth, totalUsdc, totalNfts });

    // Convert ETH to wei for the transaction
    const ethInWei = parseEther(totalEthInEth.toString());
    const totalEthBigInt = ethInWei; // Use the same value for both msg.value and totalEth

    console.log('ETH in wei:', ethInWei.toString());
    console.log('Total ETH BigInt:', totalEthBigInt.toString());
    console.log('Will commitment:', willRegistration.willCommitment);

    // Check if user has enough ETH balance
    const balance = await this.publicClient.getBalance({ address: this.account! });
    console.log('User balance:', formatEther(balance), 'ETH');
    console.log('Required ETH:', totalEthInEth, 'ETH');

    if (balance < ethInWei) {
      throw new Error(`Insufficient ETH balance. Required: ${totalEthInEth} ETH, Available: ${formatEther(balance)} ETH`);
    }

    // Check if contract exists and is accessible
    try {
      const contractCode = await this.publicClient.getCode({ address: this.contracts.willExecutor.address as `0x${string}` });
      if (contractCode === '0x') {
        throw new Error('WillExecutor contract not deployed at the specified address');
      }
      console.log('Contract code found, proceeding with transaction');

      // Check if contract is paused
      const isPaused = await this.publicClient.readContract({
        address: this.contracts.willExecutor.address as `0x${string}`,
        abi: [{ name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'paused',
      });

      if (isPaused) {
        throw new Error('WillExecutor contract is paused');
      }
      console.log('Contract is not paused, proceeding with transaction');
    } catch (error) {
      console.error('Error checking contract:', error);
      throw new Error('Failed to verify contract deployment');
    }

    try {
      const hash = await this.walletClient.writeContract({
        ...this.contracts.willExecutor,
        functionName: 'registerWill',
        args: [willRegistration.willCommitment, totalEthBigInt, BigInt(Math.floor(totalUsdc)), BigInt(totalNfts)],
        value: ethInWei, // Send ETH with the transaction
      });
      return hash;
    } catch (error) {
      console.error('Contract call failed:', error);
      throw new Error(`Contract call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Withdraw ETH from a will
  async withdrawEth(willCommitment: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.willExecutor,
      functionName: 'withdrawEth',
      args: [willCommitment],
    });

    return hash;
  }

  // Withdraw all ETH from a will
  async withdrawAllEth(willCommitment: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.willExecutor,
      functionName: 'withdrawAllEth',
      args: [willCommitment],
    });

    return hash;
  }

  // Get will details
  async getWillDetails(willCommitment: Hex): Promise<any> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    const isRegistered = await this.publicClient.readContract({
      ...this.contracts.willExecutor,
      functionName: 'isWillRegistered',
      args: [willCommitment],
    });

    const isExecuted = await this.publicClient.readContract({
      ...this.contracts.willExecutor,
      functionName: 'isWillExecuted',
      args: [willCommitment],
    });

    return {
      exists: isRegistered, // Use isRegistered as exists for compatibility
      isRegistered,
      isExecuted,
    };
  }

  // Enable will execution
  async enableExecution(willCommitment: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.aztecExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.aztecExecutor,
      functionName: 'enableExecution',
      args: [willCommitment],
    });

    return hash;
  }

  // Execute will (using WillExecutor instead of AztecExecutor)
  async executeWill(willCommitment: Hex, beneficiaries: Beneficiary[], proof: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.willExecutor) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    // Calculate totals from beneficiaries
    const totalEth = beneficiaries.reduce((sum, b) => sum + b.ethAmount, BigInt(0));
    const totalUsdc = beneficiaries.reduce((sum, b) => sum + b.usdcAmount, BigInt(0));
    const totalNftCount = beneficiaries.reduce((sum, b) => sum + b.nftCount, BigInt(0));

    // For now, we'll use a placeholder merkle root - this should be calculated from beneficiaries
    const merkleRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const hash = await this.walletClient.writeContract({
      ...this.contracts.willExecutor,
      functionName: 'executeWill',
      args: [willCommitment, merkleRoot, totalEth, totalUsdc, totalNftCount, proof],
    });

    return hash;
  }

  // Get WillExecutor stats
  async getWillExecutorStats(): Promise<{ registered: bigint, executed: bigint }> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    const [registered, executed] = await this.publicClient.readContract({
      ...this.contracts.willExecutor,
      functionName: 'getStats',
    });

    return { registered, executed };
  }

  // Check if will is registered
  async isWillRegistered(willCommitment: Hex): Promise<boolean> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    return await this.publicClient.readContract({
      ...this.contracts.willExecutor,
      functionName: 'isWillRegistered',
      args: [willCommitment],
    });
  }

  // Check if will is executed
  async isWillExecuted(willCommitment: Hex): Promise<boolean> {
    if (!this.contracts.willExecutor) {
      throw new Error('Contracts not initialized');
    }

    return await this.publicClient.readContract({
      ...this.contracts.willExecutor,
      functionName: 'isWillExecuted',
      args: [willCommitment],
    });
  }

  // Veto functions
  async castVeto(): Promise<Hex> {
    if (!this.account || !this.contracts.l1Heartbeat) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.l1Heartbeat,
      functionName: 'veto',
    });

    return hash;
  }

  async getVetoStatus(): Promise<{
    vetoCount: bigint;
    vetoThreshold: bigint;
    isVetoMember: boolean;
    hasVetoed: boolean;
    vetoMembers: Address[];
  }> {
    if (!this.account || !this.contracts.l1Heartbeat) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const [vetoCount, vetoThreshold, isVetoMember, hasVetoed, vetoMembers] = await Promise.all([
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'vetoCount',
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'vetoThreshold',
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'isVetoMember',
        args: [this.account],
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'hasVetoed',
        args: [this.account],
      }),
      this.publicClient.readContract({
        ...this.contracts.l1Heartbeat,
        functionName: 'getVetoMembers',
      }),
    ]);

    return {
      vetoCount,
      vetoThreshold,
      isVetoMember,
      hasVetoed,
      vetoMembers: vetoMembers as Address[],
    };
  }

  // Send data to Aztec L2
  async sendToAztec(target: Address, data: Hex): Promise<Hex> {
    if (!this.account || !this.contracts.l1AztecBridge) {
      throw new Error('Wallet not connected or contracts not initialized');
    }

    const hash = await this.walletClient.writeContract({
      ...this.contracts.l1AztecBridge,
      functionName: 'sendToAztec',
      args: [target, data],
    });

    return hash;
  }

  // Wait for transaction confirmation
  async waitForTransaction(hash: Hex): Promise<any> {
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  // Get transaction status
  async getTransactionStatus(hash: Hex): Promise<'pending' | 'success' | 'failed'> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash });
      return receipt.status === 'success' ? 'success' : 'failed';
    } catch {
      return 'pending';
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
