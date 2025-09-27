# ZK-AfterLife Frontend

A Next.js frontend application for the ZK-AfterLife project - a privacy-preserving digital inheritance system using zero-knowledge proofs.

## 🚀 Features

- **Will Registration**: Create and register digital wills with ZK proofs
- **Activity Monitoring**: Track user activity with heartbeat mechanism
- **Private Distribution**: Execute wills privately on Aztec Network
- **Veto System**: Emergency override capability for trusted parties
- **Demo Mode**: Optimized timing for live demonstrations (30s/15s/5s)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- Sepolia ETH for testing

## 🛠️ Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   # Copy the example environment file
   cp .env.example .env.local

   # Edit .env.local with your configuration
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Contract Addresses (Sepolia)

The frontend is pre-configured with deployed contract addresses on Sepolia:

- **L1Heartbeat**: `0xaf61dbd79eaeaa2455065619063fa5eb13fb0a4b`
- **AztecExecutor**: `0x547c2767422c2fcfe2043a79db43b4738918370f`
- **WillVerifier**: `0xa5cb5f4686e52e5e23b022ba918a0e98241713fd`
- **WillExecutor**: `0xdc19e5666551607b580b40d7fae526f3a722ed62`
- **L1AztecBridge**: `0x6db7c39f0f1601584be1355183cb112d4bdbd910`
- **NoirIntegration**: `0x680176d9f1b07cda1f086882ba72148b52cb140e`

### Demo Configuration

- **Inactivity Period**: 30 seconds
- **Grace Period**: 15 seconds
- **Execution Delay**: 5 seconds
- **Veto Threshold**: 1 (simple majority)

## 🎯 Usage

### 1. Connect Wallet

- Click "Connect Wallet" to connect MetaMask
- Ensure you're on Sepolia testnet
- Make sure you have Sepolia ETH for gas

### 2. Register Will

- Navigate to "Register Will"
- Fill in beneficiary information
- Generate ZK proof
- Submit will registration

### 3. Monitor Activity

- Use "Check In" to reset inactivity timer
- View activity status
- Monitor grace period

### 4. Execute Will (Demo)

- Wait for inactivity period (30s)
- Grace period allows veto (15s)
- Will executes automatically after delay (5s)

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
├── config/              # Contract configurations
├── lib/                 # Utility libraries
├── services/            # Blockchain services
└── types/               # TypeScript definitions
```

## 🔗 Key Technologies

- **Next.js 14**: React framework
- **Ethers.js**: Ethereum interaction
- **NoirJS**: Zero-knowledge proof generation
- **Aztec.js**: Privacy-preserving transactions
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🧪 Testing

### Local Development

```bash
# Start local blockchain (Anvil)
anvil

# Update contract addresses in config/contracts.ts
# Start frontend
npm run dev
```

### Sepolia Testnet

- Contracts are already deployed
- Use Sepolia ETH for gas
- Test complete workflow

## 📚 Documentation

- [ZK-AfterLife Architecture](../zk-afterLife.md)
- [Deployment Summary](../DEPLOYMENT_SUMMARY.md)
- [Contract Addresses](../DEPLOYMENT_SUMMARY.md#contract-addresses)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

- Check the documentation
- Review contract addresses
- Ensure proper network configuration
- Verify wallet connection

---

**Ready for your 3-minute demo!** 🎉
