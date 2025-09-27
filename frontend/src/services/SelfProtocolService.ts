import { SelfBackendVerifier, getUniversalLink } from '@selfxyz/core';
import QRCode from 'qrcode';

export interface SelfVerificationResult {
    success: boolean;
    userAddress: string;
    method: 'passport' | 'aadhaar';
    nationality?: string;
    ageVerified: boolean;
}

export class SelfProtocolService {
    private isInitialized = false;
    private contractAddress = '0x547C2767422c2fCFE2043a79DB43B4738918370F';

    async initialize(userAddress: string): Promise<void> {
        try {
            this.isInitialized = true;
            console.log('✅ Self Protocol initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Self Protocol:', error);
            throw error;
        }
    }

    async generateQRCode(
        method: 'passport' | 'aadhaar',
        userAddress: string
    ): Promise<{ qrCode: string; deepLink: string }> {
        try {
            if (!this.isInitialized) {
                await this.initialize(userAddress);
            }

            console.log('🔗 Generating QR code for', method, 'verification for user:', userAddress);

            // Use the exact configuration from the Self Protocol workshop
            // This should work with the existing workshop setup
            const verificationConfig = {
                minimumAge: 18,
                excludedCountries: ["USA"], // Match workshop config
                ofac: false,
                // disclosures
                name: true,
                nationality: true,
                gender: true,
                date_of_birth: true,
                passport_number: true,
                expiry_date: true
            };

            // Generate deep link using Self Protocol
            // Use the exact configuration from the workshop
            const deepLink = getUniversalLink({
                endpoint: this.contractAddress,
                endpointType: 'staging_celo',
                userId: userAddress,
                userIdType: 'hex',
                version: 2,
                appName: 'Self Workshop',
                scope: 'self-workshop',
                disclosures: verificationConfig,
                logoBase64: '',
                deeplinkCallback: '',
                header: 'Self Workshop',
                sessionId: `session-${Date.now()}`,
                devMode: true,
                chainID: 44787, // Celo Sepolia
                userDefinedData: ''
            });

            // Generate real QR code from deep link
            const qrCodeDataURL = await QRCode.toDataURL(deepLink, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                deepLink: deepLink
            };
        } catch (error) {
            console.error('❌ Failed to generate QR code:', error);
            throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async waitForVerification(
        method: 'passport' | 'aadhaar',
        userAddress: string,
        onProgress?: (status: string) => void
    ): Promise<SelfVerificationResult> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isInitialized) {
                    await this.initialize(userAddress);
                }

                onProgress?.('Waiting for verification...');

                // For demonstration purposes, we'll simulate the verification
                // In a real implementation, this would poll the contract or use WebSocket
                // The ConfigNotSet error suggests the contract needs proper configuration

                console.log('🔍 Simulating Self Protocol verification...');
                console.log('📋 Verification config:', {
                    minimumAge: 18,
                    excludedCountries: ["USA"],
                    ofac: false
                });
                console.log('🎯 Target contract:', this.contractAddress);
                console.log('👤 User address:', userAddress);

                setTimeout(() => {
                    onProgress?.('Processing verification data...');

                    setTimeout(() => {
                        onProgress?.('Verification completed, processing...');

                        // Simulate successful verification
                        // In production, this would verify against the actual contract
                        const result: SelfVerificationResult = {
                            success: true,
                            userAddress: userAddress,
                            method: method,
                            nationality: method === 'passport' ? 'USA' : 'IND',
                            ageVerified: true,
                        };

                        onProgress?.('Verification successful!');
                        console.log('✅ Mock verification completed:', result);
                        resolve(result);
                    }, 2000);
                }, 2000);

            } catch (error) {
                console.error('❌ Failed to wait for verification:', error);
                reject(new Error(`Failed to wait for verification: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        });
    }

    async checkVerificationStatus(userAddress: string): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                await this.initialize(userAddress);
            }

            // In a real implementation, this would check the contract
            // For now, return false to always require verification
            console.log('ℹ️ Checking verification status for:', userAddress);
            return false;
        } catch (error) {
            console.error('❌ Failed to check verification status:', error);
            return false;
        }
    }

    getInstructions(method: 'passport' | 'aadhaar'): string[] {
        if (method === 'passport') {
            return [
                'Download the Self app on your mobile device',
                'Use your phone\'s NFC reader to scan your passport chip',
                'Confirm you are 18+ years old in the app',
                'Complete the verification process'
            ];
        } else {
            return [
                'Open the official mAadhaar app on your mobile device',
                'Generate a QR code from your Aadhaar details',
                'Open the Self app and scan the Aadhaar QR code',
                'Confirm you are 18+ years old in the app',
                'Complete the verification process'
            ];
        }
    }
}

// Export singleton instance
export const selfProtocolService = new SelfProtocolService();
