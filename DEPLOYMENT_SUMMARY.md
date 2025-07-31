# 🎉 Deployment Summary - Sepolia Network

## ✅ Successfully Deployed Contracts

### **Limit Order Protocol (LOP)**
- **Contract Address**: `0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91`
- **Network**: Sepolia (Chain ID: 11155111)
- **Transaction Hash**: `0xad4ac5573cd35e7631b2dc55d5fc6c1519b55f81660f7c98584868b1e91f89ff`
- **Block**: 8881751
- **Gas Used**: 3,492,402
- **Gas Cost**: 0.017856819372119778 ETH
- **WETH Address**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- **Etherscan**: https://sepolia.etherscan.io/address/0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91
- **Status**: ✅ Verified

### **EscrowFactory**
- **Contract Address**: `0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26`
- **Network**: Sepolia (Chain ID: 11155111)
- **Transaction Hash**: `0x107f404d85b8a3415cac6b0c96036b1984b7cdb135a4bbae7d98ee9333ddeb79`
- **Block**: 8881757
- **Gas Used**: 3,041,486
- **Gas Cost**: 0.01344626919579881 ETH
- **Etherscan**: https://sepolia.etherscan.io/address/0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26
- **Status**: ✅ Verified

### **EscrowFactory Components**
The EscrowFactory deployment also created these additional contracts:

1. **FeeBank**: `0x5C85Df4d75E4bAfDc03Ef5D510Da6E134E95F1fF`
   - Etherscan: https://sepolia.etherscan.io/address/0x5C85Df4d75E4bAfDc03Ef5D510Da6E134E95F1fF
   - Status: ✅ Verified

2. **EscrowSrc**: `0x4D7779ED61238c0b00272631F1ee319F76b71b5B`
   - Etherscan: https://sepolia.etherscan.io/address/0x4D7779ED61238c0b00272631F1ee319F76b71b5B
   - Status: ✅ Verified

3. **EscrowDst**: `0x206b6B0167021a45914cd796A2173959913F5Fb1`
   - Etherscan: https://sepolia.etherscan.io/address/0x206b6B0167021a45914cd796A2173959913F5Fb1
   - Status: ✅ Verified

## 🔧 Configuration Details

### **Deployment Parameters**
- **Deployer Address**: `0x09D9a6EdfE066fc24F46bA8C2b21736468f2967D`
- **LOP Address**: `0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91`
- **Fee Token**: `0x68194a729C2450ad26072b3D33ADaCbcef39D574` (Sepolia DAI)
- **Access Token**: `0xACCe550000159e70908C0499a1119D04e7039C28`
- **Rescue Delay**: 691,200 seconds (8 days)

### **Network Information**
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: https://1rpc.io/sepolia
- **Block Explorer**: https://sepolia.etherscan.io

## 📋 Next Steps

### **1. Update Relayer Configuration**
Create or update your relayer environment file:

```bash
# Create relayer/.env
cat > relayer/.env << EOF
# Ethereum Configuration
ETHEREUM_CHAIN_ID=11155111
ETHEREUM_RPC_URL=https://1rpc.io/sepolia
ETHEREUM_ESCROW_FACTORY=0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26
ETHEREUM_LOP_ADDRESS=0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91

# TON Configuration (update with actual addresses if deployed)
TON_NETWORK=testnet
TON_BRIDGE_ADDRESS=EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL
TON_ESCROW_ADDRESS=EQ...
TON_TOKEN_HANDLER_ADDRESS=EQ...

# Relayer Configuration
RELAYER_PRIVATE_KEY=your_private_key_here
RELAYER_ADDRESS=0x09D9a6EdfE066fc24F46bA8C2b21736468f2967D
EOF
```

### **2. Test the Relayer**
```bash
cd relayer
npm test
```

### **3. Deploy TON Contracts** (Optional)
If you need TON-side contracts:
```bash
cd ton-contracts
npm install
npx blueprint run scripts/deployTonBridge.ts --network testnet
npx blueprint run scripts/deployTonEscrow.ts --network testnet
npx blueprint run scripts/deployTonTokenHandler.ts --network testnet
```

### **4. Start the Relayer**
```bash
cd relayer
npm start
```

## 🔍 Verification

All contracts have been verified on Etherscan and are ready for use. You can verify the deployments by visiting the Etherscan links above.

## 💰 Gas Costs

- **Total Gas Used**: 6,533,888
- **Total Cost**: 0.031303089567918588 ETH
- **Average Gas Price**: ~4.8 gwei

## 🎯 What's Ready

✅ **LOP**: Limit Order Protocol for order validation and settlement  
✅ **EscrowFactory**: Main contract for managing cross-chain escrows  
✅ **FeeBank**: Handles relayer fees  
✅ **EscrowSrc**: Source chain escrow logic  
✅ **EscrowDst**: Destination chain escrow logic  
✅ **All contracts verified on Etherscan**

Your cross-chain resolver system is now deployed and ready for testing! 