import { ethers } from 'ethers';
import { FusionOrderManager, FusionOrderManagerConfig } from '../services/fusionOrderManager';
import { 
  OrderConstructionParams, 
  OrderStatus, 
  OrderErrorCode,
  OrderError 
} from '../types/fusionOrders';

// Mock logger to avoid noise in tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('FusionOrderManager', () => {
  let orderManager: FusionOrderManager;
  let mockProvider: jest.Mocked<ethers.Provider>;
  let mockSigner: jest.Mocked<ethers.Signer>;

  const config: FusionOrderManagerConfig = {
    ethereumProvider: {} as ethers.Provider,
    chainId: 1,
    verifyingContract: '0x1111111111111111111111111111111111111111',
    relayerAddress: '0x2222222222222222222222222222222222222222',
    defaultRelayerFee: '1000000000000000000' // 1 ETH
  };

  beforeEach(async () => {
    // Mock provider
    mockProvider = {
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('20000000000'), // 20 gwei
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('2000000000')
      })
    } as any;

    // Mock signer
    mockSigner = {
      signTypedData: jest.fn().mockResolvedValue('0x' + 'a'.repeat(130)),
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    } as any;

    config.ethereumProvider = mockProvider;
    orderManager = new FusionOrderManager(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid configuration', () => {
      expect(orderManager).toBeInstanceOf(FusionOrderManager);
    });

    it('should emit events', () => {
      const eventSpy = jest.fn();
      orderManager.on('orderEvent', eventSpy);
      
      expect(typeof orderManager.emit).toBe('function');
    });
  });

  describe('order construction', () => {
    const validOrderParams: OrderConstructionParams = {
      maker: '0x1234567890123456789012345678901234567890',
      receiver: '0x9876543210987654321098765432109876543210',
      makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889', // Proper checksum
      takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F', // Proper checksum
      makerAmount: '1000000000000000000', // 1 token
      takerAmount: '2000000000000000000',  // 2 tokens
      deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };

    it('should construct a valid Ethereum-only order', async () => {
      const order = await orderManager.constructOrder(validOrderParams);

      expect(order.maker).toBe(validOrderParams.maker);
      expect(order.receiver).toBe(validOrderParams.receiver);
      expect(order.makerAsset).toBe(validOrderParams.makerAsset);
      expect(order.takerAsset).toBe(validOrderParams.takerAsset);
      expect(order.makerAmount).toBe(validOrderParams.makerAmount);
      expect(order.takerAmount).toBe(validOrderParams.takerAmount);
      expect(order.deadline).toBe(validOrderParams.deadline);
      expect(order.crossChainType).toBe('ethereum_only');
      expect(order.tonDestination).toBeUndefined();
    });

    it('should construct a valid cross-chain order with TON destination', async () => {
      const crossChainParams: OrderConstructionParams = {
        ...validOrderParams,
        tonDestination: {
          tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
          jettonMaster: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
          tonChainId: -3, // testnet
          relayerFee: '500000000000000000' // 0.5 ETH
        }
      };

      const order = await orderManager.constructOrder(crossChainParams);

      expect(order.crossChainType).toBe('eth_to_ton');
      expect(order.tonDestination).toBeDefined();
      expect(order.tonDestination!.tonRecipient).toBe(crossChainParams.tonDestination!.tonRecipient);
      expect(order.tonDestination!.hashlock).toBeDefined();
      expect(order.tonDestination!.timelock).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should generate unique salt when not provided', async () => {
      const order1 = await orderManager.constructOrder(validOrderParams);
      const order2 = await orderManager.constructOrder(validOrderParams);

      expect(order1.salt).not.toBe(order2.salt);
    });

    it('should use provided salt when given', async () => {
      const customSalt = BigInt('12345678901234567890');
      const paramsWithSalt = { ...validOrderParams, salt: customSalt };

      const order = await orderManager.constructOrder(paramsWithSalt);

      expect(order.salt).toBe(customSalt);
    });

    it('should throw error for invalid maker address', async () => {
      const invalidParams = { ...validOrderParams, maker: 'invalid_address' };

      await expect(orderManager.constructOrder(invalidParams))
        .rejects.toThrow(OrderError);
    });

    it('should throw error for expired deadline', async () => {
      const expiredParams = { 
        ...validOrderParams, 
        deadline: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      await expect(orderManager.constructOrder(expiredParams))
        .rejects.toThrow(OrderError);
    });
  });

  describe('order validation', () => {
    let validOrder: any;

    beforeEach(async () => {
      const validOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      validOrder = await orderManager.constructOrder(validOrderParams);
    });

    it('should validate a correct order', async () => {
      const validation = await orderManager.validateOrder(validOrder);

      expect(validation.isValidSignature).toBe(true);
      expect(validation.isValidDeadline).toBe(true);
      expect(validation.isValidAmounts).toBe(true);
      expect(validation.isValidAddresses).toBe(true);
      expect(validation.hasValidTONDestination).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect expired order', async () => {
      const expiredOrder = { 
        ...validOrder, 
        deadline: Math.floor(Date.now() / 1000) - 1 
      };

      const validation = await orderManager.validateOrder(expiredOrder);

      expect(validation.isValidDeadline).toBe(false);
      expect(validation.errors).toContain('Order deadline has passed');
    });

    it('should detect invalid amounts', async () => {
      const invalidOrder = { ...validOrder, makerAmount: 0 };

      const validation = await orderManager.validateOrder(invalidOrder);

      expect(validation.isValidAmounts).toBe(false);
      expect(validation.errors).toContain('Invalid order amounts');
    });
  });

  describe('order signing', () => {
    let validOrder: any;

    beforeEach(async () => {
      const validOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      validOrder = await orderManager.constructOrder(validOrderParams);
    });

    it('should sign a valid order', async () => {
      const signedOrder = await orderManager.signOrder(validOrder, mockSigner);

      expect(signedOrder.order).toBe(validOrder);
      expect(signedOrder.signature).toBe('0x' + 'a'.repeat(130));
      expect(signedOrder.orderHash).toBeDefined();
      expect(mockSigner.signTypedData).toHaveBeenCalledTimes(1);
    });

    it('should add cross-chain ID for TON orders', async () => {
      const crossChainParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600,
        tonDestination: {
          tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
          tonChainId: -3
        }
      };

      const crossChainOrder = await orderManager.constructOrder(crossChainParams);
      const signedOrder = await orderManager.signOrder(crossChainOrder, mockSigner);

      expect(signedOrder.crossChainId).toBeDefined();
      expect(signedOrder.relayerAddress).toBe(config.relayerAddress);
    });

    it('should throw error when signing invalid order', async () => {
      const invalidOrder = { 
        ...validOrder, 
        deadline: Math.floor(Date.now() / 1000) - 1 
      };

      await expect(orderManager.signOrder(invalidOrder, mockSigner))
        .rejects.toThrow(OrderError);
    });
  });

  describe('order book management', () => {
    let signedOrder: any;

    beforeEach(async () => {
      const validOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order = await orderManager.constructOrder(validOrderParams);
      signedOrder = await orderManager.signOrder(order, mockSigner);
    });

    it('should add order to order book', async () => {
      await orderManager.addToOrderBook(signedOrder);

      // Use the actual method to get the order ID
      const orderId = (orderManager as any).getOrderId(signedOrder.order);
      const retrievedOrder = orderManager.getOrder(orderId);

      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder!.order).toBe(signedOrder);
      expect(retrievedOrder!.status).toBe(OrderStatus.SIGNED);
    });

    it('should update order status', async () => {
      await orderManager.addToOrderBook(signedOrder);
      const orderId = (orderManager as any).getOrderId(signedOrder.order);

      await orderManager.updateOrderStatus(orderId, OrderStatus.MATCHED, '0xabc123');

      const retrievedOrder = orderManager.getOrder(orderId);
      expect(retrievedOrder!.status).toBe(OrderStatus.MATCHED);
    });

    it('should get orders by status', async () => {
      await orderManager.addToOrderBook(signedOrder);
      const orderId = (orderManager as any).getOrderId(signedOrder.order);

      await orderManager.updateOrderStatus(orderId, OrderStatus.EXECUTING);

      const executingOrders = orderManager.getOrdersByStatus(OrderStatus.EXECUTING);
      expect(executingOrders).toHaveLength(1);
      expect(executingOrders[0].status).toBe(OrderStatus.EXECUTING);
    });

    it('should cancel order by maker', async () => {
      await orderManager.addToOrderBook(signedOrder);
      const orderId = (orderManager as any).getOrderId(signedOrder.order);
      const makerAddress = signedOrder.order.maker;

      await orderManager.cancelOrder(orderId, makerAddress);

      const retrievedOrder = orderManager.getOrder(orderId);
      expect(retrievedOrder!.status).toBe(OrderStatus.CANCELLED);
    });

    it('should reject cancellation by non-maker', async () => {
      await orderManager.addToOrderBook(signedOrder);
      const orderId = (orderManager as any).getOrderId(signedOrder.order);
      const nonMakerAddress = '0x9999999999999999999999999999999999999999';

      await expect(orderManager.cancelOrder(orderId, nonMakerAddress))
        .rejects.toThrow(OrderError);
    });
  });

  describe('fee estimation', () => {
    it('should return zero fees for Ethereum-only orders', async () => {
      const validOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order = await orderManager.constructOrder(validOrderParams);
      const fees = await orderManager.estimateCrossChainFees(order);

      expect(fees.relayerFee).toBe(0);
      expect(fees.gasFeeEstimate).toBe(0);
      expect(fees.protocolFee).toBe(0);
      expect(fees.totalFee).toBe(0);
    });

    it('should estimate fees for cross-chain orders', async () => {
      const crossChainParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600,
        tonDestination: {
          tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
          tonChainId: -3,
          relayerFee: '500000000000000000'
        }
      };

      const order = await orderManager.constructOrder(crossChainParams);
      const fees = await orderManager.estimateCrossChainFees(order);

      expect(fees.relayerFee).toBeGreaterThan(0);
      expect(fees.gasFeeEstimate).toBeGreaterThan(0);
      expect(fees.protocolFee).toBeGreaterThan(0);
      expect(fees.totalFee).toBeGreaterThan(0);
    });
  });

  describe('expired order cleanup', () => {
    it('should clean up expired orders', async () => {
      // Create an order with future deadline first, then modify it to be expired
      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600 // Valid deadline initially
      };

      const order = await orderManager.constructOrder(orderParams);
      
      // Manually modify the deadline to make it expired for testing
      const expiredOrder = { ...order, deadline: Math.floor(Date.now() / 1000) - 1 };
      const signedExpiredOrder = await orderManager.signOrder(expiredOrder, mockSigner);
      
      await orderManager.addToOrderBook(signedExpiredOrder);

      // Clean up expired orders
      orderManager.cleanupExpiredOrders();

      const orderId = (orderManager as any).getOrderId(signedExpiredOrder.order);
      const retrievedOrder = orderManager.getOrder(orderId);
      expect(retrievedOrder!.status).toBe(OrderStatus.EXPIRED);
    });
  });

  describe('event emission', () => {
    it('should emit order events', async () => {
      const eventSpy = jest.fn();
      orderManager.on('orderEvent', eventSpy);

      const validOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xFb5462dEE4e00401980730f0AB17232fd3Ca9889',
        takerAsset: '0xA0625266ed7347d2B1c8984fE15Db4DAFb36F46F',
        makerAmount: '1000000000000000000',
        takerAmount: '2000000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order = await orderManager.constructOrder(validOrderParams);
      const signedOrder = await orderManager.signOrder(order, mockSigner);

      await orderManager.addToOrderBook(signedOrder);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CREATED,
          orderId: expect.any(String),
          timestamp: expect.any(Number)
        })
      );
    });
  });
}); 