// 1inch Fusion+ Order Types Extended for TON Cross-Chain Support
// Based on 1inch Fusion+ specification with TON-specific extensions

import { BigNumberish } from 'ethers';

// Base order types from 1inch Fusion+
export interface FusionOrderData {
  // Core order data
  maker: string;                    // Order creator address (Ethereum)
  receiver: string;                 // Token receiver address (can be cross-chain)
  makerAsset: string;              // Asset being sold (Ethereum token address)
  takerAsset: string;              // Asset being bought (can be TON token)
  makerAmount: BigNumberish;       // Amount of maker asset
  takerAmount: BigNumberish;       // Amount of taker asset
  
  // Timing parameters
  salt: BigNumberish;              // Unique order identifier
  deadline: number;                // Order expiration timestamp
  
  // Fusion+ specific
  extension: string;               // Extension data (packed)
  interactions: string;            // Pre/post interaction calls
  
  // TON Cross-chain extensions
  tonDestination?: TONDestination; // TON-specific destination data
  crossChainType?: 'ethereum_only' | 'ton_only' | 'eth_to_ton' | 'ton_to_eth';
}

// TON-specific destination information
export interface TONDestination {
  tonRecipient: string;            // TON wallet address (base64)
  jettonMaster?: string;           // TON token contract (if not native TON)
  tonChainId: number;              // TON chain identifier (-1 for mainnet, -3 for testnet)
  
  // Cross-chain swap parameters
  hashlock?: string;               // Secret hash for atomic swap
  timelock?: number;               // Timelock for refund (seconds)
  relayerFee?: BigNumberish;       // Fee for cross-chain relay
}

// Complete Fusion+ order with signature
export interface SignedFusionOrder {
  order: FusionOrderData;
  signature: string;               // EIP-712 signature
  orderHash: string;               // Computed order hash
  
  // Cross-chain tracking
  crossChainId?: string;           // Cross-chain order identifier
  relayerAddress?: string;         // Assigned relayer
}

// Order status tracking
export enum OrderStatus {
  CREATED = 'created',
  SIGNED = 'signed',
  SUBMITTED = 'submitted',
  MATCHED = 'matched',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// Order lifecycle events
export interface OrderEvent {
  orderId: string;
  timestamp: number;
  status: OrderStatus;
  txHash?: string;
  errorMessage?: string;
  crossChainTxHash?: string;       // TON transaction hash for cross-chain orders
}

// Order matching parameters
export interface OrderMatching {
  orderId: string;
  matchedAmount: BigNumberish;
  matchedPrice: BigNumberish;
  matcherAddress: string;
  matchingTxHash: string;
  timestamp: number;
}

// Cross-chain execution parameters
export interface CrossChainExecution {
  orderId: string;
  sourceChain: 'ethereum' | 'ton';
  targetChain: 'ethereum' | 'ton';
  
  // Atomic swap parameters
  secret?: string;                 // Secret for hashlock
  secretHash: string;              // Hash of the secret
  timelock: number;                // Timelock timestamp
  
  // Transaction tracking
  sourceTxHash: string;            // Source chain transaction
  targetTxHash?: string;           // Target chain transaction (after relay)
  
  // Status tracking
  status: 'pending' | 'relaying' | 'completed' | 'refunded' | 'failed';
  retryCount: number;
  lastError?: string;
}

// Order validation parameters
export interface OrderValidation {
  isValidSignature: boolean;
  isValidDeadline: boolean;
  isValidAmounts: boolean;
  isValidAddresses: boolean;
  hasValidTONDestination: boolean;
  errors: string[];
}

// Fee structure for cross-chain orders
export interface CrossChainFees {
  relayerFee: BigNumberish;        // Fee for message relay
  gasFeeEstimate: BigNumberish;    // Estimated gas costs
  protocolFee: BigNumberish;       // Protocol fee
  totalFee: BigNumberish;          // Total fees
}

// Order book entry
export interface OrderBookEntry {
  order: SignedFusionOrder;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  
  // Trading information
  filledAmount: BigNumberish;      // Amount already filled
  remainingAmount: BigNumberish;   // Amount still available
  
  // Cross-chain specific
  crossChainExecution?: CrossChainExecution;
  estimatedExecutionTime?: number; // Estimated completion time for cross-chain
}

// Order construction parameters
export interface OrderConstructionParams {
  // Basic order data
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: BigNumberish;
  takerAmount: BigNumberish;
  deadline: number;
  
  // TON destination (if cross-chain)
  tonDestination?: Omit<TONDestination, 'hashlock' | 'timelock'>;
  
  // Additional parameters
  salt?: BigNumberish;
  interactions?: string;
  extension?: string;
}

// EIP-712 domain for order signing
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// EIP-712 types for Fusion+ orders with TON extensions
export const FUSION_ORDER_TYPES = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'makerAsset', type: 'address' },
    { name: 'takerAsset', type: 'address' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'salt', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'extension', type: 'bytes' },
    { name: 'interactions', type: 'bytes' },
    { name: 'tonDestination', type: 'TONDestination' }
  ],
  TONDestination: [
    { name: 'tonRecipient', type: 'string' },
    { name: 'jettonMaster', type: 'string' },
    { name: 'tonChainId', type: 'int256' },
    { name: 'hashlock', type: 'bytes32' },
    { name: 'timelock', type: 'uint256' },
    { name: 'relayerFee', type: 'uint256' }
  ]
};

// Error codes for order processing
export enum OrderErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED_ORDER = 'EXPIRED_ORDER',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_TON_ADDRESS = 'INVALID_TON_ADDRESS',
  UNSUPPORTED_TOKEN = 'UNSUPPORTED_TOKEN',
  CROSS_CHAIN_TIMEOUT = 'CROSS_CHAIN_TIMEOUT',
  RELAY_FAILED = 'RELAY_FAILED',
  INVALID_AMOUNTS = 'INVALID_AMOUNTS',
  ORDER_ALREADY_FILLED = 'ORDER_ALREADY_FILLED',
  UNAUTHORIZED_CANCELLATION = 'UNAUTHORIZED_CANCELLATION'
}

// Order processing error
export class OrderError extends Error {
  constructor(
    public code: OrderErrorCode,
    message: string,
    public orderId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OrderError';
  }
} 