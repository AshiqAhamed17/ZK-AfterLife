#!/bin/bash

# Test script for ZK-PDF Backend API

echo "🧪 Testing ZK-AfterLife PDF Backend API"
echo "========================================"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:3002/health | jq '.' || echo "Health check failed"

echo -e "\n2. Testing PDF verification endpoint..."
# Create a dummy PDF file for testing
echo "Dummy PDF content for testing" > test.pdf

# Test PDF verification
curl -X POST \
  -F "pdf=@test.pdf" \
  -F "page_number=0" \
  -F "search_text=Beneficiary" \
  http://localhost:3002/api/verify-pdf | jq '.' || echo "PDF verification failed"

echo -e "\n3. Testing beneficiary extraction endpoint..."
curl -X POST \
  -F "pdf=@test.pdf" \
  http://localhost:3002/api/extract-beneficiaries | jq '.' || echo "Beneficiary extraction failed"

echo -e "\n4. Testing PDF proof generation endpoint..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_bytes": [1,2,3,4,5],
    "page_number": 0,
    "offset": 100,
    "substring": "Beneficiary",
    "beneficiaries": [
      {
        "name": "Test Beneficiary",
        "address": "0x1234567890123456789012345678901234567890",
        "eth_amount": "1.0",
        "usdc_amount": "100",
        "nft_count": "1"
      }
    ]
  }' \
  http://localhost:3002/api/generate-pdf-proof | jq '.' || echo "PDF proof generation failed"

# Clean up
rm -f test.pdf

echo -e "\n✅ All tests completed!"
