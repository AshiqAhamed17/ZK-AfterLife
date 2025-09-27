# Self Protocol Configuration

## Environment Variables

Add these to your `.env.local` file:

```env
# Self Protocol Configuration
NEXT_PUBLIC_SELF_HUMAN_VERIFIER_ADDRESS=0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B
NEXT_PUBLIC_SELF_HUB_ADDRESS=0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
NEXT_PUBLIC_SELF_SCOPE=1
NEXT_PUBLIC_SELF_VERIFICATION_CONFIG_ID=0x0000000000000000000000000000000000000000000000000000000000000001

# Network Configuration
NEXT_PUBLIC_NETWORK=celo-sepolia
NEXT_PUBLIC_CHAIN_ID=11142220
NEXT_PUBLIC_RPC_URL=https://forno.celo-sepolia.celo-testnet.org

# Self App Configuration (for production)
NEXT_PUBLIC_SELF_APP_ID=your_self_app_id_here
NEXT_PUBLIC_SELF_APP_SECRET=your_self_app_secret_here
NEXT_PUBLIC_SELF_APP_URL=https://app.self.xyz

# Optional: Block Explorer
NEXT_PUBLIC_BLOCK_EXPLORER=https://celo-sepolia.blockscout.com
```

## Testing Steps

1. **Start Frontend Development Server**

   ```bash
   cd frontend
   npm run dev
   ```

2. **Test Integration**

   - Navigate to will registration
   - Test Self verification step
   - Test method selection (passport/Aadhaar)
   - Test QR code generation
   - Test complete verification flow

3. **Verify Requirements**
   - ✅ Bot prevention works
   - ✅ Age verification (18+) works
   - ✅ Country verification works
   - ✅ Integration with will registration works
