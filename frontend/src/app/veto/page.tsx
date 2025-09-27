"use client";

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Shield,
  Timer,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VetoableWill {
  willCommitment: string;
  owner: string;
  lastCheckIn: bigint;
  gracePeriodStart: bigint;
  timeInGracePeriod: bigint;
  beneficiaries: {
    address: string;
    ethAmount: string;
    usdcAmount: string;
    nftCount: string;
    name: string;
  }[];
  vetoCount: number;
  maxVetoes: number;
  isVetoed: boolean;
}

export default function Veto() {
  const { isConnected, account, castVeto, getVetoStatus, getCheckInStatus, isLoading, error } = useWallet();
  const [vetoableWills, setVetoableWills] = useState<VetoableWill[]>([]);
  const [selectedWill, setSelectedWill] = useState<VetoableWill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'vetoable' | 'vetoed'>('all');
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [vetoReason, setVetoReason] = useState('');

  // Load real data from contracts
  useEffect(() => {
    if (isConnected) {
      loadVetoData();
    }
  }, [isConnected]);

  const loadVetoData = async () => {
    try {
      // Get veto status and check-in status
      const [vetoStatus, checkInStatus] = await Promise.all([
        getVetoStatus(),
        getCheckInStatus()
      ]);

      console.log('Veto status:', vetoStatus);
      console.log('Check-in status:', checkInStatus);

      // For now, we'll show a message that no vetoable wills are available
      // In a real implementation, we would need to:
      // 1. Check if grace period has started
      // 2. Check if user is a veto member
      // 3. Show appropriate veto options

      // Since we don't have a way to enumerate all wills, we'll show an empty state
      // with instructions for the user
      setVetoableWills([]);
    } catch (error) {
      console.error('Failed to load veto data:', error);
      setLocalError('Failed to load veto data. Please try again.');
    }
  };

  const handleVetoWill = async (will: VetoableWill, reason: string) => {
    if (!isConnected) {
      setLocalError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setLocalError('');

    try {
      // Cast real veto on the contract
      console.log('Casting veto with reason:', reason);

      const txHash = await castVeto();
      console.log('Veto cast with tx hash:', txHash);

      setIsSuccess(true);
      setShowVetoModal(false);
      setVetoReason('');

      // Reload veto data
      setTimeout(() => {
        loadVetoData();
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to veto will:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to veto will');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeRemaining = (seconds: bigint) => {
    const days = Number(seconds) / (24 * 60 * 60);
    const hours = (Number(seconds) % (24 * 60 * 60)) / (60 * 60);
    const minutes = (Number(seconds) % (60 * 60)) / 60;

    if (days > 1) return `${Math.floor(days)} days, ${Math.floor(hours)} hours`;
    if (days > 0) return `${Math.floor(days)} day, ${Math.floor(hours)} hours`;
    if (hours > 0) return `${Math.floor(hours)} hours, ${Math.floor(minutes)} minutes`;
    return `${Math.floor(minutes)} minutes`;
  };

  const getVetoStatusColor = (will: VetoableWill) => {
    if (will.isVetoed) return 'red';
    if (will.vetoCount > 0) return 'yellow';
    return 'green';
  };

  const getVetoStatusText = (will: VetoableWill) => {
    if (will.isVetoed) return 'Vetoed';
    if (will.vetoCount > 0) return `${will.vetoCount}/${will.maxVetoes} Vetoes`;
    return 'No Vetoes';
  };

  const filteredWills = vetoableWills.filter(will => {
    const matchesSearch = will.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      will.willCommitment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === 'all' ||
      (filter === 'vetoable' && !will.isVetoed) ||
      (filter === 'vetoed' && will.isVetoed);

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
                <Ban className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Wallet Connection Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please connect your wallet to access veto functionality for emergency will management.
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
          <Badge className="mb-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <Ban className="w-4 h-4 mr-2" />
            Emergency Veto
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Veto Will Execution
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Emergency veto system for wills in grace period. Trusted parties can prevent
            premature execution when the will owner is temporarily unavailable.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wills</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{vetoableWills.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vetoable</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {vetoableWills.filter(w => !w.isVetoed).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vetoed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {vetoableWills.filter(w => w.isVetoed).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Ban className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Beneficiaries</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {vetoableWills.reduce((sum, will) => sum + will.beneficiaries.length, 0)}
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
            <option value="vetoable">Vetoable</option>
            <option value="vetoed">Vetoed</option>
          </select>
        </div>

        {/* Wills List */}
        <div className="space-y-6">
          {filteredWills.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Ban className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Vetoable Wills Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No wills are currently in grace period and available for veto.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  About the Veto System:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Only veto members can cast vetoes</li>
                  <li>• Vetoes can only be cast during grace period</li>
                  <li>• Each veto extends the grace period by 30 days</li>
                  <li>• Maximum of 3 vetoes allowed per will</li>
                  <li>• Use only in emergency situations</li>
                </ul>
              </div>
            </GlassCard>
          ) : (
            filteredWills.map((will) => (
              <GlassCard key={will.willCommitment} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className={
                        will.isVetoed
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : will.vetoCount > 0
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      }>
                        {getVetoStatusText(will)}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTimeRemaining(will.timeInGracePeriod)} in grace period
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
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Veto Count:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {will.vetoCount}/{will.maxVetoes}
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

                  <div className="ml-6">
                    <Button
                      onClick={() => {
                        setSelectedWill(will);
                        setShowVetoModal(true);
                      }}
                      disabled={will.isVetoed || isProcessing}
                      className={`${will.isVetoed
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                      {will.isVetoed ? (
                        <>
                          <Ban className="mr-2" size={20} />
                          Vetoed
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2" size={20} />
                          Veto Will
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Veto Modal */}
        {showVetoModal && selectedWill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Veto Will Execution
                </h3>
                <button
                  onClick={() => setShowVetoModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Are you sure you want to veto this will execution? This action cannot be undone.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for Veto
                  </label>
                  <textarea
                    value={vetoReason}
                    onChange={(e) => setVetoReason(e.target.value)}
                    placeholder="Explain why you are vetoing this will execution..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-1 mr-2" size={16} />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Vetoing will prevent execution for 30 days. Use only in emergency situations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowVetoModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleVetoWill(selectedWill, vetoReason)}
                  disabled={isProcessing || !vetoReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2" size={20} />
                      Confirm Veto
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

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
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Veto Successful!</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  The will execution has been vetoed. It will remain in grace period for 30 more days.
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
                About the Veto System
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p>
                  • Veto system prevents premature will execution during grace period
                </p>
                <p>
                  • Each veto extends the grace period by 30 days
                </p>
                <p>
                  • Maximum of 3 vetoes allowed per will
                </p>
                <p>
                  • Use only in emergency situations when will owner is temporarily unavailable
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


