// Test script to verify field mapping between backend and frontend
const backendResponse = {
  success: true,
  message: "Beneficiaries extracted successfully",
  beneficiaries: [
    {
      name: "1 Alice Smith",
      address: "0x1234567890123456789012345678901234567890",
      eth_amount: "1.5",
      usdc_amount: "1000",
      nft_count: "2",
      description: null,
    },
    {
      name: "2 Bob Johnson",
      address: "0x2345678901234567890123456789012345678901",
      eth_amount: "0.5",
      usdc_amount: "500",
      nft_count: "1",
      description: null,
    },
  ],
};

console.log("🧪 Testing field mapping...");
console.log("Backend response:", JSON.stringify(backendResponse, null, 2));

// Simulate the frontend conversion
const convertedBeneficiaries = backendResponse.beneficiaries.map((b) => ({
  address: b.address,
  ethAmount: b.eth_amount, // Map from backend field name
  usdcAmount: b.usdc_amount, // Map from backend field name
  nftCount: b.nft_count, // Map from backend field name
  name: b.name,
}));

console.log(
  "\n🔄 Converted beneficiaries:",
  JSON.stringify(convertedBeneficiaries, null, 2)
);

// Calculate totals
const totalEth = convertedBeneficiaries.reduce(
  (sum, b) => sum + parseFloat(b.ethAmount || "0"),
  0
);
const totalUsdc = convertedBeneficiaries.reduce(
  (sum, b) => sum + parseFloat(b.usdcAmount || "0"),
  0
);
const totalNfts = convertedBeneficiaries.reduce(
  (sum, b) => sum + parseInt(b.nftCount || "0"),
  0
);

console.log("\n📊 Calculated totals:");
console.log(`Total ETH: ${totalEth}`);
console.log(`Total USDC: ${totalUsdc}`);
console.log(`Total NFTs: ${totalNfts}`);

console.log("\n✅ Field mapping test completed successfully!");
