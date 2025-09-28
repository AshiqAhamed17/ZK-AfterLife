use serde::{Deserialize, Serialize};

/// Request to verify a PDF document
#[derive(Debug, Deserialize)]
pub struct PDFVerificationRequest {
    pub pdf_bytes: Vec<u8>,
    pub page_number: u32,
    pub search_text: String,
}

/// Response from PDF verification
#[derive(Debug, Serialize)]
pub struct PDFVerificationResponse {
    pub success: bool,
    pub message: String,
    pub pdf_hash: String,
    pub is_signed: bool,
    pub signature_valid: bool,
    pub text_found: bool,
    pub text_position: Option<u32>,
}

/// Beneficiary information extracted from PDF
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Beneficiary {
    pub name: String,
    pub address: String,
    pub eth_amount: String,
    pub usdc_amount: String,
    pub nft_count: String,
    pub description: Option<String>,
}

/// Response from beneficiary extraction
#[derive(Debug, Serialize)]
pub struct BeneficiaryExtractionResponse {
    pub success: bool,
    pub message: String,
    pub beneficiaries: Vec<Beneficiary>,
}

/// Request to generate PDF proof
#[derive(Debug, Deserialize)]
pub struct PDFProofRequest {
    pub pdf_bytes: Vec<u8>,
    pub page_number: u32,
    pub offset: u32,
    pub substring: String,
    pub beneficiaries: Vec<Beneficiary>,
}

/// Response from PDF proof generation
#[derive(Debug, Serialize)]
pub struct PDFProofResponse {
    pub success: bool,
    pub message: String,
    pub pdf_proof: String,
    pub pdf_hash: String,
    pub public_inputs: Vec<String>,
    pub verification_key: String,
}

/// Combined will registration with PDF proof
#[derive(Debug, Serialize, Deserialize)]
pub struct PDFWillRegistration {
    pub pdf_proof: String,
    pub will_proof: String,
    pub pdf_hash: String,
    pub beneficiaries: Vec<Beneficiary>,
    pub will_commitment: String,
    pub merkle_root: String,
}

/// Error types for PDF processing
#[derive(Debug, thiserror::Error)]
pub enum PDFError {
    #[error("Failed to parse PDF: {0}")]
    ParseError(String),
    
    #[error("PDF signature verification failed: {0}")]
    SignatureError(String),
    
    #[error("Text not found in PDF: {0}")]
    TextNotFound(String),
    
    #[error("ZK proof generation failed: {0}")]
    ProofGenerationError(String),
    
    #[error("Invalid PDF format: {0}")]
    InvalidFormat(String),
}
