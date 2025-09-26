# ZK-AfterLife Contracts Deployed to Sepolia

## **Deployment Status: SUCCESS**

**Network:** Sepolia Testnet (Chain ID: 11155111)  


## 📋 **Contract Addresses**

| Contract            | Address                                      | Etherscan                                                                               |
| ------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| **L1Heartbeat**     | `0xaf61dbd79eaeaa2455065619063fa5eb13fb0a4b` | [View](https://sepolia.etherscan.io/address/0xaf61dbd79eaeaa2455065619063fa5eb13fb0a4b) |
| **AztecExecutor**   | `0x547c2767422c2fcfe2043a79db43b4738918370f` | [View](https://sepolia.etherscan.io/address/0x547c2767422c2fcfe2043a79db43b4738918370f) |
| **WillVerifier**    | `0xa5cb5f4686e52e5e23b022ba918a0e98241713fd` | [View](https://sepolia.etherscan.io/address/0xa5cb5f4686e52e5e23b022ba918a0e98241713fd) |
| **WillExecutor**    | `0xdc19e5666551607b580b40d7fae526f3a722ed62` | [View](https://sepolia.etherscan.io/address/0xdc19e5666551607b580b40d7fae526f3a722ed62) |
| **L1AztecBridge**   | `0x6db7c39f0f1601584be1355183cb112d4bdbd910` | [View](https://sepolia.etherscan.io/address/0x6db7c39f0f1601584be1355183cb112d4bdbd910) |
| **NoirIntegration** | `0x680176d9f1b07cda1f086882ba72148b52cb140e` | [View](https://sepolia.etherscan.io/address/0x680176d9f1b07cda1f086882ba72148b52cb140e) |

## ⚙️ **Configuration**

### **Demo Timing:**

- **Inactivity Period:** 30 seconds
- **Grace Period:** 15 seconds
- **Min Execution Delay:** 5 seconds
- **Min Confirmations:** 2 blocks

### **Veto Members:**

- **Veto Member 1:** Deployer address
- **Veto Member 2:** `0xD2EEcc98Bfe0A53c2dD1EC5D0C2244dad38ba05b`
- **Veto Threshold:** 1 (simple majority)

## 🚀 **Next Steps**

### **1. Frontend Integration:**

```javascript
const CONTRACT_ADDRESSES = {
  L1Heartbeat: "0xaf61dbd79eaeaa2455065619063fa5eb13fb0a4b",
  AztecExecutor: "0x547c2767422c2fcfe2043a79db43b4738918370f",
  WillVerifier: "0xa5cb5f4686e52e5e23b022ba918a0e98241713fd",
  WillExecutor: "0xdc19e5666551607b580b40d7fae526f3a722ed62",
  L1AztecBridge: "0x6db7c39f0f1601584be1355183cb112d4bdbd910",
  NoirIntegration: "0x680176d9f1b07cda1f086882ba72148b52cb140e",
};
```


## Update Contract Addresses

- Replace contract addresses in frontend config
- Test complete workflow
- Ready for demo!

