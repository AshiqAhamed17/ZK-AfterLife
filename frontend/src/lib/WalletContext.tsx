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
