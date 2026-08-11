import { SelfBackendVerifier, getUniversalLink } from '@selfxyz/core';
import QRCode from 'qrcode';
import { registryService } from './registryService';

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
                excludedCountries: ["USA" as any], // Match workshop config
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

    /**
     * Poll the real on-chain SelfHumanVerifier (via registryService.isSelfVerified)
     * until the connected user is verified, or time out. No simulated success —
     * this resolves only when the contract actually reports the user verified.
     */
    async waitForVerification(
        method: 'passport' | 'aadhaar',
        userAddress: string,
        onProgress?: (status: string) => void
    ): Promise<SelfVerificationResult> {
        if (!this.isInitialized) {
            await this.initialize(userAddress);
        }

        const timeoutMs = 5 * 60 * 1000; // 5 minutes to complete the Self app flow
        const pollIntervalMs = 3000;
        const startedAt = Date.now();

        onProgress?.('Waiting for verification...');

        while (Date.now() - startedAt < timeoutMs) {
            const verified = await registryService.isSelfVerified(userAddress as `0x${string}`);
            if (verified) {
                onProgress?.('Verification successful!');
                return {
                    success: true,
                    userAddress,
                    method,
                    // The contract's isFullyVerified already requires age >= 18;
                    // nationality isn't exposed by this read, so it's omitted
                    // rather than guessed.
                    ageVerified: true,
                };
            }
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error(
            'Verification timed out. Complete the scan in the Self app, then try again.'
        );
    }

    /** Real on-chain read — no simulated status. */
    async checkVerificationStatus(userAddress: string): Promise<boolean> {
        try {
            return await registryService.isSelfVerified(userAddress as `0x${string}`);
        } catch (error) {
            console.error('Failed to check verification status:', error);
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
