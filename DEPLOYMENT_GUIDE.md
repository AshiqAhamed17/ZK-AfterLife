# 🚀 ZK-AfterLife Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.local` file in your frontend directory with the following variables:

```bash
# Network Configuration
NEXT_PUBLIC_DEFAULT_NETWORK=sepolia
NEXT_PUBLIC_CHAIN_ID=11155111

# RPC URLs (Replace with your own API keys)
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_RPC_URLS=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY,https://sepolia.infura.io/v3/YOUR_INFURA_KEY,https://rpc.sepolia.org

# Contract Addresses (Sepolia Testnet)
NEXT_PUBLIC_NOIR_INTEGRATION=0x5CBa8f717a4eAfA0d933bB6A4d79e8d846A7B7a1
NEXT_PUBLIC_L1_HEARTBEAT=0x7Fa088F570dfB4878F72D666eaBB5e3f629f64Af
NEXT_PUBLIC_AZTEC_EXECUTOR=0x629A83dD1aB7323759f7a26f0Dc18Df7814E625f
NEXT_PUBLIC_L1_AZTEC_BRIDGE=0xE4Ee7a0ed33c9e024e0bE9E061901e0C6CA95107
NEXT_PUBLIC_WILL_VERIFIER=0x0Ddcac19C955abBa465AC748c287fd4CFf6CB88d
NEXT_PUBLIC_WILL_EXECUTOR=0x98545459892861c3d757d351CF2722947CC15cda
NEXT_PUBLIC_SELF_HUMAN_VERIFIER=0x0000000000000000000000000000000000000000

# Self Protocol Configuration
NEXT_PUBLIC_SELF_HUB_ADDRESS=0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
NEXT_PUBLIC_SELF_VERIFICATION_METHOD=passport

# Aztec Configuration
NEXT_PUBLIC_AZTEC_RPC_URL=https://api.aztec.network
NEXT_PUBLIC_AZTEC_CHAIN_ID=aztec

# Block Explorer
NEXT_PUBLIC_BLOCK_EXPLORER=https://sepolia.etherscan.io

# App Configuration
NEXT_PUBLIC_APP_NAME=ZK-AfterLife
NEXT_PUBLIC_APP_DESCRIPTION=Private Digital Inheritance System
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Get API Keys

You'll need API keys from these services:

#### Alchemy (Recommended)

1. Go to [Alchemy](https://www.alchemy.com/)
2. Create an account and new app
3. Select "Ethereum" and "Sepolia Testnet"
4. Copy your API key

#### Infura (Backup)

1. Go to [Infura](https://infura.io/)
2. Create an account and new project
3. Select "Ethereum" and "Sepolia Testnet"
4. Copy your project ID

## 🚀 Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Navigate to Frontend Directory**

   ```bash
   cd frontend
   ```

3. **Login to Vercel**

   ```bash
   vercel login
   ```

4. **Deploy**

   ```bash
   vercel
   ```

5. **Follow the prompts:**

   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N`
   - Project name: `zk-afterlife`
   - Directory: `./`
   - Override settings? `N`

6. **Set Environment Variables**

   ```bash
   vercel env add NEXT_PUBLIC_DEFAULT_NETWORK
   # Enter: sepolia

   vercel env add NEXT_PUBLIC_RPC_URL
   # Enter your Alchemy URL

   # Add all other environment variables...
   ```

7. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as root directory

3. **Configure Build Settings**

   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Set Environment Variables**

   - Go to Project Settings → Environment Variables
   - Add all variables from the `.env.local` file
   - Make sure to use your own API keys

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

## 🔧 Post-Deployment Configuration

### 1. Domain Setup (Optional)

1. Go to your project in Vercel dashboard
2. Go to Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed

### 2. Environment Variables for Production

Make sure all these variables are set in Vercel:

```bash
NEXT_PUBLIC_DEFAULT_NETWORK=sepolia
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_URLS=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY,https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_NOIR_INTEGRATION=0x5CBa8f717a4eAfA0d933bB6A4d79e8d846A7B7a1
NEXT_PUBLIC_L1_HEARTBEAT=0x7Fa088F570dfB4878F72D666eaBB5e3f629f64Af
NEXT_PUBLIC_AZTEC_EXECUTOR=0x629A83dD1aB7323759f7a26f0Dc18Df7814E625f
NEXT_PUBLIC_L1_AZTEC_BRIDGE=0xE4Ee7a0ed33c9e024e0bE9E061901e0C6CA95107
NEXT_PUBLIC_WILL_VERIFIER=0x0Ddcac19C955abBa465AC748c287fd4CFf6CB88d
NEXT_PUBLIC_WILL_EXECUTOR=0x98545459892861c3d757d351CF2722947CC15cda
NEXT_PUBLIC_SELF_HUB_ADDRESS=0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
NEXT_PUBLIC_SELF_VERIFICATION_METHOD=passport
NEXT_PUBLIC_AZTEC_RPC_URL=https://api.aztec.network
NEXT_PUBLIC_AZTEC_CHAIN_ID=aztec
NEXT_PUBLIC_BLOCK_EXPLORER=https://sepolia.etherscan.io
NEXT_PUBLIC_APP_NAME=ZK-AfterLife
NEXT_PUBLIC_APP_DESCRIPTION=Private Digital Inheritance System
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**

   - Check if all dependencies are in `package.json`
   - Ensure Node.js version compatibility
   - Check for TypeScript errors

2. **Environment Variables Not Loading**

   - Make sure variables start with `NEXT_PUBLIC_`
   - Redeploy after adding new variables
   - Check Vercel dashboard for variable values

3. **Crypto/Web3 Issues**

   - The webpack configuration handles Node.js polyfills
   - Check browser console for errors
   - Ensure RPC URLs are accessible

4. **Contract Connection Issues**
   - Verify contract addresses are correct
   - Check if contracts are deployed on the right network
   - Ensure RPC URLs are working

### Debug Commands

```bash
# Check build locally
npm run build

# Check linting
npm run lint

# Test locally
npm run dev
```

## 📊 Performance Optimization

### 1. Bundle Analysis

```bash
npm install --save-dev @next/bundle-analyzer
```

### 2. Image Optimization

- Use Next.js Image component
- Optimize images before upload
- Consider using WebP format

### 3. Code Splitting

- The app already uses dynamic imports
- Consider lazy loading heavy components

## 🔒 Security Considerations

1. **API Keys**

   - Never commit API keys to git
   - Use environment variables only
   - Rotate keys regularly

2. **HTTPS**

   - Vercel provides HTTPS by default
   - Ensure all external requests use HTTPS

3. **Headers**
   - Security headers are configured in `next.config.js`
   - Additional headers in `vercel.json`

## 📈 Monitoring

### 1. Vercel Analytics

- Enable in project settings
- Monitor performance metrics
- Track user behavior

### 2. Error Tracking

- Consider adding Sentry or similar
- Monitor console errors
- Track build failures

## 🎯 Next Steps

1. **Test Thoroughly**

   - Test all functionality on deployed site
   - Verify wallet connections work
   - Test contract interactions

2. **Monitor Performance**

   - Check Vercel analytics
   - Monitor build times
   - Track user experience

3. **Update Documentation**
   - Update README with deployment info
   - Document any custom configurations
   - Add troubleshooting guides

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review browser console errors
3. Test locally first
4. Check network connectivity
5. Verify contract addresses

Your ZK-AfterLife app should now be successfully deployed on Vercel! 🎉
