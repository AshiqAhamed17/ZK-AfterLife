"use client";

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Calendar,
    Clock,
    Coins,
    Gift,
    RefreshCw,
    Shield,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExecutedWill {
    willCommitment: string;
    owner: string;
    executionTime: bigint;
    totalEth: string;
    totalUsdc: string;
    totalNfts: string;
    canClaim: boolean;
}

export default function Claims() {
    const { isConnected, account, getExecutedWillsForBeneficiary, claimFromExecutedWill, checkAndExecuteWills, executeWillSimple, executeWillAlternative, isLoading, error } = useWallet();
    const [executedWills, setExecutedWills] = useState<ExecutedWill[]>([]);
    const [isLoadingWills, setIsLoadingWills] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [localError, setLocalError] = useState('');
    const [processingWill, setProcessingWill] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    useEffect(() => {
        if (isConnected && account) {
            loadExecutedWills();
        }
    }, [isConnected, account]);

    const loadExecutedWills = async () => {
        if (!account) return;

        setIsLoadingWills(true);
        setLocalError('');

        try {
            console.log('Loading executed wills for beneficiary:', account);

            // First, check and execute any wills that are ready
            console.log('Checking for wills ready to execute...');
            await checkAndExecuteWills();

            // Then load the executed wills
            const wills = await getExecutedWillsForBeneficiary(account);
            console.log('Found executed wills:', wills);

            setExecutedWills(wills);
        } catch (error) {
            console.error('Failed to load executed wills:', error);
            setLocalError('Failed to load executed wills. Please try again.');
        } finally {
            setIsLoadingWills(false);
        }
    };

    const handleManualExecute = async () => {
        if (!isConnected) {
            setLocalError('Please connect your wallet first');
            return;
        }

        setIsExecuting(true);
        setLocalError('');

        try {
            // Execute your specific will
            const willCommitment = '0x15a7f53aa83b747f82626993c29aeaa61819864086b68a3cb63a0c599b83d925';
            console.log('Manually executing will:', willCommitment);

            let txHash;

            // Try the main execution method first
            try {
                txHash = await executeWillSimple(willCommitment);
                console.log('Manual execution successful (main method):', txHash);
            } catch (mainError) {
                console.warn('Main execution failed, trying alternative method:', mainError);

                // Fallback to alternative method
                txHash = await executeWillAlternative(willCommitment);
                console.log('Manual execution successful (alternative method):', txHash);
            }

            setIsSuccess(true);

            // Reload claims after execution
            setTimeout(() => {
                loadExecutedWills();
                setIsSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to execute will with both methods:', err);
            setLocalError(err instanceof Error ? err.message : 'Failed to execute will');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleClaim = async (willCommitment: string) => {
        if (!isConnected) {
            setLocalError('Please connect your wallet first');
            return;
        }

        setIsProcessing(true);
        setProcessingWill(willCommitment);
        setLocalError('');

        try {
            const txHash = await claimFromExecutedWill(willCommitment);
            console.log('Claim successful with tx hash:', txHash);
            setIsSuccess(true);

            // Reload wills after successful claim
            setTimeout(() => {
                loadExecutedWills();
                setIsSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to claim:', err);
            setLocalError(err instanceof Error ? err.message : 'Failed to claim ETH');
        } finally {
            setIsProcessing(false);
            setProcessingWill(null);
        }
    };

    const formatDate = (timestamp: bigint) => {
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const formatEther = (wei: string) => {
        const eth = Number(wei) / 1e18;
        return eth.toFixed(4);
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
                            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Gift className="text-yellow-600 dark:text-yellow-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Wallet Connection Required
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Please connect your wallet to view and claim your inherited assets.
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
                    <Badge className="mb-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        <Gift className="w-4 h-4 mr-2" />
                        Beneficiary Claims
                    </Badge>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Claim Your Inheritance
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        View and claim assets from executed wills where you are listed as a beneficiary.
                        All claims are processed securely on the blockchain.
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wills</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{executedWills.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <Shield className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Claimable</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {executedWills.filter(w => w.canClaim).length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <Coins className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total ETH</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {formatEther(executedWills.reduce((sum, w) => sum + parseFloat(w.totalEth), 0).toString())}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected</p>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Active</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <Users className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Action Buttons */}
                <div className="mb-8 flex justify-center gap-4">
                    <Button
                        onClick={loadExecutedWills}
                        disabled={isLoadingWills}
                        variant="outline"
                        className="px-8"
                    >
                        {isLoadingWills ? (
                            <>
                                <RefreshCw className="mr-2 animate-spin" size={20} />
                                Loading...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2" size={20} />
                                Refresh Claims
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={handleManualExecute}
                        disabled={isExecuting || !isConnected}
                        className="px-8 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isExecuting ? (
                            <>
                                <RefreshCw className="mr-2 animate-spin" size={20} />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Shield className="mr-2" size={20} />
                                Execute Will
                            </>
                        )}
                    </Button>
                </div>

                {/* Executed Wills List */}
                {isLoadingWills ? (
                    <GlassCard className="p-12 text-center">
                        <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                        <p className="text-gray-600 dark:text-gray-400">Loading executed wills...</p>
                    </GlassCard>
                ) : executedWills.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <Gift className="mx-auto mb-4 text-gray-400" size={48} />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Claims Available
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You don't have any claims available at the moment. Claims will appear here when wills where you are a beneficiary are executed.
                        </p>
                        <Button onClick={loadExecutedWills} variant="outline">
                            <RefreshCw className="mr-2" size={20} />
                            Refresh
                        </Button>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {executedWills.map((will) => (
                            <GlassCard key={will.willCommitment} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                            Executed Will
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            {will.willCommitment.slice(0, 10)}...{will.willCommitment.slice(-8)}
                                        </p>
                                    </div>
                                    <Badge className={will.canClaim ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'}>
                                        {will.canClaim ? 'Claimable' : 'Claimed'}
                                    </Badge>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Execution Time</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatDate(will.executionTime)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Total ETH</span>
                                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                            {formatEther(will.totalEth)} ETH
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Total USDC</span>
                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {formatEther(will.totalUsdc)} USDC
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">NFTs</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {will.totalNfts}
                                        </span>
                                    </div>
                                </div>

                                {will.canClaim && (
                                    <Button
                                        onClick={() => handleClaim(will.willCommitment)}
                                        disabled={isProcessing && processingWill === will.willCommitment}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isProcessing && processingWill === will.willCommitment ? (
                                            <>
                                                <RefreshCw className="mr-2 animate-spin" size={20} />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Coins className="mr-2" size={20} />
                                                Claim ETH
                                            </>
                                        )}
                                    </Button>
                                )}
                            </GlassCard>
                        ))}
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
                            <Coins className="text-green-600 dark:text-green-400 mr-3" size={20} />
                            <div>
                                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Claim Successful!</h4>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Your ETH has been successfully claimed and transferred to your wallet.
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
                                About Beneficiary Claims (Demo Mode)
                            </h4>
                            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                                <p>
                                    • <strong>Demo Mode:</strong> This demo allows claiming from any executed will
                                </p>
                                <p>
                                    • <strong>Manual Execution:</strong> Use "Execute Will" button to force execute your will
                                </p>
                                <p>
                                    • <strong>Alchemy Limitation:</strong> Due to free tier limits, some wills may not appear automatically
                                </p>
                                <p>
                                    • <strong>Your Will ID:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">0x15a7f53aa83b747f82626993c29aeaa61819864086b68a3cb63a0c599b83d925</code>
                                </p>
                                <p>
                                    • <strong>How to Claim:</strong> Execute the will first, then claim the ETH using the claim button
                                </p>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
}
