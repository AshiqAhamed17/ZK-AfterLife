// ZK-PDF Integration Service
// Integrates with the ZK-PDF backend service for PDF verification and proof generation

export interface Beneficiary {
    name: string;
    address: string;
    eth_amount: string;
    usdc_amount: string;
    nft_count: string;
    description?: string;
}

export interface PDFVerificationResult {
    success: boolean;
    message: string;
    pdf_hash: string;
    is_signed: boolean;
    signature_valid: boolean;
    text_found: boolean;
    text_position?: number;
}

export interface BeneficiaryExtractionResult {
    success: boolean;
    message: string;
    beneficiaries: Beneficiary[];
}

export interface PDFProofResult {
    success: boolean;
    message: string;
    pdf_proof: string;
    pdf_hash: string;
    public_inputs: string[];
    verification_key: string;
}

export class ZKPDFService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_ZKPDF_BACKEND_URL || 'http://localhost:3002';
    }

    /**
     * Verify PDF authenticity and search for specific text
     */
    async verifyPDF(
        pdfFile: File,
        pageNumber: number = 0,
        searchText: string = 'Beneficiary'
    ): Promise<PDFVerificationResult> {
        console.log('🔍 Verifying PDF:', pdfFile.name);

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('page_number', pageNumber.toString());
        formData.append('search_text', searchText);

        try {
            const response = await fetch(`${this.baseUrl}/api/verify-pdf`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: PDFVerificationResult = await response.json();
            console.log('✅ PDF verification result:', result);
            return result;
        } catch (error) {
            console.error('❌ PDF verification failed:', error);
            throw new Error(`PDF verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract beneficiary information from PDF
     */
    async extractBeneficiaries(pdfFile: File): Promise<BeneficiaryExtractionResult> {
        console.log('👥 Extracting beneficiaries from PDF:', pdfFile.name);

        const formData = new FormData();
        formData.append('pdf', pdfFile);

        try {
            const response = await fetch(`${this.baseUrl}/api/extract-beneficiaries`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: BeneficiaryExtractionResult = await response.json();
            console.log('✅ Beneficiary extraction result:', result);
            return result;
        } catch (error) {
            console.error('❌ Beneficiary extraction failed:', error);
            throw new Error(`Beneficiary extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate ZK proof for PDF verification
     */
    async generatePDFProof(
        pdfFile: File,
        pageNumber: number,
        offset: number,
        substring: string,
        beneficiaries: Beneficiary[]
    ): Promise<PDFProofResult> {
        console.log('🔐 Generating PDF proof for:', pdfFile.name);

        // Convert PDF file to bytes
        const pdfBytes = await this.fileToBytes(pdfFile);

        const request = {
            pdf_bytes: Array.from(pdfBytes),
            page_number: pageNumber,
            offset: offset,
            substring: substring,
            beneficiaries: beneficiaries,
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/generate-pdf-proof`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: PDFProofResult = await response.json();
            console.log('✅ PDF proof generation result:', result);
            return result;
        } catch (error) {
            console.error('❌ PDF proof generation failed:', error);
            throw new Error(`PDF proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Complete PDF-to-Will registration flow
     */
    async registerWillFromPDF(
        pdfFile: File,
        beneficiaries: Beneficiary[]
    ): Promise<{
        pdfProof: PDFProofResult;
        willProof: any; // Your existing will proof
        pdfHash: string;
    }> {
        console.log('🚀 Starting complete PDF-to-Will registration flow');

        try {
            // Step 1: Verify PDF
            const verificationResult = await this.verifyPDF(pdfFile);
            if (!verificationResult.success) {
                throw new Error('PDF verification failed');
            }

            // Step 2: Generate PDF proof
            const pdfProof = await this.generatePDFProof(
                pdfFile,
                0, // page number
                100, // offset
                'Beneficiary', // substring to prove exists
                beneficiaries
            );

            if (!pdfProof.success) {
                throw new Error('PDF proof generation failed');
            }

            // Step 3: Generate will proof (using your existing NoirService)
            // This would integrate with your existing noirService.generateWillProof()
            const willProof = await this.generateWillProofFromBeneficiaries(beneficiaries);

            console.log('✅ Complete PDF-to-Will registration successful');

            return {
                pdfProof,
                willProof,
                pdfHash: verificationResult.pdf_hash,
            };
        } catch (error) {
            console.error('❌ Complete PDF-to-Will registration failed:', error);
            throw error;
        }
    }

    /**
     * Convert File to Uint8Array
     */
    private async fileToBytes(file: File): Promise<Uint8Array> {
        const arrayBuffer = await file.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    /**
     * Generate will proof from beneficiaries (integrates with existing NoirService)
     */
    private async generateWillProofFromBeneficiaries(beneficiaries: Beneficiary[]): Promise<any> {
        // This would integrate with your existing noirService
        // For now, return a mock proof structure
        console.log('🔐 Generating will proof for beneficiaries:', beneficiaries.length);

        // In a real implementation, you would call your existing noirService.generateWillProof()
        // with the beneficiaries data converted to the expected format

        return {
            willCommitment: '0x' + Math.random().toString(16).substring(2, 66),
            merkleRoot: '0x' + Math.random().toString(16).substring(2, 66),
            proof: '0x' + Math.random().toString(16).substring(2, 130),
            publicInputs: ['0x' + Math.random().toString(16).substring(2, 66)],
        };
    }

    /**
     * Validate PDF file
     */
    validatePDFFile(file: File): { valid: boolean; error?: string } {
        // Check file type
        if (file.type !== 'application/pdf') {
            return { valid: false, error: 'File must be a PDF' };
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 10MB' };
        }

        // Check file name
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return { valid: false, error: 'File must have .pdf extension' };
        }

        return { valid: true };
    }

    /**
     * Get service status
     */
    async getServiceStatus(): Promise<{ status: string; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
            });

            if (response.ok) {
                return { status: 'online', message: 'ZK-PDF service is running' };
            } else {
                return { status: 'offline', message: 'ZK-PDF service is not responding' };
            }
        } catch (error) {
            return { status: 'offline', message: `ZK-PDF service connection failed: ${error}` };
        }
    }
}

// Export singleton instance
export const zkpdfService = new ZKPDFService();
