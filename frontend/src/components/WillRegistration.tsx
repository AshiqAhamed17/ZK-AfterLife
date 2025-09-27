"use client";

import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, CheckCircle, FileText, Shield, UserCheck, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { SelfVerificationResult } from '../config/self';
import SelfVerification from './SelfVerification';
import Button from './ui/Button';
import GlassCard from './ui/GlassCard';

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
}

export default function WillRegistration() {
  const [step, setStep] = useState(1);
  const [willData, setWillData] = useState<WillData>({
    beneficiaries: [
      { address: '', ethAmount: '', usdcAmount: '', nftCount: '', name: '' }
    ],
    totalEth: '',
    totalUsdc: '',
    totalNfts: '',
    description: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSelfVerified, setIsSelfVerified] = useState(false);
  const [selfVerificationResult, setSelfVerificationResult] = useState<SelfVerificationResult | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');

  const addBeneficiary = () => {
    if (willData.beneficiaries.length < 4) {
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
    // Basic validation
    if (!willData.description.trim()) return 'Please provide a will description';
    if (willData.beneficiaries.some(b => !b.address.trim() || !b.name.trim())) {
      return 'Please fill in all beneficiary details';
    }
    if (willData.beneficiaries.some(b => !b.ethAmount && !b.usdcAmount && !b.nftCount)) {
      return 'Each beneficiary must have at least one asset allocation';
    }
    if (!isSelfVerified) {
      return 'Self verification is required to register a will';
    }
    return null;
  };

  const handleSelfVerificationComplete = (result: SelfVerificationResult) => {
    setSelfVerificationResult(result);
    setIsSelfVerified(true);
    setUserAddress(result.userAddress);
    // Move to next step after verification
    setStep(step + 1);
  };

  const handleSelfVerificationBack = () => {
    // Go back to previous step
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // TODO: Integrate with Aztec SDK and Noir circuit
      // 1. Generate will commitment hash
      // 2. Create ZK proof using Noir
      // 3. Register will on Aztec L2

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIsSuccess(true);
      setStep(4);
    } catch (err) {
      setError('Failed to register will. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const getStepTitle = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return 'Identity Verification';
      case 2:
        return 'Will Details';
      case 3:
        return 'Beneficiaries';
      case 4:
        return 'Confirmation';
      default:
        return 'Unknown Step';
    }
  };

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return <UserCheck className="w-5 h-5" />;
      case 2:
        return <FileText className="w-5 h-5" />;
      case 3:
        return <Users className="w-5 h-5" />;
      case 4:
        return <Shield className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center"
      >
        <GlassCard className="p-8">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Will Successfully Registered!</h2>
          <p className="text-gray-300 mb-6">
            Your will has been securely registered on the Aztec network.
            The details are encrypted and only accessible through your ZK proofs.
          </p>
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">Will Commitment Hash:</p>
            <p className="font-mono text-white text-sm break-all">
              0x1234...5678
            </p>
          </div>
          <Button onClick={() => window.location.href = '/checkin'}>
            Continue to Check-in
          </Button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Register Your Will</h1>
        <p className="text-gray-300">
          Securely register your digital inheritance plan using zero-knowledge proofs
        </p>
      </motion.div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= stepNum ? 'bg-purple-500' : 'bg-gray-600'
              }`}>
              {step > stepNum ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                step === stepNum ? getStepIcon(stepNum) : <span className="text-white font-semibold">{stepNum}</span>
              )}
            </div>
            {stepNum < 4 && (
              <div className={`w-16 h-1 mx-2 ${step > stepNum ? 'bg-purple-500' : 'bg-gray-600'
                }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Titles */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-16">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="text-center">
              <p className={`text-sm ${step >= stepNum ? 'text-purple-400' : 'text-gray-500'}`}>
                {getStepTitle(stepNum)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Self Verification */}
      {step === 1 && (
        <SelfVerification
          userAddress={userAddress || '0x0000000000000000000000000000000000000000'}
          onVerificationComplete={handleSelfVerificationComplete}
          onBack={handleSelfVerificationBack}
        />
      )}

      {/* Step 2: Basic Information */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Will Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Will Description
                </label>
                <textarea
                  value={willData.description}
                  onChange={(e) => setWillData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your will (optional but recommended)"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total ETH
                  </label>
                  <input
                    type="number"
                    value={willData.totalEth}
                    onChange={(e) => setWillData(prev => ({ ...prev, totalEth: e.target.value }))}
                    placeholder="0.0"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total USDC
                  </label>
                  <input
                    type="number"
                    value={willData.totalUsdc}
                    onChange={(e) => setWillData(prev => ({ ...prev, totalUsdc: e.target.value }))}
                    placeholder="0"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total NFTs
                  </label>
                  <input
                    type="number"
                    value={willData.totalNfts}
                    onChange={(e) => setWillData(prev => ({ ...prev, totalNfts: e.target.value }))}
                    placeholder="0"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Step 3: Beneficiaries */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Beneficiaries</h2>
            </div>

            <div className="space-y-4">
              {willData.beneficiaries.map((beneficiary, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-white">Beneficiary {index + 1}</h3>
                    {willData.beneficiaries.length > 1 && (
                      <button
                        onClick={() => removeBeneficiary(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={beneficiary.name}
                        onChange={(e) => updateBeneficiary(index, 'name', e.target.value)}
                        placeholder="Beneficiary name"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ethereum Address
                      </label>
                      <input
                        type="text"
                        value={beneficiary.address}
                        onChange={(e) => updateBeneficiary(index, 'address', e.target.value)}
                        placeholder="0x..."
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ETH Allocation
                      </label>
                      <input
                        type="number"
                        value={beneficiary.ethAmount}
                        onChange={(e) => updateBeneficiary(index, 'ethAmount', e.target.value)}
                        placeholder="0.0"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        USDC Allocation
                      </label>
                      <input
                        type="number"
                        value={beneficiary.usdcAmount}
                        onChange={(e) => updateBeneficiary(index, 'usdcAmount', e.target.value)}
                        placeholder="0"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        NFT Count
                      </label>
                      <input
                        type="number"
                        value={beneficiary.nftCount}
                        onChange={(e) => updateBeneficiary(index, 'nftCount', e.target.value)}
                        placeholder="0"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {willData.beneficiaries.length < 4 && (
                <Button onClick={addBeneficiary} variant="outline">
                  Add Beneficiary
                </Button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Step 4: Review and Submit */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Review & Submit</h2>
            </div>

            <div className="space-y-4 mb-6">
              {/* Self Verification Status */}
              {selfVerificationResult && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="font-medium text-green-400">Identity Verified</h3>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p>Method: {selfVerificationResult.method === 'passport' ? '🌍 Passport NFC' : '🇮🇳 Aadhaar QR'}</p>
                    <p>Nationality: {selfVerificationResult.nationality}</p>
                    <p>Age Verified: {selfVerificationResult.ageVerified ? 'Yes (18+)' : 'No'}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Will Summary</h3>
                <p className="text-gray-300">{willData.description || 'No description provided'}</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Asset Totals</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">ETH:</span>
                    <span className="text-white ml-2">{willData.totalEth || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">USDC:</span>
                    <span className="text-white ml-2">{willData.totalUsdc || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">NFTs:</span>
                    <span className="text-white ml-2">{willData.totalNfts || '0'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Beneficiaries</h3>
                <div className="space-y-2">
                  {willData.beneficiaries.map((ben, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-gray-400">{ben.name}:</span>
                      <span className="text-white ml-2">
                        {ben.ethAmount && `${ben.ethAmount} ETH`}
                        {ben.usdcAmount && `${ben.usdcAmount} USDC`}
                        {ben.nftCount && `${ben.nftCount} NFTs`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300">{error}</span>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={prevStep} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Register Will
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Navigation */}
      {step < 3 && (
        <div className="flex justify-between mt-8">
          <Button onClick={prevStep} variant="outline" disabled={step === 1}>
            Previous
          </Button>
          <Button onClick={nextStep}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
