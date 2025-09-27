import { SelfAppBuilder } from '@selfxyz/core';
import {
    getSelfConfig,
    SELF_CONFIG,
    SelfConfig,
    SelfVerificationResult
} from '../config/self';

export class SelfService {
    private selfApp: any = null;
    private isInitialized = false;

    /**
     * Initialize Self service
     */
    async initialize(): Promise<void> {
        try {
            console.log('Initializing Self Service...');
            this.isInitialized = true;
            console.log('Self Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Self Service:', error);
            throw error;
        }
    }

    /**
     * Create Self app instance for verification
     */
    private createSelfApp(
        method: 'passport' | 'aadhaar',
        userAddress: string
    ): any {
        const config = getSelfConfig(method, userAddress);

        console.log('Creating Self app with config:', {
            ...config,
            userId: '[REDACTED]' // Don't log user address
        });

        // Create V2 configuration with proper disclosures
        const v2Config = {
            ...config,
            disclosures: this.getDisclosures(method)
        };

        const selfApp = new SelfAppBuilder(v2Config).build();
        return selfApp;
    }

    /**
     * Get disclosures based on verification method
     */
    private getDisclosures(method: 'passport' | 'aadhaar'): any {
        if (method === 'passport') {
            return {
                passport: {
                    mrz: true,
                    portrait: false,
                    signature: false,
                    document: false,
                    nationality: true,
                    birthDate: true
                }
            };
        } else {
            return {
                aadhaar: {
                    name: true,
                    birthDate: true,
                    address: false,
                    document: false,
                    nationality: true
                }
            };
        }
    }

    /**
     * Generate QR code for verification
     */
    async generateQRCode(
        method: 'passport' | 'aadhaar',
        userAddress: string
    ): Promise<{ qrCode: string; deepLink: string }> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const selfApp = this.createSelfApp(method, userAddress);

            // Generate QR code and deep link
            const qrCode = await selfApp.generateQRCode();
            const deepLink = await selfApp.generateDeepLink();

            console.log('Generated QR code and deep link for', method, 'verification');

            return {
                qrCode,
                deepLink
            };
        } catch (error) {
            console.error('Failed to generate QR code:', error);
            throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Wait for verification completion
     */
    async waitForVerification(
        method: 'passport' | 'aadhaar',
        userAddress: string,
        onProgress?: (status: string) => void
    ): Promise<SelfVerificationResult> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isInitialized) {
                    await this.initialize();
                }

                const selfApp = this.createSelfApp(method, userAddress);

                onProgress?.('Waiting for verification...');

                // Set up verification listener
                const verificationListener = async (result: any) => {
                    try {
                        console.log('Verification result received:', result);

                        onProgress?.('Verification completed, processing...');

                        // Parse verification result
                        const verificationResult: SelfVerificationResult = {
                            success: true,
                            userAddress: userAddress,
                            method: method,
                            nationality: result.nationality || 'UNKNOWN',
                            ageVerified: result.olderThan >= 18,
                        };

                        onProgress?.('Verification successful!');
                        resolve(verificationResult);
                    } catch (error) {
                        console.error('Error processing verification result:', error);
                        reject(new Error(`Failed to process verification: ${error instanceof Error ? error.message : 'Unknown error'}`));
                    }
                };

                // Set up error listener
                const errorListener = (error: any) => {
                    console.error('Verification error:', error);
                    reject(new Error(`Verification failed: ${error.message || 'Unknown error'}`));
                };

                // Start verification process
                await selfApp.startVerification(verificationListener, errorListener);

            } catch (error) {
                console.error('Failed to start verification:', error);
                reject(new Error(`Failed to start verification: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        });
    }

    /**
     * Check verification status on-chain
     */
    async checkVerificationStatus(userAddress: string): Promise<{
        isVerified: boolean;
        isAgeValid: boolean;
        method: string;
        nationality: string;
    }> {
        try {
            // This would typically call your deployed contract
            // For now, we'll return a mock response
            console.log('Checking verification status for:', userAddress);

            // TODO: Implement actual contract call to check verification status
            // const contract = new ethers.Contract(SELF_CONFIG.SELF_HUMAN_VERIFIER_ADDRESS, abi, provider);
            // const [isVerified, isAgeValid, method, nationality] = await contract.getUserVerificationDetails(userAddress);

            return {
                isVerified: false, // Will be replaced with actual contract call
                isAgeValid: false,
                method: '',
                nationality: ''
            };
        } catch (error) {
            console.error('Failed to check verification status:', error);
            throw new Error(`Failed to check verification status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get verification instructions for the selected method
     */
    getVerificationInstructions(method: 'passport' | 'aadhaar'): {
        title: string;
        steps: string[];
        icon: string;
        description: string;
    } {
        if (method === 'passport') {
            return {
                title: 'Passport Verification',
                icon: '🌍',
                description: 'Verify your identity using your passport NFC chip',
                steps: [
                    'Open the Self mobile app on your phone',
                    'Scan the QR code displayed below',
                    'Place your phone on your passport',
                    'Wait for NFC reading to complete',
                    'Follow the app instructions to complete verification'
                ]
            };
        } else {
            return {
                title: 'Aadhaar Verification',
                icon: '🇮🇳',
                description: 'Verify your identity using your Aadhaar card',
                steps: [
                    'Open the mAadhaar app on your phone',
                    'Generate a QR code from your Aadhaar details',
                    'Open the Self mobile app',
                    'Scan the generated QR code',
                    'Enter the PDF password (first 4 letters of name + birth year)',
                    'Complete the verification process'
                ]
            };
        }
    }

    /**
     * Validate user address format
     */
    validateUserAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Get supported verification methods
     */
    getSupportedMethods(): Array<{
        id: 'passport' | 'aadhaar';
        name: string;
        description: string;
        icon: string;
        supported: boolean;
    }> {
        return [
            {
                id: 'passport',
                name: 'Passport NFC',
                description: 'International passport verification',
                icon: '🌍',
                supported: true
            },
            {
                id: 'aadhaar',
                name: 'Aadhaar QR',
                description: 'Indian Aadhaar verification',
                icon: '🇮🇳',
                supported: true
            }
        ];
    }
}

// Export singleton instance
export const selfService = new SelfService();
