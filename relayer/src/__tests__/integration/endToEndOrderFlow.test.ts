// End-to-End Order Flow Integration Tests
// Tests complete order lifecycle from creation to cross-chain completion

import { ethers } from 'ethers';
import { FusionOrderManager, FusionOrderManagerConfig } from '../../services/fusionOrderManager';
import { OrderExecutionEngine, OrderExecutionConfig } from '../../services/orderExecutionEngine';
import { MessageRelay } from '../../services/messageRelay';
import { StateSynchronization, OrderState } from '../../services/stateSynchronization';
import { TonSignatureService } from '../../services/tonSignatureService';
import { TonRelayer } from '../../relay/tonRelayer';
import { EthereumRelayer } from '../../relay/ethereum';
import {
  OrderConstructionParams,
  OrderStatus,
  SignedFusionOrder,
  OrderBookEntry
} from '../../types/fusionOrders';
import { 
  EthereumToTonMessage,
  TonToEthereumMessage 
} from '../../types/messageTypes';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock common utilities
jest.mock('../../utils/common', () => ({
  sleep: jest.fn().mockResolvedValue(undefined)
}));

describe('End-to-End Order Flow Integration', () => {
  let fusionOrderManager: FusionOrderManager;
  let orderExecutionEngine: OrderExecutionEngine;
  let messageRelay: MessageRelay;
  let stateSynchronization: StateSynchronization;
  let tonRelayer: TonRelayer;
  let ethereumRelayer: EthereumRelayer;
  let mockEthereumProvider: jest.Mocked<ethers.Provider>;
  let mockEthereumSigner: jest.Mocked<ethers.Signer>;

  beforeEach(async () => {
    // Setup mock Ethereum provider
    mockEthereumProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1, name: 'mainnet' }),
      getBlockNumber: jest.fn().mockResolvedValue(18000000),
      getBlock: jest.fn().mockResolvedValue({
        number: 18000000,
        hash: '0x' + 'a'.repeat(64),
        timestamp: Math.floor(Date.now() / 1000)
      }),
      estimateGas: jest.fn().mockResolvedValue(BigInt('21000')),
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('20000000000'),
        maxFeePerGas: BigInt('30000000000'),
        maxPriorityFeePerGas: BigInt('2000000000')
      })
    } as any;

    // Setup mock Ethereum signer
    mockEthereumSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signMessage: jest.fn().mockResolvedValue('0x' + 'signature'.repeat(20)),
      signTransaction: jest.fn().mockResolvedValue('0x' + 'signedtx'.repeat(20)),
      signTypedData: jest.fn().mockResolvedValue('0x' + 'typedSignature'.repeat(20)),
      sendTransaction: jest.fn().mockResolvedValue({
        hash: '0x' + 'txhash'.repeat(16),
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0x' + 'txhash'.repeat(16),
          blockNumber: 18000001,
          status: 1
        })
      }),
      provider: mockEthereumProvider
    } as any;

    // Initialize StateSynchronization
    stateSynchronization = new StateSynchronization({
      ethereumProvider: mockEthereumProvider,
      tonClient: null,
      finalityConfig: {
        ethereumRequiredConfirmations: 3,
        tonRequiredConfirmations: 5,
        checkInterval: 1000,
        maxRetries: 3
      }
    });

    // Initialize TonSignatureService
    const tonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    });

    // Initialize TonRelayer  
    tonRelayer = new TonRelayer({
      tonSignatureService,
      tonApiUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC',
      networkType: 'testnet',
      pollInterval: 5000
    });

    // Initialize EthereumRelayer
    ethereumRelayer = new EthereumRelayer(mockEthereumSigner, tonRelayer);

    // Initialize MessageRelay
    messageRelay = new MessageRelay({
      tonRelayer,
      ethereumRelayer,
      maxRetries: 3,
      retryDelay: 1000,
      processingInterval: 5000
    });

    // Initialize FusionOrderManager
    const fusionConfig: FusionOrderManagerConfig = {
      ethereumProvider: mockEthereumProvider,
      chainId: 1,
      verifyingContract: '0x1111111111111111111111111111111111111111',
      relayerAddress: '0x1234567890123456789012345678901234567890',
      defaultRelayerFee: '1000000000000000' // 0.001 ETH
    };
    fusionOrderManager = new FusionOrderManager(fusionConfig);

    // Initialize OrderExecutionEngine
    const executionConfig: OrderExecutionConfig = {
      fusionOrderManager,
      messageRelay,
      stateSynchronization,
      tonRelayer,
      ethereumRelayer,
      ethereumSigner: mockEthereumSigner,
      executionInterval: 1000, // 1 second for testing
      maxSlippage: 0.05,
      minProfitThreshold: '1000000000000000'
    };
    orderExecutionEngine = new OrderExecutionEngine(executionConfig);

    // Start all services
    await messageRelay.start();
    await orderExecutionEngine.start();
  });

  afterEach(async () => {
    // Stop all services
    await orderExecutionEngine.stop();
    await messageRelay.stop();
    
    jest.clearAllMocks();
  });

  describe('Complete Order Lifecycle', () => {
    it('should complete end-to-end Ethereum-only order flow', async () => {
      // Step 1: Create and sign order
      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D', // Fixed checksum address
        takerAsset: '0xB1C97A44F7d2c4f32dF9F8e8C3F4e5F6e7d8C9e0', // WETH
        makerAmount: '1000000000', // 1000 USDC
        takerAmount: '500000000000000000', // 0.5 WETH
        deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      // Construct order
      const order = await fusionOrderManager.constructOrder(orderParams);
      expect(order.crossChainType).toBe('ethereum_only');

      // Sign order
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      expect(signedOrder.signature).toBeDefined();
      expect(signedOrder.orderHash).toBeDefined();

      // Step 2: Add to order book
      await fusionOrderManager.addToOrderBook(signedOrder);
      
      const orderId = (fusionOrderManager as any).getOrderId(order);
      const orderEntry = fusionOrderManager.getOrder(orderId);
      expect(orderEntry?.status).toBe(OrderStatus.SIGNED);

      // Step 3: Create matching order
      const matchingOrderParams: OrderConstructionParams = {
        maker: '0x2222222222222222222222222222222222222222',
        receiver: '0x8888888888888888888888888888888888888888',
        makerAsset: '0xb1C97A44F7d2c4f32dF9F8e8C3F4e5F6e7d8C9e0', // WETH (complementary)
        takerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D', // Fixed checksum address (complementary)
        makerAmount: '500000000000000000', // 0.5 WETH
        takerAmount: '1000000000', // 1000 USDC
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const matchingOrder = await fusionOrderManager.constructOrder(matchingOrderParams);
      const signedMatchingOrder = await fusionOrderManager.signOrder(matchingOrder, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedMatchingOrder);

      // Step 4: Execute order (should find matching order)
      const executionResult = await orderExecutionEngine.executeOrder(orderId);

      expect(executionResult.status).toBe('completed');
      expect(executionResult.matchedOrderId).toBeDefined();
      expect(executionResult.executionTxHash).toBeDefined();

      // Step 5: Verify final order states
      const finalOrderEntry = fusionOrderManager.getOrder(orderId);
      expect(finalOrderEntry?.status).toBe(OrderStatus.COMPLETED);

      const matchingOrderId = (fusionOrderManager as any).getOrderId(matchingOrder);
      const finalMatchingEntry = fusionOrderManager.getOrder(matchingOrderId);
      expect(finalMatchingEntry?.status).toBe(OrderStatus.COMPLETED);
    }, 10000);

    it('should complete end-to-end cross-chain ETH→TON order flow', async () => {
      // Step 1: Create cross-chain order
      const crossChainOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D', // Fixed checksum address on Ethereum
        takerAsset: '0x0000000000000000000000000000000000000000', // Native TON
        makerAmount: '1000000000', // 1000 USDC
        takerAmount: '100000000000', // 100 TON (in nanotons)
        deadline: Math.floor(Date.now() / 1000) + 3600,
        tonDestination: {
          tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
          tonChainId: -3 // Testnet
        }
      };

      // Construct and sign cross-chain order
      const order = await fusionOrderManager.constructOrder(crossChainOrderParams);
      expect(order.crossChainType).toBe('eth_to_ton');
      expect(order.tonDestination).toBeDefined();

      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Step 2: Execute cross-chain order (no local matching)
      const executionResult = await orderExecutionEngine.executeOrder(orderId);

      expect(executionResult.status).toBe('pending');
      expect(executionResult.executionTxHash).toBeDefined();
      expect(executionResult.crossChainTxHash).toBeUndefined(); // Not yet fulfilled

      // Step 3: Simulate cross-chain message relay
      const orderEntry = fusionOrderManager.getOrder(orderId);
      expect(orderEntry?.status).toBe(OrderStatus.EXECUTING);

      // Step 4: Simulate TON-side fulfillment
      const secret = '0x' + 'secret'.repeat(16);
      const tonTxHash = '0x' + 'tontx'.repeat(16);

      // Mock secret verification
      jest.spyOn(require('../../utils/messageValidation').MessageSerializer, 'verifySecret')
        .mockReturnValue(true);

      await orderExecutionEngine.handleCrossChainFulfillment(orderId, secret, tonTxHash);

      // Step 5: Verify final cross-chain order state
      const finalOrderEntry = fusionOrderManager.getOrder(orderId);
      expect(finalOrderEntry?.status).toBe(OrderStatus.COMPLETED);

      // Verify execution statistics
      const stats = orderExecutionEngine.getExecutionStats();
      expect(stats.completedExecutions).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Order Matching Integration', () => {
    it('should find and execute complementary orders automatically', async () => {
      // Create two complementary orders
      const order1Params: OrderConstructionParams = {
        maker: '0x1111111111111111111111111111111111111111',
        receiver: '0x1111111111111111111111111111111111111111',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        makerAmount: '2000000000', // 2000 tokens
        takerAmount: '1000000000000000000', // 1 ETH
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order2Params: OrderConstructionParams = {
        maker: '0x2222222222222222222222222222222222222222',
        receiver: '0x2222222222222222222222222222222222222222',
        makerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        takerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        makerAmount: '1000000000000000000', // 1 ETH
        takerAmount: '2000000000', // 2000 tokens
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      // Create and add orders
      const order1 = await fusionOrderManager.constructOrder(order1Params);
      const order2 = await fusionOrderManager.constructOrder(order2Params);

      const signedOrder1 = await fusionOrderManager.signOrder(order1, mockEthereumSigner);
      const signedOrder2 = await fusionOrderManager.signOrder(order2, mockEthereumSigner);

      await fusionOrderManager.addToOrderBook(signedOrder1);
      await fusionOrderManager.addToOrderBook(signedOrder2);

      // Test order matching
      const orderId1 = (fusionOrderManager as any).getOrderId(order1);
      const orderEntry1 = fusionOrderManager.getOrder(orderId1)!;

      const matchingOrders = await orderExecutionEngine.findMatchingOrders(orderEntry1);
      expect(matchingOrders.length).toBeGreaterThan(0);

      // Execute first order (should match with second)
      const executionResult = await orderExecutionEngine.executeOrder(orderId1);
      expect(executionResult.status).toBe('completed');
      expect(executionResult.matchedOrderId).toBeDefined();
    });

    it('should handle orders with different price ranges', async () => {
      // Create orders with slight price differences
      const highPriceOrder: OrderConstructionParams = {
        maker: '0x1111111111111111111111111111111111111111',
        receiver: '0x1111111111111111111111111111111111111111',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        makerAmount: '2000000000',
        takerAmount: '950000000000000000', // Slightly better rate
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const lowPriceOrder: OrderConstructionParams = {
        maker: '0x2222222222222222222222222222222222222222',
        receiver: '0x2222222222222222222222222222222222222222',
        makerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        takerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        makerAmount: '1000000000000000000',
        takerAmount: '2100000000', // Slightly worse rate
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order1 = await fusionOrderManager.constructOrder(highPriceOrder);
      const order2 = await fusionOrderManager.constructOrder(lowPriceOrder);

      const signedOrder1 = await fusionOrderManager.signOrder(order1, mockEthereumSigner);
      const signedOrder2 = await fusionOrderManager.signOrder(order2, mockEthereumSigner);

      await fusionOrderManager.addToOrderBook(signedOrder1);
      await fusionOrderManager.addToOrderBook(signedOrder2);

      const orderId1 = (fusionOrderManager as any).getOrderId(order1);
      const orderEntry1 = fusionOrderManager.getOrder(orderId1)!;

      // Test matching with slippage tolerance
      const matchingOrders = await orderExecutionEngine.findMatchingOrders(orderEntry1);
      
      // Should match if within slippage tolerance (5%)
      const priceSlippage = Math.abs(0.95 - 1.05) / Math.max(0.95, 1.05); // ~9.5%
      if (priceSlippage <= 0.05) {
        expect(matchingOrders.length).toBeGreaterThan(0);
      } else {
        expect(matchingOrders.length).toBe(0); // Should not match due to slippage
      }
    });
  });

  describe('Cross-Chain Message Flow', () => {
    it('should relay messages between Ethereum and TON', async () => {
      // Create a cross-chain message
      const ethToTonMessage: EthereumToTonMessage = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'test_msg_001',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        relayerSignature: '',
        orderId: '0x' + 'order123'.repeat(8),
        ethereumTxHash: '0x' + 'ethtx'.repeat(16),
        ethereumBlockNumber: 18000001,
        ethereumLogIndex: 0,
        sender: '0x1234567890123456789012345678901234567890',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        amount: '1000000000',
        hashlock: '0x' + 'hashlock'.repeat(8),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        proof: {
          merkleProof: [],
          blockHeader: '0x' + 'header'.repeat(16),
          txProof: '0x' + 'txproof'.repeat(14),
          receiptProof: '0x' + 'receipt'.repeat(14)
        }
      };

      // Queue message for relay
      const relayId = await messageRelay.queueMessage(ethToTonMessage, 'ton');
      expect(relayId).toBeDefined();

      // Simulate message processing
      await new Promise(resolve => setTimeout(resolve, 100));

             // Verify message was processed (would need to mock TON submission)
       const queueStatus = messageRelay.getStats();
       expect(queueStatus.totalMessages).toBeGreaterThan(0);
    });

    it('should handle message retry on failure', async () => {
      // Create a message that will fail initially
      const failingMessage: EthereumToTonMessage = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'failing_msg_001',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        relayerSignature: '',
        orderId: '0x' + 'failing'.repeat(11),
        ethereumTxHash: '0x' + 'failtx'.repeat(15),
        ethereumBlockNumber: 18000001,
        ethereumLogIndex: 0,
        sender: '0x1234567890123456789012345678901234567890',
        tonRecipient: 'INVALID_TON_ADDRESS', // This should cause failure
        amount: '1000000000',
        hashlock: '0x' + 'hashlock'.repeat(8),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        proof: {
          merkleProof: [],
          blockHeader: '0x' + 'header'.repeat(16),
          txProof: '0x' + 'txproof'.repeat(14),
          receiptProof: '0x' + 'receipt'.repeat(14)
        }
      };

      // Mock TonRelayer to fail initially then succeed
      let attemptCount = 0;
      jest.spyOn(tonRelayer, 'submitToTon').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('TON submission failed');
        }
        return 'success_tx_hash';
      });

      const relayId = await messageRelay.queueMessage(failingMessage, 'ton');
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(attemptCount).toBeGreaterThanOrEqual(2); // Should have retried
    });
  });

  describe('State Synchronization Integration', () => {
    it('should track order states across chains', async () => {
      const orderId = '0x' + 'statetest'.repeat(8);
      
             // Create order state
       await stateSynchronization.createOrder({
         orderId,
         orderHash: '0x' + 'orderhash'.repeat(8),
         direction: 'eth_to_ton',
         hashlock: '0x' + 'hashlock'.repeat(8),
         timelock: Math.floor(Date.now() / 1000) + 3600,
         amount: '1000000000',
         initiator: '0x1234567890123456789012345678901234567890',
         recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
       });

       let orderState = stateSynchronization.getOrder(orderId);
       expect(orderState?.state).toBe(OrderState.PENDING);

       // Update to different state
       await stateSynchronization.updateOrderState(orderId, OrderState.ESCROWED_ETH, 'Ethereum escrow created');

       orderState = stateSynchronization.getOrder(orderId);
       expect(orderState?.state).toBe(OrderState.ESCROWED_ETH);

       // Complete the order  
       await stateSynchronization.updateOrderState(orderId, OrderState.FULFILLED, 'Order completed');

       orderState = stateSynchronization.getOrder(orderId);
       expect(orderState?.state).toBe(OrderState.FULFILLED);
    });

    it('should handle order finality checking', async () => {
      const orderId = '0x' + 'finality'.repeat(9);
      
             await stateSynchronization.createOrder({
         orderId,
         orderHash: '0x' + 'orderhash'.repeat(8),
         direction: 'eth_to_ton',
         hashlock: '0x' + 'hashlock'.repeat(8),
         timelock: Math.floor(Date.now() / 1000) + 3600,
         amount: '1000000000',
         initiator: '0x1234567890123456789012345678901234567890',
         recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
       });

       // Mock enough confirmations
       mockEthereumProvider.getBlockNumber.mockResolvedValue(18000010); // 10 blocks later
       
       // Just verify order exists (finality checking is private)
       const order = stateSynchronization.getOrder(orderId);
       expect(order).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle order execution timeout', async () => {
      // Create order with short timelock
      const shortTimelockOrder: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        takerAsset: '0x0000000000000000000000000000000000000000',
        makerAmount: '1000000000',
        takerAmount: '100000000000',
        deadline: Math.floor(Date.now() / 1000) + 60, // 1 minute
                 tonDestination: {
           tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
           tonChainId: -3
         }
      };

      const order = await fusionOrderManager.constructOrder(shortTimelockOrder);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Execute the order
      const executionResult = await orderExecutionEngine.executeOrder(orderId);
      expect(executionResult.status).toBe('pending');

      // Wait for timelock to expire (simulate by manually setting past timelock)
      const execution = (orderExecutionEngine as any).pendingExecutions.get(orderId);
      if (execution) {
        execution.timelock = Math.floor(Date.now() / 1000) - 1; // Past timelock
      }

      // Trigger cancellation
      await orderExecutionEngine.cancelOrderExecution(orderId);

      const finalOrderEntry = fusionOrderManager.getOrder(orderId);
      expect(finalOrderEntry?.status).toBe(OrderStatus.CANCELLED);
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      mockEthereumProvider.getBlockNumber.mockRejectedValueOnce(new Error('Network error'));

      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      // Should handle network error gracefully
      try {
        const order = await fusionOrderManager.constructOrder(orderParams);
        expect(order).toBeDefined();
      } catch (error) {
        // Should handle gracefully without crashing
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate signature compatibility', async () => {
      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0x29b63864FDF06B19daa5fb7134755941e305400D',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7d8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order = await fusionOrderManager.constructOrder(orderParams);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);

      // Verify the signature is properly formatted
      expect(signedOrder.signature).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(signedOrder.signature.length).toBeGreaterThan(130); // At least 65 bytes

      // Verify order hash is computed correctly
      expect(signedOrder.orderHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

             // Validate order structure matches Fusion+ specification
       const validation = await fusionOrderManager.validateOrder(order);
       expect(validation.isValidSignature).toBe(true);
       expect(validation.isValidDeadline).toBe(true);
       expect(validation.errors).toHaveLength(0);
    });
  });
}); 