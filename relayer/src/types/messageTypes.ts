// Cross-Chain Message Types for Ethereum ↔ TON Communication
// Based on docs/message-formats.md specification

// Base message interfaces
export interface BaseMessage {
  type: string;
  version: string;
  messageId: string;
  timestamp: number;
  relayerSignature: string;
  nonce: number;
}

// Ethereum → TON Messages
export interface EthereumToTonMessage extends BaseMessage {
  type: 'ETH_TO_TON_ESCROW';
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
}

export interface EthereumFulfillmentMessage extends BaseMessage {
  type: 'ETH_FULFILLMENT_REQUEST';
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
}

// TON → Ethereum Messages
export interface TonToEthereumMessage extends BaseMessage {
  type: 'TON_TO_ETH_ESCROW';
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
}

export interface TonFulfillmentMessage extends BaseMessage {
  type: 'TON_FULFILLMENT';
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
}

// Bridge Control Messages
export interface RelayerAuthMessage extends BaseMessage {
  type: 'RELAYER_AUTH';
  action: 'ADD' | 'REMOVE';
  relayerAddress: string;     // Relayer's address
  permissions: string[];      // Array of permission strings
  adminSignature: string;
}

export interface BridgeConfigMessage extends BaseMessage {
  type: 'BRIDGE_CONFIG_UPDATE';
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
}

// Error Messages
export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  originalMessageId?: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Token Mapping
export interface TokenMapping {
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

// Address Types
export type EthereumAddress = string; // 0x followed by 40 hex characters
export type TonAddress = string;      // Base64 encoded, typically 48 characters

// Union type for all message types
export type CrossChainMessage = 
  | EthereumToTonMessage 
  | EthereumFulfillmentMessage 
  | TonToEthereumMessage 
  | TonFulfillmentMessage 
  | RelayerAuthMessage 
  | BridgeConfigMessage 
  | ErrorMessage;

// Message validation interfaces
export interface MessageSignature {
  relayerAddress: string;
  signature: string;         // ECDSA signature (hex)
  messageHash: string;       // Keccak256 hash of message content
  timestamp: number;
}

// Proof interfaces
export interface EthereumProof {
  blockHash: string;
  blockNumber: number;
  txHash: string;
  txIndex: number;
  logIndex: number;
  merkleProof: string[];
  rlpEncodedTx: string;
  rlpEncodedReceipt: string;
}

export interface TonProof {
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

// Error codes
export enum MessageErrorCode {
  INVALID_PROOF = 'INVALID_PROOF',
  EXPIRED_TIMELOCK = 'EXPIRED_TIMELOCK',
  INSUFFICIENT_CONFIRMATIONS = 'INSUFFICIENT_CONFIRMATIONS',
  INVALID_SECRET = 'INVALID_SECRET',
  DUPLICATE_MESSAGE = 'DUPLICATE_MESSAGE',
  UNAUTHORIZED_RELAYER = 'UNAUTHORIZED_RELAYER',
  INVALID_FORMAT = 'INVALID_FORMAT',
  BRIDGE_PAUSED = 'BRIDGE_PAUSED'
} 