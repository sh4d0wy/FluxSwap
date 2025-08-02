# Resolver Interaction Scripts

This directory contains TypeScript scripts to interact with the Resolver contract on Sepolia testnet and listen to `CrossChainOrderFilled` events.

## Prerequisites

1. Node.js (version 22 or higher)
2. A wallet with some Sepolia ETH for gas fees
3. Your wallet's private key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
# Your private key for signing transactions
# WARNING: Never commit your actual private key to version control!
PRIVATE_KEY=your_private_key_here

# Optional: Custom RPC URL (defaults to 1rpc.io/sepolia)
# RPC_URL=https://your-custom-rpc-url.com
```

3. Make sure you have some Sepolia ETH in your wallet for gas fees.

## Available Scripts

### 1. Test Connection (`test-connection.ts`)
Tests the connection to Sepolia testnet and verifies contract addresses.

```bash
npm run test-connection
# or
npx ts-node scripts/test-connection.ts
```

**What it does:**
- Connects to Sepolia testnet
- Verifies network connection
- Checks if contracts are deployed at the expected addresses
- Tests wallet connection (if PRIVATE_KEY is provided)

### 2. Listen to Events (`listen-to-events.ts`)
Listens to `CrossChainOrderFilled` and `OrderFilled` events without creating orders.

```bash
npm run listen
# or
npx ts-node scripts/listen-to-events.ts
```

**What it does:**
- Connects to Sepolia testnet
- Starts listening to `CrossChainOrderFilled` events from SimpleTonResolver
- Starts listening to `OrderFilled` events from LimitOrderProtocol
- Shows recent events from the last 1000 blocks
- Continues listening until you stop the script (Ctrl+C)

### 3. Interact with Resolver (`interact-with-resolver.ts`)
Creates orders and listens to events.

```bash
npm run interact
# or
npx ts-node scripts/interact-with-resolver.ts
```

**What it does:**
- Connects to Sepolia testnet
- Checks wallet and contract balances
- Creates a sample cross-chain order with the following parameters:
  - Maker: Your wallet address
  - Maker Asset: ETH (0x0000000000000000000000000000000000000000)
  - Taker Asset: ETH (0x0000000000000000000000000000000000000000)
  - Making Amount: 0.1 ETH
  - Taking Amount: 0.1 ETH
  - Safety Deposit: 0.01 ETH
  - Timelock: 1 hour from creation
- Deploys source escrow and creates the order on LimitOrderProtocol
- Listens for events continuously until you stop the script (Ctrl+C)

## Events

### CrossChainOrderFilled
Emitted when a cross-chain order is filled. Contains:
- `orderHash`: Hash of the filled order
- `maker`: Address of the order maker
- `taker`: Address of the order taker
- `tonRecipient`: TON blockchain recipient address
- `tokenAddress`: Token address being transferred
- `amount`: Amount transferred
- `hashlock`: Hashlock for the escrow
- `timelock`: Timelock timestamp

### OrderFilled
Emitted by the LimitOrderProtocol when any order is filled. Contains:
- `orderHash`: Hash of the filled order
- `remainingAmount`: Remaining amount in the order

## Contract Addresses (Sepolia)

- **Resolver**: `0x512525aBd4dda45eb201ca4Ee2805A7Fb18be820`
- **LimitOrderProtocol**: `0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91`
- **EscrowFactory**: `0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26`
- **SimpleTonResolver**: `0x512525aBd4dda45eb201ca4Ee2805A7Fb18be820`

## Usage Examples

### Quick Start (Just Listen to Events)
```bash
# Test connection first
npm run test-connection

# Start listening to events
npm run listen
```

### Full Interaction (Create Orders + Listen)
```bash
# Test connection first
npm run test-connection

# Create orders and listen to events
npm run interact
```

### Manual Execution
```bash
# Test connection
npx ts-node scripts/test-connection.ts

# Listen to events only
npx ts-node scripts/listen-to-events.ts

# Full interaction
npx ts-node scripts/interact-with-resolver.ts
```

## Example Output

### Test Connection
```
🔍 Testing connection to Sepolia testnet...
📡 RPC URL: https://1rpc.io/sepolia
✅ Connected to network: sepolia (Chain ID: 11155111)
✅ Current block number: 12345678

🔍 Testing contract addresses...
✅ RESOLVER: Contract found at 0x512525aBd4dda45eb201ca4Ee2805A7Fb18be820
✅ LIMIT_ORDER_PROTOCOL: Contract found at 0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91
✅ ESCROW_FACTORY: Contract found at 0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26

🔍 Testing wallet connection...
✅ Wallet address: 0x1234...
✅ Wallet balance: 0.5 ETH

✅ Connection test completed successfully!
```

### Event Listening
```
🌐 Connected to network: sepolia (Chain ID: 11155111)
📦 Current block number: 12345678
💰 Resolver contract balance: 0.0 ETH

🔍 Fetching recent events...
📊 Found 0 recent CrossChainOrderFilled events
📊 Found 5 recent OrderFilled events
  - Block 12345670: 0xabcd...
  - Block 12345675: 0xefgh...

============================================================
🎧 Starting event listeners...
============================================================

🎧 Listening to CrossChainOrderFilled events...
📡 Contract: 0x512525aBd4dda45eb201ca4Ee2805A7Fb18be820
🌐 Network: Sepolia (Chain ID: 11155111)
⏳ Waiting for events...

📋 Listening to OrderFilled events from LimitOrderProtocol...
📡 Contract: 0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91

🎧 Script is running and listening for events...
Press Ctrl+C to stop

🚀 CrossChainOrderFilled Event Detected!
==========================================
Order Hash: 0xabcd...
Maker: 0x1234...
Taker: 0x5678...
TON Recipient: EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t
Token Address: 0x0000000000000000000000000000000000000000
Amount: 0.1 ETH
Hashlock: 0xdef0...
Timelock: 1704067200
Block Number: 12345679
Transaction Hash: 0x9876...
Block Timestamp: 2025-01-28T12:00:00.000Z
==========================================
```

## Security Notes

- **Never commit your private key** to version control
- **Use a test wallet** with only small amounts for testing
- **Verify contract addresses** before running the scripts
- **Test on testnet first** before using on mainnet

## Troubleshooting

### Common Issues

1. **Insufficient balance**: Make sure your wallet has enough Sepolia ETH for gas fees
2. **Invalid private key**: Ensure your private key is correct and doesn't include the '0x' prefix
3. **RPC connection issues**: Try using a different RPC provider if the default one is slow
4. **Contract not found**: Verify the contract addresses are correct for your network

### Error Messages

- `PRIVATE_KEY environment variable is required`: Set your private key in the `.env` file
- `Transaction failed`: Check your wallet balance and gas settings
- `Contract not found`: Verify the contract addresses are correct for your network
- `Network connection failed`: Check your RPC URL and internet connection

## Getting Sepolia ETH

You can get free Sepolia ETH from these faucets:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Chainlink Faucet](https://faucets.chain.link/sepolia)

## Development

The scripts are written in TypeScript and use:
- **ethers.js v6**: For blockchain interaction
- **dotenv**: For environment variable management
- **ts-node**: For running TypeScript directly

To modify the scripts:
1. Edit the TypeScript files in the `scripts/` directory
2. Run with `npx ts-node scripts/your-script.ts`
3. The scripts will automatically recompile when run 