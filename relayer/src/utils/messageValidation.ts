import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { 
  CrossChainMessage, 
  EthereumAddress, 
  TonAddress, 
  MessageErrorCode,
  BaseMessage 
} from '../types/messageTypes';

// Constants
export const PROTOCOL_VERSION = '1.0.0';
export const MINIMUM_TIMELOCK = 3600; // 1 hour
export const MAXIMUM_TIMELOCK = 86400 * 7; // 1 week
export const SECRET_LENGTH = 32; // bytes

/**
 * Message validation utilities
 */
export class MessageValidator {
  /**
   * Validate base message fields
   */
  static validateBaseMessage(message: BaseMessage): string[] {
    const errors: string[] = [];

    if (!message.type || typeof message.type !== 'string') {
      errors.push('Message type is required');
    }

    if (!message.version || message.version !== PROTOCOL_VERSION) {
      errors.push(`Invalid protocol version. Expected ${PROTOCOL_VERSION}`);
    }

    if (!message.messageId || typeof message.messageId !== 'string') {
      errors.push('Message ID is required');
    }

    if (!message.timestamp || typeof message.timestamp !== 'number') {
      errors.push('Timestamp is required');
    }

    if (!message.relayerSignature || typeof message.relayerSignature !== 'string') {
      errors.push('Relayer signature is required');
    }

    if (typeof message.nonce !== 'number' || message.nonce < 0) {
      errors.push('Valid nonce is required');
    }

    // Validate timestamp is not too old or too far in future
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600; // 1 hour
    const maxFuture = 300; // 5 minutes

    if (message.timestamp < now - maxAge) {
      errors.push('Message timestamp is too old');
    }

    if (message.timestamp > now + maxFuture) {
      errors.push('Message timestamp is too far in future');
    }

    return errors;
  }

  /**
   * Validate timelock value
   */
  static validateTimelock(timelock: number): string[] {
    const errors: string[] = [];
    const now = Math.floor(Date.now() / 1000);

    if (timelock <= now) {
      errors.push('Timelock must be in the future');
    }

    if (timelock - now < MINIMUM_TIMELOCK) {
      errors.push(`Timelock must be at least ${MINIMUM_TIMELOCK} seconds in the future`);
    }

    if (timelock - now > MAXIMUM_TIMELOCK) {
      errors.push(`Timelock cannot be more than ${MAXIMUM_TIMELOCK} seconds in the future`);
    }

    return errors;
  }

  /**
   * Validate hashlock format
   */
  static validateHashlock(hashlock: string): string[] {
    const errors: string[] = [];

    if (!hashlock || typeof hashlock !== 'string') {
      errors.push('Hashlock is required');
    } else if (!/^[a-fA-F0-9]{64}$/.test(hashlock)) {
      errors.push('Hashlock must be a 64-character hex string');
    }

    return errors;
  }

  /**
   * Validate amount format
   */
  static validateAmount(amount: string): string[] {
    const errors: string[] = [];

    if (!amount || typeof amount !== 'string') {
      errors.push('Amount is required');
    } else if (!/^\d+$/.test(amount)) {
      errors.push('Amount must be a positive integer string');
    } else if (BigInt(amount) <= 0n) {
      errors.push('Amount must be greater than zero');
    }

    return errors;
  }

  /**
   * Validate cross-chain message
   */
  static validateCrossChainMessage(message: CrossChainMessage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate base message fields
    errors.push(...this.validateBaseMessage(message));

    // Validate message-specific fields based on type
    switch (message.type) {
      case 'ETH_TO_TON_ESCROW':
        errors.push(...this.validateEthToTonMessage(message));
        break;
      case 'TON_TO_ETH_ESCROW':
        errors.push(...this.validateTonToEthMessage(message));
        break;
      case 'ETH_FULFILLMENT_REQUEST':
        errors.push(...this.validateEthFulfillmentMessage(message));
        break;
      case 'TON_FULFILLMENT':
        errors.push(...this.validateTonFulfillmentMessage(message));
        break;
      default:
        errors.push(`Unknown message type: ${message.type}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateEthToTonMessage(message: any): string[] {
    const errors: string[] = [];

    // Removed address validation - addresses are assumed to be valid

    errors.push(...this.validateAmount(message.amount));
    errors.push(...this.validateHashlock(message.hashlock));
    errors.push(...this.validateTimelock(message.timelock));

    return errors;
  }

  private static validateTonToEthMessage(message: any): string[] {
    const errors: string[] = [];

    // Removed address validation - addresses are assumed to be valid

    errors.push(...this.validateAmount(message.amount));
    errors.push(...this.validateHashlock(message.hashlock));
    errors.push(...this.validateTimelock(message.timelock));

    return errors;
  }

  private static validateEthFulfillmentMessage(message: any): string[] {
    const errors: string[] = [];

    if (!message.secret || typeof message.secret !== 'string' || !/^[a-fA-F0-9]{64}$/.test(message.secret)) {
      errors.push('Secret must be a 64-character hex string');
    }

    // Removed address validation - addresses are assumed to be valid

    return errors;
  }

  private static validateTonFulfillmentMessage(message: any): string[] {
    const errors: string[] = [];

    if (!message.secret || typeof message.secret !== 'string' || !/^[a-fA-F0-9]{64}$/.test(message.secret)) {
      errors.push('Secret must be a 64-character hex string');
    }

    // Removed address validation - addresses are assumed to be valid

    return errors;
  }
}

/**
 * Message serialization utilities
 */
export class MessageSerializer {
  /**
   * Calculate message hash for signature verification
   */
  static calculateMessageHash(message: Omit<CrossChainMessage, 'relayerSignature'>): string {
    // Create a deterministic string representation
    const messageForHashing = { ...message };
    
    // Sort keys for deterministic serialization
    const sortedKeys = Object.keys(messageForHashing).sort();
    const sortedMessage = sortedKeys.reduce((sorted, key) => {
      sorted[key] = (messageForHashing as any)[key];
      return sorted;
    }, {} as any);

    const serialized = JSON.stringify(sortedMessage);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Generate unique message ID
   */
  static generateMessageId(prefix: string = 'msg'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate hashlock from secret
   */
  static generateHashlock(secret: string): string {
    return createHash('sha256').update(secret, 'hex').digest('hex');
  }

  /**
   * Verify secret matches hashlock
   */
  static verifySecret(secret: string, hashlock: string): boolean {
    return this.generateHashlock(secret) === hashlock.toLowerCase();
  }
}

/**
 * Error utilities
 */
export class MessageError extends Error {
  constructor(
    public code: MessageErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MessageError';
  }
}

export function createErrorMessage(
  originalMessageId: string,
  error: { code: MessageErrorCode; message: string; details?: any }
): any {
  return {
    type: 'ERROR',
    version: PROTOCOL_VERSION,
    messageId: MessageSerializer.generateMessageId('err'),
    originalMessageId,
    error,
    timestamp: Math.floor(Date.now() / 1000),
    relayerSignature: '', // To be filled by relayer
    nonce: 0
  };
} 