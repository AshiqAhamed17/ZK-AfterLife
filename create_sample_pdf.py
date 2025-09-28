#!/usr/bin/env python3
"""
Script to create a sample PDF will for testing the ZK-PDF integration.
This creates a PDF with the exact format expected by our beneficiary extraction logic.
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os

def create_sample_pdf():
    """Create a sample PDF will document."""
    
    # Create the PDF file
    filename = "sample_will.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=6
    )
    
    # Build the content
    story = []
    
    # Title
    story.append(Paragraph("LAST WILL AND TESTAMENT", title_style))
    story.append(Spacer(1, 20))
    
    # Introduction
    story.append(Paragraph("I, John Doe, being of sound mind and body, do hereby declare this to be my Last Will and Testament.", normal_style))
    story.append(Spacer(1, 20))
    
    # Beneficiary Information
    story.append(Paragraph("Beneficiary Information:", heading_style))
    story.append(Spacer(1, 10))
    
    # Beneficiary 1
    story.append(Paragraph("Beneficiary 1 Alice Smith", normal_style))
    story.append(Paragraph("Address: 0x1234567890123456789012345678901234567890", normal_style))
    story.append(Paragraph("ETH Amount: 1.5", normal_style))
    story.append(Paragraph("USDC Amount: 1000", normal_style))
    story.append(Paragraph("NFT Count: 2", normal_style))
    story.append(Paragraph("Description: My daughter who shall inherit my digital assets.", normal_style))
    story.append(Spacer(1, 10))
    
    # Beneficiary 2
    story.append(Paragraph("Beneficiary 2 Bob Johnson", normal_style))
    story.append(Paragraph("Address: 0x2345678901234567890123456789012345678901", normal_style))
    story.append(Paragraph("ETH Amount: 0.5", normal_style))
    story.append(Paragraph("USDC Amount: 500", normal_style))
    story.append(Paragraph("NFT Count: 1", normal_style))
    story.append(Paragraph("Description: My son who shall inherit the remaining assets.", normal_style))
    story.append(Spacer(1, 20))
    
    # Total Assets
    story.append(Paragraph("Total Assets Declaration:", heading_style))
    story.append(Paragraph("• Total ETH: 2.0", normal_style))
    story.append(Paragraph("• Total USDC: 1500", normal_style))
    story.append(Paragraph("• Total NFTs: 3", normal_style))
    story.append(Spacer(1, 20))
    
    # Conclusion
    story.append(Paragraph("This will shall be executed upon my passing, and all digital assets shall be distributed according to the allocations specified above.", normal_style))
    story.append(Spacer(1, 20))
    
    # Signature
    story.append(Paragraph("Signed: John Doe", normal_style))
    story.append(Paragraph("Date: September 28, 2024", normal_style))
    story.append(Paragraph("Witness: Jane Smith", normal_style))
    
    # Build PDF
    doc.build(story)
    
    print(f"✅ Created sample PDF will: {filename}")
    print(f"📄 File size: {os.path.getsize(filename)} bytes")
    print(f"📍 Location: {os.path.abspath(filename)}")
    
    return filename

if __name__ == "__main__":
    create_sample_pdf()
