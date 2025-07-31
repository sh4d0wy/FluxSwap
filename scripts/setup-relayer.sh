#!/bin/bash

# Setup script for cross-chain relayer configuration
# This script helps you configure the relayer with deployed contract addresses

set -e

echo "🚀 Setting up Cross-Chain Relayer Configuration"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "relayer" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create relayer directory if it doesn't exist
if [ ! -d "relayer" ]; then
    echo "❌ Error: Relayer directory not found. Please ensure the relayer is set up."
    exit 1
fi

# Check if .env already exists
if [ -f "relayer/.env" ]; then
    echo "⚠️  Warning: relayer/.env already exists. This will overwrite it."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo "📝 Creating relayer environment configuration..."

# Create the .env file
cat > relayer/.env << 'EOF'
# Ethereum Configuration
ETHEREUM_CHAIN_ID=11155111
ETHEREUM_RPC_URL=https://1rpc.io/sepolia
ETHEREUM_ESCROW_FACTORY=0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26
ETHEREUM_LOP_ADDRESS=0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91

# TON Configuration
TON_NETWORK_TYPE=testnet
TON_API_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_BRIDGE_ADDRESS=kQByYeaV-f2CiO2mbLZXG3AdIyEPiXE4X6qJ7B0T2D9oo1Uh
TON_ESCROW_ADDRESS=kQBrueQRdP--s4gQROFhwqVQXb6QEoSAIhigzTip-Xsz7JS8
TON_TOKEN_HANDLER_ADDRESS=kQC6P3F9qIyCPO3vj3e8n4DyxWUImPMdfzZ6ylAHhfZgqxfR

# Relayer Configuration
DEPLOYER_PRIVATE_KEY=your_ethereum_private_key_here
TON_PRIVATE_KEY=your_ton_private_key_here
TON_WALLET_ADDRESS=your_ton_wallet_address_here

# Optional Configuration
TON_POLL_INTERVAL=5000
LOG_LEVEL=info
EOF

echo "✅ Relayer environment file created: relayer/.env"
echo ""
echo "🔧 Next Steps:"
echo "1. Edit relayer/.env and update the following values:"
echo "   - DEPLOYER_PRIVATE_KEY: Your Ethereum private key"
echo "   - TON_PRIVATE_KEY: Your TON private key"
echo "   - TON_WALLET_ADDRESS: Your TON wallet address"
echo ""
echo "2. Install relayer dependencies:"
echo "   cd relayer && npm install"
echo ""
echo "3. Test the relayer:"
echo "   cd relayer && npm test"
echo ""
echo "4. Start the relayer:"
echo "   cd relayer && npm start"
echo ""
echo "📋 Contract Addresses Summary:"
echo "Ethereum (Sepolia):"
echo "  - EscrowFactory: 0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26 (MAIN CONTRACT)"
echo "  - LOP: 0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91"
echo "  - FeeBank: 0x5C85Df4d75E4bAfDc03Ef5D510Da6E134E95F1fF"
echo ""
echo "TON (Testnet):"
echo "  - Bridge: kQByYeaV-f2CiO2mbLZXG3AdIyEPiXE4X6qJ7B0T2D9oo1Uh"
echo "  - Escrow: kQBrueQRdP--s4gQROFhwqVQXb6QEoSAIhigzTip-Xsz7JS8"
echo "  - TokenHandler: kQC6P3F9qIyCPO3vj3e8n4DyxWUImPMdfzZ6ylAHhfZgqxfR"
echo ""
echo "🏗️  Architecture Notes:"
echo "  - EscrowFactory deploys individual escrow instances dynamically"
echo "  - Relayer primarily interacts with EscrowFactory"
echo "  - Individual escrow addresses are computed deterministically"
echo ""
echo "🎉 Setup complete! Your cross-chain relayer is ready for configuration." 