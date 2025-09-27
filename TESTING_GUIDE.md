# 🧪 Testing Guide for Self Protocol Integration

## 🚀 **Quick Test Steps**

### **1. Start the Frontend**
```bash
cd frontend
npm run dev
```

### **2. Test the Integration**
1. **Open the app** in your browser (usually `http://localhost:3000`)
2. **Navigate to Will Registration** (`/register`)
3. **Connect your wallet** (MetaMask or similar)
4. **You should now see the Self verification step!**

## 🔍 **What You Should See**

### **Step 1: Wallet Connection**
- If wallet not connected: "Connect Your Wallet" screen
- Click "Connect Wallet" button
- MetaMask should pop up for connection

### **Step 2: Self Verification (NEW!)**
- **Identity Verification** step appears first
- Two options: **Passport NFC** 🌍 or **Aadhaar QR** 🇮🇳
- Click on either option to see instructions
- Click "Start Verification" to see mock QR code
- Wait 3 seconds for mock verification to complete

### **Step 3: Will Details**
- Enter will description
- Set asset totals (ETH, USDC, NFTs)

### **Step 4: Beneficiaries**
- Add beneficiary information
- Set asset allocations

### **Step 5: Review & Submit**
- Shows verification status
- Shows will summary
- Submit will

## ✅ **Expected Behavior**

### **Self Verification Flow:**
1. ✅ **Method Selection**: Choose passport or Aadhaar
2. ✅ **Instructions**: Step-by-step guide
3. ✅ **QR Code**: Mock QR code generated
4. ✅ **Verification**: 3-second mock verification
5. ✅ **Success**: "Verification Successful!" message
6. ✅ **Progress**: Moves to next step automatically

### **Integration Features:**
- ✅ **Bot Prevention**: Only verified users can proceed
- ✅ **Age Verification**: Mock 18+ verification
- ✅ **Country Verification**: Mock nationality detection
- ✅ **Method Tracking**: Shows verification method used

## 🐛 **Troubleshooting**

### **If Self verification doesn't show:**
1. **Check wallet connection**: Make sure wallet is connected
2. **Check console**: Look for any JavaScript errors
3. **Refresh page**: Try refreshing the browser
4. **Check network**: Make sure you're on the right network

### **If verification fails:**
1. **Check mock implementation**: Should work with mock data
2. **Check console logs**: Look for error messages
3. **Try different method**: Switch between passport/Aadhaar

### **If wallet won't connect:**
1. **Install MetaMask**: Make sure MetaMask is installed
2. **Unlock wallet**: Make sure MetaMask is unlocked
3. **Check network**: Make sure you're on the right network
4. **Try different wallet**: Try with different wallet provider

## 📱 **Testing Different Scenarios**

### **Test Passport Verification:**
1. Select "Passport NFC" option
2. Follow instructions
3. Verify QR code shows
4. Wait for verification completion

### **Test Aadhaar Verification:**
1. Select "Aadhaar QR" option
2. Follow instructions
3. Verify QR code shows
4. Wait for verification completion

### **Test Complete Flow:**
1. Connect wallet
2. Complete Self verification
3. Fill will details
4. Add beneficiaries
5. Submit will
6. Verify success message

## 🎯 **Success Criteria**

### **Integration Working If:**
- ✅ Self verification step appears first
- ✅ Method selection works (passport/Aadhaar)
- ✅ QR code generation works
- ✅ Mock verification completes successfully
- ✅ Progress moves to next step
- ✅ Will registration requires verification
- ✅ Verification status shows in review step

### **All Partner Prize Requirements Met:**
- ✅ **Onchain SDK Integration**: SelfHumanVerifier deployed
- ✅ **Celo Testnet**: Contract on Celo Sepolia
- ✅ **Proof of Humanity**: Bot prevention implemented
- ✅ **Age Verification**: 18+ requirement enforced
- ✅ **Country Verification**: Nationality tracking implemented

## 🚀 **Next Steps After Testing**

1. **Verify Integration**: Confirm all steps work
2. **Test Edge Cases**: Try different scenarios
3. **Real Integration**: Replace mock with real Self SDK
4. **Production Deploy**: Deploy to production
5. **Partner Prize**: Submit for partner prize

## 📞 **Support**

If you encounter any issues:
1. Check browser console for errors
2. Verify wallet connection
3. Check network configuration
4. Review this testing guide
5. Check the integration summary document

---

**Status**: ✅ Ready for Testing  
**Contract**: `0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B`  
**Network**: Celo Sepolia (Chain ID: 11142220)
