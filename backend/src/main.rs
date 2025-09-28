use axum::{
    extract::Multipart,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
// use serde::{Deserialize, Serialize}; // Not used yet
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};

mod pdf_service;
mod types;

use pdf_service::PDFService;
use types::*;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("🚀 Starting ZK-AfterLife PDF Backend Service");

    // Initialize PDF service
    let pdf_service = PDFService::new().await;

    // Build our application with routes
    let app = Router::new()
        .route("/health", axum::routing::get(health_handler))
        .route("/api/verify-pdf", post(verify_pdf_handler))
        .route("/api/extract-beneficiaries", post(extract_beneficiaries_handler))
        .route("/api/generate-pdf-proof", post(generate_pdf_proof_handler))
        .layer(CorsLayer::permissive())
        .with_state(pdf_service);

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3002));
    info!("🌐 Server running on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Health check endpoint
async fn health_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "zk-afterlife-pdf-backend",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Verify PDF authenticity and extract key information
async fn verify_pdf_handler(
    axum::extract::State(pdf_service): axum::extract::State<PDFService>,
    mut multipart: Multipart,
) -> Result<Json<PDFVerificationResponse>, StatusCode> {
    info!("📄 Received PDF verification request");

    let mut pdf_data = Vec::new();
    let mut page_number = 0;
    let mut search_text = String::new();

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await.unwrap() {
        match field.name() {
            Some("pdf") => {
                if let Ok(data) = field.bytes().await {
                    pdf_data = data.to_vec();
                    info!("📄 Received PDF file: {} bytes", pdf_data.len());
                }
            }
            Some("page_number") => {
                if let Ok(text) = field.text().await {
                    page_number = text.parse().unwrap_or(0);
                }
            }
            Some("search_text") => {
                if let Ok(text) = field.text().await {
                    search_text = text;
                }
            }
            _ => {}
        }
    }

    if pdf_data.is_empty() {
        warn!("❌ No PDF data received");
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify PDF using ZK-PDF service
    match pdf_service.verify_pdf(&pdf_data, page_number, &search_text).await {
        Ok(verification) => {
            info!("✅ PDF verification successful");
            Ok(Json(verification))
        }
        Err(e) => {
            warn!("❌ PDF verification failed: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

/// Extract beneficiary information from PDF
async fn extract_beneficiaries_handler(
    axum::extract::State(pdf_service): axum::extract::State<PDFService>,
    mut multipart: Multipart,
) -> Result<Json<BeneficiaryExtractionResponse>, StatusCode> {
    info!("👥 Received beneficiary extraction request");

    let mut pdf_data = Vec::new();

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await.unwrap() {
        if field.name() == Some("pdf") {
            if let Ok(data) = field.bytes().await {
                pdf_data = data.to_vec();
                info!("📄 Received PDF file: {} bytes", pdf_data.len());
            }
        }
    }

    if pdf_data.is_empty() {
        warn!("❌ No PDF data received");
        return Err(StatusCode::BAD_REQUEST);
    }

    // Extract beneficiaries from PDF
    match pdf_service.extract_beneficiaries(&pdf_data).await {
        Ok(beneficiaries) => {
            info!("✅ Beneficiary extraction successful: {} beneficiaries found", beneficiaries.len());
            Ok(Json(BeneficiaryExtractionResponse {
                beneficiaries,
                success: true,
                message: "Beneficiaries extracted successfully".to_string(),
            }))
        }
        Err(e) => {
            warn!("❌ Beneficiary extraction failed: {}", e);
            Ok(Json(BeneficiaryExtractionResponse {
                beneficiaries: vec![],
                success: false,
                message: format!("Failed to extract beneficiaries: {}", e),
            }))
        }
    }
}

/// Generate ZK proof for PDF verification
async fn generate_pdf_proof_handler(
    axum::extract::State(pdf_service): axum::extract::State<PDFService>,
    Json(request): Json<PDFProofRequest>,
) -> Result<Json<PDFProofResponse>, StatusCode> {
    info!("🔐 Received PDF proof generation request");

    // Generate ZK proof for PDF verification
    match pdf_service.generate_pdf_proof(&request).await {
        Ok(proof_response) => {
            info!("✅ PDF proof generation successful");
            Ok(Json(proof_response))
        }
        Err(e) => {
            warn!("❌ PDF proof generation failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
