// Error Scenarios and Edge Cases Integration Tests
// Tests system behavior under various failure conditions and edge cases

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
  OrderError,
  OrderErrorCode
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

describe('Error Scenarios and Edge Cases Integration', () => {
  let fusionOrderManager: FusionOrderManager;
  let orderExecutionEngine: OrderExecutionEngine;
  let messageRelay: MessageRelay;
  let stateSynchronization: StateSynchronization;
  let tonRelayer: TonRelayer;
  let ethereumRelayer: EthereumRelayer;
  let mockEthereumProvider: jest.Mocked<ethers.Provider>;
  let mockEthereumSigner: jest.Mocked<ethers.Signer>;

  beforeEach(async () => {
    // Setup mock Ethereum provider with controllable behavior
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
      }),
      call: jest.fn().mockResolvedValue('0x'),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 1,
        transactionHash: '0x' + 'txhash'.repeat(16),
        blockNumber: 18000001
      })
    } as any;

    // Setup mock Ethereum signer with controllable behavior
    mockEthereumSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signMessage: jest.fn().mockResolvedValue('0x' + 'signature'.repeat(20)),
      signTransaction: jest.fn().mockResolvedValue('0x' + 'signedtx'.repeat(20)),
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

    // Initialize all components
    stateSynchronization = new StateSynchronization({
      ethereumProvider: mockEthereumProvider,
      tonClient: null,
      finalityConfig: {
        ethereumRequiredConfirmations: 3,
        tonRequiredConfirmations: 5,
        checkInterval: 100,
        maxRetries: 3
      }
    });

    const tonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    });

    tonRelayer = new TonRelayer({
      tonSignatureService,
      tonApiUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC',
      networkType: 'testnet',
      pollInterval: 1000 // Faster for testing
    });

    ethereumRelayer = new EthereumRelayer(mockEthereumSigner, tonRelayer);

    messageRelay = new MessageRelay({
      tonRelayer,
      ethereumRelayer,
      maxRetries: 3,
      retryDelay: 100, // Faster for testing
      processingInterval: 1000
    });

    const fusionConfig: FusionOrderManagerConfig = {
      ethereumProvider: mockEthereumProvider,
      chainId: 1,
      verifyingContract: '0xFusionContract1234567890123456789012345678',
      relayerAddress: '0x1234567890123456789012345678901234567890',
      defaultRelayerFee: '1000000000000000'
    };
    fusionOrderManager = new FusionOrderManager(fusionConfig);

    const executionConfig: OrderExecutionConfig = {
      fusionOrderManager,
      messageRelay,
      stateSynchronization,
      tonRelayer,
      ethereumRelayer,
      ethereumSigner: mockEthereumSigner,
      executionInterval: 500, // Faster for testing
      maxSlippage: 0.05,
      minProfitThreshold: '1000000000000000'
    };
    orderExecutionEngine = new OrderExecutionEngine(executionConfig);

    await messageRelay.start();
    await orderExecutionEngine.start();
  });

  afterEach(async () => {
    await orderExecutionEngine.stop();
    await messageRelay.stop();
    jest.clearAllMocks();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle Ethereum provider connection failures', async () => {
      // Mock provider failure
      mockEthereumProvider.getBlockNumber.mockRejectedValue(new Error('Connection failed'));

      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      // Order construction should handle provider errors gracefully
      try {
        await fusionOrderManager.constructOrder(orderParams);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Connection failed');
      }

      // Restore provider after failure
      mockEthereumProvider.getBlockNumber.mockResolvedValue(18000000);
      
      // Should work normally after restoration
      const order = await fusionOrderManager.constructOrder(orderParams);
      expect(order).toBeDefined();
    });

         it('should handle transaction submission failures with retries', async () => {
       // Mock transaction submission to fail initially
       let attempts = 0;
       mockEthereumSigner.sendTransaction.mockImplementation(async () => {
         attempts++;
         if (attempts < 3) {
           throw new Error('Transaction failed');
         }
         return {
           hash: '0x' + 'txhash'.repeat(16),
           wait: jest.fn().mockResolvedValue({
             transactionHash: '0x' + 'txhash'.repeat(16),
             blockNumber: 18000001,
             status: 1
           })
         } as any;
       });

       const orderParams: OrderConstructionParams = {
         maker: '0x1234567890123456789012345678901234567890',
         receiver: '0x9876543210987654321098765432109876543210',
         makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
         takerAsset: '0x0000000000000000000000000000000000000000',
         makerAmount: '1000000000',
         takerAmount: '100000000000',
         deadline: Math.floor(Date.now() / 1000) + 3600,
         tonDestination: {
           tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
           tonChainId: -3
         }
       };

      const order = await fusionOrderManager.constructOrder(orderParams);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

             // Execution should eventually succeed after retries
       const executionResult = await orderExecutionEngine.executeOrder(orderId);
       expect(executionResult.status).toBe('pending');
       expect(attempts).toBeGreaterThanOrEqual(3); // Should have retried
     });

     it('should handle TON network failures', async () => {
       // Mock TON relayer to fail
       jest.spyOn(tonRelayer, 'submitToTon').mockRejectedValue(new Error('TON network error'));

       const message: EthereumToTonMessage = {
         type: 'ETH_TO_TON_ESCROW' as const,
         version: '1.0.0',
         messageId: 'test_fail_001',
         timestamp: Math.floor(Date.now() / 1000),
         nonce: 1,
         relayerSignature: '',
         orderId: '0x' + 'order123'.repeat(8),
         ethereumTxHash: '0x' + 'ethtx'.repeat(16),
         ethereumBlockNumber: 18000001,
         ethereumLogIndex: 0,
         sender: '0x1234567890123456789012345678901234567890',
         tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
         amount: '1000000000',
         hashlock: '0x' + 'hashlock'.repeat(8),
         timelock: Math.floor(Date.now() / 1000) + 3600,
         tokenAddress: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
         proof: {
           merkleProof: [],
           blockHeader: '0x' + 'header'.repeat(16),
           txProof: '0x' + 'txproof'.repeat(14),
           receiptProof: '0x' + 'receipt'.repeat(14)
         }
       };

       await messageRelay.queueMessage(message, 'ton');

       // Wait for processing and retries
       await new Promise(resolve => setTimeout(resolve, 1000));

       // Message should be queued for retry
       const queueStatus = messageRelay.getStats();
       expect(queueStatus.failedMessages).toBeGreaterThan(0);
    });
  });

  describe('Invalid Data Scenarios', () => {
    it('should reject orders with invalid Ethereum addresses', async () => {
      const invalidOrderParams: OrderConstructionParams = {
        maker: 'invalid_ethereum_address',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      await expect(fusionOrderManager.constructOrder(invalidOrderParams))
        .rejects.toThrow(OrderError);
    });

         it('should reject orders with invalid TON addresses', async () => {
       const invalidTonOrderParams: OrderConstructionParams = {
         maker: '0x1234567890123456789012345678901234567890',
         receiver: '0x9876543210987654321098765432109876543210',
         makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
         takerAsset: '0x0000000000000000000000000000000000000000',
         makerAmount: '1000000000',
         takerAmount: '100000000000',
         deadline: Math.floor(Date.now() / 1000) + 3600,
         tonDestination: {
           tonRecipient: 'INVALID_TON_ADDRESS',
           tonChainId: -3
         }
       };

      await expect(fusionOrderManager.constructOrder(invalidTonOrderParams))
        .rejects.toThrow(OrderError);
    });

    it('should reject orders with expired deadlines', async () => {
      const expiredOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      await expect(fusionOrderManager.constructOrder(expiredOrderParams))
        .rejects.toThrow(OrderError);
    });

    it('should reject orders with zero amounts', async () => {
      const zeroAmountOrderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '0', // Invalid: zero amount
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      await expect(fusionOrderManager.constructOrder(zeroAmountOrderParams))
        .rejects.toThrow(OrderError);
    });

    it('should handle malformed cross-chain messages gracefully', async () => {
      const malformedMessage = {
        type: 'ETH_TO_TON_ESCROW',
        // Missing required fields
        messageId: 'malformed_001'
      } as any;

      // Should handle gracefully without crashing
      try {
        await messageRelay.queueMessage(malformedMessage, 'ton');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Race Condition Scenarios', () => {
    it('should handle concurrent order execution attempts', async () => {
      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order = await fusionOrderManager.constructOrder(orderParams);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Simulate concurrent execution attempts
      const executionPromises = [
        orderExecutionEngine.executeOrder(orderId),
        orderExecutionEngine.executeOrder(orderId),
        orderExecutionEngine.executeOrder(orderId)
      ];

      const results = await Promise.allSettled(executionPromises);

      // Only one should succeed, others should fail gracefully
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(failed).toBe(2);
    });

    it('should handle concurrent order book updates', async () => {
      const order1Params: OrderConstructionParams = {
        maker: '0x1111111111111111111111111111111111111111',
        receiver: '0x1111111111111111111111111111111111111111',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order2Params: OrderConstructionParams = {
        maker: '0x2222222222222222222222222222222222222222',
        receiver: '0x2222222222222222222222222222222222222222',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const order1 = await fusionOrderManager.constructOrder(order1Params);
      const order2 = await fusionOrderManager.constructOrder(order2Params);

      const signedOrder1 = await fusionOrderManager.signOrder(order1, mockEthereumSigner);
      const signedOrder2 = await fusionOrderManager.signOrder(order2, mockEthereumSigner);

      // Add orders concurrently
      const addPromises = [
        fusionOrderManager.addToOrderBook(signedOrder1),
        fusionOrderManager.addToOrderBook(signedOrder2)
      ];

      await Promise.all(addPromises);

      // Both orders should be in the order book
      const signedOrders = fusionOrderManager.getOrdersByStatus(OrderStatus.SIGNED);
      expect(signedOrders.length).toBe(2);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle order book overflow gracefully', async () => {
      // Create many orders to test order book limits
      const createOrderPromises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const orderParams: OrderConstructionParams = {
          maker: `0x${i.toString(16).padStart(40, '0')}`,
          receiver: '0x9876543210987654321098765432109876543210',
          makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
          takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
          makerAmount: (1000000000 + i).toString(),
          takerAmount: '500000000000000000',
          deadline: Math.floor(Date.now() / 1000) + 3600
        };

        createOrderPromises.push(
          fusionOrderManager.constructOrder(orderParams)
            .then(order => fusionOrderManager.signOrder(order, mockEthereumSigner))
            .then(signedOrder => fusionOrderManager.addToOrderBook(signedOrder))
        );
      }

      // Should handle creating many orders without crashing
      await Promise.allSettled(createOrderPromises);

      const orderCount = fusionOrderManager.getOrdersByStatus(OrderStatus.SIGNED).length;
      expect(orderCount).toBeGreaterThan(0);
    });

    it('should handle message queue overflow', async () => {
      // Create many messages to test queue limits
      const messages: EthereumToTonMessage[] = [];

      for (let i = 0; i < 50; i++) {
        messages.push({
          type: 'ETH_TO_TON_ESCROW' as const,
          version: '1.0.0',
          messageId: `overflow_test_${i}`,
          timestamp: Math.floor(Date.now() / 1000),
          nonce: i,
          relayerSignature: '',
          orderId: '0x' + i.toString(16).padStart(64, '0'),
          ethereumTxHash: '0x' + 'ethtx'.repeat(16),
          ethereumBlockNumber: 18000001 + i,
          ethereumLogIndex: 0,
          sender: '0x1234567890123456789012345678901234567890',
          tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
          amount: (1000000000 + i).toString(),
          hashlock: '0x' + 'hashlock'.repeat(8),
          timelock: Math.floor(Date.now() / 1000) + 3600,
          tokenAddress: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
          proof: {
            merkleProof: [],
            blockHeader: '0x' + 'header'.repeat(16),
            txProof: '0x' + 'txproof'.repeat(14),
            receiptProof: '0x' + 'receipt'.repeat(14)
          }
        });
      }

      // Queue all messages
      const queuePromises = messages.map(msg => 
        messageRelay.queueMessage(msg, 'ton')
      );

             await Promise.allSettled(queuePromises);

       const queueStatus = messageRelay.getStats();
       expect(queueStatus.totalMessages).toBeGreaterThan(0);
    });
  });

  describe('State Corruption Scenarios', () => {
    it('should handle corrupted order state gracefully', async () => {
      const orderId = '0x' + 'corrupt'.repeat(12);

             // Create valid order state first
       await stateSynchronization.createOrder({
         orderId,
         orderHash: '0x' + 'orderhash'.repeat(8),
         direction: 'eth_to_ton',
         hashlock: '0x' + 'hashlock'.repeat(8),
         timelock: Math.floor(Date.now() / 1000) + 3600,
         amount: '1000000000',
         initiator: '0x1234567890123456789012345678901234567890',
         recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL'
       });

       // Simulate state corruption by updating with invalid data
       try {
         await stateSynchronization.updateOrderState(orderId, 'invalid_status' as any, 'Test corruption');
       } catch (error) {
         expect(error).toBeInstanceOf(Error);
       }

       // Order state should still be retrievable and valid
       const orderState = stateSynchronization.getOrder(orderId);
       expect(orderState).toBeDefined();
       expect(orderState?.state).toBe(OrderState.PENDING); // Should maintain last valid state
    });

         it('should recover from partial execution failures', async () => {
       const orderParams: OrderConstructionParams = {
         maker: '0x1234567890123456789012345678901234567890',
         receiver: '0x9876543210987654321098765432109876543210',
         makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
         takerAsset: '0x0000000000000000000000000000000000000000',
         makerAmount: '1000000000',
         takerAmount: '100000000000',
         deadline: Math.floor(Date.now() / 1000) + 3600,
         tonDestination: {
           tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
           tonChainId: -3
         }
       };

      const order = await fusionOrderManager.constructOrder(orderParams);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Start execution
      const executionResult = await orderExecutionEngine.executeOrder(orderId);
      expect(executionResult.status).toBe('pending');

      // Simulate failure after Ethereum transaction but before TON relay
      const execution = (orderExecutionEngine as any).pendingExecutions.get(orderId);
      expect(execution).toBeDefined();

      // Simulate recovery mechanism
      await orderExecutionEngine.handleCrossChainFulfillment(
        orderId,
        '0x' + 'recovery_secret'.repeat(6),
        '0x' + 'recovery_tx'.repeat(14)
      );

      const finalOrderEntry = fusionOrderManager.getOrder(orderId);
      expect(finalOrderEntry?.status).toBe(OrderStatus.FAILED); // Should handle invalid secret
    });
  });

  describe('Time-based Edge Cases', () => {
    it('should handle orders created near deadline', async () => {
      const nearDeadlineParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 60 // Only 1 minute
      };

      const order = await fusionOrderManager.constructOrder(nearDeadlineParams);
      expect(order).toBeDefined();

      // Wait a bit to approach deadline
      await new Promise(resolve => setTimeout(resolve, 100));

      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Should still be able to execute if within deadline
      const executionResult = await orderExecutionEngine.executeOrder(orderId);
      expect(executionResult).toBeDefined();
    });

    it('should handle clock drift scenarios', async () => {
      // Mock system time drift
      const originalNow = Date.now;
      let timeOffset = 0;

      Date.now = jest.fn(() => originalNow() + timeOffset);

      const orderParams: OrderConstructionParams = {
        maker: '0x1234567890123456789012345678901234567890',
        receiver: '0x9876543210987654321098765432109876543210',
        makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
        takerAsset: '0xB1c97a44F7D2C4F32df9F8e8c3f4e5f6e7D8c9e0',
        makerAmount: '1000000000',
        takerAmount: '500000000000000000',
        deadline: Math.floor(originalNow() / 1000) + 3600
      };

      const order = await fusionOrderManager.constructOrder(orderParams);

      // Simulate clock drift forward
      timeOffset = 10000; // 10 seconds forward

      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      // Should handle time drift gracefully
      const orderId = (fusionOrderManager as any).getOrderId(order);
      const orderEntry = fusionOrderManager.getOrder(orderId);
      expect(orderEntry).toBeDefined();

      // Restore original Date.now
      Date.now = originalNow;
    });

         it('should handle extremely long execution times', async () => {
       const orderParams: OrderConstructionParams = {
         maker: '0x1234567890123456789012345678901234567890',
         receiver: '0x9876543210987654321098765432109876543210',
         makerAsset: '0xA0b86a33E6C1B3E21ce8E7b70b2e3e3a6D8D3f1b',
         takerAsset: '0x0000000000000000000000000000000000000000',
         makerAmount: '1000000000',
         takerAmount: '100000000000',
         deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
         tonDestination: {
           tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
           tonChainId: -3
         }
       };

      const order = await fusionOrderManager.constructOrder(orderParams);
      const signedOrder = await fusionOrderManager.signOrder(order, mockEthereumSigner);
      await fusionOrderManager.addToOrderBook(signedOrder);

      const orderId = (fusionOrderManager as any).getOrderId(order);

      // Start execution
      const executionResult = await orderExecutionEngine.executeOrder(orderId);
      expect(executionResult.status).toBe('pending');

      // Simulate very long execution time by manually adjusting timelock
      const execution = (orderExecutionEngine as any).pendingExecutions.get(orderId);
      if (execution) {
        execution.timelock = Math.floor(Date.now() / 1000) - 1; // Force timeout
      }

      // Should handle timeout gracefully
      await orderExecutionEngine.cancelOrderExecution(orderId);
      
      const finalOrderEntry = fusionOrderManager.getOrder(orderId);
      expect(finalOrderEntry?.status).toBe(OrderStatus.CANCELLED);
    });
  });
}); 