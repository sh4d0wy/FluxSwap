# Cross-Chain Protocol Design: Ethereum ↔ TON

## Overview
This document defines the protocol design for atomic cross-chain swaps between Ethereum and TON blockchain using hashlock/timelock mechanisms integrated with 1inch Fusion+ meta-orders.

## Protocol Architecture

### 1. Core Components
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Ethereum   │    │   Relayer   │    │     TON     │
│   Side      │◄──►│   Service   │◄──►│    Side     │
│             │    │             │    │             │
│ - Resolver  │    │ - Monitor   │    │ - TonEscrow │
│ - EthEscrow │    │ - Relay     │    │ - TonBridge │
│ - EthBridge │    │ - Verify    │    │ - Jetton    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 2. Protocol Flow
1. **Order Creation**: User creates 1inch Fusion+ meta-order with TON destination
2. **Escrow Setup**: Ethereum escrow contract locks tokens with hashlock/timelock
3. **Cross-Chain Message**: Relayer detects and verifies Ethereum transaction
4. **TON Execution**: TON contracts receive message and create corresponding escrow
5. **Secret Reveal**: User reveals secret to claim funds on TON
6. **Settlement**: Secret is used to unlock funds on Ethereum side

## Message Format Specifications

### 1. Base Message Structure
```typescript
interface CrossChainMessage {
  // Message identification
  messageId: string;           // Unique message identifier
  nonce: number;              // Replay protection
  timestamp: number;          // Message timestamp
  
  // Chain information
  sourceChain: 'ethereum' | 'ton';
  destChain: 'ethereum' | 'ton';
  version: string;            // Protocol version
  
  // Swap parameters
  swapType: 'ETH_TO_TON' | 'TON_TO_ETH';
  orderHash: string;          // 1inch Fusion+ order hash
  
  // Addresses
  sourceAddress: string;      // Sender address (chain-specific format)
  destAddress: string;        // Recipient address (chain-specific format)
  
  // Token information
  tokenInfo: TokenInfo;
  amount: string;             // Amount in smallest unit
  
  // Atomic swap parameters
  hashlock: string;           // SHA256 hash of secret
  timelock: number;           // Unix timestamp expiry
  
  // Verification
  proof: TransactionProof;
  signature: string;          // Message signature
}
```

### 2. Token Information
```typescript
interface TokenInfo {
  // Ethereum tokens
  ethereumToken?: {
    type: 'ETH' | 'ERC20';
    address?: string;         // ERC20 contract address (if applicable)
    symbol: string;
    decimals: number;
  };
  
  // TON tokens
  tonToken?: {
    type: 'TON' | 'JETTON';
    jettonMaster?: string;    // Jetton master address (if applicable)
    symbol: string;
    decimals: number;
  };
}
```

### 3. Transaction Proof Structure
```typescript
interface TransactionProof {
  txHash: string;
  blockNumber?: number;       // Ethereum block number
  logicalTime?: string;       // TON logical time
  
  // Ethereum-specific proof
  ethereumProof?: {
    blockHash: string;
    logIndex: number;
    merkleProof: string[];
    receiptRoot: string;
  };
  
  // TON-specific proof
  tonProof?: {
    lt: string;               // Logical time
    cellHash: string;         // Transaction cell hash
    stateProof: string;       // State proof
    configProof?: string;     // Config proof (if needed)
  };
}
```

## Ethereum to TON Swap Protocol

### 1. Ethereum Side Messages
```typescript
// Order Creation Event
interface EthOrderCreated {
  messageType: 'ETH_ORDER_CREATED';
  messageId: string;
  orderHash: string;
  maker: string;              // Ethereum address
  tonRecipient: string;       // TON address
  tokenAddress: string;       // ERC20 address or ETH
  amount: string;
  hashlock: string;
  timelock: number;
  fusionOrderData: string;    // 1inch Fusion+ order data
}

// Escrow Created Event
interface EthEscrowCreated {
  messageType: 'ETH_ESCROW_CREATED';
  messageId: string;
  escrowId: string;
  depositor: string;
  recipient: string;
  amount: string;
  tokenAddress: string;
  hashlock: string;
  timelock: number;
  blockNumber: number;
  txHash: string;
}

// Escrow Fulfilled Event (secret revealed)
interface EthEscrowFulfilled {
  messageType: 'ETH_ESCROW_FULFILLED';
  messageId: string;
  escrowId: string;
  secret: string;             // Revealed secret
  fulfiller: string;
  blockNumber: number;
  txHash: string;
}
```

### 2. TON Side Messages
```typescript
// TON Escrow Creation Message
interface TonEscrowCreate {
  messageType: 'TON_ESCROW_CREATE';
  messageId: string;
  ethTxHash: string;          // Reference to Ethereum transaction
  sender: string;             // TON address
  recipient: string;          // TON address
  amount: string;
  jettonMaster?: string;      // For Jetton transfers
  hashlock: string;
  timelock: number;
  proof: TransactionProof;
}

// TON Escrow Fulfilled Message
interface TonEscrowFulfilled {
  messageType: 'TON_ESCROW_FULFILLED';
  messageId: string;
  escrowId: string;
  secret: string;
  fulfiller: string;
  tonTxHash: string;
  logicalTime: string;
}
```

## TON to Ethereum Swap Protocol

### 1. TON Side Initialization
```typescript
// TON Order Created
interface TonOrderCreated {
  messageType: 'TON_ORDER_CREATED';
  messageId: string;
  orderHash: string;
  maker: string;              // TON address
  ethRecipient: string;       // Ethereum address
  jettonMaster?: string;      // For Jetton transfers
  amount: string;
  hashlock: string;
  timelock: number;
  logicalTime: string;
}
```

### 2. Ethereum Side Response
```typescript
// Ethereum Escrow from TON
interface EthEscrowFromTon {
  messageType: 'ETH_ESCROW_FROM_TON';
  messageId: string;
  tonTxHash: string;
  tonSender: string;
  ethRecipient: string;
  tokenAddress: string;
  amount: string;
  hashlock: string;
  timelock: number;
  proof: TransactionProof;
}
```

## Hashlock/Timelock Implementation

### 1. Secret Generation
```typescript
interface SecretGeneration {
  // Generate 32-byte random secret
  secret: Uint8Array;         // 32 bytes
  hash: string;               // SHA256(secret) as hex string
  
  // Security requirements
  entropy: number;            // Minimum 256 bits
  source: 'crypto.random' | 'hardware';
}
```

### 2. Timelock Parameters
```typescript
interface TimelockConfig {
  // Time constraints
  MIN_TIMELOCK: 3600;         // 1 hour minimum
  MAX_TIMELOCK: 604800;       // 1 week maximum
  DEFAULT_TIMELOCK: 86400;    // 24 hours default
  
  // Grace periods
  REVEAL_GRACE_PERIOD: 1800;  // 30 minutes to reveal after TON fulfillment
  REFUND_DELAY: 300;          // 5 minutes before refund allowed
}
```

### 3. State Machine
```
PENDING ──────► FULFILLED ──────► COMPLETED
   │               │
   │               └──────► REFUND_INITIATED ──► REFUNDED
   │
   └──► EXPIRED ──────────► REFUND_INITIATED ──► REFUNDED
```

## Security Mechanisms

### 1. Replay Protection
```typescript
interface ReplayProtection {
  messageNonce: number;       // Incremental nonce per sender
  messageId: string;          // Unique message identifier
  processedMessages: Set<string>; // Track processed messages
  
  // Time-based protection
  messageTimestamp: number;
  maxMessageAge: number;      // 1 hour max age
}
```

### 2. Signature Verification
```typescript
interface MessageSignature {
  messageHash: string;        // Keccak256 of message data
  signature: string;          // ECDSA signature
  signer: string;             // Recovered signer address
  
  // Multi-signature support
  requiredSignatures: number;
  signatures: string[];
  signers: string[];
}
```

### 3. Amount Validation
```typescript
interface AmountValidation {
  minAmount: string;          // Minimum swap amount
  maxAmount: string;          // Maximum swap amount
  
  // Slippage protection
  expectedAmount: string;
  tolerancePercent: number;   // Max 5% slippage
  
  // Fee calculation
  relayerFee: string;
  protocolFee: string;
  totalFees: string;
}
```

## Error Handling and Recovery

### 1. Error Types
```typescript
enum SwapError {
  // Validation errors
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_PROOF = 'INVALID_PROOF',
  AMOUNT_TOO_LOW = 'AMOUNT_TOO_LOW',
  TIMELOCK_EXPIRED = 'TIMELOCK_EXPIRED',
  
  // Network errors
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  NETWORK_CONGESTION = 'NETWORK_CONGESTION',
  RPC_ERROR = 'RPC_ERROR',
  
  // Protocol errors
  DUPLICATE_MESSAGE = 'DUPLICATE_MESSAGE',
  UNSUPPORTED_TOKEN = 'UNSUPPORTED_TOKEN',
  ESCROW_NOT_FOUND = 'ESCROW_NOT_FOUND',
  SECRET_ALREADY_REVEALED = 'SECRET_ALREADY_REVEALED'
}
```

### 2. Recovery Mechanisms
```typescript
interface RecoveryMechanism {
  // Automatic recovery
  retryAttempts: number;      // Max 3 attempts
  backoffStrategy: 'exponential' | 'linear';
  
  // Manual recovery
  emergencyRefund: boolean;
  adminOverride: boolean;
  
  // Monitoring
  alertThresholds: {
    failureRate: number;      // Alert if >5% failures
    responseTime: number;     // Alert if >30s response
    queueSize: number;        // Alert if >100 pending
  };
}
```

### 3. Circuit Breaker
```typescript
interface CircuitBreaker {
  // Failure thresholds
  maxFailures: number;        // Trip after 10 failures
  timeWindow: number;         // 5 minute window
  
  // State management
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailureTime: number;
  
  // Recovery
  cooldownPeriod: number;     // 30 minutes cooldown
  testRequestThreshold: number; // 1 test request in half-open
}
```

## Performance Optimization

### 1. Message Batching
```typescript
interface MessageBatch {
  batchId: string;
  messages: CrossChainMessage[];
  maxBatchSize: number;       // 10 messages per batch
  maxWaitTime: number;        // 30 seconds max wait
  
  // Compression
  compressed: boolean;
  compressionAlgorithm: 'gzip' | 'lz4';
}
```

### 2. Caching Strategy
```typescript
interface CacheConfig {
  // Proof caching
  proofCache: {
    ttl: number;              // 10 minutes
    maxSize: number;          // 1000 entries
  };
  
  // State caching
  stateCache: {
    ttl: number;              // 5 minutes
    refreshStrategy: 'lazy' | 'eager';
  };
  
  // Token metadata
  tokenCache: {
    ttl: number;              // 1 hour
    refreshOnAccess: boolean;
  };
}
```

### 3. Rate Limiting
```typescript
interface RateLimit {
  // Per user limits
  userLimits: {
    requestsPerMinute: number;  // 10 requests/minute
    swapsPerHour: number;       // 5 swaps/hour
    maxConcurrentSwaps: number; // 2 concurrent
  };
  
  // System limits
  systemLimits: {
    totalRequestsPerSecond: number; // 100 requests/second
    totalSwapsPerMinute: number;    // 50 swaps/minute
  };
}
```

## Integration Points

### 1. 1inch Fusion+ Integration
```typescript
interface FusionIntegration {
  // Order format compatibility
  orderStructure: '1inch_fusion_v2';
  supportedChains: ['ethereum', 'polygon', 'bsc'];
  
  // Resolver integration
  resolverAddress: string;
  resolverABI: string[];
  
  // Event monitoring
  orderEvents: string[];      // Events to monitor
  settlementEvents: string[];
}
```

### 2. TON Connect Integration
```typescript
interface TonConnectIntegration {
  // Wallet connection
  supportedWallets: string[]; // ['tonkeeper', 'tonhub', 'openmask']
  connectionConfig: {
    manifestUrl: string;
    bridgeUrl: string;
  };
  
  // Transaction signing
  signatureFormat: 'ton_proof';
  messageFormat: 'text' | 'cell';
}
```

### 3. Monitoring Integration
```typescript
interface MonitoringIntegration {
  // Metrics collection
  metricsEndpoints: string[];
  alertingRules: AlertRule[];
  
  // Health checks
  healthCheckInterval: number; // 30 seconds
  healthCheckEndpoints: string[];
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
}
```

## Testing Strategy

### 1. Protocol Testing
```typescript
interface ProtocolTests {
  // Unit tests
  messageValidation: TestSuite;
  cryptographicFunctions: TestSuite;
  stateTransitions: TestSuite;
  
  // Integration tests
  crossChainFlow: TestSuite;
  errorHandling: TestSuite;
  performanceTests: TestSuite;
  
  // Security tests
  replayAttacks: TestSuite;
  signatureForging: TestSuite;
  timingAttacks: TestSuite;
}
```

### 2. Test Scenarios
```typescript
interface TestScenarios {
  // Happy path
  ethToTonSwap: TestCase;
  tonToEthSwap: TestCase;
  
  // Error cases
  expiredTimelock: TestCase;
  invalidSecret: TestCase;
  insufficientFunds: TestCase;
  
  // Edge cases
  minimumAmount: TestCase;
  maximumAmount: TestCase;
  networkCongestion: TestCase;
}
```

## Future Enhancements

### 1. Multi-Hop Swaps
- Support for ETH → TON → BSC routing
- Optimal path finding algorithms
- Cross-chain liquidity aggregation

### 2. Advanced Order Types
- Limit orders with time decay
- Stop-loss mechanisms
- Partial fill support

### 3. Privacy Features
- Zero-knowledge proofs for amounts
- Private relay networks
- Confidential transaction support

---

## Implementation Checklist

### Phase 1.3 Requirements ✅
- [x] Cross-chain message format definition
- [x] Hashlock/timelock protocol specification
- [x] Security mechanisms design
- [x] Error handling strategy
- [x] Performance optimization plan
- [x] Integration point specifications
- [x] Testing strategy outline

### Ready for Phase 1.4: Architecture Documentation
The protocol design is complete and ready for system architecture documentation and implementation planning. 