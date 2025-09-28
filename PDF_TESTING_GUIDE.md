# 📄 PDF Testing Guide for ZK-PDF Integration

## 🎯 **How to Create a Sample PDF Will**

You have **3 options** to create a sample PDF will for testing:

### **Option 1: HTML to PDF (Recommended - No Dependencies)**

```bash
# Open the HTML file in your browser
open create_simple_pdf.html
# OR
# Navigate to: file:///Users/ashiq/Documents/Hooman-Digital/ZK-AfterLife/create_simple_pdf.html

# Then:
# 1. Press Ctrl+P (or Cmd+P on Mac)
# 2. Choose "Save as PDF" as destination
# 3. Save as "sample_will.pdf"
```

### **Option 2: Automated Script (Requires Pandoc)**

```bash
./create_sample_pdf.sh
```

### **Option 3: Python Script (Requires ReportLab)**

```bash
python3 create_sample_pdf.py
```

## 🧪 **Testing the ZK-PDF Integration**

### **Step 1: Start Both Services**

```bash
# Terminal 1: Start Backend
cd backend
./start.sh

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### **Step 2: Test the Complete Flow**

1. **Go to**: `http://localhost:3000/register`
2. **Complete**: Self Protocol verification (if not already done)
3. **Choose**: "PDF Upload" method
4. **Upload**: Your `sample_will.pdf` file
5. **Watch**: The magic happen! ✨

## 🔍 **What Should Happen**

When you upload the PDF, the system will:

1. **✅ PDF Verification**:

   - Verify the document format
   - Check for "Beneficiary" text
   - Generate document hash

2. **✅ Beneficiary Extraction**:

   - Extract Alice Smith's details (1.5 ETH, 1000 USDC, 2 NFTs)
   - Extract Bob Johnson's details (0.5 ETH, 500 USDC, 1 NFT)
   - Calculate totals (2.0 ETH, 1500 USDC, 3 NFTs)

3. **✅ ZK Proof Generation**:

   - Generate cryptographic proof
   - Create public inputs
   - Return verification key

4. **✅ Frontend Integration**:
   - Display extracted beneficiaries
   - Show verification results
   - Allow will registration

## 📊 **Expected Results**

### **PDF Verification Response**:

```json
{
  "success": true,
  "message": "PDF verification completed",
  "pdf_hash": "0x...",
  "is_signed": true,
  "signature_valid": true,
  "text_found": true,
  "text_position": 77
}
```

### **Beneficiary Extraction Response**:

```json
{
  "success": true,
  "message": "Beneficiaries extracted successfully",
  "beneficiaries": [
    {
      "name": "1 Alice Smith",
      "address": "0x1234567890123456789012345678901234567890",
      "eth_amount": "1.5",
      "usdc_amount": "1000",
      "nft_count": "2"
    },
    {
      "name": "2 Bob Johnson",
      "address": "0x2345678901234567890123456789012345678901",
      "eth_amount": "0.5",
      "usdc_amount": "500",
      "nft_count": "1"
    }
  ]
}
```

## 🚀 **Demo Script**

You can also test the API directly:

```bash
# Test with the sample PDF
curl -X POST \
  -F "pdf=@sample_will.pdf" \
  -F "search_text=Beneficiary" \
  http://localhost:3002/api/verify-pdf

# Extract beneficiaries
curl -X POST \
  -F "pdf=@sample_will.pdf" \
  http://localhost:3002/api/extract-beneficiaries
```

## 🎉 **Success Indicators**

You'll know it's working when you see:

- ✅ **PDF Upload Interface**: Drag & drop area appears
- ✅ **File Processing**: Loading indicators during upload
- ✅ **Verification Success**: Green checkmarks and success messages
- ✅ **Beneficiary Display**: Extracted data shown in organized cards
- ✅ **ZK Proof Generated**: Cryptographic proof creation confirmed
- ✅ **Registration Ready**: Form populated with extracted data

## 🛠️ **Troubleshooting**

### **If PDF Upload Fails**:

1. Check backend is running: `curl http://localhost:3002/health`
2. Verify PDF format: Ensure it's a valid PDF file
3. Check file size: Should be reasonable (< 10MB)

### **If Beneficiary Extraction Fails**:

1. Ensure PDF contains the exact format:
   - "Beneficiary 1 Alice Smith"
   - "Address: 0x..."
   - "ETH Amount: 1.5"
   - etc.

### **If Frontend Doesn't Connect**:

1. Check both services are running
2. Verify ports 3000 and 3002 are free
3. Check browser console for errors

## 🏆 **What This Demonstrates**

This integration showcases:

- **🔐 Zero-Knowledge PDF Verification**: Proves document authenticity without revealing content
- **📄 Automated Data Extraction**: Parses legal documents automatically
- **🛡️ Privacy-Preserving Wills**: Protects sensitive information while enabling verification
- **⚡ Real-World Application**: Works with actual legal document formats
- **🔗 Blockchain Integration**: Seamlessly connects to existing will registration system

**This is a revolutionary approach to digital inheritance!** 🚀
