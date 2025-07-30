# System Architecture: Ethereum ↔ TON Cross-Chain Resolver

## Overview
This document provides comprehensive system architecture documentation for the cross-chain atomic swap solution between Ethereum and TON blockchain, integrated with 1inch Fusion+ meta-orders.

## High-Level Architecture

### System Components Diagram
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   USER LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Web Interface    │    Mobile App     │   1inch App      │    TON Wallet       │
│  - Swap UI        │    - TON Connect  │   - Meta Orders  │    - Transaction    │
│  - Order Status   │    - Transaction  │   - Order Book   │    - Signing        │
│  - History        │    - Monitoring   │   - Analytics    │    - Balance        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               APPLICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Relayer Service                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Event Monitor │  │  Message Relay  │  │  State Manager  │                │
│  │  - Ethereum     │  │  - Validation   │  │  - Order Track  │                │
│  │  - TON          │  │  - Routing      │  │  - Recovery     │                │
│  │  - Filtering    │  │  - Batching     │  │  - Monitoring   │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                        ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│     ETHEREUM SIDE       │    │     INTEGRATION LAYER   │    │       TON SIDE          │
├─────────────────────────┤    ├─────────────────────────┤    ├─────────────────────────┤
│  Smart Contracts:      │    │  External Services:     │    │  Smart Contracts:       │
│  ┌─────────────────┐   │    │  ┌─────────────────┐    │    │  ┌─────────────────┐    │
│  │   Resolver      │   │    │  │ 1inch Fusion+  │    │    │  │   TonEscrow     │    │
│  │  - Meta Orders  │   │    │  │ - Order Book    │    │    │  │  - Hashlock     │    │
│  │  - Validation   │   │    │  │ - Settlement    │    │    │  │  - Timelock     │    │
│  │  - Settlement   │   │    │  │ - Pricing       │    │    │  │  - State Mgmt   │    │
│  └─────────────────┘   │    │  └─────────────────┘    │    │  └─────────────────┘    │
│  ┌─────────────────┐   │    │  ┌─────────────────┐    │    │  ┌─────────────────┐    │
│  │   EthEscrow     │   │    │  │   TON Connect   │    │    │  │   TonBridge     │    │
│  │  - Hashlock     │   │    │  │ - Wallet Link   │    │    │  │  - Message Ver  │    │
│  │  - Timelock     │   │    │  │ - Transaction   │    │    │  │  - Relayer Mgmt │    │
│  │  - Token Lock   │   │    │  │ - Signing       │    │    │  │  - Event Emit   │    │
│  └─────────────────┘   │    │  └─────────────────┘    │    │  └─────────────────┘    │
│  ┌─────────────────┐   │    │  ┌─────────────────┐    │    │  ┌─────────────────┐    │
│  │   EthBridge     │   │    │  │   Monitoring    │    │    │  │  JettonHandler  │    │
│  │  - Cross-chain  │   │    │  │ - Prometheus    │    │    │  │  - Token Trans  │    │
│  │  - Verification │   │    │  │ - Grafana       │    │    │  │  - Balance Chk  │    │
│  │  - Events       │   │    │  │ - Alerting      │    │    │  │  - Validation   │    │
│  └─────────────────┘   │    │  └─────────────────┘    │    │  └─────────────────┘    │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
             │                                │                            │
             ▼                                ▼                            ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│    ETHEREUM NETWORK     │    │     DATA STORAGE        │    │      TON NETWORK        │
├─────────────────────────┤    ├─────────────────────────┤    ├─────────────────────────┤
│  - Mainnet/Testnets     │    │  - PostgreSQL DB       │    │  - Mainnet/Testnet      │
│  - RPC Providers        │    │  - Redis Cache         │    │  - TON API Endpoints    │
│  - Block Explorers      │    │  - Message Queue       │    │  - Block Explorers      │
│  - Gas Optimization     │    │  - Backup Storage       │    │  - Fee Optimization     │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

## Detailed Component Architecture

### 1. Ethereum Side Components

#### 1.1 Resolver Contract
```solidity
contract CrossChainResolver {
    // Manages 1inch Fusion+ integration
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) public settledOrders;
    
    // Cross-chain communication
    address public tonBridge;
    mapping(address => bool) public authorizedRelayers;
    
    function submitOrder(Order calldata order) external;
    function settleOrder(bytes32 orderHash, bytes calldata proof) external;
    function cancelOrder(bytes32 orderHash) external;
}
```

#### 1.2 EthEscrow Contract
```solidity
contract EthEscrow {
    struct EscrowData {
        address depositor;
        address recipient;
        uint256 amount;
        address token;
        bytes32 hashlock;
        uint256 timelock;
        EscrowStatus status;
        bytes32 secret;
    }
    
    mapping(bytes32 => EscrowData) public escrows;
    
    function createEscrow(
        address recipient,
        uint256 timelock,
        bytes32 hashlock
    ) external payable returns (bytes32 escrowId);
    
    function fulfillEscrow(
        bytes32 escrowId,
        bytes32 secret
    ) external;
    
    function refundEscrow(bytes32 escrowId) external;
}
```

#### 1.3 EthBridge Contract
```solidity
contract EthBridge {
    // Cross-chain message verification
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => bool) public relayers;
    
    event CrossChainMessage(
        bytes32 indexed messageId,
        string indexed destChain,
        bytes data
    );
    
    function relayMessage(
        bytes32 messageId,
        bytes calldata tonProof,
        bytes calldata data
    ) external onlyRelayer;
    
    function verifyTonTransaction(
        bytes calldata proof
    ) external view returns (bool);
}
```

### 2. TON Side Components

#### 2.1 TonEscrow Contract (Tact)
```tact
contract TonEscrow with Deployable {
    owner: Address;
    recipient: Address;
    amount: Int;
    jettonMaster: Address?;
    hashlock: Int;
    timelock: Int;
    status: Int; // 0=pending, 1=fulfilled, 2=refunded
    secret: Int;
    
    init(
        owner: Address,
        recipient: Address,
        amount: Int,
        jettonMaster: Address?,
        hashlock: Int,
        timelock: Int
    ) {
        require(timelock > now() + 3600, "Timelock too short");
        require(timelock < now() + 604800, "Timelock too long");
        
        self.owner = owner;
        self.recipient = recipient;
        self.amount = amount;
        self.jettonMaster = jettonMaster;
        self.hashlock = hashlock;
        self.timelock = timelock;
        self.status = 0;
        self.secret = 0;
    }
    
    receive(msg: FulfillEscrow) {
        require(self.status == 0, "Invalid status");
        require(sha256(msg.secret) == self.hashlock, "Invalid secret");
        require(now() < self.timelock, "Expired");
        
        self.secret = msg.secret;
        self.status = 1;
        
        self.transferFunds();
        self.emitFulfillEvent();
    }
    
    receive(msg: RefundEscrow) {
        require(self.status == 0, "Invalid status");
        require(now() >= self.timelock, "Not expired");
        require(sender() == self.owner, "Unauthorized");
        
        self.status = 2;
        self.refundFunds();
        self.emitRefundEvent();
    }
}
```

#### 2.2 TonBridge Contract (Tact)
```tact
contract TonBridge with Deployable {
    admin: Address;
    relayers: map<Address, Bool>;
    processedMessages: map<Int, Bool>;
    
    init(admin: Address) {
        self.admin = admin;
    }
    
    receive(msg: RelayEthereumMessage) {
        require(self.relayers.get(sender()) == true, "Unauthorized");
        require(self.processedMessages.get(msg.messageId) != true, "Processed");
        
        self.processedMessages.set(msg.messageId, true);
        
        if (msg.messageType == "CREATE_ESCROW") {
            self.handleCreateEscrow(msg);
        } else if (msg.messageType == "FULFILL_ESCROW") {
            self.handleFulfillEscrow(msg);
        }
        
        self.emitCrossChainEvent(msg);
    }
    
    receive(msg: AddRelayer) {
        require(sender() == self.admin, "Only admin");
        self.relayers.set(msg.relayer, true);
    }
    
    receive(msg: RemoveRelayer) {
        require(sender() == self.admin, "Only admin");
        self.relayers.set(msg.relayer, false);
    }
}
```

### 3. Relayer Service Architecture

#### 3.1 Service Structure
```typescript
class RelayerService {
    private ethereumMonitor: EthereumMonitor;
    private tonMonitor: TonMonitor;
    private messageQueue: MessageQueue;
    private stateManager: StateManager;
    private configManager: ConfigManager;
    
    constructor(config: RelayerConfig) {
        this.initializeComponents(config);
    }
    
    async start(): Promise<void> {
        await Promise.all([
            this.ethereumMonitor.start(),
            this.tonMonitor.start(),
            this.messageQueue.start(),
            this.stateManager.start()
        ]);
    }
    
    async processMessage(message: CrossChainMessage): Promise<void> {
        await this.validateMessage(message);
        await this.routeMessage(message);
        await this.updateState(message);
    }
}
```

#### 3.2 Event Monitoring
```typescript
class EthereumMonitor {
    private provider: JsonRpcProvider;
    private contracts: Map<string, Contract>;
    private lastProcessedBlock: number;
    
    async start(): Promise<void> {
        this.startBlockListener();
        this.startEventListener();
    }
    
    private async processEscrowCreated(event: EventLog): Promise<void> {
        const message: EthToTonMessage = {
            messageType: 'ETH_ESCROW_CREATED',
            messageId: generateMessageId(),
            escrowId: event.args.escrowId,
            depositor: event.args.depositor,
            recipient: event.args.recipient,
            amount: event.args.amount.toString(),
            hashlock: event.args.hashlock,
            timelock: event.args.timelock,
            proof: await this.generateProof(event)
        };
        
        await this.messageQueue.publish(message);
    }
}

class TonMonitor {
    private tonClient: TonClient;
    private subscribedAddresses: Address[];
    private lastProcessedLt: string;
    
    async start(): Promise<void> {
        this.startTransactionListener();
        this.startAccountListener();
    }
    
    private async processEscrowFulfilled(tx: Transaction): Promise<void> {
        const message: TonToEthMessage = {
            messageType: 'TON_ESCROW_FULFILLED',
            messageId: generateMessageId(),
            escrowId: extractEscrowId(tx),
            secret: extractSecret(tx),
            fulfiller: tx.inMessage?.info.src?.toString(),
            tonTxHash: tx.hash().toString('hex'),
            proof: await this.generateTonProof(tx)
        };
        
        await this.messageQueue.publish(message);
    }
}
```

### 4. Data Flow Architecture

#### 4.1 Ethereum → TON Swap Flow
```
1. User submits 1inch Fusion+ order with TON destination
   ├─ Order validation
   ├─ Price calculation  
   └─ Meta-order creation

2. Resolver contract processes order
   ├─ Order storage
   ├─ Event emission
   └─ Escrow creation trigger

3. EthEscrow contract locks funds
   ├─ Token transfer
   ├─ Hashlock/timelock setup
   └─ EscrowCreated event

4. Relayer detects Ethereum event
   ├─ Event validation
   ├─ Proof generation
   └─ Message construction

5. Relayer submits message to TON
   ├─ Message validation
   ├─ TonBridge verification
   └─ TonEscrow creation

6. User reveals secret on TON
   ├─ Secret validation
   ├─ Fund transfer
   ├─ Secret reveal
   └─ Event emission

7. Relayer detects TON fulfillment
   ├─ Secret extraction
   ├─ Proof generation
   └─ Ethereum settlement

8. EthEscrow releases funds
   ├─ Secret verification
   ├─ Fund transfer
   └─ Swap completion
```

#### 4.2 TON → Ethereum Swap Flow
```
1. User initiates TON-side escrow
   ├─ TON/Jetton lock
   ├─ Hashlock/timelock setup
   └─ Event emission

2. Relayer detects TON event
   ├─ Transaction validation
   ├─ Proof generation
   └─ Message construction

3. Relayer creates Ethereum escrow
   ├─ EthEscrow deployment
   ├─ Fund locking
   └─ Event emission

4. User reveals secret on Ethereum
   ├─ Secret validation
   ├─ Fund release
   └─ Event emission

5. Relayer submits secret to TON
   ├─ Secret relay
   ├─ TonEscrow fulfillment
   └─ Swap completion
```

### 5. Security Architecture

#### 5.1 Security Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION SECURITY                     │
├─────────────────────────────────────────────────────────────┤
│  - Input validation        │  - Rate limiting               │
│  - Message authentication  │  - Circuit breakers           │
│  - Replay protection      │  - Error handling              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROTOCOL SECURITY                        │
├─────────────────────────────────────────────────────────────┤
│  - Hashlock/timelock      │  - Multi-signature             │
│  - Cryptographic proofs   │  - Access controls             │
│  - State validation       │  - Emergency mechanisms        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE SECURITY                   │
├─────────────────────────────────────────────────────────────┤
│  - Network security       │  - Key management              │
│  - Database encryption    │  - Audit logging               │
│  - Container security     │  - Monitoring/alerting         │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2 Threat Model & Mitigations
```typescript
interface ThreatMitigation {
  // Network-level threats
  networkThreats: {
    ddosAttacks: 'Rate limiting + CDN protection';
    manInTheMiddle: 'TLS encryption + certificate pinning';
    networkPartition: 'Multi-provider redundancy';
  };
  
  // Protocol-level threats
  protocolThreats: {
    replayAttacks: 'Nonce-based message ordering';
    frontRunning: 'Commit-reveal schemes';
    oracleManipulation: 'Multiple price sources';
    timingAttacks: 'Randomized delays';
  };
  
  // Smart contract threats
  contractThreats: {
    reentrancy: 'Checks-effects-interactions pattern';
    integerOverflow: 'SafeMath library usage';
    accessControl: 'Role-based permissions';
    upgradeability: 'Transparent proxy pattern';
  };
}
```

### 6. Performance Architecture

#### 6.1 Scalability Design
```
┌─────────────────────────────────────────────────────────────┐
│                      HORIZONTAL SCALING                     │
├─────────────────────────────────────────────────────────────┤
│  Load Balancer                                              │
│  ├─ Relayer Instance 1  ┌─ Event Monitor                   │
│  ├─ Relayer Instance 2  ├─ Message Processor               │
│  ├─ Relayer Instance 3  ├─ State Manager                   │
│  └─ Relayer Instance N  └─ Health Monitor                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      MESSAGE QUEUE                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─ High Priority    ┌─ Normal Priority    ┌─ Low Priority  │
│  │  - Settlements   │  - New Orders       │  - Analytics   │
│  │  - Refunds       │  - Updates          │  - Cleanup     │
│  │  - Emergencies   │  - Monitoring       │  - Archival    │
│  └─────────────────  └──────────────────   └───────────────  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA PERSISTENCE                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─ PostgreSQL     ┌─ Redis Cache       ┌─ Object Storage  │
│  │  - Orders       │  - Active swaps    │  - Proofs        │
│  │  - Transactions │  - User sessions   │  - Logs          │
│  │  - History      │  - Rate limits     │  - Backups       │
│  └───────────────  └─────────────────   └─────────────────  │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2 Performance Metrics
```typescript
interface PerformanceTargets {
  latency: {
    orderSubmission: '< 2 seconds';
    eventDetection: '< 30 seconds';
    crossChainRelay: '< 5 minutes';
    swapCompletion: '< 10 minutes';
  };
  
  throughput: {
    ordersPerSecond: 100;
    messagesPerSecond: 1000;
    concurrentSwaps: 10000;
  };
  
  availability: {
    systemUptime: '99.9%';
    relayerUptime: '99.95%';
    dataConsistency: '100%';
  };
  
  scalability: {
    horizontalScaling: 'Auto-scaling based on load';
    databaseSharding: 'By user/order hash';
    cacheDistribution: 'Redis cluster';
  };
}
```

### 7. Deployment Architecture

#### 7.1 Environment Structure
```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Kubernetes Cluster                                      │
│  │  ├─ Relayer Pods (3+ replicas)                          │
│  │  ├─ Database StatefulSet                                │
│  │  ├─ Redis Cluster                                       │
│  │  └─ Monitoring Stack                                    │
│  └─ Load Balancers & Ingress                               │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                        STAGING                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Mirror of production (scaled down)                      │
│  │  ├─ Testnet contracts                                   │
│  │  ├─ Integration testing                                 │
│  │  └─ Performance testing                                 │
│  └─ CI/CD Pipeline validation                              │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Local Development                                       │
│  │  ├─ Docker Compose                                      │
│  │  ├─ Local blockchain nodes                              │
│  │  └─ Mock services                                       │
│  └─ Feature branch testing                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 7.2 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Cross-Chain Resolver

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
      - name: Setup Node.js
      - name: Install dependencies
      - name: Run unit tests
      - name: Run integration tests
      - name: Security scanning
      - name: Performance testing

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
      - name: Push to registry
      - name: Sign images
      - name: Generate SBOM

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
      - name: Run smoke tests
      - name: Generate deployment report

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
      - name: Health checks
      - name: Rollback on failure
```

### 8. Monitoring & Observability

#### 8.1 Monitoring Stack
```
┌─────────────────────────────────────────────────────────────┐
│                      METRICS COLLECTION                     │
├─────────────────────────────────────────────────────────────┤
│  Prometheus + Grafana                                       │
│  ├─ System metrics (CPU, memory, network)                  │
│  ├─ Application metrics (latency, throughput, errors)      │
│  ├─ Business metrics (swaps, volume, fees)                 │
│  └─ Blockchain metrics (gas, confirmations, reorgs)        │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                        LOGGING                              │
├─────────────────────────────────────────────────────────────┤
│  ELK Stack (Elasticsearch + Logstash + Kibana)             │
│  ├─ Structured JSON logs                                   │
│  ├─ Log aggregation & search                               │
│  ├─ Error tracking & analysis                              │
│  └─ Audit trail & compliance                               │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      ALERTING                               │
├─────────────────────────────────────────────────────────────┤
│  AlertManager + PagerDuty                                   │
│  ├─ SLA violation alerts                                   │
│  ├─ System failure alerts                                  │
│  ├─ Security incident alerts                               │
│  └─ Business metric alerts                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 8.2 Health Checks & SLI/SLO
```typescript
interface ServiceLevelIndicators {
  availability: {
    measurement: 'Uptime percentage';
    target: '99.9%';
    alertThreshold: '< 99.5%';
  };
  
  latency: {
    measurement: '95th percentile response time';
    target: '< 2 seconds';
    alertThreshold: '> 5 seconds';
  };
  
  accuracy: {
    measurement: 'Successful swap completion rate';
    target: '99.5%';
    alertThreshold: '< 98%';
  };
  
  consistency: {
    measurement: 'Cross-chain state synchronization';
    target: '100%';
    alertThreshold: '< 100%';
  };
}
```

## Implementation Readiness Checklist

### Phase 1 Completion ✅
- [x] TON codebase cleanup and migration preparation
- [x] Comprehensive TON blockchain research and understanding  
- [x] Detailed protocol design with security mechanisms
- [x] Complete system architecture documentation
- [x] Performance and scalability planning
- [x] Security architecture and threat modeling
- [x] Deployment and monitoring strategy
- [x] Testing framework and verification

**Phase 1.1: TON Codebase Cleanup** ✅ COMPLETE
**Phase 1.2: TON Blockchain Study** ✅ COMPLETE  
**Phase 1.3: Protocol Design** ✅ COMPLETE
**Phase 1.4: Architecture Documentation** ✅ COMPLETE

### Ready for Phase 2: TON Side Implementation
The architecture documentation provides a solid foundation for implementing:
1. TON smart contracts using Tact language
2. Cross-chain message protocols
3. Security mechanisms and validation
4. Performance optimization strategies
5. Monitoring and operational procedures

---

*This architecture documentation completes Phase 1 and provides the blueprint for the entire cross-chain resolver implementation.* 