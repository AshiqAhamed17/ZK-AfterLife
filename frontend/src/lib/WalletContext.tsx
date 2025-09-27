// Wallet Context for zk-afterlife-agent
// Manages wallet connections and provides blockchain functionality

'use client';

import { blockchainService } from '@/services/blockchain';
import { NoirService } from '@/services/noirService';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Address } from 'viem';

interface WalletContextType {
  // Wallet state
  isConnected: boolean;
  account: Address | null;
  balance: string;

  // Connection methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // Blockchain methods
  checkIn: () => Promise<string>;
  getCheckInStatus: (address?: Address) => Promise<any>;

  // Will methods
  registerWill: (willData: any) => Promise<string>;
  executeWill: (willCommitment: string, beneficiaries: any[], proof: string) => Promise<string>;
  withdrawEth: (willCommitment: string) => Promise<string>;
  withdrawAllEth: (willCommitment: string) => Promise<string>;
  getWillDetails: (willCommitment: string) => Promise<any>;
  getWillExecutorStats: () => Promise<{ registered: bigint, executed: bigint }>;
  isWillRegistered: (willCommitment: string) => Promise<boolean>;
  isWillExecuted: (willCommitment: string) => Promise<boolean>;
  getAllRegisteredWills: () => Promise<any[]>;
  getWillsForBeneficiary: (userAddress: string) => Promise<any[]>;
  canUserClaimFromWill: (willCommitment: string, userAddress: string) => Promise<boolean>;
  claimFromWill: (willCommitment: string) => Promise<string>;
  isWillExecutable: (willCommitment: string) => Promise<boolean>;
  executeWillSimple: (willCommitment: string) => Promise<string>;
  executeWillAlternative: (willCommitment: string) => Promise<string>;
  directWithdrawEth: (willCommitment: string) => Promise<string>;
  checkAndExecuteWills: () => Promise<void>;
  getExecutedWillsForBeneficiary: (userAddress: string) => Promise<any[]>;
  claimFromExecutedWill: (willCommitment: string) => Promise<string>;
  testContractConnection: () => Promise<{ success: boolean; message: string; details?: any }>;
  castVeto: () => Promise<string>;
  getVetoStatus: () => Promise<{ vetoCount: bigint, vetoThreshold: bigint, isVetoMember: boolean, hasVetoed: boolean, vetoMembers: Address[] }>;

  // Services
  noirService: NoirService;

  // Loading states
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

  // Create service instances
  const noirService = new NoirService();

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await noirService.initialize();
        console.log('Services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setError('Failed to initialize services');
      }
    };

    initializeServices();
  }, [noirService]);

  // Check for existing wallet connection
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            const connectedAccount = accounts[0] as Address;
            setAccount(connectedAccount);
            setIsConnected(true);
            // Ensure blockchain service is initialized with this existing connection
            try {
              blockchainService.initializeWithProvider(connectedAccount);
            } catch (e) {
              console.error('Failed to initialize blockchain service from existing connection:', e);
            }
            await updateBalance(connectedAccount);
          }
        } catch (error) {
          console.error('Failed to check existing connection:', error);
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setAccount(null);
          setIsConnected(false);
          setBalance('0');
        } else {
          // Account changed
          const newAccount = accounts[0] as Address;
          setAccount(newAccount);
          setIsConnected(true);
          try {
            blockchainService.initializeWithProvider(newAccount);
          } catch (e) {
            console.error('Failed to reinitialize blockchain service after account change:', e);
          }
          await updateBalance(newAccount);
        }
      };

      const handleChainChanged = () => {
        // Reload page when chain changes
        window.location.reload();
      };

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
      const bal = await blockchainService.getBalance(address);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const connectedAccount = await blockchainService.connectWallet();
      setAccount(connectedAccount);
      setIsConnected(true);
      await updateBalance(connectedAccount);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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

  const checkIn = async (): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await blockchainService.checkIn();
      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to check in:', error);
      setError('Failed to check in. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCheckInStatus = async (address?: Address) => {
    try {
      return await blockchainService.getCheckInStatus(address);
    } catch (error) {
      console.error('Failed to get check-in status:', error);
      throw error;
    }
  };

  const registerWill = async (willData: any): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate ZK proof
      const proof = await noirService.generateWillProof(willData);

      // Register will on blockchain with ETH deposit
      const hash = await blockchainService.registerWill({
        willCommitment: proof.willCommitment as `0x${string}`,
        merkleRoot: proof.merkleRoot as `0x${string}`,
        proof: proof.proof as `0x${string}`,
        beneficiaries: willData.beneficiaries || [],
      });

      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to register will:', error);
      setError('Failed to register will. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawEth = async (willCommitment: string): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await blockchainService.withdrawEth(willCommitment as `0x${string}`);
      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to withdraw ETH:', error);
      setError('Failed to withdraw ETH. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawAllEth = async (willCommitment: string): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await blockchainService.withdrawAllEth(willCommitment as `0x${string}`);
      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to withdraw all ETH:', error);
      setError('Failed to withdraw all ETH. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getWillDetails = async (willCommitment: string): Promise<any> => {
    try {
      return await blockchainService.getWillDetails(willCommitment as `0x${string}`);
    } catch (error) {
      console.error('Failed to get will details:', error);
      throw error;
    }
  };

  const executeWill = async (willCommitment: string, beneficiaries: any[], proof: string): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await blockchainService.executeWill(willCommitment as `0x${string}`, beneficiaries, proof as `0x${string}`);
      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to execute will:', error);
      setError('Failed to execute will. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getWillExecutorStats = async () => {
    try {
      return await blockchainService.getWillExecutorStats();
    } catch (error) {
      console.error('Failed to get will executor stats:', error);
      throw error;
    }
  };

  const isWillRegistered = async (willCommitment: string) => {
    try {
      return await blockchainService.isWillRegistered(willCommitment as `0x${string}`);
    } catch (error) {
      console.error('Failed to check if will is registered:', error);
      throw error;
    }
  };

  const isWillExecuted = async (willCommitment: string) => {
    try {
      return await blockchainService.isWillExecuted(willCommitment as `0x${string}`);
    } catch (error) {
      console.error('Failed to check if will is executed:', error);
      throw error;
    }
  };

  const castVeto = async (): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const hash = await blockchainService.castVeto();
      await blockchainService.waitForTransaction(hash);
      return hash;
    } catch (error) {
      console.error('Failed to cast veto:', error);
      setError('Failed to cast veto. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getVetoStatus = async () => {
    try {
      return await blockchainService.getVetoStatus();
    } catch (error) {
      console.error('Failed to get veto status:', error);
      throw error;
    }
  };

  // New functions for execute page
  const getAllRegisteredWills = async () => {
    try {
      return await blockchainService.getAllRegisteredWills();
    } catch (error) {
      console.error('Failed to get all registered wills:', error);
      throw error;
    }
  };

  const getWillsForBeneficiary = async (userAddress: string) => {
    try {
      return await blockchainService.getWillsForBeneficiary(userAddress);
    } catch (error) {
      console.error('Failed to get wills for beneficiary:', error);
      throw error;
    }
  };

  const canUserClaimFromWill = async (willCommitment: string, userAddress: string) => {
    try {
      return await blockchainService.canUserClaimFromWill(willCommitment as `0x${string}`, userAddress);
    } catch (error) {
      console.error('Failed to check claim eligibility:', error);
      throw error;
    }
  };

  const claimFromWill = async (willCommitment: string) => {
    try {
      return await blockchainService.claimFromWill(willCommitment as `0x${string}`);
    } catch (error) {
      console.error('Failed to claim from will:', error);
      throw error;
    }
  };

  const testContractConnection = async () => {
    try {
      return await blockchainService.testContractConnection();
    } catch (error) {
      console.error('Failed to test contract connection:', error);
      throw error;
    }
  };

  const isWillExecutable = async (willCommitment: string) => {
    try {
      return await blockchainService.isWillExecutable(willCommitment);
    } catch (error) {
      console.error('Failed to check will executability:', error);
      throw error;
    }
  };

  const executeWillSimple = async (willCommitment: string) => {
    try {
      return await blockchainService.executeWillSimple(willCommitment);
    } catch (error) {
      console.error('Failed to execute will:', error);
      throw error;
    }
  };

  const executeWillAlternative = async (willCommitment: string) => {
    try {
      return await blockchainService.executeWillAlternative(willCommitment);
    } catch (error) {
      console.error('Failed to execute will with alternative method:', error);
      throw error;
    }
  };

  const directWithdrawEth = async (willCommitment: string) => {
    try {
      return await blockchainService.directWithdrawEth(willCommitment);
    } catch (error) {
      console.error('Failed to withdraw ETH directly:', error);
      throw error;
    }
  };

  const checkAndExecuteWills = async () => {
    try {
      return await blockchainService.checkAndExecuteWills();
    } catch (error) {
      console.error('Failed to check and execute wills:', error);
      throw error;
    }
  };

  const getExecutedWillsForBeneficiary = async (userAddress: string) => {
    try {
      return await blockchainService.getExecutedWillsForBeneficiary(userAddress);
    } catch (error) {
      console.error('Failed to get executed wills:', error);
      throw error;
    }
  };

  const claimFromExecutedWill = async (willCommitment: string) => {
    try {
      return await blockchainService.claimFromExecutedWill(willCommitment);
    } catch (error) {
      console.error('Failed to claim from executed will:', error);
      throw error;
    }
  };

  const value: WalletContextType = {
    isConnected,
    account,
    balance,
    connectWallet,
    disconnectWallet,
    checkIn,
    getCheckInStatus,
    registerWill,
    executeWill,
    withdrawEth,
    withdrawAllEth,
    getWillDetails,
    getWillExecutorStats,
    isWillRegistered,
    isWillExecuted,
    castVeto,
    getVetoStatus,
    getAllRegisteredWills,
    getWillsForBeneficiary,
    canUserClaimFromWill,
    claimFromWill,
    isWillExecutable,
    executeWillSimple,
    executeWillAlternative,
    directWithdrawEth,
    checkAndExecuteWills,
    getExecutedWillsForBeneficiary,
    claimFromExecutedWill,
    testContractConnection,
    noirService,
    isLoading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
