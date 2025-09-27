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

        const selfApp = new SelfAppBuilder(config).build();
        return selfApp;
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

            // For now, return mock data for testing
            // In production, this would use the actual Self SDK
            console.log('Generating mock QR code for', method, 'verification for user:', userAddress);

            const mockQRCode = `data:image/svg+xml;base64,${btoa(`
                <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="200" fill="white"/>
                    <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
                        Self ${method.toUpperCase()} QR Code
                    </text>
                    <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10">
                        User: ${userAddress.slice(0, 8)}...
                    </text>
                </svg>
            `)}`;

            const mockDeepLink = `self://verify/${method}/${userAddress}`;

            return {
                qrCode: mockQRCode,
                deepLink: mockDeepLink
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

                onProgress?.('Waiting for verification...');

                // Mock verification process for testing
                setTimeout(() => {
                    onProgress?.('Verification completed, processing...');
                    
                    // Mock successful verification
                    const verificationResult: SelfVerificationResult = {
                        success: true,
                        userAddress: userAddress,
                        method: method,
                        nationality: method === 'passport' ? 'USA' : 'IND',
                        ageVerified: true,
                    };

                    onProgress?.('Verification successful!');
                    resolve(verificationResult);
                }, 3000); // 3 second delay to simulate verification

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
