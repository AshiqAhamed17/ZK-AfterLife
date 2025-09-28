'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useState } from 'react';

interface Beneficiary {
    name: string;
    address: string;
    eth_amount: string;
    usdc_amount: string;
    nft_count: string;
    description?: string;
}

interface PDFVerificationResult {
    success: boolean;
    message: string;
    pdf_hash: string;
    is_signed: boolean;
    signature_valid: boolean;
    text_found: boolean;
    text_position?: number;
}

interface BeneficiaryExtractionResult {
    success: boolean;
    message: string;
    beneficiaries: Beneficiary[];
}

interface PDFUploaderProps {
    onBeneficiariesExtracted: (beneficiaries: Beneficiary[]) => void;
    onVerificationComplete: (result: PDFVerificationResult) => void;
    onError: (error: string) => void;
}

export default function PDFUploader({
    onBeneficiariesExtracted,
    onVerificationComplete,
    onError
}: PDFUploaderProps) {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [verificationResult, setVerificationResult] = useState<PDFVerificationResult | null>(null);
    const [extractedBeneficiaries, setExtractedBeneficiaries] = useState<Beneficiary[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                setPdfFile(file);
            } else {
                onError('Please upload a PDF file');
            }
        }
    }, [onError]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf') {
                setPdfFile(file);
            } else {
                onError('Please upload a PDF file');
            }
        }
    };

    const verifyPDF = async (file: File) => {
        setIsVerifying(true);

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('page_number', '0');
            formData.append('search_text', 'Beneficiary');

            const response = await fetch('http://localhost:3002/api/verify-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: PDFVerificationResult = await response.json();
            setVerificationResult(result);
            onVerificationComplete(result);

            if (result.success) {
                // Extract beneficiaries after successful verification
                await extractBeneficiaries(file);
            }
        } catch (error) {
            console.error('PDF verification failed:', error);
            onError(`PDF verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const extractBeneficiaries = async (file: File) => {
        setIsExtracting(true);

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            const response = await fetch('http://localhost:3002/api/extract-beneficiaries', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: BeneficiaryExtractionResult = await response.json();

            if (result.success) {
                setExtractedBeneficiaries(result.beneficiaries);
                onBeneficiariesExtracted(result.beneficiaries);
            } else {
                onError(`Failed to extract beneficiaries: ${result.message}`);
            }
        } catch (error) {
            console.error('Beneficiary extraction failed:', error);
            onError(`Beneficiary extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleUpload = async () => {
        if (!pdfFile) return;

        setIsUploading(true);
        try {
            await verifyPDF(pdfFile);
        } catch (error) {
            onError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const resetUpload = () => {
        setPdfFile(null);
        setVerificationResult(null);
        setExtractedBeneficiaries([]);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Upload Area */}
            <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="space-y-4">
                    <div className="text-6xl">📄</div>
                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {pdfFile ? pdfFile.name : 'Upload your PDF will'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Drag and drop your PDF here, or click to browse
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Supported format: PDF with digital signature
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Button */}
            {pdfFile && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex gap-4 justify-center"
                >
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || isVerifying || isExtracting}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {(isUploading || isVerifying || isExtracting) ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {isVerifying ? 'Verifying PDF...' : isExtracting ? 'Extracting Beneficiaries...' : 'Uploading...'}
                            </>
                        ) : (
                            <>
                                🔍 Verify & Extract
                            </>
                        )}
                    </button>

                    <button
                        onClick={resetUpload}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                        Reset
                    </button>
                </motion.div>
            )}

            {/* Verification Results */}
            <AnimatePresence>
                {verificationResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                        <h3 className="font-medium text-green-800 mb-2">✅ PDF Verification Results</h3>
                        <div className="space-y-1 text-sm text-green-700">
                            <p>📄 PDF Hash: {verificationResult.pdf_hash.substring(0, 20)}...</p>
                            <p>🔐 Signed: {verificationResult.is_signed ? 'Yes' : 'No'}</p>
                            <p>✅ Signature Valid: {verificationResult.signature_valid ? 'Yes' : 'No'}</p>
                            <p>🔍 Text Found: {verificationResult.text_found ? 'Yes' : 'No'}</p>
                            {verificationResult.text_position && (
                                <p>📍 Position: {verificationResult.text_position}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extracted Beneficiaries */}
            <AnimatePresence>
                {extractedBeneficiaries.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-6"
                    >
                        <h3 className="font-medium text-gray-900 mb-4">
                            👥 Extracted Beneficiaries ({extractedBeneficiaries.length})
                        </h3>
                        <div className="space-y-3">
                            {extractedBeneficiaries.map((beneficiary, index) => (
                                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Name:</span> {beneficiary.name}
                                        </div>
                                        <div>
                                            <span className="font-medium">Address:</span> {beneficiary.address.substring(0, 20)}...
                                        </div>
                                        <div>
                                            <span className="font-medium">ETH:</span> {beneficiary.eth_amount}
                                        </div>
                                        <div>
                                            <span className="font-medium">USDC:</span> {beneficiary.usdc_amount}
                                        </div>
                                        <div>
                                            <span className="font-medium">NFTs:</span> {beneficiary.nft_count}
                                        </div>
                                        {beneficiary.description && (
                                            <div className="col-span-2">
                                                <span className="font-medium">Description:</span> {beneficiary.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
