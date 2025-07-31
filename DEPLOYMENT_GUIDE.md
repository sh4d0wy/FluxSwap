# Deployment Guide for Limit Order Protocol (LOP) and Cross-Chain Resolver

This guide will walk you through deploying the Limit Order Protocol (LOP) and related contracts needed for the cross-chain resolver system.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Make sure you have Foundry installed
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   
   # Install dependencies
   forge install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```bash
   # Required for deployment
   PRIVATE_KEY=your_private_key_here
   DEPLOYER_ADDRESS=your_deployer_address_here
   
   # Optional: Override LOP address if you want to use a custom deployment
   LOP_ADDRESS=0x111111125421cA6dc452d289314280a0f8842A65
   
   # RPC URLs (examples)
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   
   # For verification (optional)
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

## Step 1: Deploy Limit Order Protocol (LOP)

### Option A: Use Pre-deployed LOP (Recommended for Mainnet/Testnets)

For most networks, LOP is already deployed. Check the official addresses:
- **Mainnet**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **BSC**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **Polygon**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **Arbitrum**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **Optimism**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **Base**: `0x111111125421cA6dc452d289314280a0f8842A65`

If LOP is already deployed on your target network, skip to Step 2.

### Option B: Deploy LOP Yourself (For Local/New Networks)

If you need to deploy LOP yourself (e.g., for a local network or new testnet):

```bash
# Navigate to contracts directory
cd contracts

# Deploy LOP
forge script script/DeployLimitOrderProtocol.s.sol:DeployLimitOrderProtocol \
    --fork-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

# The deployment will output the LOP address and save it to deployment-lop.txt
```

**Note**: The script automatically detects the correct WETH address for your chain.

## Step 2: Deploy EscrowFactory

After LOP is deployed (or if using pre-deployed LOP), deploy the EscrowFactory:

```bash
# If using pre-deployed LOP (default)
forge script script/DeployEscrowFactoryWithLOP.s.sol:DeployEscrowFactoryWithLOP \
    --fork-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

# If using your custom LOP deployment, set the address:
export LOP_ADDRESS=your_deployed_lop_address
forge script script/DeployEscrowFactoryWithLOP.s.sol:DeployEscrowFactoryWithLOP \
    --fork-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv
```

## Step 3: Deploy TON Contracts

Deploy the TON-side contracts:

```bash
# Navigate to TON contracts directory
cd ton-contracts

# Install dependencies
npm install

# Deploy TON Bridge
npx blueprint run scripts/deployTonBridge.ts --network testnet

# Deploy TON Escrow
npx blueprint run scripts/deployTonEscrow.ts --network testnet

# Deploy TON Token Handler
npx blueprint run scripts/deployTonTokenHandler.ts --network testnet
```

## Step 4: Update Relayer Configuration

After deployment, update your relayer configuration with the deployed addresses:

1. **Create a deployment config file** (`deployment-config.json`):
```json
{
  "ethereum": {
    "chainId": 11155111,
    "escrowFactory": "0x...",
    "lopAddress": "0x111111125421cA6dc452d289314280a0f8842A65",
    "rpcUrl": "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
  },
  "ton": {
    "bridgeAddress": "EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL",
    "escrowAddress": "EQ...",
    "tokenHandlerAddress": "EQ...",
    "network": "testnet"
  }
}
```

2. **Update relayer environment variables**:
```bash
# In relayer/.env
ETHEREUM_ESCROW_FACTORY=0x...
ETHEREUM_LOP_ADDRESS=0x111111125421cA6dc452d289314280a0f8842A65
TON_BRIDGE_ADDRESS=EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL
TON_ESCROW_ADDRESS=EQ...
```

## Step 5: Verify Deployments

### Ethereum Contracts
```bash
# Verify on Etherscan (if using --verify flag)
# Or manually verify using the contract addresses and constructor arguments
```

### TON Contracts
```bash
# Check deployment status
npx blueprint run scripts/checkDeployment.ts --network testnet
```

## Step 6: Test the Deployment

1. **Run the relayer tests**:
```bash
cd relayer
npm test
```

2. **Run integration tests**:
```bash
# Test cross-chain message flow
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **"WETH address not configured for this chain"**
   - Add the WETH address for your chain to the deployment script

2. **"Fee token not configured for this chain"**
   - Add the fee token address for your chain to the deployment script

3. **"CREATE3_DEPLOYER not found"**
   - The CREATE3 deployer should be available on most networks
   - If not, you may need to deploy it first or use a different deployment method

4. **TON deployment failures**
   - Ensure you have TON testnet/mainnet access
   - Check your TON wallet has sufficient balance

### Network-Specific Notes

- **Sepolia**: Use Sepolia WETH and DAI addresses
- **Local Networks**: Deploy your own WETH and fee tokens
- **New Testnets**: Add network configuration to deployment scripts

## Next Steps

After successful deployment:

1. **Update your relayer configuration** with the deployed addresses
2. **Test the complete cross-chain flow**
3. **Monitor the relayer logs** for any issues
4. **Set up monitoring and alerting** for production use

## Support

If you encounter issues:
1. Check the deployment logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure you have sufficient balance for deployment gas fees
4. Check network RPC endpoints are accessible 