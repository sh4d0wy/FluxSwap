import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { sleep } from '../utils/common';

/**
 * Order states in the cross-chain atomic swap lifecycle
 */
export enum OrderState {
  PENDING = 'pending',              // Order created but not yet processed
  ESCROWED_ETH = 'escrowed_eth',   // Funds escrowed on Ethereum
  ESCROWED_TON = 'escrowed_ton',   // Funds escrowed on TON
  ESCROWED_BOTH = 'escrowed_both', // Funds escrowed on both chains
  FULFILLED = 'fulfilled',          // Secret revealed and swap completed
  REFUNDED_ETH = 'refunded_eth',   // Refunded on Ethereum (timeout)
  REFUNDED_TON = 'refunded_ton',   // Refunded on TON (timeout)
  REFUNDED_BOTH = 'refunded_both', // Refunded on both chains
  CANCELLED = 'cancelled',          // Order cancelled
  FAILED = 'failed'                // Order failed permanently
}

/**
 * Chain-specific order information
 */
export interface ChainOrderInfo {
  chain: 'ethereum' | 'ton';
  txHash?: string;
  blockNumber?: number;
  logIndex?: number;
  contractAddress?: string;
  amount?: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  timestamp?: number;
}

/**
 * Complete order tracking information
 */
export interface OrderInfo {
  orderId: string;
  orderHash: string;
  state: OrderState;
  direction: 'eth_to_ton' | 'ton_to_eth';
  
  // Swap parameters
  hashlock: string;
  timelock: number;
  amount: string;
  secret?: string;
  
  // Participants
  initiator: string;
  recipient: string;
  
  // Chain-specific information
  ethereum?: ChainOrderInfo;
  ton?: ChainOrderInfo;
  
  // Lifecycle timestamps
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  
  // Finality tracking
  ethereumFinalized: boolean;
  tonFinalized: boolean;
  
  // Error information
  lastError?: string;
  retryCount?: number;
}

/**
 * State change event
 */
export interface StateChangeEvent {
  orderId: string;
  previousState: OrderState;
  newState: OrderState;
  timestamp: number;
  reason: string;
  data?: any;
}

/**
 * Finality configuration
 */
export interface FinalityConfig {
  ethereumRequiredConfirmations: number;
  tonRequiredConfirmations: number;
  checkInterval: number;
  maxRetries: number;
}

/**
 * State synchronization service for cross-chain orders
 */
export class StateSynchronization extends EventEmitter {
  private orders: Map<string, OrderInfo> = new Map();
  private isRunning = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private finalityConfig: FinalityConfig;
  
  // External dependencies for chain state checking
  private ethereumProvider: any;
  private tonClient: any;

  constructor(config: {
    ethereumProvider?: any;
    tonClient?: any;
    finalityConfig?: Partial<FinalityConfig>;
  }) {
    super();
    
    this.ethereumProvider = config.ethereumProvider;
    this.tonClient = config.tonClient;
    
    this.finalityConfig = {
      ethereumRequiredConfirmations: 12,
      tonRequiredConfirmations: 5,
      checkInterval: 10000, // 10 seconds
      maxRetries: 10,
      ...config.finalityConfig
    };
  }

  /**
   * Start the state synchronization service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('State synchronization service is already running');
      return;
    }

    try {
      logger.info('Starting state synchronization service...');
      this.isRunning = true;
      
      // Start finality checking loop
      this.startFinalityChecking();
      
      logger.info('State synchronization service started successfully');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start state synchronization service:', error);
      throw error;
    }
  }

  /**
   * Stop the state synchronization service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping state synchronization service...');
    this.isRunning = false;
    
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    
    logger.info('State synchronization service stopped');
    this.emit('stopped');
  }

  /**
   * Create a new order for tracking
   */
  async createOrder(orderData: {
    orderId: string;
    orderHash: string;
    direction: 'eth_to_ton' | 'ton_to_eth';
    hashlock: string;
    timelock: number;
    amount: string;
    initiator: string;
    recipient: string;
  }): Promise<void> {
    const order: OrderInfo = {
      ...orderData,
      state: OrderState.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: orderData.timelock * 1000, // Convert to milliseconds
      ethereumFinalized: false,
      tonFinalized: false,
      retryCount: 0
    };

    this.orders.set(orderData.orderId, order);
    
    logger.info(`Created order tracking for ${orderData.orderId}`);
    this.emit('orderCreated', order);
  }

  /**
   * Update order state
   */
  async updateOrderState(
    orderId: string, 
    newState: OrderState, 
    reason: string, 
    data?: any
  ): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      logger.warn(`Attempted to update non-existent order: ${orderId}`);
      return;
    }

    const previousState = order.state;
    order.state = newState;
    order.updatedAt = Date.now();

    const changeEvent: StateChangeEvent = {
      orderId,
      previousState,
      newState,
      timestamp: Date.now(),
      reason,
      data
    };

    logger.info(`Order ${orderId} state changed: ${previousState} -> ${newState} (${reason})`);
    this.emit('stateChanged', changeEvent);
  }

  /**
   * Update Ethereum chain information
   */
  async updateEthereumInfo(orderId: string, info: Partial<ChainOrderInfo>): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.ethereum = {
      chain: 'ethereum',
      status: 'pending',
      ...order.ethereum,
      ...info
    };
    order.updatedAt = Date.now();

    // Update state based on Ethereum info
    if (info.status === 'confirmed' && order.state === OrderState.PENDING) {
      if (order.direction === 'eth_to_ton') {
        await this.updateOrderState(orderId, OrderState.ESCROWED_ETH, 'Ethereum escrow confirmed');
      }
    }

    this.emit('ethereumUpdated', { orderId, info: order.ethereum });
  }

  /**
   * Update TON chain information
   */
  async updateTonInfo(orderId: string, info: Partial<ChainOrderInfo>): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.ton = {
      chain: 'ton',
      status: 'pending',
      ...order.ton,
      ...info
    };
    order.updatedAt = Date.now();

    // Update state based on TON info
    if (info.status === 'confirmed' && order.state === OrderState.ESCROWED_ETH) {
      if (order.direction === 'eth_to_ton') {
        await this.updateOrderState(orderId, OrderState.ESCROWED_BOTH, 'TON escrow confirmed');
      }
    }

    this.emit('tonUpdated', { orderId, info: order.ton });
  }

  /**
   * Mark order as fulfilled with secret
   */
  async fulfillOrder(orderId: string, secret: string, txHash: string, chain: 'ethereum' | 'ton'): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.secret = secret;
    
    if (chain === 'ethereum') {
      order.ethereum = {
        ...order.ethereum,
        chain: 'ethereum',
        status: 'confirmed',
        txHash
      };
    } else {
      order.ton = {
        ...order.ton,
        chain: 'ton',
        status: 'confirmed',
        txHash
      };
    }

    await this.updateOrderState(orderId, OrderState.FULFILLED, `Order fulfilled on ${chain}`, { secret, txHash });
  }

  /**
   * Mark order as refunded
   */
  async refundOrder(orderId: string, txHash: string, chain: 'ethereum' | 'ton'): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    if (chain === 'ethereum') {
      order.ethereum = {
        ...order.ethereum,
        chain: 'ethereum',
        status: 'confirmed',
        txHash
      };
      
      const newState = order.ton?.status === 'confirmed' ? OrderState.REFUNDED_BOTH : OrderState.REFUNDED_ETH;
      await this.updateOrderState(orderId, newState, `Order refunded on ${chain}`, { txHash });
    } else {
      order.ton = {
        ...order.ton,
        chain: 'ton',
        status: 'confirmed',
        txHash
      };
      
      const newState = order.ethereum?.status === 'confirmed' ? OrderState.REFUNDED_BOTH : OrderState.REFUNDED_TON;
      await this.updateOrderState(orderId, newState, `Order refunded on ${chain}`, { txHash });
    }
  }

  /**
   * Get order information
   */
  getOrder(orderId: string): OrderInfo | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get orders by state
   */
  getOrdersByState(state: OrderState): OrderInfo[] {
    return Array.from(this.orders.values()).filter(order => order.state === state);
  }

  /**
   * Get expired orders
   */
  getExpiredOrders(): OrderInfo[] {
    const now = Date.now();
    return Array.from(this.orders.values()).filter(order => 
      order.expiresAt < now && 
      order.state !== OrderState.FULFILLED &&
      order.state !== OrderState.REFUNDED_BOTH &&
      order.state !== OrderState.FAILED
    );
  }

  /**
   * Get orders requiring attention (expired, failed, etc.)
   */
  getOrdersRequiringAttention(): OrderInfo[] {
    const now = Date.now();
    return Array.from(this.orders.values()).filter(order => {
      // Expired orders
      if (order.expiresAt < now && order.state !== OrderState.FULFILLED) {
        return true;
      }
      
      // Orders stuck in pending state for too long
      if (order.state === OrderState.PENDING && (now - order.createdAt) > 3600000) { // 1 hour
        return true;
      }
      
      // Failed orders with retries remaining
      if (order.state === OrderState.FAILED && (order.retryCount || 0) < this.finalityConfig.maxRetries) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalOrders: number;
    ordersByState: Record<OrderState, number>;
    expiredOrders: number;
    finalizedOrders: number;
  } {
    const orders = Array.from(this.orders.values());
    const ordersByState = {} as Record<OrderState, number>;
    
    // Initialize counters
    Object.values(OrderState).forEach(state => {
      ordersByState[state] = 0;
    });
    
    // Count orders by state
    orders.forEach(order => {
      ordersByState[order.state]++;
    });
    
    return {
      totalOrders: orders.length,
      ordersByState,
      expiredOrders: this.getExpiredOrders().length,
      finalizedOrders: orders.filter(o => o.ethereumFinalized && o.tonFinalized).length
    };
  }

  /**
   * Start finality checking loop
   */
  private startFinalityChecking(): void {
    const checkFinality = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.checkOrderFinality();
        await this.checkExpiredOrders();
      } catch (error) {
        logger.error('Error in finality checking:', error);
      }
      
      if (this.isRunning) {
        this.syncTimer = setTimeout(checkFinality, this.finalityConfig.checkInterval);
      }
    };
    
    checkFinality();
  }

  /**
   * Check finality for all orders
   */
  private async checkOrderFinality(): Promise<void> {
    const orders = Array.from(this.orders.values()).filter(order => 
      !order.ethereumFinalized || !order.tonFinalized
    );

    for (const order of orders) {
      try {
        await this.checkSingleOrderFinality(order);
      } catch (error) {
        logger.error(`Error checking finality for order ${order.orderId}:`, error);
      }
    }
  }

  /**
   * Check finality for a single order
   */
  private async checkSingleOrderFinality(order: OrderInfo): Promise<void> {
    // Check Ethereum finality
    if (!order.ethereumFinalized && order.ethereum?.txHash && this.ethereumProvider) {
      try {
        const confirmations = await this.getEthereumConfirmations(order.ethereum.txHash);
        if (confirmations >= this.finalityConfig.ethereumRequiredConfirmations) {
          order.ethereumFinalized = true;
          this.emit('ethereumFinalized', { orderId: order.orderId, confirmations });
        }
      } catch (error) {
        logger.debug(`Error checking Ethereum finality for ${order.orderId}:`, error);
      }
    }

    // Check TON finality
    if (!order.tonFinalized && order.ton?.txHash && this.tonClient) {
      try {
        const confirmations = await this.getTonConfirmations(order.ton.txHash);
        if (confirmations >= this.finalityConfig.tonRequiredConfirmations) {
          order.tonFinalized = true;
          this.emit('tonFinalized', { orderId: order.orderId, confirmations });
        }
      } catch (error) {
        logger.debug(`Error checking TON finality for ${order.orderId}:`, error);
      }
    }
  }

  /**
   * Check for expired orders and mark them for refund
   */
  private async checkExpiredOrders(): Promise<void> {
    const expiredOrders = this.getExpiredOrders();
    
    for (const order of expiredOrders) {
      try {
        await this.updateOrderState(
          order.orderId, 
          OrderState.FAILED, 
          'Order expired - timelock reached'
        );
      } catch (error) {
        logger.error(`Error handling expired order ${order.orderId}:`, error);
      }
    }
  }

  /**
   * Get Ethereum transaction confirmations
   * TODO: Implement actual Ethereum provider integration
   */
  private async getEthereumConfirmations(txHash: string): Promise<number> {
    // Placeholder implementation
    return this.finalityConfig.ethereumRequiredConfirmations;
  }

  /**
   * Get TON transaction confirmations
   * TODO: Implement actual TON client integration
   */
  private async getTonConfirmations(txHash: string): Promise<number> {
    // Placeholder implementation
    return this.finalityConfig.tonRequiredConfirmations;
  }

  /**
   * Clean up old orders
   */
  cleanupOldOrders(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    const ordersToRemove: string[] = [];
    
    for (const [id, order] of this.orders.entries()) {
      if ((order.state === OrderState.FULFILLED || 
           order.state === OrderState.REFUNDED_BOTH || 
           order.state === OrderState.FAILED) &&
          order.updatedAt < cutoff) {
        ordersToRemove.push(id);
      }
    }
    
    for (const id of ordersToRemove) {
      this.orders.delete(id);
    }
    
    if (ordersToRemove.length > 0) {
      logger.debug(`Cleaned up ${ordersToRemove.length} old orders`);
    }
  }
} 