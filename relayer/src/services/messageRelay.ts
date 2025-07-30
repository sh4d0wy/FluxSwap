import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { sleep } from '../utils/common';
import { TonRelayer } from '../relay/tonRelayer';
import { EthereumRelayer } from '../relay/ethereum';
import { 
  CrossChainMessage, 
  EthereumToTonMessage, 
  TonToEthereumMessage,
  MessageErrorCode 
} from '../types/messageTypes';
import { 
  MessageValidator, 
  MessageSerializer, 
  createErrorMessage 
} from '../utils/messageValidation';

/**
 * Message delivery status
 */
export enum MessageStatus {
  PENDING = 'pending',
  RELAYING = 'relaying',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRY = 'retry'
}

/**
 * Queued message with metadata
 */
export interface QueuedMessage {
  id: string;
  message: CrossChainMessage;
  status: MessageStatus;
  targetChain: 'ethereum' | 'ton';
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

/**
 * Relay statistics
 */
export interface RelayStats {
  totalMessages: number;
  pendingMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  retryMessages: number;
  averageDeliveryTime: number;
}

/**
 * Message relay service coordinates cross-chain communication
 */
export class MessageRelay extends EventEmitter {
  private ethereumRelayer: EthereumRelayer;
  private tonRelayer: TonRelayer;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private isRunning = false;
  private processingTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly processingInterval: number;
  
  // Statistics
  private stats: RelayStats = {
    totalMessages: 0,
    pendingMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    retryMessages: 0,
    averageDeliveryTime: 0
  };

  constructor(config: {
    ethereumRelayer: EthereumRelayer;
    tonRelayer: TonRelayer;
    maxRetries?: number;
    retryDelay?: number;
    processingInterval?: number;
  }) {
    super();
    
    this.ethereumRelayer = config.ethereumRelayer;
    this.tonRelayer = config.tonRelayer;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 5000; // 5 seconds
    this.processingInterval = config.processingInterval || 2000; // 2 seconds
  }

  /**
   * Start the message relay service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Message relay is already running');
      return;
    }

    try {
      logger.info('Starting message relay service...');
      this.isRunning = true;
      
      // Start message processing loop
      this.startProcessingLoop();
      
      logger.info('Message relay service started successfully');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start message relay service:', error);
      throw error;
    }
  }

  /**
   * Stop the message relay service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping message relay service...');
    this.isRunning = false;
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    
    logger.info('Message relay service stopped');
    this.emit('stopped');
  }

  /**
   * Queue a message for cross-chain delivery
   */
  async queueMessage(message: CrossChainMessage, targetChain: 'ethereum' | 'ton'): Promise<string> {
    try {
      // Validate message
      const validation = MessageValidator.validateCrossChainMessage(message);
      if (!validation.isValid) {
        throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
      }

      const queuedMessage: QueuedMessage = {
        id: MessageSerializer.generateMessageId('relay'),
        message,
        status: MessageStatus.PENDING,
        targetChain,
        attempts: 0,
        maxAttempts: this.maxRetries,
        nextRetry: Date.now(),
        createdAt: Date.now()
      };

      this.messageQueue.set(queuedMessage.id, queuedMessage);
      this.updateStats();
      
      logger.info(`Queued message ${queuedMessage.id} for ${targetChain} delivery`);
      this.emit('messageQueued', queuedMessage);
      
      return queuedMessage.id;
    } catch (error) {
      logger.error('Failed to queue message:', error);
      throw error;
    }
  }

  /**
   * Process Ethereum to TON message
   */
  async relayToTon(message: EthereumToTonMessage): Promise<string> {
    return this.queueMessage(message, 'ton');
  }

  /**
   * Process TON to Ethereum message
   */
  async relayToEthereum(message: TonToEthereumMessage): Promise<string> {
    return this.queueMessage(message, 'ethereum');
  }

  /**
   * Get message delivery status
   */
  getMessageStatus(messageId: string): QueuedMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  /**
   * Get relay statistics
   */
  getStats(): RelayStats {
    return { ...this.stats };
  }

  /**
   * Get pending messages count
   */
  getPendingMessagesCount(): number {
    return Array.from(this.messageQueue.values())
      .filter(msg => msg.status === MessageStatus.PENDING || msg.status === MessageStatus.RETRY)
      .length;
  }

  /**
   * Start the message processing loop
   */
  private startProcessingLoop(): void {
    const processMessages = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.processMessageQueue();
      } catch (error) {
        logger.error('Error in message processing loop:', error);
      }
      
      if (this.isRunning) {
        this.processingTimer = setTimeout(processMessages, this.processingInterval);
      }
    };
    
    processMessages();
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    const now = Date.now();
    const messagesToProcess = Array.from(this.messageQueue.values())
      .filter(msg => 
        (msg.status === MessageStatus.PENDING || msg.status === MessageStatus.RETRY) &&
        msg.nextRetry <= now
      )
      .sort((a, b) => a.createdAt - b.createdAt); // Process oldest first

    for (const queuedMessage of messagesToProcess) {
      await this.processMessage(queuedMessage);
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(queuedMessage: QueuedMessage): Promise<void> {
    try {
      logger.debug(`Processing message ${queuedMessage.id} to ${queuedMessage.targetChain}`);
      
      // Update status to relaying
      queuedMessage.status = MessageStatus.RELAYING;
      queuedMessage.attempts++;
      queuedMessage.lastAttempt = Date.now();
      
      // Attempt delivery
      let success = false;
      if (queuedMessage.targetChain === 'ton') {
        success = await this.deliverToTon(queuedMessage.message);
      } else if (queuedMessage.targetChain === 'ethereum') {
        success = await this.deliverToEthereum(queuedMessage.message);
      }
      
      if (success) {
        queuedMessage.status = MessageStatus.DELIVERED;
        logger.info(`Successfully delivered message ${queuedMessage.id} to ${queuedMessage.targetChain}`);
        this.emit('messageDelivered', queuedMessage);
      } else {
        await this.handleFailedMessage(queuedMessage);
      }
      
    } catch (error) {
      logger.error(`Failed to process message ${queuedMessage.id}:`, error);
      queuedMessage.error = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailedMessage(queuedMessage);
    } finally {
      this.updateStats();
    }
  }

  /**
   * Deliver message to TON
   */
  private async deliverToTon(message: CrossChainMessage): Promise<boolean> {
    try {
      const txHash = await this.tonRelayer.submitToTon(message);
      return await this.tonRelayer.verifyTonTransaction(txHash);
    } catch (error) {
      logger.error('Failed to deliver message to TON:', error);
      return false;
    }
  }

  /**
   * Deliver message to Ethereum
   */
  private async deliverToEthereum(message: CrossChainMessage): Promise<boolean> {
    try {
      await this.ethereumRelayer.processFromTon(message);
      return true; // TODO: Add verification logic
    } catch (error) {
      logger.error('Failed to deliver message to Ethereum:', error);
      return false;
    }
  }

  /**
   * Handle failed message delivery
   */
  private async handleFailedMessage(queuedMessage: QueuedMessage): Promise<void> {
    if (queuedMessage.attempts >= queuedMessage.maxAttempts) {
      queuedMessage.status = MessageStatus.FAILED;
      logger.error(`Message ${queuedMessage.id} failed after ${queuedMessage.attempts} attempts`);
      this.emit('messageFailed', queuedMessage);
    } else {
      queuedMessage.status = MessageStatus.RETRY;
      queuedMessage.nextRetry = Date.now() + (this.retryDelay * queuedMessage.attempts); // Exponential backoff
      logger.warn(`Message ${queuedMessage.id} will retry in ${this.retryDelay * queuedMessage.attempts}ms (attempt ${queuedMessage.attempts}/${queuedMessage.maxAttempts})`);
      this.emit('messageRetry', queuedMessage);
    }
  }

  /**
   * Update relay statistics
   */
  private updateStats(): void {
    const messages = Array.from(this.messageQueue.values());
    
    this.stats.totalMessages = messages.length;
    this.stats.pendingMessages = messages.filter(m => m.status === MessageStatus.PENDING).length;
    this.stats.deliveredMessages = messages.filter(m => m.status === MessageStatus.DELIVERED).length;
    this.stats.failedMessages = messages.filter(m => m.status === MessageStatus.FAILED).length;
    this.stats.retryMessages = messages.filter(m => m.status === MessageStatus.RETRY).length;
    
    // Calculate average delivery time for delivered messages
    const deliveredMessages = messages.filter(m => m.status === MessageStatus.DELIVERED && m.lastAttempt);
    if (deliveredMessages.length > 0) {
      const totalDeliveryTime = deliveredMessages.reduce((sum, msg) => {
        return sum + (msg.lastAttempt! - msg.createdAt);
      }, 0);
      this.stats.averageDeliveryTime = totalDeliveryTime / deliveredMessages.length;
    }
  }

  /**
   * Clean up old completed messages
   */
  cleanupOldMessages(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    const messagesToRemove: string[] = [];
    
    for (const [id, message] of this.messageQueue.entries()) {
      if ((message.status === MessageStatus.DELIVERED || message.status === MessageStatus.FAILED) &&
          message.createdAt < cutoff) {
        messagesToRemove.push(id);
      }
    }
    
    for (const id of messagesToRemove) {
      this.messageQueue.delete(id);
    }
    
    if (messagesToRemove.length > 0) {
      logger.debug(`Cleaned up ${messagesToRemove.length} old messages`);
      this.updateStats();
    }
  }
} 