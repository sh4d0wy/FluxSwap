# Cross-Chain Message Formats: Ethereum ↔ TON

This document defines the message formats used for cross-chain communication between Ethereum and TON Protocol in the atomic swap system.

## Overview

The message passing system enables atomic swaps between Ethereum and TON using hashlock/timelock mechanisms. Messages are relayed by authorized relayers and verified through cryptographic proofs.

## Message Categories

### 1. Escrow Creation Messages
### 2. Fulfillment Messages  
### 3. Refund Messages
### 4. Bridge Control Messages

## Ethereum → TON Messages

### 1. Ethereum to TON Escrow Creation

```typescript
interface EthereumToTonMessage {
  type: 'ETH_TO_TON_ESCROW';
  version: string;
  messageId: string;
  orderId: string;
  ethereumTxHash: string;
  ethereumBlockNumber: number;
  ethereumLogIndex: number;
  
  // Escrow details
  sender: string;              // Ethereum address (0x...)
  tonRecipient: string;        // TON address (base64 format)
  amount: string;              // Amount in wei/nanotons
  tokenAddress?: string;       // ERC20 token address (optional, null for ETH)
  jettonMaster?: string;       // Corresponding TON Jetton master address
  
  // Atomic swap parameters
  hashlock: string;            // SHA256 hash of secret (hex)
  timelock: number;            // Unix timestamp
  
  // Verification
  proof: {
    merkleProof: string[];     // Merkle proof for transaction inclusion
    blockHeader: string;       // Ethereum block header (RLP encoded)
    txProof: string;          // Transaction proof
    receiptProof: string;     // Receipt proof
  };
  
  // Metadata
  timestamp: number;
  relayerSignature: string;
  nonce: number;
}
```

### 2. Ethereum Escrow Fulfillment Request

```typescript
interface EthereumFulfillmentMessage {
  type: 'ETH_FULFILLMENT_REQUEST';
  version: string;
  messageId: string;
  orderId: string;
  
  // Fulfillment data
  secret: string;              // Preimage of hashlock (hex)
  tonTxHash: string;          // TON transaction hash proving fulfillment
  tonRecipient: string;       // TON address that received funds
  
  // Verification
  tonProof: {
    transactionProof: string;  // TON transaction inclusion proof
    blockProof: string;       // TON block proof
    stateProof: string;       // State proof for balance change
  };
  
  timestamp: number;
  relayerSignature: string;
}
```

## TON → Ethereum Messages

### 1. TON to Ethereum Escrow Creation

```typescript
interface TonToEthereumMessage {
  type: 'TON_TO_ETH_ESCROW';
  version: string;
  messageId: string;
  orderId: string;
  tonTxHash: string;
  tonLt: string;              // Logical time in TON
  tonBlockSeqno: number;      // TON block sequence number
  
  // Escrow details
  sender: string;             // TON address (base64)
  ethereumRecipient: string;  // Ethereum address (0x...)
  amount: string;             // Amount in nanotons/wei
  jettonMaster?: string;      // TON Jetton master address (optional)
  tokenAddress?: string;      // Corresponding Ethereum ERC20 address
  
  // Atomic swap parameters
  hashlock: string;           // SHA256 hash of secret (hex)
  timelock: number;           // Unix timestamp
  
  // Verification
  proof: {
    merkleProof: string;      // TON Merkle proof
    blockHeader: string;      // TON block header
    transactionProof: string; // Transaction inclusion proof
    messageProof: string;     // Message proof within transaction
  };
  
  // Metadata
  timestamp: number;
  relayerSignature: string;
  nonce: number;
}
```

### 2. TON Escrow Fulfillment

```typescript
interface TonFulfillmentMessage {
  type: 'TON_FULFILLMENT';
  version: string;
  messageId: string;
  orderId: string;
  
  // Fulfillment data
  secret: string;             // Preimage of hashlock (hex)
  ethereumTxHash: string;     // Ethereum transaction hash proving fulfillment
  ethereumRecipient: string;  // Ethereum address that received funds
  
  // Verification
  ethereumProof: {
    merkleProof: string[];    // Ethereum Merkle proof
    blockHeader: string;      // Ethereum block header
    receiptProof: string;     // Receipt proof for transfer
  };
  
  timestamp: number;
  relayerSignature: string;
}
```

## Bridge Control Messages

### 1. Relayer Authorization

```typescript
interface RelayerAuthMessage {
  type: 'RELAYER_AUTH';
  version: string;
  messageId: string;
  
  action: 'ADD' | 'REMOVE';
  relayerAddress: string;     // Relayer's address
  permissions: string[];      // Array of permission strings
  
  // Admin signature
  adminSignature: string;
  timestamp: number;
  nonce: number;
}
```

### 2. Bridge Configuration Update

```typescript
interface BridgeConfigMessage {
  type: 'BRIDGE_CONFIG_UPDATE';
  version: string;
  messageId: string;
  
  updates: {
    minConfirmations?: number;
    maxTimelock?: number;
    minTimelock?: number;
    supportedTokens?: {
      ethereum: string;       // ERC20 address
      ton: string;           // Jetton master address
    }[];
  };
  
  adminSignature: string;
  timestamp: number;
}
```

## Common Data Structures

### Token Mapping

```typescript
interface TokenMapping {
  ethereum: {
    address: string;          // ERC20 contract address
    symbol: string;
    decimals: number;
    name: string;
  };
  ton: {
    jettonMaster: string;     // Jetton master contract address
    symbol: string;
    decimals: number;
    name: string;
  };
  exchangeRate?: {
    rate: string;             // Current exchange rate
    lastUpdated: number;
  };
}
```

### Address Formats

```typescript
// Ethereum addresses
type EthereumAddress = string; // 0x followed by 40 hex characters

// TON addresses  
type TonAddress = string;      // Base64 encoded, typically 48 characters

// Address validation
function isValidEthereumAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidTonAddress(addr: string): boolean {
  // Simplified validation - in production use proper TON address validation
  return /^[A-Za-z0-9+/]{47}=$/.test(addr);
}
```

## Message Validation

### Signature Verification

```typescript
interface MessageSignature {
  relayerAddress: string;
  signature: string;         // ECDSA signature (hex)
  messageHash: string;       // Keccak256 hash of message content
  timestamp: number;
}

// Message hash calculation (pseudo-code)
function calculateMessageHash(message: any): string {
  const serialized = JSON.stringify(message, Object.keys(message).sort());
  return keccak256(serialized);
}
```

### Proof Verification

#### Ethereum Proofs
```typescript
interface EthereumProof {
  blockHash: string;
  blockNumber: number;
  txHash: string;
  txIndex: number;
  logIndex: number;
  merkleProof: string[];
  rlpEncodedTx: string;
  rlpEncodedReceipt: string;
}
```

#### TON Proofs
```typescript
interface TonProof {
  blockId: {
    workchain: number;
    shard: string;
    seqno: number;
    rootHash: string;
    fileHash: string;
  };
  transactionId: {
    lt: string;
    hash: string;
  };
  merkleProof: string;
  blockHeader: string;
}
```

## Error Handling

### Error Message Format

```typescript
interface ErrorMessage {
  type: 'ERROR';
  version: string;
  messageId: string;
  originalMessageId?: string;
  
  error: {
    code: string;
    message: string;
    details?: any;
  };
  
  timestamp: number;
  relayerSignature: string;
}
```

### Common Error Codes

- `INVALID_PROOF`: Cryptographic proof verification failed
- `EXPIRED_TIMELOCK`: Message timelock has expired
- `INSUFFICIENT_CONFIRMATIONS`: Not enough relayer confirmations
- `INVALID_SECRET`: Provided secret doesn't match hashlock
- `DUPLICATE_MESSAGE`: Message already processed
- `UNAUTHORIZED_RELAYER`: Relayer not authorized
- `INVALID_FORMAT`: Message format validation failed
- `BRIDGE_PAUSED`: Bridge operations temporarily paused

## Message Flow Examples

### Example 1: ETH → TON Atomic Swap

1. **User initiates swap on Ethereum**
   ```typescript
   // Ethereum transaction creates escrow
   const escrowTx = await ethereumBridge.createTonEscrow(
     orderId,
     tonRecipient,
     hashlock,
     timelock,
     tokenAddress
   );
   ```

2. **Relayer detects and relays to TON**
   ```typescript
   const message: EthereumToTonMessage = {
     type: 'ETH_TO_TON_ESCROW',
     // ... other fields
   };
   await tonBridge.relayMessage(message);
   ```

3. **TON side creates corresponding escrow**
   ```tact
   receive(msg: RelayMessage) {
     // Verify proof and create escrow
     self.createEscrowFromMessage(msg);
   }
   ```

4. **User fulfills on TON side**
   ```tact
   receive(msg: FulfillEscrow) {
     // Verify secret and release funds
     require(sha256(msg.secret) == self.hashlock);
     // Transfer funds and emit event
   }
   ```

5. **Relayer relays fulfillment back to Ethereum**
   ```typescript
   const fulfillment: TonFulfillmentMessage = {
     type: 'TON_FULFILLMENT',
     secret: revealedSecret,
     // ... proof data
   };
   await ethereumBridge.fulfillFromTon(orderId, secret);
   ```

## Security Considerations

1. **Message Replay Protection**: Each message includes a unique `messageId` and `nonce`
2. **Proof Verification**: All cross-chain messages must include cryptographic proofs
3. **Multi-Relayer Consensus**: Minimum number of relayer confirmations required
4. **Timelock Enforcement**: All escrows have expiration times for safety
5. **Signature Validation**: All messages must be signed by authorized relayers
6. **Rate Limiting**: Prevent spam through rate limiting and minimum amounts

## Implementation Notes

- All amounts are stored as strings to prevent precision loss
- Timestamps are Unix timestamps (seconds since epoch)
- All hashes are lowercase hex strings without '0x' prefix (except Ethereum addresses)
- Message ordering is enforced through nonces and timestamps
- Failed messages can be retried with exponential backoff

This message format specification ensures reliable, secure, and verifiable cross-chain communication between Ethereum and TON for atomic swaps.
