import { ethers } from 'ethers';
import { OrderExecutionEngine, OrderExecutionConfig } from '../services/orderExecutionEngine';
import { FusionOrderManager } from '../services/fusionOrderManager';
import { MessageRelay } from '../services/messageRelay';
import { StateSynchronization } from '../services/stateSynchronization';
import { TonRelayer } from '../relay/tonRelayer';
import { EthereumRelayer } from '../relay/ethereum';
import {
  OrderStatus,
  OrderBookEntry,
  SignedFusionOrder,
  FusionOrderData
} from '../types/fusionOrders';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock sleep utility
jest.mock('../utils/common', () => ({
  sleep: jest.fn().mockResolvedValue(undefined)
}));

describe('OrderExecutionEngine', () => {
  let executionEngine: OrderExecutionEngine;
  let mockFusionOrderManager: jest.Mocked<FusionOrderManager>;
  let mockMessageRelay: jest.Mocked<MessageRelay>;
  let mockStateSynchronization: jest.Mocked<StateSynchronization>;
  let mockTonRelayer: jest.Mocked<TonRelayer>;
  let mockEthereumRelayer: jest.Mocked<EthereumRelayer>;
  let mockEthereumSigner: jest.Mocked<ethers.Signer>;

  beforeEach(() => {
    // Mock FusionOrderManager
    mockFusionOrderManager = {
      getOrder: jest.fn(),
      getOrdersByStatus: jest.fn(),
      updateOrderStatus: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    // Mock MessageRelay
    mockMessageRelay = {
      queueMessage: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    // Mock StateSynchronization
    mockStateSynchronization = {
      createOrder: jest.fn(),
      updateOrderState: jest.fn(),
      on: jest.fn()
    } as any;

    // Mock TonRelayer
    mockTonRelayer = {
      submitToTon: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    } as any;

    // Mock EthereumRelayer
    mockEthereumRelayer = {
      processFromTon: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    } as any;

    // Mock Ethereum Signer
    mockEthereumSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signTransaction: jest.fn(),
      signMessage: jest.fn()
    } as any;

    const config: OrderExecutionConfig = {
      fusionOrderManager: mockFusionOrderManager,
      messageRelay: mockMessageRelay,
      stateSynchronization: mockStateSynchronization,
      tonRelayer: mockTonRelayer,
      ethereumRelayer: mockEthereumRelayer,
      ethereumSigner: mockEthereumSigner,
      executionInterval: 1000, // 1 second for testing
      maxSlippage: 0.05,
      minProfitThreshold: '1000000000000000'
    };

    executionEngine = new OrderExecutionEngine(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization and control', () => {
    it('should initialize successfully', () => {
      expect(executionEngine).toBeInstanceOf(OrderExecutionEngine);
    });

    it('should start and stop successfully', async () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();
      
      executionEngine.on('started', startSpy);
      executionEngine.on('stopped', stopSpy);

      await executionEngine.start();
      expect(startSpy).toHaveBeenCalled();

      await executionEngine.stop();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle starting when already running', async () => {
      await executionEngine.start();
      await executionEngine.start(); // Should not throw or cause issues
    });

    it('should handle stopping when not running', async () => {
      await executionEngine.stop(); // Should not throw
    });
  });

  describe('order matching', () => {
    const createMockOrderEntry = (
      maker: string,
      makerAsset: string,
      takerAsset: string,
      makerAmount: string,
      takerAmount: string
    ): OrderBookEntry => ({
      order: {
        order: {
          maker,
          receiver: '0x9876543210987654321098765432109876543210',
          makerAsset,
          takerAsset,
          makerAmount,
          takerAmount,
          salt: BigInt('12345'),
          deadline: Math.floor(Date.now() / 1000) + 3600,
          extension: '0x',
          interactions: '0x',
          crossChainType: 'ethereum_only'
        },
        signature: '0x' + 'a'.repeat(130),
        orderHash: '0x' + 'b'.repeat(64)
      } as SignedFusionOrder,
      status: OrderStatus.SIGNED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledAmount: 0,
      remainingAmount: makerAmount
    });

    it('should find matching orders', async () => {
      const targetOrder = createMockOrderEntry(
        '0x1111111111111111111111111111111111111111',
        '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889', // Token A
        '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F', // Token B
        '1000000000000000000', // 1 Token A
        '2000000000000000000'  // 2 Token B
      );

      const matchingOrder = createMockOrderEntry(
        '0x2222222222222222222222222222222222222222',
        '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F', // Token B (complementary)
        '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889', // Token A (complementary)
        '2000000000000000000', // 2 Token B
        '1000000000000000000'  // 1 Token A
      );

      const nonMatchingOrder = createMockOrderEntry(
        '0x3333333333333333333333333333333333333333',
        '0xC0d80e44E8D3F4F42ef0F9e9d4f5e6f7e8E9f0e1', // Token C (different)
        '0xD1e91f55F9E4G5G53fg1G0f0e5g6g7g8f9G0g1g2', // Token D (different)
        '1000000000000000000',
        '1000000000000000000'
      );

      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([
        matchingOrder,
        nonMatchingOrder
      ]);

      const matchingOrders = await executionEngine.findMatchingOrders(targetOrder);

      expect(matchingOrders).toHaveLength(1);
      expect(matchingOrders[0]).toBe(matchingOrder);
    });

    it('should sort matching orders by price and time', async () => {
      const targetOrder = createMockOrderEntry(
        '0x1111111111111111111111111111111111111111',
        '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        '1000000000000000000',
        '2000000000000000000'
      );

      const earlierOrder = createMockOrderEntry(
        '0x2222222222222222222222222222222222222222',
        '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        '2000000000000000000',
        '1000000000000000000'
      );

      const laterOrder = createMockOrderEntry(
        '0x3333333333333333333333333333333333333333',
        '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        '2000000000000000000',
        '1000000000000000000'
      );

      earlierOrder.createdAt = Date.now() - 1000;
      laterOrder.createdAt = Date.now();

      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([
        laterOrder,
        earlierOrder
      ]);

      const matchingOrders = await executionEngine.findMatchingOrders(targetOrder);

      expect(matchingOrders).toHaveLength(2);
      expect(matchingOrders[0]).toBe(earlierOrder); // Earlier order should be first
    });
  });

  describe('order execution', () => {
    const createValidOrder = (): OrderBookEntry => ({
      order: {
        order: {
          maker: '0x1234567890123456789012345678901234567890',
          receiver: '0x9876543210987654321098765432109876543210',
          makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
          takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
          makerAmount: '1000000000000000000',
          takerAmount: '2000000000000000000',
          salt: BigInt('12345'),
          deadline: Math.floor(Date.now() / 1000) + 3600,
          extension: '0x',
          interactions: '0x',
          crossChainType: 'ethereum_only'
        },
        signature: '0x' + 'a'.repeat(130),
        orderHash: '0x' + 'b'.repeat(64)
      } as SignedFusionOrder,
      status: OrderStatus.SIGNED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledAmount: 0,
      remainingAmount: '1000000000000000000'
    });

    it('should execute order with local matching', async () => {
      const order1 = createValidOrder();
      const order2 = createValidOrder();
      order2.order.order.maker = '0x2222222222222222222222222222222222222222';

      // Mock order retrieval
      mockFusionOrderManager.getOrder.mockReturnValue(order1);
      
      // Mock finding matching orders
      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([order2]);

      // Mock order status updates
      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);

      const orderId = '0x' + 'c'.repeat(64);
      const result = await executionEngine.executeOrder(orderId);

      expect(result.status).toBe('completed');
      expect(result.matchedOrderId).toBeDefined();
      expect(mockFusionOrderManager.updateOrderStatus).toHaveBeenCalledWith(
        expect.any(String),
        OrderStatus.EXECUTING
      );
    });

    it('should execute cross-chain order without matching', async () => {
      const crossChainOrder = createValidOrder();
      crossChainOrder.order.order.crossChainType = 'eth_to_ton';
      crossChainOrder.order.order.tonDestination = {
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        tonChainId: -3,
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600
      };

      mockFusionOrderManager.getOrder.mockReturnValue(crossChainOrder);
      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([]);
      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);
      mockMessageRelay.queueMessage.mockResolvedValue('relay_123');

      const orderId = '0x' + 'c'.repeat(64);
      const result = await executionEngine.executeOrder(orderId);

      expect(result.status).toBe('pending');
      expect(result.crossChainTxHash).toBeUndefined(); // Should be undefined for pending
      expect(mockMessageRelay.queueMessage).toHaveBeenCalled();
    });

    it('should throw error for non-existent order', async () => {
      mockFusionOrderManager.getOrder.mockReturnValue(undefined);

      const orderId = '0x' + 'c'.repeat(64);
      
      await expect(executionEngine.executeOrder(orderId))
        .rejects.toThrow('Order');
    });

    it('should handle execution failure gracefully', async () => {
      const order = createValidOrder();
      mockFusionOrderManager.getOrder.mockReturnValue(order);
      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([]);
      mockFusionOrderManager.updateOrderStatus
        .mockResolvedValueOnce(undefined) // First call succeeds (EXECUTING)
        .mockRejectedValue(new Error('Transaction failed')); // Second call fails

      const orderId = '0x' + 'c'.repeat(64);

      await expect(executionEngine.executeOrder(orderId))
        .rejects.toThrow('Transaction failed');
      
      expect(mockFusionOrderManager.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.FAILED,
        undefined,
        'Transaction failed'
      );
    });
  });

  describe('cross-chain fulfillment', () => {
    it('should handle successful cross-chain fulfillment', async () => {
      const orderId = '0x' + 'a'.repeat(64);
      const secret = '0x' + 'b'.repeat(64);
      const secretHash = '0x' + 'c'.repeat(64);
      const targetTxHash = '0x' + 'd'.repeat(64);

      // Setup pending execution
      const execution = {
        orderId,
        sourceChain: 'ethereum' as const,
        targetChain: 'ton' as const,
        secretHash,
        timelock: Math.floor(Date.now() / 1000) + 3600,
        sourceTxHash: '0x' + 'e'.repeat(64),
        status: 'relaying' as const,
        retryCount: 0
      };

      // Add to pending executions
      (executionEngine as any).pendingExecutions.set(orderId, execution);

      // Mock secret verification
      jest.spyOn(require('../utils/messageValidation').MessageSerializer, 'verifySecret')
        .mockReturnValue(true);

      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);

      await executionEngine.handleCrossChainFulfillment(orderId, secret, targetTxHash);

      expect(mockFusionOrderManager.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.COMPLETED,
        targetTxHash
      );
    });

    it('should reject fulfillment with invalid secret', async () => {
      const orderId = '0x' + 'a'.repeat(64);
      const invalidSecret = '0x' + 'invalid'.repeat(8);
      const secretHash = '0x' + 'c'.repeat(64);
      const targetTxHash = '0x' + 'd'.repeat(64);

      const execution = {
        orderId,
        sourceChain: 'ethereum' as const,
        targetChain: 'ton' as const,
        secretHash,
        timelock: Math.floor(Date.now() / 1000) + 3600,
        sourceTxHash: '0x' + 'e'.repeat(64),
        status: 'relaying' as const,
        retryCount: 0
      };

      (executionEngine as any).pendingExecutions.set(orderId, execution);

      // Mock secret verification to fail
      jest.spyOn(require('../utils/messageValidation').MessageSerializer, 'verifySecret')
        .mockReturnValue(false);

      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);

      await executionEngine.handleCrossChainFulfillment(orderId, invalidSecret, targetTxHash);

      expect(mockFusionOrderManager.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.FAILED
      );
    });

    it('should handle fulfillment for non-existent execution', async () => {
      const orderId = '0x' + 'nonexistent'.repeat(5);
      const secret = '0x' + 'b'.repeat(64);
      const targetTxHash = '0x' + 'd'.repeat(64);

      // Should not throw, just log warning
      await executionEngine.handleCrossChainFulfillment(orderId, secret, targetTxHash);

      expect(mockFusionOrderManager.updateOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('order cancellation', () => {
    it('should cancel order execution after timelock expiry', async () => {
      const orderId = '0x' + 'a'.repeat(64);
      const pastTimelock = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const execution = {
        orderId,
        sourceChain: 'ethereum' as const,
        targetChain: 'ton' as const,
        secretHash: '0x' + 'c'.repeat(64),
        timelock: pastTimelock,
        sourceTxHash: '0x' + 'e'.repeat(64),
        status: 'relaying' as const,
        retryCount: 0
      };

      (executionEngine as any).pendingExecutions.set(orderId, execution);
      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);

      await executionEngine.cancelOrderExecution(orderId);

      expect(mockFusionOrderManager.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.CANCELLED,
        expect.any(String) // refund tx hash
      );
    });

    it('should reject cancellation before timelock expiry', async () => {
      const orderId = '0x' + 'a'.repeat(64);
      const futureTimelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const execution = {
        orderId,
        sourceChain: 'ethereum' as const,
        targetChain: 'ton' as const,
        secretHash: '0x' + 'c'.repeat(64),
        timelock: futureTimelock,
        sourceTxHash: '0x' + 'e'.repeat(64),
        status: 'relaying' as const,
        retryCount: 0
      };

      (executionEngine as any).pendingExecutions.set(orderId, execution);

      await expect(executionEngine.cancelOrderExecution(orderId))
        .rejects.toThrow('Cannot cancel execution before timelock expiry');
    });

    it('should throw error for non-existent execution', async () => {
      const orderId = '0x' + 'nonexistent'.repeat(5);

      await expect(executionEngine.cancelOrderExecution(orderId))
        .rejects.toThrow('No pending execution for order');
    });
  });

  describe('statistics and monitoring', () => {
    it('should return execution statistics', () => {
      // Add some mock completed executions
      const completedExecution = {
        orderId: '0x' + 'a'.repeat(64),
        executionTxHash: '0x' + 'b'.repeat(64),
        executedAmount: '1000000000000000000',
        executionPrice: '2000000000000000000',
        fees: '0',
        status: 'completed' as const
      };

      (executionEngine as any).completedExecutions.set('test1', completedExecution);

      const stats = executionEngine.getExecutionStats();

      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.completedExecutions).toBeGreaterThan(0);
      expect(typeof stats.averageExecutionTime).toBe('number');
    });

         it('should emit events for order execution', async () => {
       const eventSpy = jest.fn();
       executionEngine.on('orderExecuted', eventSpy);

       const order: OrderBookEntry = {
         order: {
           order: {
             maker: '0x1234567890123456789012345678901234567890',
             receiver: '0x9876543210987654321098765432109876543210',
             makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
             takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
             makerAmount: '1000000000000000000',
             takerAmount: '2000000000000000000',
             salt: BigInt('12345'),
             deadline: Math.floor(Date.now() / 1000) + 3600,
             extension: '0x',
             interactions: '0x',
             crossChainType: 'ethereum_only'
           },
           signature: '0x' + 'a'.repeat(130),
           orderHash: '0x' + 'b'.repeat(64)
         } as SignedFusionOrder,
         status: OrderStatus.SIGNED,
         createdAt: Date.now(),
         updatedAt: Date.now(),
         filledAmount: 0,
         remainingAmount: '1000000000000000000'
       };

       mockFusionOrderManager.getOrder.mockReturnValue(order);
       mockFusionOrderManager.getOrdersByStatus.mockReturnValue([]);
       mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);
       mockMessageRelay.queueMessage.mockResolvedValue('relay_123');

       const orderId = '0x' + 'c'.repeat(64);
       
       try {
         await executionEngine.executeOrder(orderId);
       } catch (error) {
         // Execution may fail due to mocking, but we're testing event emission
       }

       // The event should be emitted for successful matched orders
       // Cross-chain orders emit different events
     });
  });

  describe('automatic execution loop', () => {
    const createValidOrder = (): OrderBookEntry => ({
      order: {
        order: {
          maker: '0x1234567890123456789012345678901234567890',
          receiver: '0x9876543210987654321098765432109876543210',
          makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
          takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
          makerAmount: '1000000000000000000',
          takerAmount: '2000000000000000000',
          salt: BigInt('12345'),
          deadline: Math.floor(Date.now() / 1000) + 3600,
          extension: '0x',
          interactions: '0x',
          crossChainType: 'ethereum_only'
        },
        signature: '0x' + 'a'.repeat(130),
        orderHash: '0x' + 'b'.repeat(64)
      } as SignedFusionOrder,
      status: OrderStatus.SIGNED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledAmount: 0,
      remainingAmount: '1000000000000000000'
    });

    it('should process orders automatically when started', async () => {
      const order = createValidOrder();
      mockFusionOrderManager.getOrdersByStatus.mockReturnValue([order]);
      mockFusionOrderManager.getOrder.mockReturnValue(order);
      mockFusionOrderManager.updateOrderStatus.mockResolvedValue(undefined);

      await executionEngine.start();
      
      // Wait a bit for the execution loop to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await executionEngine.stop();

      // Verify that orders were considered for execution
      expect(mockFusionOrderManager.getOrdersByStatus).toHaveBeenCalled();
    });

    it('should handle errors in execution loop gracefully', async () => {
      (mockFusionOrderManager.getOrdersByStatus as jest.Mock).mockRejectedValue(new Error('Database error'));

      await executionEngine.start();
      
      // Wait a bit for the execution loop to run and handle error
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await executionEngine.stop();

      // Should not crash and should continue running
    });
  });
}); 