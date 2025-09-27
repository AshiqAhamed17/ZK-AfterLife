#!/bin/bash

# ZK-AfterLife Vercel Deployment Script
echo "🚀 Starting ZK-AfterLife deployment to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for environment variables
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Make sure to set environment variables in Vercel dashboard."
    echo "📋 Please create .env.local with the variables from env.example"
fi

# Build the project locally to check for errors
echo "🔨 Building project locally..."
if npm run build; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "🎉 Deployment complete!"
echo "📋 Don't forget to:"
echo "   1. Set environment variables in Vercel dashboard"
echo "   2. Test the deployed application"
echo "   3. Check wallet connections work"
echo "   4. Verify contract interactions"
