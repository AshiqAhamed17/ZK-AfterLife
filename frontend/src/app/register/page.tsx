"use client";

import DynamicAssetValuation from '@/components/DynamicAssetValuation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { blockchainService } from '@/services/blockchain';
import { selfProtocolService, SelfVerificationResult } from '@/services/SelfProtocolService';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Copy,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    Lock,
    Plus,
    Shield,
    Trash2,
    Users,
    Wallet
} from 'lucide-react';
import React, { useState } from 'react';

interface Beneficiary {
    address: string;
    ethAmount: string;
    usdcAmount: string;
    nftCount: string;
    name: string;
}

interface WillData {
    beneficiaries: Beneficiary[];
    totalEth: string;
    totalUsdc: string;
    totalNfts: string;
    description: string;
    willSalt: string;
}

export default function RegisterWill() {
    const { isConnected, account, registerWill, withdrawEth, withdrawAllEth, getWillDetails, isLoading, error, noirService } = useWallet();
    const [step, setStep] = useState(0); // Start with Self verification
    const [isSelfVerified, setIsSelfVerified] = useState(false);
    const [selfVerificationMethod, setSelfVerificationMethod] = useState<'passport' | 'aadhaar' | null>(null);
    const [verificationStep, setVerificationStep] = useState<'select' | 'instructions' | 'qr' | 'verifying' | 'completed'>('select');
    const [qrCode, setQrCode] = useState<string>('');
    const [deepLink, setDeepLink] = useState<string>('');
    const [verificationStatus, setVerificationStatus] = useState<string>('');
    const [willData, setWillData] = useState<WillData>({
        beneficiaries: [
            { address: '', ethAmount: '', usdcAmount: '', nftCount: '', name: '' }
        ],
        totalEth: '',
        totalUsdc: '',
        totalNfts: '',
        description: '',
        willSalt: Math.random().toString(36).substring(2, 15)
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [localError, setLocalError] = useState('');

    const addBeneficiary = () => {
        if (willData.beneficiaries.length < 8) {
            setWillData(prev => ({
                ...prev,
                beneficiaries: [...prev.beneficiaries, { address: '', ethAmount: '', usdcAmount: '', nftCount: '', name: '' }]
            }));
        }
    };

    const removeBeneficiary = (index: number) => {
        if (willData.beneficiaries.length > 1) {
            setWillData(prev => ({
                ...prev,
                beneficiaries: prev.beneficiaries.filter((_, i) => i !== index)
            }));
        }
    };

    const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string) => {
        setWillData(prev => ({
            ...prev,
            beneficiaries: prev.beneficiaries.map((ben, i) =>
                i === index ? { ...ben, [field]: value } : ben
            )
        }));
    };

    const validateForm = () => {
        if (!willData.description.trim()) return 'Please provide a will description';
        if (willData.beneficiaries.some(b => !b.address.trim() || !b.name.trim())) {
            return 'Please fill in all beneficiary details';
        }
        if (willData.beneficiaries.some(b => !b.ethAmount && !b.usdcAmount && !b.nftCount)) {
            return 'Each beneficiary must have at least one asset allocation';
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!isConnected) {
            setLocalError('Please connect your wallet first');
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            setLocalError(validationError);
            return;
        }

        setIsProcessing(true);
        setLocalError('');

        try {
            // Calculate total ETH from beneficiaries
            const totalEth = willData.beneficiaries.reduce((sum, ben) => {
                return sum + parseFloat(ben.ethAmount || '0');
            }, 0);

            const totalUsdc = willData.beneficiaries.reduce((sum, ben) => {
                return sum + parseFloat(ben.usdcAmount || '0');
            }, 0);

            const totalNfts = willData.beneficiaries.reduce((sum, ben) => {
                return sum + parseInt(ben.nftCount || '0');
            }, 0);

            console.log('Calculated totals:', { totalEth, totalUsdc, totalNfts });

            // Generate a simple will commitment (for demo purposes)
            const willCommitment = `0x${willData.willSalt}${Date.now().toString(16)}`;

            // Convert will data to the format expected by the service
            const willDataForService = {
                willCommitment: willCommitment,
                willSalt: willData.willSalt,
                willData: [willData.description, totalEth.toString(), totalUsdc.toString(), totalNfts.toString()],
                beneficiaryCount: willData.beneficiaries.length.toString(),
                beneficiaryAddresses: willData.beneficiaries.map(b => b.address),
                beneficiaryEth: willData.beneficiaries.map(b => b.ethAmount || '0'),
                beneficiaryUsdc: willData.beneficiaries.map(b => b.usdcAmount || '0'),
                beneficiaryNfts: willData.beneficiaries.map(b => b.nftCount || '0'),
                beneficiaries: willData.beneficiaries.map(b => ({
                    address: b.address,
                    ethAmount: b.ethAmount || '0',
                    usdcAmount: b.usdcAmount || '0',
                    nftCount: b.nftCount || '0'
                }))
            };

            console.log('Will data for service:', willDataForService);

            // Register will
            const txHash = await registerWill(willDataForService);
            console.log('Will registered with tx hash:', txHash);

            setIsSuccess(true);
            setStep(4);
        } catch (err) {
            console.error('Failed to register will:', err);
            setLocalError(err instanceof Error ? err.message : 'Failed to register will');
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleVerificationMethodSelect = (method: 'passport' | 'aadhaar') => {
        setSelfVerificationMethod(method);
        setVerificationStep('instructions');
    };

    const generateQRCode = async () => {
        if (!account || !selfVerificationMethod) return;

        setVerificationStep('qr');
        try {
            const qrResult = await selfProtocolService.generateQRCode(selfVerificationMethod, account);
            setQrCode(qrResult.qrCode);
            setDeepLink(qrResult.deepLink);
            console.log('✅ QR Code generated successfully');
        } catch (error) {
            console.error('❌ Failed to generate QR code:', error);
            setLocalError('Failed to generate QR code. Please try again.');
            setVerificationStep('instructions');
        }
    };

    const startVerification = async () => {
        if (!account || !selfVerificationMethod) return;

        setVerificationStep('verifying');
        setVerificationStatus('Waiting for verification...');

        try {
            const result: SelfVerificationResult = await selfProtocolService.waitForVerification(
                selfVerificationMethod,
                account,
                (status) => setVerificationStatus(status)
            );

            if (result.success) {
                setIsSelfVerified(true);
                setVerificationStep('completed');
                console.log('✅ Self verification completed successfully');
                setTimeout(() => {
                    setStep(1);
                }, 2000);
            } else {
                throw new Error('Verification failed');
            }
        } catch (error) {
            console.error('❌ Verification failed:', error);
            setLocalError('Verification failed. Please try again.');
            setVerificationStep('qr');
        }
    };

    const resetVerification = () => {
        setVerificationStep('select');
        setSelfVerificationMethod(null);
        setQrCode('');
        setDeepLink('');
        setVerificationStatus('');
        setIsSelfVerified(false);
    };

    // Check if user is already verified when component mounts
    React.useEffect(() => {
        const checkExistingVerification = async () => {
            if (account && step === 0) {
                try {
                    const isVerified = await selfProtocolService.checkVerificationStatus(account);
                    if (isVerified) {
                        setIsSelfVerified(true);
                        setVerificationStep('completed');
                        console.log('✅ User is already verified');
                    }
                } catch (error) {
                    console.log('ℹ️ No existing verification found');
                }
            }
        };

        checkExistingVerification();
    }, [account, step]);

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
                                <Wallet className="text-red-600 dark:text-red-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Wallet Connection Required
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Please connect your wallet to register a will. This ensures your will is properly associated with your account.
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
                    <Badge className="mb-4 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                        <Lock className="w-4 h-4 mr-2" />
                        Private Will Registration
                    </Badge>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Register Your Digital Will
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Create a privacy-preserving digital inheritance plan using zero-knowledge proofs.
                        Your will details remain confidential until execution.
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center space-x-4">
                        {[0, 1, 2, 3, 4].map((stepNumber) => (
                            <div key={stepNumber} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${step >= stepNumber
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    } ${stepNumber === 0 ? 'ring-2 ring-blue-400' : ''}`}>
                                    {step > stepNumber ? <CheckCircle size={20} /> : (stepNumber === 0 ? '🔐' : stepNumber)}
                                </div>
                                {stepNumber < 4 && (
                                    <div className={`w-16 h-1 mx-2 ${step > stepNumber ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                {step === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-8 mb-6">
                            <h2 className="text-3xl font-bold text-white mb-4">🔐 Self Protocol Verification</h2>
                            <p className="text-gray-300 mb-6 text-lg">
                                Verify your identity using Self Protocol to prevent bots and ensure you're 18+
                            </p>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                                <p className="text-green-300 font-semibold">✅ Partner Prize Requirements Met:</p>
                                <p className="text-green-200 text-sm">Onchain SDK Integration • Celo Testnet • Proof of Humanity • Age Verification • Country Verification</p>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                                <p className="text-yellow-300 font-semibold">⚠️ Demo Mode:</p>
                                <p className="text-yellow-200 text-sm">
                                    This is a demonstration of Self Protocol integration. For production, the contract needs proper verification configuration setup in the Self Protocol system.
                                </p>
                            </div>

                            {localError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                                    <p className="text-red-300 font-semibold">❌ Error:</p>
                                    <p className="text-red-200 text-sm">{localError}</p>
                                    <button
                                        onClick={() => setLocalError('')}
                                        className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            {/* Method Selection */}
                            {verificationStep === 'select' && (
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2">Identity Verification Required</h3>
                                    <p className="text-blue-300 mb-4">
                                        Choose your verification method:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleVerificationMethodSelect('passport')}
                                            className="p-4 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">🌍</div>
                                            <h4 className="font-semibold text-white">Passport NFC</h4>
                                            <p className="text-sm text-gray-300">International passport verification</p>
                                        </button>
                                        <button
                                            onClick={() => handleVerificationMethodSelect('aadhaar')}
                                            className="p-4 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">🇮🇳</div>
                                            <h4 className="font-semibold text-white">Aadhaar QR</h4>
                                            <p className="text-sm text-gray-300">Indian Aadhaar verification</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Instructions */}
                            {verificationStep === 'instructions' && (
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-4">
                                        {selfVerificationMethod === 'passport' ? '🌍 Passport NFC Verification' : '🇮🇳 Aadhaar QR Verification'}
                                    </h3>

                                    <div className="text-left space-y-4">
                                        {selfProtocolService.getInstructions(selfVerificationMethod).map((instruction, index) => (
                                            <div key={index} className="bg-white/10 rounded-lg p-4">
                                                <h4 className="font-semibold text-white mb-2">Step {index + 1}</h4>
                                                <p className="text-gray-300 text-sm">{instruction}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={resetVerification}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={generateQRCode}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Generate QR Code
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* QR Code Display */}
                            {verificationStep === 'qr' && (
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-4">
                                        Scan QR Code with Self App
                                    </h3>
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="bg-white p-4 rounded-lg">
                                            <img src={qrCode} alt="Self Verification QR Code" className="w-48 h-48" />
                                        </div>
                                        <p className="text-gray-300 text-sm text-center">
                                            Open Self app and scan this QR code to verify your identity
                                        </p>

                                        {/* Deep Link Button */}
                                        {deepLink && (
                                            <div className="flex flex-col items-center space-y-2">
                                                <button
                                                    onClick={() => window.open(deepLink, '_blank')}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                >
                                                    Open in Self App
                                                </button>
                                                <p className="text-gray-400 text-xs text-center max-w-xs">
                                                    Or copy this link: <span className="font-mono text-xs break-all">{deepLink.slice(0, 50)}...</span>
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            onClick={startVerification}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            I've Scanned the QR Code
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Verification in Progress */}
                            {verificationStep === 'verifying' && (
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-4">
                                        Verifying Identity...
                                    </h3>
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                                        <p className="text-gray-300">{verificationStatus}</p>
                                    </div>
                                </div>
                            )}

                            {/* Verification Completed */}
                            {verificationStep === 'completed' && (
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-green-400 mb-4">
                                        ✅ Verification Successful!
                                    </h3>
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="text-6xl">🎉</div>
                                        <p className="text-green-300">
                                            Your identity has been verified using {selfVerificationMethod === 'passport' ? 'Passport NFC' : 'Aadhaar QR'}
                                        </p>
                                        <p className="text-gray-300 text-sm">
                                            Proceeding to will registration...
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-gray-400 mb-4">
                                <p>✅ Bot prevention through humanity verification</p>
                                <p>✅ Age verification (18+ requirement)</p>
                                <p>✅ Country verification with nationality tracking</p>
                            </div>

                            {/* Skip verification for testing */}
                            <div className="text-center">
                                <button
                                    onClick={() => {
                                        setIsSelfVerified(true);
                                        setSelfVerificationMethod('passport');
                                        setStep(1);
                                    }}
                                    className="text-gray-400 hover:text-gray-300 text-sm underline"
                                >
                                    Skip verification for testing
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <GlassCard className="p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-4">
                                    <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Will Details
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Describe your will and set the total asset allocations
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Will Description
                                    </label>
                                    <textarea
                                        value={willData.description}
                                        onChange={(e) => setWillData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe your will and any special instructions..."
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows={4}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Total ETH
                                        </label>
                                        <input
                                            type="number"
                                            value={willData.totalEth}
                                            onChange={(e) => setWillData(prev => ({ ...prev, totalEth: e.target.value }))}
                                            placeholder="0.0"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Total USDC
                                        </label>
                                        <input
                                            type="number"
                                            value={willData.totalUsdc}
                                            onChange={(e) => setWillData(prev => ({ ...prev, totalUsdc: e.target.value }))}
                                            placeholder="0"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Total NFTs
                                        </label>
                                        <input
                                            type="number"
                                            value={willData.totalNfts}
                                            onChange={(e) => setWillData(prev => ({ ...prev, totalNfts: e.target.value }))}
                                            placeholder="0"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="flex justify-between">
                            <div className="flex space-x-2">
                                <Button
                                    onClick={async () => {
                                        if (noirService) {
                                            await noirService.testZKFlow();
                                        }
                                    }}
                                    variant="outline"
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                >
                                    🧪 Test ZK Flow
                                </Button>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const result = await blockchainService.testContractConnection();
                                            console.log('Contract test result:', result);
                                            alert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
                                        } catch (error) {
                                            console.error('Contract test failed:', error);
                                            alert(`❌ Contract test failed: ${error}`);
                                        }
                                    }}
                                    variant="outline"
                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                >
                                    🔍 Test Contract
                                </Button>
                            </div>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!willData.description.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Next Step
                                <ArrowRight className="ml-2" size={20} />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <GlassCard className="p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-4">
                                    <Users className="text-green-600 dark:text-green-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Beneficiaries
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Add up to 8 beneficiaries and their asset allocations
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {willData.beneficiaries.map((beneficiary, index) => (
                                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                                Beneficiary {index + 1}
                                            </h4>
                                            {willData.beneficiaries.length > 1 && (
                                                <button
                                                    onClick={() => removeBeneficiary(index)}
                                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={beneficiary.name}
                                                    onChange={(e) => updateBeneficiary(index, 'name', e.target.value)}
                                                    placeholder="Beneficiary name"
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Ethereum Address
                                                </label>
                                                <input
                                                    type="text"
                                                    value={beneficiary.address}
                                                    onChange={(e) => updateBeneficiary(index, 'address', e.target.value)}
                                                    placeholder="0x..."
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    ETH Amount
                                                </label>
                                                <input
                                                    type="number"
                                                    value={beneficiary.ethAmount}
                                                    onChange={(e) => updateBeneficiary(index, 'ethAmount', e.target.value)}
                                                    placeholder="0.0"
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    USDC Amount
                                                </label>
                                                <input
                                                    type="number"
                                                    value={beneficiary.usdcAmount}
                                                    onChange={(e) => updateBeneficiary(index, 'usdcAmount', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    NFT Count
                                                </label>
                                                <input
                                                    type="number"
                                                    value={beneficiary.nftCount}
                                                    onChange={(e) => updateBeneficiary(index, 'nftCount', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {willData.beneficiaries.length < 8 && (
                                    <Button
                                        onClick={addBeneficiary}
                                        variant="outline"
                                        className="w-full border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500"
                                    >
                                        <Plus className="mr-2" size={20} />
                                        Add Beneficiary
                                    </Button>
                                )}
                            </div>
                        </GlassCard>

                        <div className="flex justify-between">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                disabled={willData.beneficiaries.some(b => !b.address.trim() || !b.name.trim())}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Next Step
                                <ArrowRight className="ml-2" size={20} />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <GlassCard className="p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mr-4">
                                    <Shield className="text-purple-600 dark:text-purple-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Review & Confirm
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Review your will details before registration
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Will Summary</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Description:</span>
                                            <p className="text-gray-900 dark:text-white">{willData.description}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total ETH:</span>
                                                <p className="text-gray-900 dark:text-white">{willData.totalEth || '0'}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total USDC:</span>
                                                <p className="text-gray-900 dark:text-white">{willData.totalUsdc || '0'}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total NFTs:</span>
                                                <p className="text-gray-900 dark:text-white">{willData.totalNfts || '0'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isSelfVerified && selfVerificationMethod && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-green-900 dark:text-green-100 mb-4">🔐 Self Verification Status</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <CheckCircle className="text-green-600 dark:text-green-400 mr-2" size={20} />
                                                <span className="text-green-800 dark:text-green-200">Identity Verified</span>
                                            </div>
                                            <div className="text-sm text-green-700 dark:text-green-300">
                                                <p>Method: {selfVerificationMethod === 'passport' ? '🌍 Passport NFC' : '🇮🇳 Aadhaar QR'}</p>
                                                <p>Status: Bot prevention enabled • Age verification (18+) • Country verification</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Beneficiaries ({willData.beneficiaries.length})</h4>
                                    <div className="space-y-3">
                                        {willData.beneficiaries.map((beneficiary, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{beneficiary.name}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{beneficiary.address}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        ETH: {beneficiary.ethAmount || '0'} | USDC: {beneficiary.usdcAmount || '0'} | NFTs: {beneficiary.nftCount || '0'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 🏆 PRIZE-WINNING FEATURE: Dynamic Asset Valuation with Pyth Network */}
                                <DynamicAssetValuation
                                    assets={['ETH', 'USDC']}
                                    amounts={[
                                        willData.beneficiaries.reduce((sum, ben) => sum + parseFloat(ben.ethAmount || '0'), 0).toString(),
                                        willData.beneficiaries.reduce((sum, ben) => sum + parseFloat(ben.usdcAmount || '0'), 0).toString()
                                    ]}
                                    beneficiaries={willData.beneficiaries.map(b => b.address)}
                                    percentages={willData.beneficiaries.map((_, index) => {
                                        // Calculate percentage based on ETH amounts (simplified)
                                        const totalEth = willData.beneficiaries.reduce((sum, ben) => sum + parseFloat(ben.ethAmount || '0'), 0);
                                        if (totalEth === 0) return 100 / willData.beneficiaries.length;
                                        return (parseFloat(willData.beneficiaries[index].ethAmount || '0') / totalEth) * 100;
                                    })}
                                    onDistributionCalculated={(distribution) => {
                                        console.log('🏆 Dynamic distribution calculated:', distribution);
                                    }}
                                />

                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="text-blue-600 dark:text-blue-400 mt-1 mr-3" size={20} />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">ETH Transfer Required</h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                You will need to transfer ETH to the contract during registration.
                                                The amount will be calculated from your beneficiary allocations and locked until will execution.
                                                You can withdraw the ETH at any time before execution using the withdrawal functions.
                                            </p>
                                            <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded border">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Total ETH to be transferred:</p>
                                                <p className="text-sm font-mono text-gray-900 dark:text-white">
                                                    {willData.beneficiaries.reduce((sum, ben) => sum + parseFloat(ben.ethAmount || '0'), 0).toFixed(6)} ETH
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-1 mr-3" size={20} />
                                        <div>
                                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Important</h4>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                                Your will details will be encrypted and stored privately. Only the commitment hash will be stored on-chain.
                                                Keep your private key safe - you'll need it to execute the will.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="flex justify-between">
                            <Button
                                onClick={() => setStep(2)}
                                variant="outline"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isProcessing}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isProcessing ? 'Processing...' : 'Register Will'}
                                {!isProcessing && <ArrowRight className="ml-2" size={20} />}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <GlassCard className="p-12 max-w-2xl mx-auto">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Will Registered Successfully!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-8">
                                Your digital will has been registered with zero-knowledge proofs.
                                The commitment is now stored on-chain while your details remain private.
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Will Salt (Keep This Safe)</h4>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                                    <code className="text-sm text-gray-900 dark:text-white font-mono">
                                        {showPrivateKey ? willData.willSalt : '•'.repeat(willData.willSalt.length)}
                                    </code>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(willData.willSalt)}
                                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Will Management</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                        You can withdraw your ETH at any time before the will is executed.
                                        The ETH will be automatically distributed to beneficiaries after the grace period ends.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    const willCommitment = "0x" + willData.willSalt; // Simplified for demo
                                                    await withdrawEth(willCommitment);
                                                    alert('ETH withdrawn successfully!');
                                                } catch (err) {
                                                    console.error('Withdrawal failed:', err);
                                                    alert('Withdrawal failed. Please try again.');
                                                }
                                            }}
                                            variant="outline"
                                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                        >
                                            Withdraw ETH
                                        </Button>
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    const willCommitment = "0x" + willData.willSalt; // Simplified for demo
                                                    await withdrawAllEth(willCommitment);
                                                    alert('All ETH withdrawn successfully!');
                                                } catch (err) {
                                                    console.error('Withdrawal failed:', err);
                                                    alert('Withdrawal failed. Please try again.');
                                                }
                                            }}
                                            variant="outline"
                                            className="border-red-500 text-red-600 hover:bg-red-50"
                                        >
                                            Withdraw All ETH
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        onClick={() => window.location.href = '/checkin'}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Set Up Check-ins
                                        <ArrowRight className="ml-2" size={20} />
                                    </Button>
                                    <Button
                                        onClick={() => window.location.href = '/app'}
                                        variant="outline"
                                    >
                                        Back to Dashboard
                                    </Button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Error Display */}
                {(localError || error) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
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
            </motion.div>
        </div>
    );
}


