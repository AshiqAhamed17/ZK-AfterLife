// Self Protocol Configuration
export interface SelfConfig {
    endpoint: string;
    endpointType: 'staging_celo' | 'celo';
    userIdType: 'hex';
    version: 2;
    appName: string;
    scope: string;
    userId: string;
    disclosures: SelfDisclosures;
}

export interface SelfDisclosures {
    minimumAge: number;
    excludedCountries: string[];
    ofac: boolean;
    name: boolean;
    nationality: boolean;
    gender: boolean;
    date_of_birth: boolean;
    passport_number?: boolean;
    expiry_date?: boolean;
    idNumber?: boolean; // For Aadhaar
}

export interface SelfVerificationResult {
    success: boolean;
    userAddress: string;
    method: 'passport' | 'aadhaar';
    nationality: string;
    ageVerified: boolean;
    error?: string;
}

// Self Protocol Configuration
export const SELF_CONFIG = {
    // Deployed contract addresses
    SELF_HUMAN_VERIFIER_ADDRESS: '0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B',
    SELF_HUB_ADDRESS: '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74',
    SELF_SCOPE: 1,

    // App configuration
    APP_NAME: 'ZK AfterLife',
    SCOPE_SEED: 'zk-afterlife-verification',

    // Network configuration
    NETWORK: 'celo-sepolia',
    CHAIN_ID: 11142220,
} as const;

// Verification method configurations
export const PASSPORT_DISCLOSURES: SelfDisclosures = {
    minimumAge: 18,
    excludedCountries: [],
    ofac: false,
    name: true,
    nationality: true,
    gender: true,
    date_of_birth: true,
    passport_number: true,
    expiry_date: true,
};

export const AADHAAR_DISCLOSURES: SelfDisclosures = {
    minimumAge: 18,
    excludedCountries: [],
    ofac: false,
    name: true,
    nationality: true,
    gender: true,
    date_of_birth: true,
    idNumber: true, // Last 4 digits of Aadhaar
};

// Helper function to get Self configuration
export function getSelfConfig(
    method: 'passport' | 'aadhaar',
    userAddress: string
): SelfConfig {
    return {
        endpoint: SELF_CONFIG.SELF_HUMAN_VERIFIER_ADDRESS,
        endpointType: 'staging_celo', // Use 'celo' for mainnet
        userIdType: 'hex',
        version: 2,
        appName: SELF_CONFIG.APP_NAME,
        scope: SELF_CONFIG.SCOPE_SEED,
        userId: userAddress,
        disclosures: method === 'aadhaar' ? AADHAAR_DISCLOSURES : PASSPORT_DISCLOSURES,
    };
}
