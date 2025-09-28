#!/bin/bash

echo "📄 Creating sample PDF will for ZK-PDF testing..."

# Check if we have the required tools
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  Pandoc not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install pandoc
    else
        echo "❌ Please install pandoc manually: https://pandoc.org/installing.html"
        exit 1
    fi
fi

# Create the sample will content
cat > sample_will.md << 'EOF'
# LAST WILL AND TESTAMENT

I, John Doe, being of sound mind and body, do hereby declare this to be my Last Will and Testament.

## Beneficiary Information

### Beneficiary 1 Alice Smith
- **Address**: 0x1234567890123456789012345678901234567890
- **ETH Amount**: 0.002
- **USDC Amount**: 10
- **NFT Count**: 0
- **Description**: My daughter who shall inherit my digital assets.

### Beneficiary 2 Bob Johnson
- **Address**: 0x2345678901234567890123456789012345678901
- **ETH Amount**: 0.003
- **USDC Amount**: 5
- **NFT Count**: 0
- **Description**: My son who shall inherit the remaining assets.

## Total Assets Declaration
- **Total ETH**: 0.005
- **Total USDC**: 15
- **Total NFTs**: 0

This will shall be executed upon my passing, and all digital assets shall be distributed according to the allocations specified above.

---
**Signed**: John Doe  
**Date**: September 28, 2024  
**Witness**: Jane Smith
EOF

# Convert to PDF using pandoc
echo "🔄 Converting to PDF..."
pandoc sample_will.md -o sample_will.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || \
pandoc sample_will.md -o sample_will.pdf --pdf-engine=weasyprint 2>/dev/null || \
pandoc sample_will.md -o sample_will.pdf

if [ -f "sample_will.pdf" ]; then
    echo "✅ Created sample PDF will: sample_will.pdf"
    echo "📄 File size: $(ls -lh sample_will.pdf | awk '{print $5}')"
    echo "📍 Location: $(pwd)/sample_will.pdf"
    echo ""
    echo "🎯 You can now upload this PDF to test the ZK-PDF integration!"
    echo "   Go to: http://localhost:3000/register"
    echo "   Choose: PDF Upload method"
    echo "   Upload: sample_will.pdf"
else
    echo "❌ Failed to create PDF. Please install a PDF engine:"
    echo "   brew install wkhtmltopdf"
    echo "   or"
    echo "   brew install weasyprint"
fi

# Clean up
rm -f sample_will.md
