"use client";

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  RefreshCw,
  Shield,
  Timer,
  TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface CheckInStatus {
  lastCheckIn: bigint;
  isInGracePeriod: boolean;
  gracePeriodStart: bigint;
  timeUntilGracePeriod: bigint;
}

export default function CheckIn() {
  const { isConnected, account, checkIn, getCheckInStatus, isLoading, error } = useWallet();
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isConnected && account) {
      loadCheckInStatus();
    }
  }, [isConnected, account]);

  const loadCheckInStatus = async () => {
    try {
      const status = await getCheckInStatus(account!);
      setCheckInStatus(status);
    } catch (err) {
      console.error('Failed to load check-in status:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!isConnected) {
      setLocalError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setLocalError('');

    try {
      const txHash = await checkIn();
      console.log('Check-in successful with tx hash:', txHash);
      setIsSuccess(true);

      // Reload status after successful check-in
      setTimeout(() => {
        loadCheckInStatus();
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to check in:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to check in');
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

  const getStatusColor = () => {
    if (!checkInStatus) return 'gray';
    if (checkInStatus.isInGracePeriod) return 'red';
    if (checkInStatus.timeUntilGracePeriod < 30 * 24 * 60 * 60) return 'yellow'; // 30 days
    return 'green';
  };

  const getStatusText = () => {
    if (!checkInStatus) return 'Loading...';
    if (checkInStatus.isInGracePeriod) return 'Grace Period Active';
    if (checkInStatus.timeUntilGracePeriod < 30 * 24 * 60 * 60) return 'Check-in Due Soon';
    return 'Active';
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
                <Heart className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Wallet Connection Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please connect your wallet to manage your heartbeat check-ins and monitor your will status.
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
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            <Heart className="w-4 h-4 mr-2" />
            Heartbeat Monitoring
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Heartbeat Check-in
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Keep your digital will active by sending regular heartbeat transactions.
            This ensures your will remains executable and prevents premature activation.
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                <p className={`text-lg font-semibold ${getStatusColor() === 'green' ? 'text-green-600 dark:text-green-400' :
                  getStatusColor() === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                    getStatusColor() === 'red' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                  }`}>
                  {getStatusText()}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor() === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
                getStatusColor() === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                  getStatusColor() === 'red' ? 'bg-red-100 dark:bg-red-900/20' :
                    'bg-gray-100 dark:bg-gray-900/20'
                }`}>
                {getStatusColor() === 'green' ? <CheckCircle className="text-green-600 dark:text-green-400" size={24} /> :
                  getStatusColor() === 'yellow' ? <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} /> :
                    getStatusColor() === 'red' ? <AlertCircle className="text-red-600 dark:text-red-400" size={24} /> :
                      <Clock className="text-gray-600 dark:text-gray-400" size={24} />}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Check-in</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {checkInStatus ? formatDate(checkInStatus.lastCheckIn) : 'Never'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Remaining</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {checkInStatus ? formatTimeRemaining(checkInStatus.timeUntilGracePeriod) : 'Loading...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <Timer className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Check-in Action */}
          <GlassCard className="p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-4">
                <Heart className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Send Heartbeat
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Update your last check-in timestamp
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="text-blue-600 dark:text-blue-400 mt-1 mr-3" size={20} />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">How it works</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Sending a heartbeat transaction updates your last activity timestamp.
                      This keeps your will active and prevents automatic execution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Connected Wallet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{account}</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Network</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sepolia Testnet</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={isProcessing || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2" size={20} />
                    Send Heartbeat
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          {/* Status Details */}
          <GlassCard className="p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Status Details
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Monitor your will's activity status
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {checkInStatus ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Last Check-in</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(checkInStatus.lastCheckIn)}
                        </p>
                      </div>
                      <Calendar className="text-gray-400" size={20} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Grace Period</p>
                        <p className={`text-sm ${checkInStatus.isInGracePeriod
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                          }`}>
                          {checkInStatus.isInGracePeriod ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <AlertCircle className="text-gray-400" size={20} />
                    </div>

                    {checkInStatus.isInGracePeriod && (
                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200">Grace Period Started</p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {formatDate(checkInStatus.gracePeriodStart)}
                          </p>
                        </div>
                        <Timer className="text-red-400" size={20} />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Next Check-in Due</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTimeRemaining(checkInStatus.timeUntilGracePeriod)}
                        </p>
                      </div>
                      <Clock className="text-gray-400" size={20} />
                    </div>
                  </div>

                  <Button
                    onClick={loadCheckInStatus}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2" size={20} />
                    Refresh Status
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                  <p className="text-gray-600 dark:text-gray-400">Loading status...</p>
                </div>
              )}
            </div>
          </GlassCard>
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
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Check-in Successful!</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your heartbeat has been recorded. Your will remains active.
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
                About Heartbeat Check-ins
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p>
                  • Heartbeat check-ins keep your will active and prevent automatic execution
                </p>
                <p>
                  • You should check in at least once per year to maintain will validity
                </p>
                <p>
                  • If you miss a check-in, a 30-day grace period begins before will execution
                </p>
                <p>
                  • During grace period, trusted parties can veto execution if needed
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


