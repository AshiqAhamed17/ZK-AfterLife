#!/bin/bash

# ZK-AfterLife PDF Backend Startup Script

echo "🚀 Starting ZK-AfterLife PDF Backend Service..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if we're in the backend directory
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Check if port 3002 is already in use
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3002 is already in use. Stopping existing server..."
    pkill -f "zk-afterlife-backend" 2>/dev/null || true
    sleep 2
    echo "✅ Port 3002 is now free"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cargo build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build the project. Please check the errors above."
    exit 1
fi

# Start the server
echo "🌐 Starting server on http://localhost:3002..."
echo "📄 PDF verification endpoint: http://localhost:3002/api/verify-pdf"
echo "👥 Beneficiary extraction endpoint: http://localhost:3002/api/extract-beneficiaries"
echo "🔐 PDF proof generation endpoint: http://localhost:3002/api/generate-pdf-proof"
echo ""
echo "Press Ctrl+C to stop the server"

cargo run
