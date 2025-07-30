// 1inch Fusion+ Order Manager with TON Cross-Chain Support
// Handles order construction, validation, signing, and lifecycle management

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { AddressValidator } from '../utils/messageValidation';
import {
  FusionOrderData,
  SignedFusionOrder,
  OrderStatus,
  OrderEvent,
  OrderConstructionParams,
  OrderValidation,
  CrossChainFees,
  OrderBookEntry,
  OrderError,
  OrderErrorCode,
  EIP712Domain,
  FUSION_ORDER_TYPES,
  TONDestination,
  CrossChainExecution
} from '../types/fusionOrders';

export interface FusionOrderManagerConfig {
  ethereumProvider: ethers.Provider;
  chainId: number;
  verifyingContract: string;
  relayerAddress: string;
  defaultRelayerFee: string;
}

export class FusionOrderManager extends EventEmitter {
  private ethereumProvider: ethers.Provider;
  private orderBook: Map<string, OrderBookEntry> = new Map();
  private eip712Domain: EIP712Domain;
  private relayerAddress: string;
  private defaultRelayerFee: string;

  constructor(config: FusionOrderManagerConfig) {
    super();
    this.ethereumProvider = config.ethereumProvider;
    this.relayerAddress = config.relayerAddress;
    this.defaultRelayerFee = config.defaultRelayerFee;
    
    // EIP-712 domain for order signing
    this.eip712Domain = {
      name: '1inch Fusion+ TON Extension',
      version: '1.0.0',
      chainId: config.chainId,
      verifyingContract: config.verifyingContract
    };

    logger.info('Fusion+ Order Manager initialized', {
      chainId: config.chainId,
      verifyingContract: config.verifyingContract,
      relayerAddress: config.relayerAddress
    });
  }

  /**
   * Construct a new Fusion+ order with optional TON destination
   */
  async constructOrder(params: OrderConstructionParams): Promise<FusionOrderData> {
    logger.debug('Constructing Fusion+ order', { 
      maker: params.maker,
      crossChain: !!params.tonDestination 
    });

    // Validate basic parameters
    await this.validateOrderParams(params);

    // Generate salt if not provided
    const salt = params.salt || this.generateOrderSalt();

    // Determine cross-chain type
    const crossChainType = this.determineCrossChainType(params);

    // Construct TON destination if provided
    let tonDestination: TONDestination | undefined;
    if (params.tonDestination) {
      tonDestination = await this.constructTONDestination(params.tonDestination);
    }

    const order: FusionOrderData = {
      maker: params.maker,
      receiver: params.receiver,
      makerAsset: params.makerAsset,
      takerAsset: params.takerAsset,
      makerAmount: params.makerAmount,
      takerAmount: params.takerAmount,
      salt,
      deadline: params.deadline,
      extension: params.extension || '0x',
      interactions: params.interactions || '0x',
      tonDestination,
      crossChainType
    };

    logger.info('Fusion+ order constructed successfully', {
      orderId: this.getOrderId(order),
      crossChainType: order.crossChainType
    });

    return order;
  }

  /**
   * Sign a Fusion+ order using EIP-712
   */
  async signOrder(order: FusionOrderData, signer: ethers.Signer): Promise<SignedFusionOrder> {
    logger.debug('Signing Fusion+ order', { orderId: this.getOrderId(order) });

    try {
      // Validate order before signing
      const validation = await this.validateOrder(order);
      if (!validation.isValidSignature) {
        throw new OrderError(
          OrderErrorCode.INVALID_SIGNATURE,
          `Order validation failed: ${validation.errors.join(', ')}`,
          this.getOrderId(order)
        );
      }

      // Compute order hash
      const orderHash = await this.computeOrderHash(order);

      // Sign using EIP-712
      const signature = await signer.signTypedData(
        this.eip712Domain,
        FUSION_ORDER_TYPES,
        this.serializeOrderForSigning(order)
      );

      const signedOrder: SignedFusionOrder = {
        order,
        signature,
        orderHash,
        crossChainId: order.tonDestination ? this.generateCrossChainId() : undefined,
        relayerAddress: order.tonDestination ? this.relayerAddress : undefined
      };

      logger.info('Order signed successfully', {
        orderId: this.getOrderId(order),
        orderHash,
        crossChainId: signedOrder.crossChainId
      });

      return signedOrder;
    } catch (error) {
      logger.error('Failed to sign order', {
        orderId: this.getOrderId(order),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate a Fusion+ order
   */
  async validateOrder(order: FusionOrderData): Promise<OrderValidation> {
    const errors: string[] = [];

    // Validate deadline
    const isValidDeadline = order.deadline > Math.floor(Date.now() / 1000);
    if (!isValidDeadline) {
      errors.push('Order deadline has passed');
    }

    // Validate amounts
    const isValidAmounts = this.validateAmounts(order);
    if (!isValidAmounts) {
      errors.push('Invalid order amounts');
    }

    // Validate addresses
    const isValidAddresses = await this.validateAddresses(order);
    if (!isValidAddresses) {
      errors.push('Invalid Ethereum addresses');
    }

    // Validate TON destination if present
    const hasValidTONDestination = order.tonDestination ? 
      await this.validateTONDestination(order.tonDestination) : true;
    if (!hasValidTONDestination) {
      errors.push('Invalid TON destination');
    }

    return {
      isValidSignature: errors.length === 0,
      isValidDeadline,
      isValidAmounts,
      isValidAddresses,
      hasValidTONDestination,
      errors
    };
  }

  /**
   * Add order to order book
   */
  async addToOrderBook(signedOrder: SignedFusionOrder): Promise<void> {
    const orderId = this.getOrderId(signedOrder.order);
    
    const orderBookEntry: OrderBookEntry = {
      order: signedOrder,
      status: OrderStatus.SIGNED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledAmount: 0,
      remainingAmount: signedOrder.order.makerAmount
    };

    this.orderBook.set(orderId, orderBookEntry);

    // Emit order created event
    this.emitOrderEvent(orderId, OrderStatus.CREATED);

    logger.info('Order added to order book', { orderId });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, txHash?: string, errorMessage?: string): Promise<void> {
    const entry = this.orderBook.get(orderId);
    if (!entry) {
      throw new OrderError(OrderErrorCode.ORDER_ALREADY_FILLED, `Order ${orderId} not found`);
    }

    entry.status = status;
    entry.updatedAt = Date.now();

    // Emit status change event
    this.emitOrderEvent(orderId, status, txHash, errorMessage);

    logger.info('Order status updated', { orderId, status, txHash });
  }

  /**
   * Get order from order book
   */
  getOrder(orderId: string): OrderBookEntry | undefined {
    return this.orderBook.get(orderId);
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderStatus): OrderBookEntry[] {
    return Array.from(this.orderBook.values()).filter(entry => entry.status === status);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, cancellerAddress: string): Promise<void> {
    const entry = this.orderBook.get(orderId);
    if (!entry) {
      throw new OrderError(OrderErrorCode.ORDER_ALREADY_FILLED, `Order ${orderId} not found`);
    }

    // Verify canceller is the order maker
    if (entry.order.order.maker.toLowerCase() !== cancellerAddress.toLowerCase()) {
      throw new OrderError(
        OrderErrorCode.UNAUTHORIZED_CANCELLATION,
        'Only order maker can cancel the order',
        orderId
      );
    }

    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
    logger.info('Order cancelled', { orderId, cancellerAddress });
  }

  /**
   * Estimate fees for cross-chain order
   */
  async estimateCrossChainFees(order: FusionOrderData): Promise<CrossChainFees> {
    if (!order.tonDestination) {
      return {
        relayerFee: 0,
        gasFeeEstimate: 0,
        protocolFee: 0,
        totalFee: 0
      };
    }

    // Estimate gas costs (simplified calculation)
    const gasPrice = await this.ethereumProvider.getFeeData();
    const estimatedGas = 200000; // Estimated gas for cross-chain transaction
    const gasFeeEstimate = gasPrice.gasPrice ? 
      gasPrice.gasPrice * BigInt(estimatedGas) : BigInt(0);

    const relayerFee = BigInt(order.tonDestination.relayerFee || this.defaultRelayerFee);
    const protocolFee = BigInt(order.makerAmount) / BigInt(1000); // 0.1% protocol fee
    const totalFee = relayerFee + gasFeeEstimate + protocolFee;

    return {
      relayerFee,
      gasFeeEstimate,
      protocolFee,
      totalFee
    };
  }

  /**
   * Clean up expired orders
   */
  cleanupExpiredOrders(): void {
    const now = Math.floor(Date.now() / 1000);
    const expiredOrders: string[] = [];

    for (const [orderId, entry] of this.orderBook.entries()) {
      if (entry.order.order.deadline < now && 
          entry.status !== OrderStatus.COMPLETED && 
          entry.status !== OrderStatus.CANCELLED) {
        expiredOrders.push(orderId);
      }
    }

    for (const orderId of expiredOrders) {
      this.updateOrderStatus(orderId, OrderStatus.EXPIRED);
    }

    if (expiredOrders.length > 0) {
      logger.info('Cleaned up expired orders', { count: expiredOrders.length });
    }
  }

  // Private helper methods

  private async validateOrderParams(params: OrderConstructionParams): Promise<void> {
    if (!AddressValidator.validateAddress(params.maker, 'ethereum')) {
      throw new OrderError(OrderErrorCode.INVALID_SIGNATURE, 'Invalid maker address');
    }

    if (!AddressValidator.validateAddress(params.receiver, 'ethereum')) {
      throw new OrderError(OrderErrorCode.INVALID_SIGNATURE, 'Invalid receiver address');
    }

    if (params.deadline <= Math.floor(Date.now() / 1000)) {
      throw new OrderError(OrderErrorCode.EXPIRED_ORDER, 'Order deadline must be in the future');
    }
  }

  private determineCrossChainType(params: OrderConstructionParams): 'ethereum_only' | 'ton_only' | 'eth_to_ton' | 'ton_to_eth' {
    if (!params.tonDestination) {
      return 'ethereum_only';
    }

    // For now, assume ETH to TON direction
    // This logic would be more sophisticated in a real implementation
    return 'eth_to_ton';
  }

  private async constructTONDestination(tonDest: Omit<TONDestination, 'hashlock' | 'timelock'>): Promise<TONDestination> {
    // Generate hashlock and timelock for atomic swap
    const secret = ethers.randomBytes(32);
    const hashlock = ethers.keccak256(secret);
    const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    return {
      ...tonDest,
      hashlock,
      timelock,
      relayerFee: tonDest.relayerFee || BigInt(this.defaultRelayerFee)
    };
  }

  private validateAmounts(order: FusionOrderData): boolean {
    return BigInt(order.makerAmount) > 0 && BigInt(order.takerAmount) > 0;
  }

  private async validateAddresses(order: FusionOrderData): Promise<boolean> {
    return AddressValidator.validateAddress(order.maker, 'ethereum') &&
           AddressValidator.validateAddress(order.receiver, 'ethereum') &&
           AddressValidator.validateAddress(order.makerAsset, 'ethereum') &&
           AddressValidator.validateAddress(order.takerAsset, 'ethereum');
  }

  private async validateTONDestination(tonDest: TONDestination): Promise<boolean> {
    return AddressValidator.validateAddress(tonDest.tonRecipient, 'ton');
  }

  private generateOrderSalt(): bigint {
    return BigInt(ethers.randomBytes(32).reduce((acc, byte) => acc * 256 + byte, 0));
  }

  private generateCrossChainId(): string {
    return `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOrderId(order: FusionOrderData): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [order.maker, order.salt, order.deadline]
      )
    );
  }

  private async computeOrderHash(order: FusionOrderData): Promise<string> {
    return ethers.TypedDataEncoder.hash(
      this.eip712Domain,
      FUSION_ORDER_TYPES,
      this.serializeOrderForSigning(order)
    );
  }

  private serializeOrderForSigning(order: FusionOrderData): any {
    return {
      maker: order.maker,
      receiver: order.receiver,
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset,
      makerAmount: order.makerAmount,
      takerAmount: order.takerAmount,
      salt: order.salt,
      deadline: order.deadline,
      extension: order.extension,
      interactions: order.interactions,
      tonDestination: order.tonDestination || {
        tonRecipient: '',
        jettonMaster: '',
        tonChainId: 0,
        hashlock: '0x0000000000000000000000000000000000000000000000000000000000000000',
        timelock: 0,
        relayerFee: 0
      }
    };
  }

  private emitOrderEvent(orderId: string, status: OrderStatus, txHash?: string, errorMessage?: string): void {
    const event: OrderEvent = {
      orderId,
      timestamp: Date.now(),
      status,
      txHash,
      errorMessage
    };

    this.emit('orderEvent', event);
    
    // Emit specific event types
    this.emit(`order:${status}`, event);
  }
} 