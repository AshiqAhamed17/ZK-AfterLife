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
    RefreshCw,
    Shield,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface RegisteredWill {
    willCommitment: string;
    owner: string;
    totalEth: string;
    totalUsdc: string;
    totalNfts: string;
    registrationTime: bigint;
    canWithdraw: boolean;
}

export default function Withdraw() {
    const { isConnected, account, directWithdrawEth, getWillDetails, isWillRegistered, isLoading, error } = useWallet();
    const [registeredWills, setRegisteredWills] = useState<RegisteredWill[]>([]);
    const [isLoadingWills, setIsLoadingWills] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [localError, setLocalError] = useState('');
    const [processingWill, setProcessingWill] = useState<string | null>(null);

    // Known will commitments to check
    const knownWillCommitments = [
        '0x06ecb45ac40d9b09be15cf448ee3a5b2c73ba07ee2948dbb5fcc4b44417d7b90', // New will from logs
        '0x15a7f53aa83b747f82626993c29aeaa61819864086b68a3cb63a0c599b83d925',
        '0x2d7c52135eb2ae75eaa93d36268571575a632a7340aefe97af8025e5c34c2f70',
        '0x279597a979e43225e84ac83f27351459c4690b4ca6030d4a5c71d44bd50bac47',
        '0x2f1968ac4dd60060271bc2697f92bc773b63856bfc59b54622ddd80889503131',
        '0x174bd33d68608ac4f2c9bc21f21ea01173619f99d6dcc832a397de3c7024276f',
    ];

    useEffect(() => {
        if (isConnected && account) {
            loadRegisteredWills();
        }
    }, [isConnected, account]);

    const loadRegisteredWills = async () => {
        if (!account) return;

        setIsLoadingWills(true);
        setLocalError('');

        try {
            console.log('Loading registered wills for direct withdrawal...');
            const wills = [];

            for (const commitment of knownWillCommitments) {
                try {
                    console.log('Checking will:', commitment);

                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    );

                    const checkPromise = isWillRegistered(commitment);
                    const isRegistered = await Promise.race([checkPromise, timeoutPromise]) as boolean;

                    if (isRegistered) {
                        console.log('Found registered will:', commitment);

                        try {
                            const willDetails = await getWillDetails(commitment);
                            if (willDetails && willDetails.exists) {
                                wills.push({
                                    willCommitment: commitment,
                                    owner: willDetails.owner,
                                    totalEth: willDetails.totalEth.toString(),
                                    totalUsdc: willDetails.totalUsdc.toString(),
                                    totalNfts: willDetails.totalNfts.toString(),
                                    registrationTime: willDetails.registrationTime,
                                    canWithdraw: true // Allow withdrawal for demo
                                });
                                console.log('Successfully added will to list:', commitment);
                            }
                        } catch (detailsError) {
                            console.error('Failed to get will details:', commitment, detailsError);
                            // Continue with other wills even if one fails
                        }
                    } else {
                        console.log('Will not registered:', commitment);
                    }
                } catch (error) {
                    console.log('Will check failed or timeout:', commitment, error);
                    // Continue with other wills even if one fails
                }
            }

            console.log('Found registered wills:', wills.length);
            setRegisteredWills(wills);
        } catch (error) {
            console.error('Failed to load registered wills:', error);
            setLocalError('Failed to load wills. Please try again.');
        } finally {
            setIsLoadingWills(false);
        }
    };

    const handleDirectWithdraw = async (willCommitment: string) => {
        if (!isConnected) {
            setLocalError('Please connect your wallet first');
            return;
        }

        setIsProcessing(true);
        setProcessingWill(willCommitment);
        setLocalError('');

        try {
            console.log('Direct withdrawal for will:', willCommitment);
            const txHash = await directWithdrawEth(willCommitment);
            console.log('Direct withdrawal successful:', txHash);
            setIsSuccess(true);

            // Reload wills after successful withdrawal
            setTimeout(() => {
                loadRegisteredWills();
                setIsSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to withdraw ETH:', err);
            setLocalError(err instanceof Error ? err.message : 'Failed to withdraw ETH');
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
        return eth.toFixed(6);
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
                                <Coins className="text-yellow-600 dark:text-yellow-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Wallet Connection Required
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Please connect your wallet to view and withdraw from your registered wills.
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
                    <Badge className="mb-4 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        <Coins className="w-4 h-4 mr-2" />
                        Direct ETH Withdrawal
                    </Badge>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Withdraw ETH from Wills
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Directly withdraw ETH from your registered wills. This bypasses execution and allows immediate withdrawal.
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wills</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{registeredWills.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <Shield className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Withdrawable</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {registeredWills.filter(w => w.canWithdraw).length}
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
                                    {formatEther(registeredWills.reduce((sum, w) => sum + parseFloat(w.totalEth), 0).toString())}
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
                        onClick={loadRegisteredWills}
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
                                Refresh Wills
                            </>
                        )}
                    </Button>

                    {/* Manual Withdrawal Button - Only show if user has wills */}
                    {registeredWills.length > 0 && (
                        <Button
                            onClick={() => handleDirectWithdraw(registeredWills[0].willCommitment)}
                            disabled={isProcessing}
                            className="px-8 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="mr-2 animate-spin" size={20} />
                                    Withdrawing...
                                </>
                            ) : (
                                <>
                                    <Coins className="mr-2" size={20} />
                                    Withdraw from Latest Will
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Registered Wills List */}
                {isLoadingWills ? (
                    <GlassCard className="p-12 text-center">
                        <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                        <p className="text-gray-600 dark:text-gray-400">Loading registered wills...</p>
                    </GlassCard>
                ) : registeredWills.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <Shield className="mx-auto mb-4 text-gray-400" size={48} />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Registered Wills Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            No registered wills were found for direct withdrawal. Make sure you have registered wills and they are within the detectable range.
                        </p>
                        <Button onClick={loadRegisteredWills} variant="outline">
                            <RefreshCw className="mr-2" size={20} />
                            Refresh
                        </Button>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {registeredWills.map((will) => (
                            <GlassCard key={will.willCommitment} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                            Registered Will
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            {will.willCommitment.slice(0, 10)}...{will.willCommitment.slice(-8)}
                                        </p>
                                    </div>
                                    <Badge className={will.canWithdraw ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'}>
                                        {will.canWithdraw ? 'Withdrawable' : 'Locked'}
                                    </Badge>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Registration Time</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatDate(will.registrationTime)}
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

                                {will.canWithdraw && (
                                    <Button
                                        onClick={() => handleDirectWithdraw(will.willCommitment)}
                                        disabled={isProcessing && processingWill === will.willCommitment}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isProcessing && processingWill === will.willCommitment ? (
                                            <>
                                                <RefreshCw className="mr-2 animate-spin" size={20} />
                                                Withdrawing...
                                            </>
                                        ) : (
                                            <>
                                                <Coins className="mr-2" size={20} />
                                                Withdraw ETH
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
                                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Withdrawal Successful!</h4>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Your ETH has been successfully withdrawn and transferred to your wallet.
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
                                About Direct ETH Withdrawal
                            </h4>
                            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                                <p>
                                    • <strong>Direct Withdrawal:</strong> Bypasses will execution and directly withdraws ETH
                                </p>
                                <p>
                                    • <strong>Owner Only:</strong> Only the will owner can withdraw ETH before execution
                                </p>
                                <p>
                                    • <strong>Immediate:</strong> No waiting for grace periods or execution conditions
                                </p>
                                <p>
                                    • <strong>Demo Mode:</strong> This is for testing purposes - in production, proper execution flow would be used
                                </p>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
}
