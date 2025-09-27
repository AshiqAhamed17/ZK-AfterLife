"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  Globe, 
  QrCode, 
  Loader2,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { selfService } from '../services/SelfService';
import { SelfVerificationResult } from '../config/self';
import GlassCard from './ui/GlassCard';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface SelfVerificationProps {
  userAddress: string;
  onVerificationComplete: (result: SelfVerificationResult) => void;
  onBack: () => void;
}

type VerificationStep = 'method-selection' | 'instructions' | 'verification' | 'completed' | 'error';

export default function SelfVerification({ 
  userAddress, 
  onVerificationComplete, 
  onBack 
}: SelfVerificationProps) {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<'passport' | 'aadhaar' | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Check if user is already verified on component mount
  useEffect(() => {
    checkExistingVerification();
  }, [userAddress]);

  const checkExistingVerification = async () => {
    try {
      setIsLoading(true);
      const status = await selfService.checkVerificationStatus(userAddress);
      
      if (status.isVerified && status.isAgeValid) {
        const result: SelfVerificationResult = {
          success: true,
          userAddress,
          method: status.method as 'passport' | 'aadhaar',
          nationality: status.nationality,
          ageVerified: true
        };
        onVerificationComplete(result);
      }
    } catch (error) {
      console.error('Failed to check existing verification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelection = (method: 'passport' | 'aadhaar') => {
    setSelectedMethod(method);
    setCurrentStep('instructions');
    setError('');
  };

  const handleStartVerification = async () => {
    if (!selectedMethod) return;

    try {
      setIsLoading(true);
      setCurrentStep('verification');
      setError('');

      // Generate QR code and deep link
      const { qrCode: generatedQr, deepLink: generatedDeepLink } = 
        await selfService.generateQRCode(selectedMethod, userAddress);
      
      setQrCode(generatedQr);
      setDeepLink(generatedDeepLink);

      // Start verification process
      const result = await selfService.waitForVerification(
        selectedMethod, 
        userAddress,
        (status) => setVerificationStatus(status)
      );

      setCurrentStep('completed');
      setTimeout(() => {
        onVerificationComplete(result);
      }, 2000);

    } catch (error) {
      console.error('Verification failed:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodIcon = (method: 'passport' | 'aadhaar') => {
    return method === 'passport' ? '🌍' : '🇮🇳';
  };

  const getMethodName = (method: 'passport' | 'aadhaar') => {
    return method === 'passport' ? 'Passport NFC' : 'Aadhaar QR';
  };

  const renderMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <Badge className="mb-4 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
          <Smartphone className="w-4 h-4 mr-2" />
          Choose Verification Method
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verify Your Identity
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Select your preferred verification method to prove you're a real human over 18
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selfService.getSupportedMethods().map((method) => (
          <motion.div
            key={method.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
            onClick={() => handleMethodSelection(method.id)}
          >
            <GlassCard className="p-6 h-full hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="text-4xl mb-4">{method.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {method.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {method.description}
                </p>
                <div className="flex items-center justify-center text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Supported
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onBack}
          variant="outline"
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Will Registration
        </Button>
      </div>
    </motion.div>
  );

  const renderInstructions = () => {
    if (!selectedMethod) return null;

    const instructions = selfService.getVerificationInstructions(selectedMethod);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <Badge className="mb-4 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
            {instructions.icon}
            {instructions.title}
          </Badge>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Instructions
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {instructions.description}
          </p>
        </div>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Step-by-Step Process:
          </h3>
          <ol className="space-y-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {index + 1}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{step}</p>
              </li>
            ))}
          </ol>
        </GlassCard>

        <div className="flex justify-between">
          <Button
            onClick={() => setCurrentStep('method-selection')}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Method Selection
          </Button>
          <Button
            onClick={handleStartVerification}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Verification
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderVerification = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div>
        <Badge className="mb-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <QrCode className="w-4 h-4 mr-2" />
          Verification in Progress
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {getMethodName(selectedMethod!)} Verification
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Follow the instructions in the Self app to complete verification
        </p>
      </div>

      {qrCode && (
        <GlassCard className="p-8">
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCode} alt="Verification QR Code" className="w-48 h-48" />
              </div>
            </div>
            
            {deepLink && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Or open directly in Self app:
                </p>
                <Button
                  onClick={() => window.open(deepLink, '_blank')}
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Self App
                </Button>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          <span className="text-gray-700 dark:text-gray-300">
            {verificationStatus || 'Waiting for verification...'}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );

  const renderCompleted = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verification Successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          You have been verified as a human over 18. You can now proceed with will registration.
        </p>
      </div>

      <GlassCard className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Verification Method:</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {getMethodIcon(selectedMethod!)} {getMethodName(selectedMethod!)}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );

  const renderError = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
        <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verification Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {error}
        </p>
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          onClick={() => setCurrentStep('method-selection')}
          variant="outline"
        >
          Try Again
        </Button>
        <Button
          onClick={onBack}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Back to Registration
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <AnimatePresence mode="wait">
        {currentStep === 'method-selection' && renderMethodSelection()}
        {currentStep === 'instructions' && renderInstructions()}
        {currentStep === 'verification' && renderVerification()}
        {currentStep === 'completed' && renderCompleted()}
        {currentStep === 'error' && renderError()}
      </AnimatePresence>
    </div>
  );
}
