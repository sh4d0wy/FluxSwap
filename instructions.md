# Cross-Chain Resolver Instructions: Ethereum ↔ TON

## Overview
This document provides implementation instructions for building a novel extension to 1inch Fusion+ enabling atomic swaps between Ethereum and TON blockchain using Tact smart contracts. The solution uses cryptographic hashlocks and timelocks instead of TEE or shade agents for security.

## Goals
- Build atomic cross-chain swaps between Ethereum and TON
- Integrate with 1inch Fusion+ meta-orders on Ethereum side
- Use Tact language for TON smart contracts
- Implement hashlock/timelock mechanisms for security
- Enable bidirectional swaps (ETH→TON and TON→ETH)
- Demonstrate live onchain execution on testnet/mainnet
- **Remove all NEAR-based logic and dependencies that are not beneficial for TON**

## Key Technologies
- **Ethereum**: Solidity contracts, 1inch Fusion+ integration, Foundry tooling
- **TON**: Tact smart contracts, TON Connect wallet integration
- **Cross-chain**: Relayer service, message verification, atomic swaps
- **Security**: Hashlock/timelock mechanisms, cryptographic proofs

## Architecture Overview

### Components
1. **Ethereum Side**
   - Extended Resolver contract for TON compatibility
   - Escrow contracts for atomic swaps
   - Adapter contracts for token standards
   - 1inch Fusion+ meta-order integration

2. **TON Side**
   - Tact-based escrow contracts
   - Bridge contract for message verification
   - Token transfer handlers
   - Cross-chain message processing

3. **Relayer Service**
   - TypeScript/Node.js service
   - Event monitoring on both chains
   - Message relay and verification
   - State synchronization

4. **Security Layer**
   - Hashlock/timelock atomic swap protocol
   - Cryptographic message verification
   - Multi-signature requirements (optional)

## NEAR-to-TON Migration Strategy

### Remove NEAR Dependencies
The current project contains NEAR-specific implementation that must be removed or replaced for TON integration:

#### Components to Remove/Replace:
- [ ] **NEAR Solver/Agent Logic**: Remove `near-solver/` directory entirely - TON doesn't use TEE or shade agents
- [ ] **NEAR Contracts**: Remove or replace `near-contracts/` with TON equivalents
- [ ] **NEAR Relayer Logic**: Remove NEAR-specific parts in `relayer/src/relay/near.ts` and `near-relayer.ts`
- [ ] **NEAR Chain Signatures**: Replace with TON wallet signing mechanisms
- [ ] **NEAR Dependencies**: Remove NEAR SDK, near-api-js, and related packages from package.json files
- [ ] **NEAR Message Formats**: Replace NEAR-specific message formats in `docs/message-formats.md` with TON formats
- [ ] **NEAR Test Files**: Remove `tests/near-integration.spec.ts` and replace with TON integration tests

#### Logic NOT to Reuse for TON:
- [ ] **TEE/Shade Agent Architecture**: TON uses traditional cryptographic methods, not TEE
- [ ] **NEAR Account Model**: TON has a different account and address system
- [ ] **NEAR Gas/Fee Model**: TON's fee structure is fundamentally different
- [ ] **NEAR Async Patterns**: While TON is also async, the patterns are different
- [ ] **NEAR Chain Signatures**: TON uses different signing mechanisms
- [ ] **NEAR State Management**: TON contracts have different state handling

#### What Can Be Adapted:
- [ ] **Hashlock/Timelock Concepts**: Core atomic swap logic can be adapted
- [ ] **Order Lifecycle Management**: Basic order states and transitions
- [ ] **Cross-chain Message Structure**: Basic message patterns (with TON-specific modifications)
- [ ] **Relayer Architecture**: Core relayer service structure (with TON endpoints)
- [ ] **Ethereum-side Logic**: Most Ethereum contracts can be extended rather than replaced

#### Migration Tasks:
1. **Audit Current Codebase**: 
   - [ ] Identify all NEAR-specific code and dependencies
   - [ ] Document what logic can be salvaged vs. what must be rewritten
   - [ ] Create migration checklist for each component

2. **Clean Removal**:
   - [ ] Remove NEAR directories and files that have no TON equivalent
   - [ ] Clean up package.json dependencies
   - [ ] Remove NEAR-specific environment variables and configs
   - [ ] Update CI/CD pipelines to remove NEAR deployment steps

3. **Strategic Replacement**:
   - [ ] Replace NEAR solver with TON-specific atomic swap logic
   - [ ] Replace NEAR bridge contracts with TON bridge contracts
   - [ ] Adapt relayer service for TON API integration
   - [ ] Update message formats for TON addressing and transaction structure

### TON-Specific Implementation Notes:
- **Start Fresh for TON Contracts**: Don't try to port NEAR contract logic - TON's Tact language and architecture are sufficiently different
- **Rebuild Relayer Integration**: TON API and event structure are different from NEAR
- **New Security Model**: TON doesn't need TEE-based security - use traditional cryptographic proofs
- **Different Async Patterns**: TON's message-based architecture requires different async handling than NEAR

## Implementation Plan

### Phase 1: Research & Design
#### 1.1 NEAR Codebase Cleanup (CRITICAL FIRST STEP)
- [x] **Audit existing NEAR code**: Identify all NEAR-specific files, dependencies, and logic
- [x] **Remove NEAR directories**: Delete `near-solver/`, `near-contracts/` if not adaptable
- [x] **Clean dependencies**: Remove NEAR SDK, near-api-js from all package.json files
- [ ] **Update documentation**: Remove NEAR references from existing docs that won't apply to TON
- [x] **Backup valuable logic**: Extract any hashlock/timelock logic that can be adapted for TON

#### 1.2 TON Blockchain Study
- [x] Study TON architecture and message passing
- [x] Study blueprint SDK and how to build, deploy and test Tact based contracts
- [x] Understand Tact language features and limitations
- [x] Research TON transaction fees and gas model
- [x] Analyze TON wallet ecosystem (TON Connect, TON Keeper, etc.)

#### 1.3 Protocol Design
- [ ] Design cross-chain message formats for TON
- [ ] Adapt hashlock/timelock for TON's async model
- [ ] Design token mapping between Ethereum and TON
- [ ] Create security model without TEE dependency

#### 1.4 Architecture Documentation
- [ ] Create system architecture diagram
- [ ] Define data flow for ETH↔TON swaps
- [ ] Document message formats and protocols
- [ ] Design error handling and recovery mechanisms

### Phase 2: TON Side Implementation

#### 2.1 Development Environment Setup
- [x] Install TON development tools (func, tact, blueprint)
- [x] Set up TON testnet environment
- [x] Configure TON wallet for testing
- [x] Set up blueprint project structure

#### 2.2 Core Tact Contracts

##### 2.2.1 TON Escrow Contract
```tact
// Core features to implement:
contract TonEscrow with Deployable {
    // State variables
    source_address: Address;
    dest_address: Address;
    amount: Int;
    hashlock: Int;
    timelock: Int;
    status: Int; // 0=pending, 1=fulfilled, 2=refunded
    
    // Main functions
    receive(msg: CreateEscrow) { /* implementation */ }
    receive(msg: FulfillEscrow) { /* implementation */ }
    receive(msg: RefundEscrow) { /* implementation */ }
}
```

- [x] Implement escrow creation with hashlock/timelock
- [x] Add fulfillment logic with secret verification
- [x] Implement refund mechanism after timelock expiry
- [x] Add event emission for cross-chain communication
- [x] Handle TON-specific fee calculations

##### 2.2.2 TON Bridge Contract
```tact
contract TonBridge with Deployable {
    // Cross-chain message verification
    admin: Address;
    relayers: map<Address, Bool>;
    
    receive(msg: VerifyEthereumMessage) { /* implementation */ }
    receive(msg: RelayMessage) { /* implementation */ }
}
```

- [x] Implement message verification from Ethereum
- [x] Add relayer management and permissions
- [x] Create cross-chain event emission
- [x] Handle message replay protection

##### 2.2.3 TON Token Handler
```tact
// For handling various TON tokens (Jettons)
contract TonTokenHandler with Deployable {
    receive(msg: TransferNotification) { /* implementation */ }
    receive(msg: TokenTransfer) { /* implementation */ }
}
```

- [x] Implement Jetton (TON token) handling
- [x] Add native TON handling
- [x] Create token mapping logic
- [x] Implement balance verification

#### 2.3 Testing and Deployment
- [x] Write comprehensive unit tests for Tact contracts
- [ ] Deploy contracts to TON testnet
- [ ] Test atomic swap scenarios
- [ ] Verify gas optimization and fee handling

### Phase 3: Ethereum Side Enhancement

#### 3.1 Extended Resolver Contract
- [x] Modify existing Resolver.sol for TON compatibility
- [x] Add TON-specific message formats
- [x] Implement TON address validation
- [x] Add TON bridge communication

#### 3.2 TON Bridge Adapter
```solidity
contract EthereumTonBridge {
    // Cross-chain communication with TON
    mapping(bytes32 => bool) public processedMessages;
    mapping(bytes32 => EscrowOrder) public orders;
    
    function createTonEscrow(/* params */) external;
    function fulfillFromTon(/* params */) external;
    function verifyTonMessage(/* params */) external view returns (bool);
}
```

- [x] Create bridge contract for TON communication
- [x] Implement message verification from TON
- [x] Add order lifecycle management
- [x] Handle dispute resolution mechanisms

#### 3.3 Enhanced Escrow Factory
- [x] Extend TestEscrowFactory.sol for TON orders
- [x] Add TON-specific order types
- [x] Implement cross-chain validation
- [x] Add event emission for TON relayer

### Phase 4: Cross-Chain Communication ✅ COMPLETED

#### 4.1 Message Format Definition ✅
**Note**: Replace existing NEAR message formats in `docs/message-formats.md` - do not reuse NEAR-specific structures that don't fit TON's architecture.
```typescript
// TON-specific message formats
interface EthereumToTonMessage {
  type: 'ETH_TO_TON_ESCROW';
  orderId: string;
  ethereumTxHash: string;
  tonRecipient: string; // TON address
  amount: string;
  hashlock: string;
  timelock: number;
  tokenAddress: string;
}

interface TonToEthereumMessage {
  type: 'TON_TO_ETH_ESCROW';
  orderId: string;
  tonTxHash: string;
  ethereumRecipient: string;
  amount: string;
  hashlock: string;
  timelock: number;
  jettonMaster?: string; // For TON tokens
}
```

- [x] Define comprehensive message formats
- [x] Implement message serialization/deserialization
- [x] Add message validation and verification
- [x] Create error handling protocols

#### 4.2 Relayer Service Enhancement ✅
**Note**: Remove NEAR-specific relayer logic in `relayer/src/relay/near.ts` and `near-relayer.ts` - TON requires different API integration.

```typescript
// TON integration for relayer
class TonRelayer {
  async monitorTonEvents(): Promise<void>;
  async relayToEthereum(message: TonMessage): Promise<void>;
  async verifyTonTransaction(txHash: string): Promise<boolean>;
}
```

- [x] Remove existing NEAR relayer components that conflict with TON
- [x] Extend existing relayer for TON support
- [x] Implement TON event monitoring
- [x] Add TON transaction verification
- [x] Create message relay logic
- [x] Implement retry and error handling

#### 4.3 State Synchronization ✅
- [x] Implement order state tracking across chains
- [x] Add finality checking for both chains
- [ ] Handle reorg scenarios (requires actual blockchain integration)
- [ ] Create state recovery mechanisms (requires actual blockchain integration)

### Phase 5: 1inch Fusion+ Integration

#### 5.1 Meta-Order Construction ✅
- [x] Extend meta-order format for TON destinations
- [x] Implement TON-compatible order signing
- [x] Add TON address validation in orders
- [x] Create order lifecycle management

#### 5.2 Order Execution ✅
- [x] Implement local order matching
- [x] Add cross-chain execution logic
- [ ] Handle partial fills (stretch goal)
- [x] Create order cancellation mechanisms

#### 5.3 Integration Testing ✅
- [x] Test end-to-end order flow
- [x] Verify signature compatibility
- [x] Test error scenarios
- [x] Validate order lifecycle

### Phase 6: Security & Testing

#### 6.1 Security Implementation
- [ ] Implement hashlock generation and verification
- [ ] Add timelock enforcement
- [ ] Create message replay protection
- [ ] Implement access controls

#### 6.2 Comprehensive Testing
- [ ] Unit tests for all Tact contracts
- [ ] Integration tests for cross-chain flow
- [ ] Security testing and audit
- [ ] Load testing for relayer service

#### 6.3 Bug Fixes and Optimization
- [ ] Fix identified issues
- [ ] Optimize gas usage on both chains
- [ ] Improve error handling
- [ ] Enhance monitoring and logging

### Phase 7: Testnet Deployment

#### 7.1 TON Testnet Deployment
- [ ] Deploy Tact contracts to TON testnet
- [ ] Configure initial parameters
- [ ] Fund test accounts
- [ ] Verify contract functionality

#### 7.2 Ethereum Integration
- [ ] Deploy enhanced contracts to Sepolia
- [ ] Configure TON bridge parameters
- [ ] Test cross-chain communication
- [ ] Verify message relay functionality

#### 7.3 End-to-End Testing
- [ ] Test ETH → TON swap flow
- [ ] Test TON → ETH swap flow
- [ ] Verify atomic swap properties
- [ ] Test failure scenarios and recovery

### Phase 8: Documentation & Demo

#### 8.1 Technical Documentation
- [ ] API documentation for contracts
- [ ] Integration guide for developers
- [ ] Security considerations document
- [ ] Deployment and configuration guide

#### 8.2 User Documentation
- [ ] User guide for cross-chain swaps
- [ ] Wallet integration instructions
- [ ] Troubleshooting guide
- [ ] FAQ and common issues

#### 8.3 Live Demo Preparation
- [ ] Prepare demo script
- [ ] Create verification steps
- [ ] Set up monitoring and logging
- [ ] Prepare backup recordings

### Phase 9: Stretch Goals

#### 9.1 UI Development
- [ ] Web interface for cross-chain swaps
- [ ] TON Connect wallet integration
- [ ] Transaction monitoring dashboard
- [ ] Swap history and analytics

#### 9.2 Advanced Features
- [ ] Partial fill support
- [ ] Multi-hop swaps
- [ ] Advanced order types
- [ ] MEV protection mechanisms

#### 9.3 Production Enhancements
- [ ] Monitoring and alerting
- [ ] Performance optimization
- [ ] Scalability improvements
- [ ] Additional token support

## Technical Specifications

### TON-Specific Considerations

#### 1. Message Architecture
- TON uses asynchronous message passing
- Consider message delivery guarantees
- Handle message bouncing scenarios
- Implement proper error handling

#### 2. Fee Structure
- TON has different fee calculation than Ethereum
- Consider storage fees for long-term contracts
- Optimize message costs
- Handle fee payment in various tokens

#### 3. Address Format
- TON addresses are different from Ethereum
- Implement proper address validation
- Handle workchain routing
- Consider address format conversions

#### 4. Token Standards
- Native TON coin handling
- Jetton (TIP-74) token standard
- NFT considerations (if applicable)
- Token metadata and decimals

### Security Considerations

#### 1. Hashlock/Timelock Protocol
```typescript
// Security parameters
const MINIMUM_TIMELOCK = 3600; // 1 hour
const MAXIMUM_TIMELOCK = 86400 * 7; // 1 week
const SECRET_LENGTH = 32; // bytes
```

#### 2. Message Verification
- Cryptographic signature verification
- Merkle proof validation (if using state proofs)
- Replay attack prevention
- Man-in-the-middle protection

#### 3. Economic Security
- Minimum and maximum swap amounts
- Fee calculation and distribution
- Slippage protection
- Front-running prevention

## Development Tools

### TON Development Stack
- **Tact**: Smart contract language
- **Blueprint**: Development framework
- **TON CLI**: Command-line tools
- **TON Connect**: Wallet integration
- **TON Scanner**: Block explorer

### Ethereum Development Stack
- **Foundry**: Testing and deployment
- **Solidity**: Smart contract language
- **OpenZeppelin**: Security libraries
- **Ethers.js**: JavaScript library

### Cross-Chain Tools
- **TypeScript**: Relayer service
- **Jest**: Testing framework
- **Docker**: Containerization
- **Prometheus**: Monitoring

## Success Criteria

### Core Requirements
- [ ] Successful atomic swaps between Ethereum and TON
- [ ] Integration with 1inch Fusion+ orders
- [ ] Live testnet demonstration
- [ ] Security audit passage
- [ ] Comprehensive documentation

### Performance Targets
- [ ] Swap completion time < 10 minutes
- [ ] 99.9% uptime for relayer service
- [ ] Gas optimization within 10% of optimal
- [ ] Support for 100+ concurrent swaps

### Security Standards
- [ ] No loss of funds in normal operation
- [ ] Proper handling of all failure modes
- [ ] Resistance to common attack vectors
- [ ] Proper access controls and permissions

## Risk Mitigation

### Technical Risks
- **TON Network Issues**: Implement robust error handling and retry logic
- **Gas Price Volatility**: Dynamic fee calculation and limits
- **Contract Bugs**: Comprehensive testing and security audits
- **Relayer Failures**: Multi-relayer setup and failover mechanisms

### Economic Risks
- **Token Price Volatility**: Short timelock windows and slippage protection
- **MEV Attacks**: Transaction ordering protection and fair pricing
- **Liquidity Issues**: Partner integration and liquidity provision

### Operational Risks
- **Network Congestion**: Fee escalation and priority handling
- **Wallet Integration**: Multiple wallet support and fallbacks
- **User Experience**: Clear error messages and recovery procedures

## Conclusion

This implementation plan provides a comprehensive roadmap for building cross-chain atomic swaps between Ethereum and TON using Tact smart contracts. The approach leverages proven cryptographic techniques (hashlock/timelock) while adapting to TON's unique architecture and capabilities.

**CRITICAL REMINDER**: This is a migration from NEAR to TON - do not blindly reuse NEAR code that doesn't fit TON's architecture. TON's asynchronous message-based system, different fee model, and Tact language require fresh implementation in many areas.

The key innovations include:
1. First cross-chain integration between Ethereum and TON
2. Tact-based atomic swap implementation
3. Integration with 1inch Fusion+ without TEE dependency
4. Robust relayer architecture for message passing
5. **Clean migration from NEAR-based to TON-based architecture**

Success will be measured by the ability to perform live atomic swaps on testnet/mainnet with security, reliability, and user experience meeting production standards.
