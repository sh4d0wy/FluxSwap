# TON Blockchain Research

## Overview
This document contains research findings about TON blockchain architecture, development tools, and implementation strategies for the cross-chain resolver project.

## TON Architecture Fundamentals

### 1. Message-Based Architecture
- **Asynchronous Processing**: All TON operations are asynchronous
- **Message Passing**: Contracts communicate via messages, not direct calls
- **Actor Model**: Each contract is an independent actor
- **Gas Model**: Different from Ethereum - compute + storage + message costs

### 2. Account Types
- **Wallet Contracts**: Smart contracts that hold tokens and execute transactions
- **Simple Wallets**: Basic wallet implementations (v3, v4, v5)
- **High-Load Wallets**: For frequent transactions
- **Multi-Signature Wallets**: Require multiple signatures

### 3. TON Address System
- **Workchain**: TON supports multiple workchains (masterchain + workchain 0)
- **Address Format**: `<workchain>:<account_id>` (32-byte account ID)
- **User-Friendly Format**: Base64 encoded with checksum
- **Raw Format**: Hexadecimal representation

## Tact Language Features

### 1. Contract Structure
```tact
contract MyContract with Deployable {
    // State variables
    owner: Address;
    balance: Int;
    
    // Constructor
    init(owner: Address) {
        self.owner = owner;
        self.balance = 0;
    }
    
    // Message receivers
    receive(msg: MyMessage) {
        // Handle message
    }
    
    // Getters
    get fun getBalance(): Int {
        return self.balance;
    }
}
```

### 2. Message Types
```tact
message Transfer {
    amount: Int;
    to: Address;
}

message Deposit {
    amount: Int;
}
```

### 3. Key Features
- **Type Safety**: Strong typing system
- **Gas Optimization**: Built-in gas optimization
- **Message Handling**: Structured message processing
- **Storage Management**: Efficient state management

## Blueprint SDK

### 1. Project Structure
```
ton-project/
├── contracts/          # Tact contracts
├── tests/             # Test files
├── scripts/           # Deployment scripts
├── wrappers/          # Contract wrappers
└── blueprint.config.ts # Configuration
```

### 2. Key Commands
```bash
# Create new project
npx blueprint create my-project

# Build contracts
npx blueprint build

# Test contracts
npx blueprint test

# Deploy contracts
npx blueprint deploy
```

### 3. Contract Testing
```typescript
import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { TonContract } from '../wrappers/TonContract';

describe('TonContract', () => {
    let blockchain: Blockchain;
    let contract: SandboxContract<TonContract>;
    
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        contract = blockchain.openContract(await TonContract.fromInit());
    });
    
    it('should deploy', async () => {
        const result = await contract.send(/* params */);
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: contract.address,
            success: true,
        });
    });
});
```

## Token Standards

### 1. Native TON
- **Toncoin**: Native cryptocurrency
- **Decimals**: 9 decimals
- **Transfer**: Via wallet contracts

### 2. Jettons (Fungible Tokens)
- **Standard**: TEP-74
- **Architecture**: Master contract + wallet contracts
- **Transfer**: Requires specific message format
- **Minting**: Controlled by master contract

### 3. NFTs (Non-Fungible Tokens)
- **Standard**: TEP-62
- **Collection**: NFT collection contract
- **Items**: Individual NFT contracts
- **Transfer**: Similar to Jettons but unique items

## Cross-Chain Considerations

### 1. Message Verification
- **Cell Structure**: TON uses cells for data storage
- **Merkle Proofs**: Can verify transaction inclusion
- **Block Verification**: Requires understanding of TON consensus
- **State Proofs**: Verify contract state

### 2. Atomic Swaps Implementation
```tact
contract TonEscrow with Deployable {
    const MIN_TIMELOCK: Int = 3600; // 1 hour
    const MAX_TIMELOCK: Int = 604800; // 1 week
    
    owner: Address;
    recipient: Address;
    amount: Int;
    hashlock: Int; // SHA256 hash
    timelock: Int; // Unix timestamp
    status: Int; // 0=pending, 1=fulfilled, 2=refunded
    secret: Int; // Revealed secret
    
    init(
        owner: Address,
        recipient: Address,
        amount: Int,
        hashlock: Int,
        timelock: Int
    ) {
        require(timelock > now() + self.MIN_TIMELOCK, "Timelock too short");
        require(timelock < now() + self.MAX_TIMELOCK, "Timelock too long");
        
        self.owner = owner;
        self.recipient = recipient;
        self.amount = amount;
        self.hashlock = hashlock;
        self.timelock = timelock;
        self.status = 0;
        self.secret = 0;
    }
    
    receive(msg: FulfillEscrow) {
        require(self.status == 0, "Escrow not pending");
        require(sha256(msg.secret) == self.hashlock, "Invalid secret");
        require(now() < self.timelock, "Escrow expired");
        
        self.secret = msg.secret;
        self.status = 1;
        
        // Transfer funds to recipient
        send(SendParameters{
            to: self.recipient,
            value: self.amount,
            mode: SendIgnoreErrors,
            body: "Escrow fulfilled".asComment()
        });
    }
    
    receive(msg: RefundEscrow) {
        require(self.status == 0, "Escrow not pending");
        require(now() >= self.timelock, "Escrow not expired");
        require(sender() == self.owner, "Only owner can refund");
        
        self.status = 2;
        
        // Refund to owner
        send(SendParameters{
            to: self.owner,
            value: self.amount,
            mode: SendIgnoreErrors,
            body: "Escrow refunded".asComment()
        });
    }
}
```

### 3. Bridge Architecture
```tact
contract TonBridge with Deployable {
    admin: Address;
    relayers: map<Address, Bool>;
    processedMessages: map<Int, Bool>;
    
    init(admin: Address) {
        self.admin = admin;
    }
    
    receive(msg: RelayMessage) {
        require(self.relayers.get(sender()) == true, "Unauthorized relayer");
        require(self.processedMessages.get(msg.messageId) != true, "Already processed");
        
        self.processedMessages.set(msg.messageId, true);
        
        // Process cross-chain message
        // Emit event for external monitoring
    }
    
    receive(msg: AddRelayer) {
        require(sender() == self.admin, "Only admin");
        self.relayers.set(msg.relayer, true);
    }
}
```

## Development Environment

### 1. Prerequisites
```bash
# Node.js 18+
node --version

# Install Blueprint CLI
npm install -g @ton-community/blueprint

# TON CLI (optional)
npm install -g ton
```

### 2. Local Testing
```bash
# TON Local Testnet
tondev network start

# Connect to testnet
tondev network switch testnet
```

### 3. Wallet Setup
```bash
# Create wallet
tondev wallet create

# Fund wallet (testnet)
tondev wallet fund <address>
```

## Transaction Fees

### 1. Fee Structure
- **Gas Fee**: Computation cost
- **Storage Fee**: Data storage cost
- **Forward Fee**: Message forwarding cost
- **Total**: Sum of all components

### 2. Optimization Strategies
- **Minimize Storage**: Use efficient data structures
- **Batch Operations**: Combine multiple operations
- **Gas Limit**: Set appropriate gas limits
- **Message Size**: Keep messages compact

## Security Considerations

### 1. Message Replay Protection
```tact
contract SecureContract {
    seqno: Int;
    
    receive(msg: SecureMessage) {
        require(msg.seqno == self.seqno + 1, "Invalid sequence");
        self.seqno = msg.seqno;
        // Process message
    }
}
```

### 2. Access Control
```tact
contract ControlledContract {
    owner: Address;
    
    receive(msg: AdminMessage) {
        require(sender() == self.owner, "Unauthorized");
        // Admin operation
    }
}
```

### 3. Time Locks
```tact
contract TimeLocked {
    unlockTime: Int;
    
    receive(msg: WithdrawMessage) {
        require(now() >= self.unlockTime, "Still locked");
        // Allow withdrawal
    }
}
```

## Cross-Chain Message Formats

### 1. Ethereum to TON
```typescript
interface EthToTonMessage {
    messageId: string;
    sourceChain: 'ethereum';
    destChain: 'ton';
    sourceAddress: string; // Ethereum address
    destAddress: string;   // TON address
    amount: string;
    hashlock: string;
    timelock: number;
    tokenAddress?: string; // ERC20 address
    proof: {
        txHash: string;
        blockNumber: number;
        logIndex: number;
        merkleProof: string[];
    };
}
```

### 2. TON to Ethereum
```typescript
interface TonToEthMessage {
    messageId: string;
    sourceChain: 'ton';
    destChain: 'ethereum';
    sourceAddress: string; // TON address
    destAddress: string;   // Ethereum address
    amount: string;
    hashlock: string;
    timelock: number;
    jettonMaster?: string; // Jetton master address
    proof: {
        txHash: string;
        lt: string; // Logical time
        cellProof: string; // Cell merkle proof
    };
}
```

## Next Steps

### 1. Environment Setup
- [ ] Install Blueprint CLI
- [ ] Create TON development workspace
- [ ] Set up TON testnet wallet
- [ ] Configure development environment

### 2. Contract Development
- [ ] Implement TonEscrow contract
- [ ] Create TonBridge contract
- [ ] Develop Jetton handling
- [ ] Add comprehensive tests

### 3. Integration Planning
- [ ] Design message relay protocol
- [ ] Plan Ethereum contract modifications
- [ ] Design relayer service architecture
- [ ] Create deployment scripts

## Resources

### Documentation
- [TON Documentation](https://docs.ton.org)
- [Tact Language Guide](https://docs.tact-lang.org)
- [Blueprint Framework](https://github.com/ton-community/blueprint)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/)

### Tools
- [TON Explorer](https://tonviewer.com)
- [Tact Playground](https://tact-lang.org/play)
- [TON Center API](https://toncenter.com)
- [TON SDK](https://github.com/ton-community/ton)

### Examples
- [Jetton Implementation](https://github.com/ton-blockchain/token-contract)
- [NFT Collection](https://github.com/ton-blockchain/nft-item)
- [Multi-sig Wallet](https://github.com/ton-blockchain/multisig-contract-v2) 