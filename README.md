# 1inch Fusion+ x TON Cross-Chain Swap

This project implements a cross-chain swap solution between Ethereum and TON using 1inch Fusion+. It enables atomic swaps between the two blockchains while preserving hashlock and timelock functionality.

## Project Structure

```
cross-chain-resolver-example/
├── contracts/           # Ethereum smart contracts
├── ton-contracts/       # TON-side contracts (Tact)
├── relayer/             # Cross-chain message relayer (TypeScript)
├── docs/                # Documentation
└── tests/               # Integration tests
```

## Features

- **Cross-Chain Swaps**: Atomic swaps between Ethereum and TON
- **1inch Fusion+ Integration**: Leverages 1inch's Fusion mode for order matching
- **TON Integration**: Native TON blockchain support with Tact contracts
- **Modular Architecture**: Easy to extend and maintain

## Prerequisites

### System Dependencies

```bash
# Install Node.js (v18+)
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Install Foundry (for Ethereum development)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Rust (for TON development)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install TON CLI tools
npm install -g ton-cli

# Install Tact compiler
cargo install tact
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/1inch/cross-chain-resolver-example.git
cd cross-chain-resolver-example
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Foundry dependencies
forge install
```

### 3. Configuration

Create a `.env` file in the project root with the following variables:

```env
# Ethereum Configuration
ETHEREUM_RPC_URL=https://eth.merkle.io
ETHEREUM_CHAIN_ID=1  # 1 for mainnet, 5 for Goerli, etc.

# TON Configuration
TON_NETWORK=testnet
TON_NODE_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_ACCOUNT_ID=your-account.testnet
TON_PRIVATE_KEY=your-private-key

# Relayer Configuration
RELAYER_POLL_INTERVAL=5000  # 5 seconds
LOG_LEVEL=info
```

## TON Contracts Setup

The TON contracts are implemented in Tact language and provide cross-chain functionality.

### Build the Contracts

```bash
cd ton-contracts
tact --config blueprint.config.ts
```

### Deploy to Testnet

1. Configure your TON wallet:
   ```bash
   ton-cli config
   ```

2. Deploy the contracts:
   ```bash
   npm run deploy:testnet
   ```

## Relayer Setup

The relayer handles cross-chain communication between Ethereum and TON.

### Start the Relayer

```bash
cd relayer
pnpm install
pnpm build
pnpm start
```

The relayer will start and begin monitoring for cross-chain events.

## Development Tools

### Ethereum Development
- Hardhat: Smart contract development and testing
- Foundry: Advanced testing and deployment
- Ethers.js: Ethereum interaction library

### TON Development
- Tact: TON smart contract language
- TON CLI: For deployment and interaction
- ton-core: TON blockchain interaction library

### Monitoring
- Prometheus: Metrics collection
- Grafana: Monitoring dashboards

## Testing

### Run Unit Tests

```bash
# Run Ethereum tests
cd contracts
pnpm test

# Run TON contract tests
cd ../ton-contracts
npm test

# Run relayer tests
cd ../relayer
pnpm test
```

### Run Integration Tests

```bash
# Start local Ethereum node (Anvil)
anvil

# In a new terminal, deploy contracts
cd contracts
pnpm deploy:local

# In another terminal, run integration tests
pnpm test:integration
```

## Development Workflow

### Ethereum Development
1. Write and test Solidity contracts in `contracts/src/`
2. Run tests: `pnpm test`
3. Deploy to testnet: `pnpm deploy:testnet`

### TON Development
1. Write and test Tact contracts in `ton-contracts/contracts/`
2. Run tests: `npm test`
3. Deploy to testnet: `npm run deploy:testnet`

### Integration Testing
1. Start local Ethereum node: `anvil`
2. Deploy contracts: `pnpm deploy:local`
3. Start relayer: `cd relayer && pnpm start`
4. Run integration tests: `pnpm test:integration`

## Local Development

### Ethereum Local Node

```bash
# Start Anvil (local Ethereum node)
anvil

# Deploy contracts to local node
cd contracts
pnpm deploy:local
```

### TON Local Node

```bash
# Start TON local testnet
ton-dev

# Set TON_ENV to local
# export TON_ENV=local
```

## Available Scripts

### Contracts
```bash
# Compile contracts
pnpm compile

# Run tests
pnpm test

# Deploy to testnet
pnpm deploy:testnet

# Start local node
pnpm node
```

### TON Contracts
```bash
# Build the contracts
tact --config blueprint.config.ts

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet
```

### Relayer
```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start
pnpm start
```

## IDE Setup

### VS Code Extensions
- Solidity (by Juan Blanco)
- Tact (TON smart contract language)
- Hardhat
- ESLint
- Prettier
- TOML Language Support
- Docker

### Recommended Settings

```json
{
  "solidity.packageDefaultDependenciesContractsDirectory": "contracts/src",
  "solidity.packageDefaultDependenciesDirectory": "contracts/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

1. **Deploy to Testnet**
   - Deploy contracts to Ethereum testnet
   - Deploy TON contracts to testnet
   - Configure and start the relayer

2. **Testing**
   - Run unit tests for all components
   - Test cross-chain swaps on testnet
   - Perform security audits

3. **Mainnet Deployment**
   - Deploy audited contracts to mainnet
   - Set up monitoring and alerting
   - Deploy production relayer infrastructure

## Security Considerations

- Always audit smart contracts before deployment
- Use multi-sig wallets for contract administration
- Monitor for suspicious activity
- Keep private keys secure
- Regularly update dependencies

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Running

To run tests you need to provide fork urls for Ethereum and Bsc

```shell
SRC_CHAIN_RPC=ETH_FORK_URL DST_CHAIN_RPC=BNB_FORK_URL pnpm test
```

### Public rpc

| Chain    | Url                          |
|----------|------------------------------|
| Ethereum | https://eth.merkle.io        |
| BSC      | wss://bsc-rpc.publicnode.com |

## Test accounts

### Available Accounts

```
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" Owner of EscrowFactory
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" User
(2) 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" Resolver
```