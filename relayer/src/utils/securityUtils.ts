import { createHash } from 'crypto';

/**
 * Security utilities for cross-chain atomic swaps
 */
export class SecurityUtils {
  // Security constants
  public static readonly MIN_TIMELOCK = 3600; // 1 hour in seconds
  public static readonly MAX_TIMELOCK = 604800; // 1 week in seconds
  public static readonly SECRET_LENGTH = 32; // bytes
  public static readonly MIN_CONFIRMATIONS = 2;

  // In-memory storage for message processing (in production, use persistent storage)
  private static processedMessages = new Set<string>();
  private static messageTimestamps = new Map<string, number>();
  private static relayerConfirmations = new Map<string, Set<string>>();
  private static messageConfirmations = new Map<string, number>();

  /**
   * Generate a hashlock from a secret
   * @param secret The secret to hash
   * @returns The generated hashlock
   */
  public static generateHashlock(secret: string): string {
    if (!secret || secret.length === 0) {
      throw new Error('Invalid secret');
    }
    
    const hash = createHash('sha256');
    hash.update(secret);
    return '0x' + hash.digest('hex');
  }

  /**
   * Verify a secret against a hashlock
   * @param secret The secret to verify
   * @param hashlock The expected hashlock
   * @returns Whether the secret matches the hashlock
   */
  public static verifySecret(secret: string, hashlock: string): boolean {
    if (!secret || secret.length === 0) {
      return false;
    }
    
    const computedHashlock = this.generateHashlock(secret);
    return computedHashlock === hashlock;
  }

  /**
   * Check if a timelock has expired
   * @param timelock The timelock timestamp
   * @returns Whether the timelock has expired
   */
  public static isTimelockExpired(timelock: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= timelock;
  }

  /**
   * Validate timelock parameters
   * @param timelock The timelock timestamp
   * @returns Whether the timelock is valid
   */
  public static validateTimelock(timelock: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return timelock >= currentTime + this.MIN_TIMELOCK && 
           timelock <= currentTime + this.MAX_TIMELOCK;
  }

  /**
   * Get remaining time until timelock expires
   * @param timelock The timelock timestamp
   * @returns The remaining time in seconds
   */
  public static getRemainingTime(timelock: number): number {
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= timelock) {
      return 0;
    }
    return timelock - currentTime;
  }

  /**
   * Protect against message replay attacks
   * @param messageHash The hash of the message to protect
   * @returns Whether the protection was successful
   */
  public static processMessage(messageHash: string): boolean {
    if (this.processedMessages.has(messageHash)) {
      return false; // Message already processed
    }
    
    this.processedMessages.add(messageHash);
    this.messageTimestamps.set(messageHash, Math.floor(Date.now() / 1000));
    return true;
  }

  /**
   * Check if a message has been processed
   * @param messageHash The hash of the message
   * @returns Whether the message has been processed
   */
  public static isMessageProcessed(messageHash: string): boolean {
    return this.processedMessages.has(messageHash);
  }

  /**
   * Add relayer confirmation for a message
   * @param messageHash The hash of the message
   * @param relayer The relayer address
   * @returns The total number of confirmations
   */
  public static addRelayerConfirmation(messageHash: string, relayer: string): number {
    if (!this.relayerConfirmations.has(messageHash)) {
      this.relayerConfirmations.set(messageHash, new Set());
    }
    
    const confirmations = this.relayerConfirmations.get(messageHash)!;
    if (confirmations.has(relayer)) {
      return this.messageConfirmations.get(messageHash) || 0; // Already confirmed by this relayer
    }
    
    confirmations.add(relayer);
    const totalConfirmations = confirmations.size;
    this.messageConfirmations.set(messageHash, totalConfirmations);
    
    return totalConfirmations;
  }

  /**
   * Check if a message has sufficient confirmations
   * @param messageHash The hash of the message
   * @returns Whether there are enough confirmations
   */
  public static hasSufficientConfirmations(messageHash: string): boolean {
    const confirmations = this.messageConfirmations.get(messageHash) || 0;
    return confirmations >= this.MIN_CONFIRMATIONS;
  }

  /**
   * Generate a cryptographically secure secret
   * @returns A secure random secret
   */
  public static generateSecureSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(this.SECRET_LENGTH).toString('hex');
  }

  /**
   * Create security parameters for an atomic swap
   * @param secret The secret for the swap
   * @param timelockDuration The timelock duration in seconds
   * @returns The security parameters
   */
  public static createSecurityParams(secret: string, timelockDuration: number): {
    hashlock: string;
    timelock: number;
    createdAt: number;
    isValid: boolean;
  } {
    if (!secret || secret.length === 0) {
      throw new Error('Invalid secret');
    }
    
    if (timelockDuration < this.MIN_TIMELOCK || timelockDuration > this.MAX_TIMELOCK) {
      throw new Error('Invalid timelock duration');
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timelock = currentTime + timelockDuration;
    
    return {
      hashlock: this.generateHashlock(secret),
      timelock,
      createdAt: currentTime,
      isValid: true
    };
  }

  /**
   * Retry an operation with exponential backoff
   * @param operation The operation to retry
   * @param maxRetries Maximum number of retries
   * @returns The result of the operation
   */
  public static async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff: wait 2^attempt * 1000ms
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Clear all in-memory data (for testing purposes)
   */
  public static clearData(): void {
    this.processedMessages.clear();
    this.messageTimestamps.clear();
    this.relayerConfirmations.clear();
    this.messageConfirmations.clear();
  }

  /**
   * Get message security information
   * @param messageHash The hash of the message
   * @returns The security information
   */
  public static getMessageSecurity(messageHash: string): {
    messageHash: string;
    timestamp: number;
    confirmations: number;
    processed: boolean;
  } {
    return {
      messageHash,
      timestamp: this.messageTimestamps.get(messageHash) || 0,
      confirmations: this.messageConfirmations.get(messageHash) || 0,
      processed: this.processedMessages.has(messageHash)
    };
  }
} 