"use client";

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Play,
  RefreshCw,
  Search,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExecutableWill {
  willCommitment: string;
  owner: string;
  lastCheckIn: bigint;
  gracePeriodStart: bigint;
  isExecutable: boolean;
  isInGracePeriod: boolean;
  beneficiaries: {
    address: string;
    ethAmount: string;
    usdcAmount: string;
    nftCount: string;
    name: string;
  }[];
}

export default function ExecuteWill() {
  const {
    isConnected,
    account,
    executeWill,
    getWillExecutorStats,
    isWillRegistered,
    isWillExecuted,
    getAllRegisteredWills,
    getWillsForBeneficiary,
    canUserClaimFromWill,
    claimFromWill,
    testContractConnection,
    noirService,
    isLoading,
    error
  } = useWallet();

  const [executableWills, setExecutableWills] = useState<ExecutableWill[]>([]);
  const [allWills, setAllWills] = useState<any[]>([]);
  const [selectedWill, setSelectedWill] = useState<ExecutableWill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'executable' | 'grace-period' | 'claimable'>('all');
  const [isLoadingWills, setIsLoadingWills] = useState(false);

  // Load real data from contracts
  useEffect(() => {
    if (isConnected) {
      loadExecutableWills();
    }
  }, [isConnected]);

  const loadExecutableWills = async () => {
    if (!isConnected || !account) return;

    setIsLoadingWills(true);
    setLocalError('');

    try {
      console.log('Loading all registered wills...');

      // Get all registered wills from blockchain events
      const wills = await getAllRegisteredWills();
      console.log('Found wills:', wills);

      setAllWills(wills);

      // Convert to ExecutableWill format
      const executableWillsData: ExecutableWill[] = wills.map(will => ({
        willCommitment: will.willCommitment,
        owner: will.owner,
        lastCheckIn: will.lastCheckIn,
        gracePeriodStart: will.gracePeriodStart,
        isExecutable: will.isExecutable,
        isInGracePeriod: will.isInGracePeriod,
        beneficiaries: [
          // For demo purposes, create dummy beneficiaries
          // In production, you'd get this from the will data
          {
            address: account, // Current user as beneficiary for demo
            ethAmount: will.totalEth,
            usdcAmount: will.totalUsdc,
            nftCount: will.totalNfts,
            name: 'Beneficiary 1'
          }
        ]
      }));

      setExecutableWills(executableWillsData);

      console.log('Loaded executable wills:', executableWillsData.length);

      // If no wills found, show helpful message
      if (wills.length === 0) {
        console.log('No wills found. This could be due to:');
        console.log('1. No wills have been registered yet');
        console.log('2. Alchemy free tier limitation (only shows last 10 blocks)');
        console.log('3. Wills were registered more than 10 blocks ago');
        console.log('Try registering a new will to see it appear here.');
      }
    } catch (error) {
      console.error('Failed to load executable wills:', error);
      setLocalError('Failed to load will data. Please try again.');
    } finally {
      setIsLoadingWills(false);
    }
  };

  const handleExecuteWill = async (will: ExecutableWill) => {
    if (!isConnected) {
      setLocalError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setLocalError('');

    try {
      // Convert beneficiaries to the format expected by the service
      const beneficiaries = will.beneficiaries.map(ben => ({
        address: ben.address,
        ethAmount: BigInt(ben.ethAmount),
        usdcAmount: BigInt(ben.usdcAmount),
        nftCount: BigInt(ben.nftCount)
      }));

      // Generate real ZK proof for execution
      console.log('Generating ZK proof for will execution...');

      // Create proper WillData structure
      const willData = {
        willSalt: '5',
        willData: ['1', '2', '3', '4'],
        beneficiaryCount: beneficiaries.length.toString(),
        beneficiaryAddresses: beneficiaries.map(b => b.address),
        beneficiaryEth: beneficiaries.map(b => b.ethAmount.toString()),
        beneficiaryUsdc: beneficiaries.map(b => b.usdcAmount.toString()),
        beneficiaryNfts: beneficiaries.map(b => b.nftCount.toString())
      };

      const proofData = await noirService.generateWillProof(willData);

      console.log('Generated proof:', proofData);

      // Execute will with real proof
      const txHash = await executeWill(will.willCommitment, beneficiaries, proofData.proof);
      console.log('Will executed with tx hash:', txHash);

      setIsSuccess(true);
      setSelectedWill(null);

      // Reload the will list
      setTimeout(() => {
        loadExecutableWills();
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to execute will:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to execute will');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFromWill = async (will: ExecutableWill) => {
    if (!isConnected || !account) {
      setLocalError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setLocalError('');

    try {
      // Check if user can claim from this will
      const canClaim = await canUserClaimFromWill(will.willCommitment, account);
      if (!canClaim) {
        setLocalError('You are not eligible to claim from this will');
        return;
      }

      console.log('Claiming from will:', will.willCommitment);

      // Claim ETH from the will
      const txHash = await claimFromWill(will.willCommitment);
      console.log('Claimed from will with tx hash:', txHash);

      setIsSuccess(true);
      setLocalError('');

      // Reload the will list
      setTimeout(() => {
        loadExecutableWills();
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to claim from will:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to claim from will');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeAgo = (timestamp: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const diff = now - timestamp;
    const days = Number(diff) / (24 * 60 * 60);

    if (days > 365) return `${Math.floor(days / 365)} years ago`;
    if (days > 30) return `${Math.floor(days / 30)} months ago`;
    if (days > 7) return `${Math.floor(days / 7)} weeks ago`;
    if (days > 1) return `${Math.floor(days)} days ago`;
    return 'Today';
  };

  const filteredWills = executableWills.filter(will => {
    const matchesSearch = will.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      will.willCommitment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === 'all' ||
      (filter === 'executable' && will.isExecutable) ||
      (filter === 'grace-period' && will.isInGracePeriod) ||
      (filter === 'claimable' && (will.isExecutable || will.isInGracePeriod));

    return matchesSearch && matchesFilter;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          <GlassCard className="p-12">
            <div className="mb-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Wallet Connection Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please connect your wallet to execute wills and manage digital inheritance.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'}>
              Connect Wallet
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
            <Zap className="w-4 h-4 mr-2" />
            Will Execution
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Execute Digital Wills
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Execute wills that have entered grace period. This distributes assets to beneficiaries
            using zero-knowledge proofs for privacy and security.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wills</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoadingWills ? '...' : allWills.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Executable</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {isLoadingWills ? '...' : allWills.filter(w => w.isExecutable).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Grace Period</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {isLoadingWills ? '...' : allWills.filter(w => w.isInGracePeriod).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Claimable</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {isLoadingWills ? '...' : allWills.filter(w => w.isExecutable || w.isInGracePeriod).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <Users className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by owner address or will commitment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Wills</option>
            <option value="executable">Executable</option>
            <option value="grace-period">Grace Period</option>
            <option value="claimable">Claimable</option>
          </select>
          <Button
            onClick={loadExecutableWills}
            disabled={isLoadingWills}
            variant="outline"
            className="px-4 py-3 border-gray-300 dark:border-gray-600"
          >
            {isLoadingWills ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <RefreshCw size={20} />
            )}
          </Button>
        </div>

        {/* Wills List */}
        <div className="space-y-6">
          {isLoadingWills ? (
            <GlassCard className="p-12 text-center">
              <RefreshCw className="mx-auto mb-4 text-gray-400 animate-spin" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Loading Wills...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fetching registered wills from the blockchain.
              </p>
            </GlassCard>
          ) : filteredWills.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <FileText className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {allWills.length === 0 ? 'No Wills Found' : 'No Wills Match Filter'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {allWills.length === 0
                  ? 'No wills found in the last 10 blocks. This could be due to Alchemy free tier limitations or no recent registrations.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  How to Execute a Will:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• A will must be registered first (use the Register page)</li>
                  <li>• The owner must be inactive for 30+ seconds (demo timing)</li>
                  <li>• The grace period must have started (15+ seconds)</li>
                  <li>• The grace period must have ended (30+ seconds total)</li>
                  <li>• No vetoes should have been cast</li>
                </ul>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Due to Alchemy free tier limitations, only wills registered in the last 10 blocks are shown.
                    Register a new will to see it appear here immediately.
                  </p>
                </div>
              </div>
            </GlassCard>
          ) : (
            filteredWills.map((will) => (
              <GlassCard key={will.willCommitment} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className={
                        will.isExecutable
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : will.isInGracePeriod
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'
                      }>
                        {will.isExecutable ? 'Executable' : will.isInGracePeriod ? 'Grace Period' : 'Registered'}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTimeAgo(will.lastCheckIn)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Will Details
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Owner:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{will.owner}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Last Check-in:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatDate(will.lastCheckIn)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Grace Period Start:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatDate(will.gracePeriodStart)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Beneficiaries ({will.beneficiaries.length})
                        </h3>
                        <div className="space-y-2">
                          {will.beneficiaries.map((beneficiary, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{beneficiary.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{beneficiary.address}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-900 dark:text-white">
                                  ETH: {beneficiary.ethAmount} | USDC: {beneficiary.usdcAmount} | NFTs: {beneficiary.nftCount}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Will Commitment</h4>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <code className="text-xs text-gray-900 dark:text-white font-mono flex-1">
                          {will.willCommitment}
                        </code>
                        <button
                          onClick={() => copyToClipboard(will.willCommitment)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col gap-2">
                    {will.isExecutable && (
                      <Button
                        onClick={() => handleExecuteWill(will)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="mr-2 animate-spin" size={20} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2" size={20} />
                            Execute Will
                          </>
                        )}
                      </Button>
                    )}

                    {(will.isExecutable || will.isInGracePeriod) && (
                      <Button
                        onClick={() => handleClaimFromWill(will)}
                        disabled={isProcessing}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="mr-2 animate-spin" size={20} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2" size={20} />
                            Claim ETH
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Success Message */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-center">
              <CheckCircle className="text-green-600 dark:text-green-400 mr-3" size={20} />
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Transaction Successful!</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your transaction has been processed successfully. The will has been executed or ETH has been claimed.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {(localError || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-1 mr-3" size={20} />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {localError || error}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Information Panel */}
        <GlassCard className="mt-8 p-6">
          <div className="flex items-start">
            <Shield className="text-blue-600 dark:text-blue-400 mt-1 mr-3" size={20} />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                About Will Execution
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p>
                  • Wills become executable after 30 seconds without a check-in (demo timing)
                </p>
                <p>
                  • A 15-second grace period follows before execution is allowed
                </p>
                <p>
                  • Execution uses zero-knowledge proofs to maintain privacy
                </p>
                <p>
                  • Assets are distributed directly to beneficiaries
                </p>
                <p>
                  • Beneficiaries can claim their ETH using the "Claim ETH" button
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


