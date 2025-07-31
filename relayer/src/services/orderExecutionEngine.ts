// Order Execution Engine for 1inch Fusion+ with TON Cross-Chain Support
// Handles order matching, cross-chain execution, and atomic swap coordination

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { sleep } from '../utils/common';
import { MessageSerializer } from '../utils/messageValidation';
import { FusionOrderManager } from './fusionOrderManager';
import { MessageRelay } from './messageRelay';
import { StateSynchronization, OrderState } from './stateSynchronization';
import { TonRelayer } from '../relay/tonRelayer';
import { EthereumRelayer } from '../relay/ethereum';
import {
  SignedFusionOrder,
  OrderBookEntry,
  OrderStatus,
  OrderMatching,
  CrossChainExecution,
  OrderError,
  OrderErrorCode
} from '../types/fusionOrders';
import {
  EthereumToTonMessage,
  TonToEthereumMessage,
  EthereumFulfillmentMessage,
  TonFulfillmentMessage
} from '../types/messageTypes';

export interface OrderExecutionConfig {
  fusionOrderManager: FusionOrderManager;
  messageRelay: MessageRelay;
  stateSynchronization: StateSynchronization;
  tonRelayer: TonRelayer;
  ethereumRelayer: EthereumRelayer;
  ethereumSigner: ethers.Signer;
  executionInterval?: number;
  maxSlippage?: number;
  minProfitThreshold?: string;
}

export interface ExecutionResult {
  orderId: string;
  matchedOrderId?: string;
  executionTxHash: string;
  crossChainTxHash?: string;
  executedAmount: string;
  executionPrice: string;
  fees: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface OrderMatchingCriteria {
  maxPriceSlippage: number;
  minOrderSize: string;
  maxOrderAge: number;
  preferredTokens: string[];
}

export class OrderExecutionEngine extends EventEmitter {
  private fusionOrderManager: FusionOrderManager;
  private messageRelay: MessageRelay;
  private stateSynchronization: StateSynchronization;
  private tonRelayer: TonRelayer;
  private ethereumRelayer: EthereumRelayer;
  private ethereumSigner: ethers.Signer;
  
  private isRunning = false;
  private executionTimer: NodeJS.Timeout | null = null;
  private readonly executionInterval: number;
  private readonly maxSlippage: number;
  private readonly minProfitThreshold: bigint;
  
  // Execution state tracking
  private pendingExecutions: Map<string, CrossChainExecution> = new Map();
  private completedExecutions: Map<string, ExecutionResult> = new Map();
  
  // Matching criteria
  private matchingCriteria: OrderMatchingCriteria = {
    maxPriceSlippage: 0.05, // 5%
    minOrderSize: '1000000000000000000', // 1 token
    maxOrderAge: 3600000, // 1 hour
    preferredTokens: []
  };

  constructor(config: OrderExecutionConfig) {
    super();
    this.fusionOrderManager = config.fusionOrderManager;
    this.messageRelay = config.messageRelay;
    this.stateSynchronization = config.stateSynchronization;
    this.tonRelayer = config.tonRelayer;
    this.ethereumRelayer = config.ethereumRelayer;
    this.ethereumSigner = config.ethereumSigner;
    
    this.executionInterval = config.executionInterval || 10000; // 10 seconds
    this.maxSlippage = config.maxSlippage || 0.05; // 5%
    this.minProfitThreshold = BigInt(config.minProfitThreshold || '1000000000000000'); // 0.001 ETH

    // Listen to order events
    this.setupEventListeners();

    logger.info('Order Execution Engine initialized', {
      executionInterval: this.executionInterval,
      maxSlippage: this.maxSlippage,
      minProfitThreshold: this.minProfitThreshold.toString()
    });
  }

  /**
   * Start the order execution engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Order execution engine is already running');
      return;
    }

    this.isRunning = true;
    this.startExecutionLoop();
    
    logger.info('Order execution engine started successfully');
    this.emit('started');
  }

  /**
   * Stop the order execution engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }

    logger.info('Order execution engine stopped');
    this.emit('stopped');
  }

  /**
   * Execute a specific order manually
   */
  async executeOrder(orderId: string): Promise<ExecutionResult> {
    const orderEntry = this.fusionOrderManager.getOrder(orderId);
    if (!orderEntry) {
      throw new OrderError(OrderErrorCode.ORDER_ALREADY_FILLED, `Order ${orderId} not found`);
    }

    logger.info('Manually executing order', { orderId });

    try {
      // Find matching orders
      const matchingOrders = await this.findMatchingOrders(orderEntry);
      
      if (matchingOrders.length === 0) {
        // Check if this is a cross-chain order
        if (orderEntry.order.order.crossChainType === 'ethereum_only') {
          // For Ethereum-only orders, we need a match to execute
          throw new OrderError(
            OrderErrorCode.ORDER_ALREADY_FILLED,
            `No matching orders found for Ethereum-only order ${orderId}`,
            orderId
          );
        } else {
          // Execute as cross-chain order without matching
          return await this.executeCrossChainOrder(orderEntry);
        }
      } else {
        // Execute with local matching
        const bestMatch = matchingOrders[0];
        return await this.executeMatchedOrders(orderEntry, bestMatch);
      }
    } catch (error) {
      logger.error('Failed to execute order', { 
        orderId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      await this.fusionOrderManager.updateOrderStatus(
        orderId, 
        OrderStatus.FAILED, 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
      
      throw error;
    }
  }

  /**
   * Find orders that can be matched with the given order
   */
  async findMatchingOrders(targetOrder: OrderBookEntry): Promise<OrderBookEntry[]> {
    const allOrders = this.fusionOrderManager.getOrdersByStatus(OrderStatus.SIGNED);
    const matchingOrders: OrderBookEntry[] = [];

    logger.info('Finding matching orders', { 
      targetOrderId: this.getOrderId(targetOrder.order.order),
      totalOrders: allOrders.length,
      targetOrderAssets: `${targetOrder.order.order.makerAsset} -> ${targetOrder.order.order.takerAsset}`
    });

    for (const order of allOrders) {
      const canMatch = await this.canMatchOrders(targetOrder, order);
      logger.info('Order matching check', {
        orderId: this.getOrderId(order.order.order),
        orderAssets: `${order.order.order.makerAsset} -> ${order.order.order.takerAsset}`,
        canMatch
      });
      
      if (canMatch) {
        matchingOrders.push(order);
      }
    }

    // Sort by best price and earliest creation time
    matchingOrders.sort((a, b) => {
      const priceA = this.calculateOrderPrice(a);
      const priceB = this.calculateOrderPrice(b);
      
      if (priceA !== priceB) {
        return priceB - priceA; // Higher price first
      }
      
      return a.createdAt - b.createdAt; // Earlier orders first
    });

    logger.info('Matching orders found', { 
      count: matchingOrders.length,
      orderIds: matchingOrders.map(o => this.getOrderId(o.order.order))
    });

    return matchingOrders;
  }

  /**
   * Execute matched orders locally
   */
  private async executeMatchedOrders(
    order1: OrderBookEntry, 
    order2: OrderBookEntry
  ): Promise<ExecutionResult> {
    const orderId1 = this.getOrderId(order1.order.order);
    const orderId2 = this.getOrderId(order2.order.order);

    logger.info('Executing matched orders', { orderId1, orderId2 });

    try {
      // Update both orders to executing status
      await Promise.all([
        this.fusionOrderManager.updateOrderStatus(orderId1, OrderStatus.EXECUTING),
        this.fusionOrderManager.updateOrderStatus(orderId2, OrderStatus.EXECUTING)
      ]);

      // Calculate execution parameters
      const executionAmount = this.calculateMatchedAmount(order1, order2);
      const executionPrice = this.calculateMatchedPrice(order1, order2);

      // Execute the matched trade
      const executionTxHash = await this.executeMatchedTrade(order1, order2, executionAmount);

      // Create execution result
      const result: ExecutionResult = {
        orderId: orderId1,
        matchedOrderId: orderId2,
        executionTxHash,
        executedAmount: executionAmount.toString(),
        executionPrice: executionPrice.toString(),
        fees: '0', // Calculate actual fees
        status: 'completed'
      };

      // Update order statuses
      await Promise.all([
        this.fusionOrderManager.updateOrderStatus(orderId1, OrderStatus.COMPLETED, executionTxHash),
        this.fusionOrderManager.updateOrderStatus(orderId2, OrderStatus.COMPLETED, executionTxHash)
      ]);

      this.completedExecutions.set(orderId1, result);
      this.emit('orderExecuted', result);

      logger.info('Successfully executed matched orders', { orderId1, orderId2, executionTxHash });
      return result;

    } catch (error) {
      // Revert order statuses on failure
      await Promise.all([
        this.fusionOrderManager.updateOrderStatus(orderId1, OrderStatus.SIGNED),
        this.fusionOrderManager.updateOrderStatus(orderId2, OrderStatus.SIGNED)
      ]);

      throw error;
    }
  }

  /**
   * Execute cross-chain order without local matching
   */
  private async executeCrossChainOrder(orderEntry: OrderBookEntry): Promise<ExecutionResult> {
    const order = orderEntry.order.order;
    const orderId = this.getOrderId(order);

    if (!order.tonDestination) {
      throw new OrderError(
        OrderErrorCode.UNSUPPORTED_TOKEN,
        'Cross-chain execution requires TON destination',
        orderId
      );
    }

    logger.info('Executing cross-chain order', { orderId, crossChainType: order.crossChainType });

    try {
      await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.EXECUTING);

      // Create cross-chain execution tracking
      const crossChainExecution: CrossChainExecution = {
        orderId,
        sourceChain: 'ethereum',
        targetChain: 'ton',
        secretHash: order.tonDestination.hashlock!,
        timelock: order.tonDestination.timelock!,
        sourceTxHash: '', // Will be filled after transaction
        status: 'pending',
        retryCount: 0
      };

      this.pendingExecutions.set(orderId, crossChainExecution);

      // Execute source chain transaction (Ethereum)
      const sourceTxHash = await this.executeSourceChainTransaction(order);
      crossChainExecution.sourceTxHash = sourceTxHash;

      // Create cross-chain message for TON
      const crossChainMessage = await this.createCrossChainMessage(order, sourceTxHash);

      // Submit to message relay
      const relayId = await this.messageRelay.queueMessage(crossChainMessage, 'ton');
      
      crossChainExecution.status = 'relaying';
      this.pendingExecutions.set(orderId, crossChainExecution);

      // Create execution result (pending completion)
      const result: ExecutionResult = {
        orderId,
        executionTxHash: sourceTxHash,
        executedAmount: order.makerAmount.toString(),
        executionPrice: this.calculateOrderPrice(orderEntry).toString(),
        fees: '0', // Calculate actual fees
        status: 'pending'
      };

      this.emit('crossChainExecutionStarted', result);
      logger.info('Cross-chain execution initiated', { orderId, sourceTxHash, relayId });

      return result;

    } catch (error) {
      await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.FAILED);
      this.pendingExecutions.delete(orderId);
      throw error;
    }
  }

  /**
   * Handle cross-chain message fulfillment
   */
  async handleCrossChainFulfillment(
    orderId: string, 
    secret: string, 
    targetTxHash: string
  ): Promise<void> {
    const execution = this.pendingExecutions.get(orderId);
    if (!execution) {
      logger.warn('No pending execution found for fulfillment', { orderId });
      return;
    }

    logger.info('Handling cross-chain fulfillment', { orderId, targetTxHash });

    try {
      // Verify secret matches hashlock
      if (!MessageSerializer.verifySecret(secret, execution.secretHash)) {
        throw new Error('Secret does not match hashlock');
      }

      // Update execution status
      execution.secret = secret;
      execution.targetTxHash = targetTxHash;
      execution.status = 'completed';
      this.pendingExecutions.set(orderId, execution);

      // Update order status
      await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.COMPLETED, targetTxHash);

      // Create final execution result
      const result: ExecutionResult = {
        orderId,
        executionTxHash: execution.sourceTxHash,
        crossChainTxHash: targetTxHash,
        executedAmount: '0', // Get from order
        executionPrice: '0', // Get from order
        fees: '0',
        status: 'completed'
      };

      this.completedExecutions.set(orderId, result);
      this.pendingExecutions.delete(orderId);

      this.emit('crossChainExecutionCompleted', result);
      logger.info('Cross-chain execution completed successfully', { orderId, targetTxHash });

    } catch (error) {
      logger.error('Failed to handle cross-chain fulfillment', {
        orderId,
        error: error instanceof Error ? error.message : String(error)
      });

      execution.status = 'failed';
      execution.lastError = error instanceof Error ? error.message : String(error);
      this.pendingExecutions.set(orderId, execution);

      await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.FAILED);
    }
  }

  /**
   * Cancel an order execution
   */
  async cancelOrderExecution(orderId: string): Promise<void> {
    const execution = this.pendingExecutions.get(orderId);
    if (!execution) {
      throw new OrderError(OrderErrorCode.ORDER_ALREADY_FILLED, `No pending execution for order ${orderId}`);
    }

    logger.info('Cancelling order execution', { orderId });

    try {
      // Check if timelock has expired
      const now = Math.floor(Date.now() / 1000);
      if (now < execution.timelock) {
        throw new Error('Cannot cancel execution before timelock expiry');
      }

      // Submit refund transaction
      const refundTxHash = await this.submitRefundTransaction(execution);

      // Update status
      execution.status = 'refunded';
      this.pendingExecutions.delete(orderId);

      await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.CANCELLED, refundTxHash);

      this.emit('orderExecutionCancelled', { orderId, refundTxHash });
      logger.info('Order execution cancelled successfully', { orderId, refundTxHash });

    } catch (error) {
      logger.error('Failed to cancel order execution', {
        orderId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    pendingExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    const completed = Array.from(this.completedExecutions.values());
    const pending = this.pendingExecutions.size;
    
    const failedExecutions = completed.filter(e => e.status === 'failed').length;
    const successfulExecutions = completed.filter(e => e.status === 'completed').length;

    return {
      totalExecutions: completed.length + pending,
      pendingExecutions: pending,
      completedExecutions: successfulExecutions,
      failedExecutions,
      averageExecutionTime: 0 // Calculate from timing data
    };
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Listen to order events from FusionOrderManager
    this.fusionOrderManager.on('order:signed', async (event) => {
      logger.debug('New signed order detected', { orderId: event.orderId });
      // Auto-execute if criteria met
      await this.considerOrderForExecution(event.orderId);
    });

    // Listen to message relay events
    this.messageRelay.on('messageDelivered', (event) => {
      // Handle successful cross-chain message delivery
      this.handleMessageDelivered(event);
    });
  }

  private startExecutionLoop(): void {
    if (!this.isRunning) return;

    this.executionTimer = setTimeout(async () => {
      try {
        await this.executeOrderBatch();
        await this.checkPendingExecutions();
        await this.cleanupExpiredExecutions();
      } catch (error) {
        logger.error('Error in execution loop', {
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.startExecutionLoop();
      }
    }, this.executionInterval);
  }

  private async executeOrderBatch(): Promise<void> {
    const signedOrders = this.fusionOrderManager.getOrdersByStatus(OrderStatus.SIGNED);
    
    for (const orderEntry of signedOrders.slice(0, 10)) { // Process up to 10 orders per batch
      try {
        await this.considerOrderForExecution(this.getOrderId(orderEntry.order.order));
      } catch (error) {
        logger.debug('Failed to execute order in batch', {
          orderId: this.getOrderId(orderEntry.order.order),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async considerOrderForExecution(orderId: string): Promise<void> {
    const orderEntry = this.fusionOrderManager.getOrder(orderId);
    if (!orderEntry || orderEntry.status !== OrderStatus.SIGNED) {
      return;
    }

    // Check if order meets execution criteria
    if (!this.meetsExecutionCriteria(orderEntry)) {
      return;
    }

    // Execute the order
    await this.executeOrder(orderId);
  }

  private meetsExecutionCriteria(orderEntry: OrderBookEntry): boolean {
    const now = Date.now();
    const orderAge = now - orderEntry.createdAt;
    
    // Check age limit
    if (orderAge > this.matchingCriteria.maxOrderAge) {
      return false;
    }

    // Check minimum size
    if (BigInt(orderEntry.order.order.makerAmount) < BigInt(this.matchingCriteria.minOrderSize)) {
      return false;
    }

    return true;
  }

  private async canMatchOrders(order1: OrderBookEntry, order2: OrderBookEntry): Promise<boolean> {
    // Basic matching logic - orders must be complementary
    const order1Data = order1.order.order;
    const order2Data = order2.order.order;

    const order1Id = this.getOrderId(order1Data);
    const order2Id = this.getOrderId(order2Data);

    logger.debug('canMatchOrders check', {
      order1Id,
      order2Id,
      order1Assets: `${order1Data.makerAsset} -> ${order1Data.takerAsset}`,
      order2Assets: `${order2Data.makerAsset} -> ${order2Data.takerAsset}`,
      order1Amounts: `${order1Data.makerAmount} -> ${order1Data.takerAmount}`,
      order2Amounts: `${order2Data.makerAmount} -> ${order2Data.takerAmount}`
    });

    // Cannot match order with itself
    if (order1Id === order2Id) {
      logger.debug('Self-match rejected');
      return false;
    }

    // Check if assets are complementary (order1's taker = order2's maker and vice versa)
    const assetsMatch = order1Data.takerAsset.toLowerCase() === order2Data.makerAsset.toLowerCase() &&
                       order1Data.makerAsset.toLowerCase() === order2Data.takerAsset.toLowerCase();
    
    logger.debug('Asset matching', {
      order1Taker: order1Data.takerAsset.toLowerCase(),
      order2Maker: order2Data.makerAsset.toLowerCase(),
      order1Maker: order1Data.makerAsset.toLowerCase(),
      order2Taker: order2Data.takerAsset.toLowerCase(),
      assetsMatch
    });

    if (!assetsMatch) {
      logger.debug('Asset mismatch');
      return false;
    }

    // Check price compatibility with slippage tolerance
    // For complementary orders, we need to calculate prices in the same direction
    const price1 = this.calculateOrderPrice(order1);
    const price2 = this.calculateOrderPrice(order2);
    
    // For complementary orders, prices should be inverses of each other
    // Check if price1 * price2 ≈ 1 (within slippage tolerance)
    const priceProduct = price1 * price2;
    const slippage = Math.abs(priceProduct - 1);

    logger.debug('Price check', {
      price1,
      price2,
      priceProduct,
      slippage,
      maxSlippage: this.matchingCriteria.maxPriceSlippage,
      priceMatch: slippage <= this.matchingCriteria.maxPriceSlippage
    });

    const result = slippage <= this.matchingCriteria.maxPriceSlippage;
    logger.debug('canMatchOrders result', { result });
    return result;
  }

  private calculateOrderPrice(order: OrderBookEntry): number {
    return Number(order.order.order.takerAmount) / Number(order.order.order.makerAmount);
  }

  private calculateMatchedAmount(order1: OrderBookEntry, order2: OrderBookEntry): bigint {
    const amount1 = BigInt(order1.order.order.makerAmount);
    const amount2 = BigInt(order2.order.order.makerAmount);
    return amount1 < amount2 ? amount1 : amount2;
  }

  private calculateMatchedPrice(order1: OrderBookEntry, order2: OrderBookEntry): bigint {
    const price1 = this.calculateOrderPrice(order1);
    const price2 = this.calculateOrderPrice(order2);
    const avgPrice = (price1 + price2) / 2;
    return BigInt(Math.floor(avgPrice * 1e18)); // Convert to wei-like precision
  }

  private async executeMatchedTrade(
    order1: OrderBookEntry,
    order2: OrderBookEntry,
    amount: bigint
  ): Promise<string> {
    // Placeholder for actual trade execution
    // In real implementation, this would call smart contracts
    logger.info('Executing matched trade', {
      order1Id: this.getOrderId(order1.order.order),
      order2Id: this.getOrderId(order2.order.order),
      amount: amount.toString()
    });

    return `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
  }

  private async executeSourceChainTransaction(order: any): Promise<string> {
    // Placeholder for source chain transaction execution
    logger.info('Executing source chain transaction', { orderId: this.getOrderId(order) });
    return `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
  }

  private async createCrossChainMessage(order: any, sourceTxHash: string): Promise<EthereumToTonMessage> {
    return {
      type: 'ETH_TO_TON_ESCROW' as const,
      version: '1.0.0',
      messageId: MessageSerializer.generateMessageId('exec'),
      timestamp: Math.floor(Date.now() / 1000),
      nonce: 1,
      relayerSignature: '', // Will be added by message relay
      orderId: this.getOrderId(order),
      ethereumTxHash: sourceTxHash,
      ethereumBlockNumber: 0, // Placeholder - would be filled from actual transaction
      ethereumLogIndex: 0, // Placeholder - would be filled from actual transaction
      sender: order.maker,
      tonRecipient: order.tonDestination.tonRecipient,
      amount: order.makerAmount.toString(),
      hashlock: order.tonDestination.hashlock,
      timelock: order.tonDestination.timelock,
      tokenAddress: order.makerAsset,
      proof: { // Placeholder proof structure
        merkleProof: [],
        blockHeader: '0x' + '0'.repeat(64),
        txProof: '0x' + '0'.repeat(64),
        receiptProof: '0x' + '0'.repeat(64)
      }
    };
  }

  private async submitRefundTransaction(execution: CrossChainExecution): Promise<string> {
    // Placeholder for refund transaction
    logger.info('Submitting refund transaction', { orderId: execution.orderId });
    return `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
  }

  private async checkPendingExecutions(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    for (const [orderId, execution] of this.pendingExecutions.entries()) {
      // Check for timelock expiry
      if (now > execution.timelock && execution.status === 'relaying') {
        logger.warn('Cross-chain execution timed out', { orderId });
        await this.handleExecutionTimeout(orderId);
      }
    }
  }

  private async handleExecutionTimeout(orderId: string): Promise<void> {
    const execution = this.pendingExecutions.get(orderId);
    if (!execution) return;

    execution.status = 'failed';
    execution.lastError = 'Execution timeout';
    
    await this.fusionOrderManager.updateOrderStatus(orderId, OrderStatus.FAILED);
    this.pendingExecutions.delete(orderId);

    this.emit('orderExecutionTimeout', { orderId });
  }

  private async cleanupExpiredExecutions(): Promise<void> {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;

    for (const [orderId, result] of this.completedExecutions.entries()) {
      // Remove old completed executions (assuming we add timestamp)
      if (result.status === 'completed') {
        this.completedExecutions.delete(orderId);
      }
    }
  }

  private handleMessageDelivered(event: any): void {
    // Handle successful message delivery for cross-chain orders
    logger.debug('Message delivered for cross-chain execution', event);
  }

  private getOrderId(order: any): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [order.maker, order.salt, order.deadline]
      )
    );
  }
} 