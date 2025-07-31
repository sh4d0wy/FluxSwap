#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please create one based on the template."
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
required_vars=("PRIVATE_KEY" "DEPLOYER_ADDRESS" "SEPOLIA_RPC_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

# Default values
NETWORK=${NETWORK:-"sepolia"}
DEPLOY_LOP=${DEPLOY_LOP:-"false"}
VERIFY=${VERIFY:-"true"}

print_status "Starting deployment on $NETWORK network..."

# Set RPC URL based on network
case $NETWORK in
    "sepolia")
        RPC_URL=$SEPOLIA_RPC_URL
        CHAIN_ID=11155111
        ;;
    "mainnet")
        RPC_URL=$MAINNET_RPC_URL
        CHAIN_ID=1
        ;;
    *)
        print_error "Unsupported network: $NETWORK"
        exit 1
        ;;
esac

# Create deployment directory
DEPLOY_DIR="deployments/$NETWORK"
mkdir -p $DEPLOY_DIR

print_status "Deployment directory: $DEPLOY_DIR"

# Step 1: Deploy LOP (if needed)
if [ "$DEPLOY_LOP" = "true" ]; then
    print_status "Deploying Limit Order Protocol..."
    
    cd contracts
    
    forge script script/DeployLimitOrderProtocol.s.sol:DeployLimitOrderProtocol \
        --fork-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY \
        -vvvv
    
    # Extract LOP address from deployment output
    LOP_ADDRESS=$(grep "LimitOrderProtocol deployed at:" deployment-lop.txt | cut -d' ' -f4)
    
    if [ -z "$LOP_ADDRESS" ]; then
        print_error "Failed to extract LOP address from deployment"
        exit 1
    fi
    
    print_success "LOP deployed at: $LOP_ADDRESS"
    
    # Save to deployment config
    echo "LOP_ADDRESS=$LOP_ADDRESS" > ../$DEPLOY_DIR/lop.env
    
    cd ..
else
    print_status "Using pre-deployed LOP..."
    LOP_ADDRESS="0x111111125421cA6dc452d289314280a0f8842A65"
    echo "LOP_ADDRESS=$LOP_ADDRESS" > $DEPLOY_DIR/lop.env
fi

# Step 2: Deploy EscrowFactory
print_status "Deploying EscrowFactory..."

cd contracts

# Set LOP address for EscrowFactory deployment
export LOP_ADDRESS

forge script script/DeployEscrowFactoryWithLOP.s.sol:DeployEscrowFactoryWithLOP \
    --fork-url $RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

# Extract EscrowFactory address from deployment output
ESCROW_FACTORY_ADDRESS=$(grep "Escrow Factory deployed at:" deployment-escrow-factory.txt | cut -d' ' -f5)

if [ -z "$ESCROW_FACTORY_ADDRESS" ]; then
    print_error "Failed to extract EscrowFactory address from deployment"
    exit 1
fi

print_success "EscrowFactory deployed at: $ESCROW_FACTORY_ADDRESS"

cd ..

# Step 3: Deploy TON contracts (if TON deployment is enabled)
if [ "$DEPLOY_TON" = "true" ]; then
    print_status "Deploying TON contracts..."
    
    cd ton-contracts
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Deploy TON Bridge
    print_status "Deploying TON Bridge..."
    npx blueprint run scripts/deployTonBridge.ts --network testnet
    
    # Deploy TON Escrow
    print_status "Deploying TON Escrow..."
    npx blueprint run scripts/deployTonEscrow.ts --network testnet
    
    # Deploy TON Token Handler
    print_status "Deploying TON Token Handler..."
    npx blueprint run scripts/deployTonTokenHandler.ts --network testnet
    
    cd ..
    
    print_success "TON contracts deployed successfully"
else
    print_warning "Skipping TON deployment. Set DEPLOY_TON=true to deploy TON contracts."
fi

# Step 4: Create deployment summary
print_status "Creating deployment summary..."

cat > $DEPLOY_DIR/deployment-summary.json << EOF
{
  "network": "$NETWORK",
  "chainId": $CHAIN_ID,
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "limitOrderProtocol": "$LOP_ADDRESS",
    "escrowFactory": "$ESCROW_FACTORY_ADDRESS"
  },
  "rpcUrl": "$RPC_URL",
  "deployer": "$DEPLOYER_ADDRESS"
}
EOF

# Step 5: Create relayer configuration
print_status "Creating relayer configuration..."

cat > $DEPLOY_DIR/relayer-config.json << EOF
{
  "ethereum": {
    "chainId": $CHAIN_ID,
    "escrowFactory": "$ESCROW_FACTORY_ADDRESS",
    "lopAddress": "$LOP_ADDRESS",
    "rpcUrl": "$RPC_URL"
  },
  "ton": {
    "network": "testnet"
  }
}
EOF

# Step 6: Create environment file for relayer
print_status "Creating relayer environment file..."

cat > $DEPLOY_DIR/relayer.env << EOF
# Ethereum Configuration
ETHEREUM_CHAIN_ID=$CHAIN_ID
ETHEREUM_RPC_URL=$RPC_URL
ETHEREUM_ESCROW_FACTORY=$ESCROW_FACTORY_ADDRESS
ETHEREUM_LOP_ADDRESS=$LOP_ADDRESS

# TON Configuration (update with actual addresses if deployed)
TON_NETWORK=testnet
TON_BRIDGE_ADDRESS=EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL
TON_ESCROW_ADDRESS=EQ...
TON_TOKEN_HANDLER_ADDRESS=EQ...

# Relayer Configuration
RELAYER_PRIVATE_KEY=$PRIVATE_KEY
RELAYER_ADDRESS=$DEPLOYER_ADDRESS
EOF

print_success "Deployment completed successfully!"
print_status "Deployment files saved in: $DEPLOY_DIR"
print_status ""
print_status "Next steps:"
print_status "1. Copy $DEPLOY_DIR/relayer.env to relayer/.env"
print_status "2. Update TON addresses in relayer/.env if TON contracts were deployed"
print_status "3. Test the relayer: cd relayer && npm test"
print_status "4. Start the relayer: cd relayer && npm start"

# Display deployment summary
echo ""
print_status "Deployment Summary:"
echo "Network: $NETWORK"
echo "Chain ID: $CHAIN_ID"
echo "LOP Address: $LOP_ADDRESS"
echo "EscrowFactory Address: $ESCROW_FACTORY_ADDRESS"
echo "" 