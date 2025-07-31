# 🎉 Deployment Summary - Sepolia Network + TON Testnet

## ✅ Successfully Deployed Contracts

### **Ethereum (Sepolia) Contracts**

#### **Limit Order Protocol (LOP)**
- **Contract Address**: `0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91`
- **Network**: Sepolia (Chain ID: 11155111)
- **Transaction Hash**: `0xad4ac5573cd35e7631b2dc55d5fc6c1519b55f81660f7c98584868b1e91f89ff`
- **Block**: 8881751
- **Gas Used**: 3,492,402
- **Gas Cost**: 0.017856819372119778 ETH
- **WETH Address**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- **Etherscan**: https://sepolia.etherscan.io/address/0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91
- **Status**: ✅ Verified

#### **EscrowFactory**
- **Contract Address**: `0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26`
- **Network**: Sepolia (Chain ID: 11155111)
- **Transaction Hash**: `0x107f404d85b8a3415cac6b0c96036b1984b7cdb135a4bbae7d98ee9333ddeb79`
- **Block**: 8881757
- **Gas Used**: 3,041,486
- **Gas Cost**: 0.01344626919579881 ETH
- **Etherscan**: https://sepolia.etherscan.io/address/0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26
- **Status**: ✅ Verified

#### **EscrowFactory Components**
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

### **TON (Testnet) Contracts**

#### **TON Bridge**
- **Contract Address**: `kQByYeaV-f2CiO2mbLZXG3AdIyEPiXE4X6qJ7B0T2D9oo1Uh`
- **Network**: TON Testnet
- **Status**: ✅ Deployed

#### **TON Escrow**
- **Contract Address**: `kQBrueQRdP--s4gQROFhwqVQXb6QEoSAIhigzTip-Xsz7JS8`
- **Network**: TON Testnet
- **Status**: ✅ Deployed

#### **TON Token Handler**
- **Contract Address**: `kQC6P3F9qIyCPO3vj3e8n4DyxWUImPMdfzZ6ylAHhfZgqxfR`
- **Network**: TON Testnet
- **Status**: ✅ Deployed

## 🔧 Configuration Details

### **Ethereum Deployment Parameters**
- **Deployer Address**: `0x09D9a6EdfE066fc24F46bA8C2b21736468f2967D`
- **LOP Address**: `0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91`
- **Fee Token**: `0x68194a729C2450ad26072b3D33ADaCbcef39D574` (Sepolia DAI)
- **Access Token**: `0xACCe550000159e70908C0499a1119D04e7039C28`
- **Rescue Delay**: 691,200 seconds (8 days)

### **Network Information**
- **Ethereum Network**: Sepolia Testnet (Chain ID: 11155111)
- **TON Network**: Testnet
- **Ethereum RPC URL**: https://1rpc.io/sepolia
- **TON API URL**: https://testnet.toncenter.com/api/v2/jsonRPC

## 📋 Next Steps

### **1. Configure Relayer Environment**
Create your relayer environment file:

```bash
# Copy the template and update with your keys
cp relayer/.env.template relayer/.env

# Update the following values in relayer/.env:
# - DEPLOYER_PRIVATE_KEY=your_ethereum_private_key
# - TON_PRIVATE_KEY=your_ton_private_key  
# - TON_WALLET_ADDRESS=your_ton_wallet_address
```

### **2. Test the Relayer**
```bash
cd relayer
npm install
npm test
```

### **3. Start the Relayer**
```bash
cd relayer
npm start
```

### **4. Test Cross-Chain Communication**
```bash
# Test Ethereum to TON message relay
npm run test:integration

# Test TON to Ethereum message relay  
npm run test:ton-integration
```

## 🔍 Verification

### **Ethereum Contracts**
All Ethereum contracts have been verified on Etherscan and are ready for use.

### **TON Contracts**
TON contracts have been deployed successfully. You can verify them using:
- TON Explorer: https://testnet.tonscan.org/
- TON Center API: https://testnet.toncenter.com/

## 💰 Gas Costs

### **Ethereum (Sepolia)**
- **Total Gas Used**: 6,533,888
- **Total Cost**: 0.031303089567918588 ETH
- **Average Gas Price**: ~4.8 gwei

### **TON (Testnet)**
- **Deployment Cost**: Minimal (testnet TON coins)

## 🎯 What's Ready

✅ **Ethereum Side**: LOP, EscrowFactory, and all supporting contracts  
✅ **TON Side**: Bridge, Escrow, and Token Handler contracts  
✅ **Cross-Chain Infrastructure**: Relayer service ready for configuration  
✅ **Configuration Files**: All deployment addresses stored in `deployments/`  

Your cross-chain resolver system is now fully deployed and ready for testing! 