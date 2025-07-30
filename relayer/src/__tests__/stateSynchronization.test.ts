import { StateSynchronization, OrderState, OrderInfo } from '../services/stateSynchronization';

describe('StateSynchronization', () => {
  let stateSyncer: StateSynchronization;
  
  beforeEach(() => {
    stateSyncer = new StateSynchronization({
      finalityConfig: {
        ethereumRequiredConfirmations: 2,
        tonRequiredConfirmations: 2,
        checkInterval: 100, // Fast for testing
        maxRetries: 3
      }
    });
  });

  afterEach(async () => {
    await stateSyncer.stop();
  });

  describe('initialization and control', () => {
    it('should start successfully', async () => {
      await stateSyncer.start();
      // Should not throw errors
    });

    it('should stop successfully', async () => {
      await stateSyncer.start();
      await stateSyncer.stop();
      // Should not throw errors
    });

    it('should handle starting when already running', async () => {
      await stateSyncer.start();
      await stateSyncer.start(); // Should not throw
    });

    it('should emit started and stopped events', async () => {
      const startedPromise = new Promise(resolve => stateSyncer.once('started', resolve));
      const stoppedPromise = new Promise(resolve => stateSyncer.once('stopped', resolve));

      await stateSyncer.start();
      await startedPromise;

      await stateSyncer.stop();
      await stoppedPromise;
    });
  });

  describe('order creation and tracking', () => {
    beforeEach(async () => {
      await stateSyncer.start();
    });

    it('should create order with correct initial state', async () => {
      const orderData = {
        orderId: 'test_order_1',
        orderHash: 'hash_123',
        direction: 'eth_to_ton' as const,
        hashlock: 'hashlock_123',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      };

      await stateSyncer.createOrder(orderData);

      const order = stateSyncer.getOrder('test_order_1');
      expect(order).toBeDefined();
      expect(order!.state).toBe(OrderState.PENDING);
      expect(order!.orderId).toBe('test_order_1');
      expect(order!.direction).toBe('eth_to_ton');
      expect(order!.ethereumFinalized).toBe(false);
      expect(order!.tonFinalized).toBe(false);
    });

    it('should emit orderCreated event', async () => {
      const orderCreatedPromise = new Promise(resolve => 
        stateSyncer.once('orderCreated', resolve)
      );

      const orderData = {
        orderId: 'test_order_2',
        orderHash: 'hash_456',
        direction: 'ton_to_eth' as const,
        hashlock: 'hashlock_456',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '2000000',
        initiator: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        recipient: '0x1234567890123456789012345678901234567890'
      };

      await stateSyncer.createOrder(orderData);
      await orderCreatedPromise;
    });
  });

  describe('state management', () => {
    beforeEach(async () => {
      await stateSyncer.start();
      
      await stateSyncer.createOrder({
        orderId: 'state_test_order',
        orderHash: 'hash_state',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_state',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });
    });

    it('should update order state correctly', async () => {
      await stateSyncer.updateOrderState(
        'state_test_order', 
        OrderState.ESCROWED_ETH, 
        'Test state update'
      );

      const order = stateSyncer.getOrder('state_test_order');
      expect(order!.state).toBe(OrderState.ESCROWED_ETH);
    });

    it('should emit stateChanged event', async () => {
      const stateChangedPromise = new Promise(resolve => 
        stateSyncer.once('stateChanged', resolve)
      );

      await stateSyncer.updateOrderState(
        'state_test_order', 
        OrderState.ESCROWED_ETH, 
        'Test state change'
      );

      const event = await stateChangedPromise as any;
      expect(event.orderId).toBe('state_test_order');
      expect(event.previousState).toBe(OrderState.PENDING);
      expect(event.newState).toBe(OrderState.ESCROWED_ETH);
    });

    it('should handle updating non-existent order gracefully', async () => {
      await stateSyncer.updateOrderState(
        'non_existent_order', 
        OrderState.FAILED, 
        'Should not crash'
      );
      
      expect(stateSyncer.getOrder('non_existent_order')).toBeUndefined();
    });
  });

  describe('chain-specific updates', () => {
    beforeEach(async () => {
      await stateSyncer.start();
      
      await stateSyncer.createOrder({
        orderId: 'chain_test_order',
        orderHash: 'hash_chain',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_chain',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });
    });

    it('should update Ethereum info and trigger state change', async () => {
      await stateSyncer.updateEthereumInfo('chain_test_order', {
        txHash: '0xeth_tx_hash',
        blockNumber: 12345,
        status: 'confirmed',
        confirmations: 5
      });

      const order = stateSyncer.getOrder('chain_test_order');
      expect(order!.ethereum).toBeDefined();
      expect(order!.ethereum!.txHash).toBe('0xeth_tx_hash');
      expect(order!.ethereum!.status).toBe('confirmed');
      expect(order!.state).toBe(OrderState.ESCROWED_ETH);
    });

    it('should update TON info and trigger state change', async () => {
      // First set up Ethereum escrow
      await stateSyncer.updateEthereumInfo('chain_test_order', {
        status: 'confirmed'
      });

      await stateSyncer.updateTonInfo('chain_test_order', {
        txHash: 'ton_tx_hash',
        blockNumber: 54321,
        status: 'confirmed',
        confirmations: 3
      });

      const order = stateSyncer.getOrder('chain_test_order');
      expect(order!.ton).toBeDefined();
      expect(order!.ton!.txHash).toBe('ton_tx_hash');
      expect(order!.ton!.status).toBe('confirmed');
      expect(order!.state).toBe(OrderState.ESCROWED_BOTH);
    });

    it('should emit chain-specific update events', async () => {
      const ethereumUpdatedPromise = new Promise(resolve => 
        stateSyncer.once('ethereumUpdated', resolve)
      );

      const tonUpdatedPromise = new Promise(resolve => 
        stateSyncer.once('tonUpdated', resolve)
      );

      await stateSyncer.updateEthereumInfo('chain_test_order', {
        status: 'confirmed'
      });

      await stateSyncer.updateTonInfo('chain_test_order', {
        status: 'confirmed'
      });

      await ethereumUpdatedPromise;
      await tonUpdatedPromise;
    });
  });

  describe('order fulfillment and refunds', () => {
    beforeEach(async () => {
      await stateSyncer.start();
      
      await stateSyncer.createOrder({
        orderId: 'fulfill_test_order',
        orderHash: 'hash_fulfill',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_fulfill',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });
    });

    it('should fulfill order with secret', async () => {
      await stateSyncer.fulfillOrder(
        'fulfill_test_order', 
        'secret_123', 
        'fulfill_tx_hash', 
        'ethereum'
      );

      const order = stateSyncer.getOrder('fulfill_test_order');
      expect(order!.state).toBe(OrderState.FULFILLED);
      expect(order!.secret).toBe('secret_123');
      expect(order!.ethereum!.txHash).toBe('fulfill_tx_hash');
    });

    it('should refund order on single chain', async () => {
      await stateSyncer.refundOrder(
        'fulfill_test_order', 
        'refund_tx_hash', 
        'ethereum'
      );

      const order = stateSyncer.getOrder('fulfill_test_order');
      expect(order!.state).toBe(OrderState.REFUNDED_ETH);
      expect(order!.ethereum!.txHash).toBe('refund_tx_hash');
    });

    it('should refund order on both chains', async () => {
      // Set up both chains as confirmed first
      await stateSyncer.updateEthereumInfo('fulfill_test_order', {
        status: 'confirmed'
      });
      
      await stateSyncer.updateTonInfo('fulfill_test_order', {
        status: 'confirmed'
      });

      // Refund on both chains
      await stateSyncer.refundOrder(
        'fulfill_test_order', 
        'refund_eth_tx', 
        'ethereum'
      );

      await stateSyncer.refundOrder(
        'fulfill_test_order', 
        'refund_ton_tx', 
        'ton'
      );

      const order = stateSyncer.getOrder('fulfill_test_order');
      expect(order!.state).toBe(OrderState.REFUNDED_BOTH);
    });
  });

  describe('query methods', () => {
    beforeEach(async () => {
      await stateSyncer.start();
      
      // Create orders in different states
      const orders = [
        { id: 'pending_order', state: OrderState.PENDING },
        { id: 'escrowed_order', state: OrderState.ESCROWED_ETH },
        { id: 'fulfilled_order', state: OrderState.FULFILLED },
        { id: 'failed_order', state: OrderState.FAILED }
      ];

      for (const orderInfo of orders) {
        await stateSyncer.createOrder({
          orderId: orderInfo.id,
          orderHash: `hash_${orderInfo.id}`,
          direction: 'eth_to_ton',
          hashlock: `hashlock_${orderInfo.id}`,
          timelock: Math.floor(Date.now() / 1000) + 3600,
          amount: '1000000',
          initiator: '0x1234567890123456789012345678901234567890',
          recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
        });

        if (orderInfo.state !== OrderState.PENDING) {
          await stateSyncer.updateOrderState(orderInfo.id, orderInfo.state, 'Test setup');
        }
      }
    });

    it('should get orders by state', () => {
      const pendingOrders = stateSyncer.getOrdersByState(OrderState.PENDING);
      const fulfilledOrders = stateSyncer.getOrdersByState(OrderState.FULFILLED);

      expect(pendingOrders).toHaveLength(1);
      expect(fulfilledOrders).toHaveLength(1);
      expect(pendingOrders[0].orderId).toBe('pending_order');
      expect(fulfilledOrders[0].orderId).toBe('fulfilled_order');
    });

    it('should get expired orders', async () => {
      // Create an expired order
      await stateSyncer.createOrder({
        orderId: 'expired_order',
        orderHash: 'hash_expired',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_expired',
        timelock: Math.floor(Date.now() / 1000) - 3600, // Already expired
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      const expiredOrders = stateSyncer.getExpiredOrders();
      expect(expiredOrders).toHaveLength(1);
      expect(expiredOrders[0].orderId).toBe('expired_order');
    });

    it('should get orders requiring attention', async () => {
      // Create an order that's been pending too long
      await stateSyncer.createOrder({
        orderId: 'stuck_order',
        orderHash: 'hash_stuck',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_stuck',
        timelock: Math.floor(Date.now() / 1000) - 3600, // Expired
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      const ordersRequiringAttention = stateSyncer.getOrdersRequiringAttention();
      expect(ordersRequiringAttention.length).toBeGreaterThan(0);
    });

    it('should get service statistics', () => {
      const stats = stateSyncer.getStats();
      
      expect(stats.totalOrders).toBe(4);
      expect(stats.ordersByState[OrderState.PENDING]).toBe(1);
      expect(stats.ordersByState[OrderState.FULFILLED]).toBe(1);
      expect(stats.ordersByState[OrderState.ESCROWED_ETH]).toBe(1);
      expect(stats.ordersByState[OrderState.FAILED]).toBe(1);
    });
  });

  describe('finality checking', () => {
    beforeEach(async () => {
      await stateSyncer.start();
      
      await stateSyncer.createOrder({
        orderId: 'finality_test_order',
        orderHash: 'hash_finality',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_finality',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });
    });

    it('should check expired orders automatically', async () => {
      // Create an expired order
      await stateSyncer.createOrder({
        orderId: 'auto_expire_order',
        orderHash: 'hash_auto_expire',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_auto_expire',
        timelock: Math.floor(Date.now() / 1000) - 1, // Just expired
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      // Wait for automatic check
      await new Promise(resolve => setTimeout(resolve, 200));

      const order = stateSyncer.getOrder('auto_expire_order');
      expect(order!.state).toBe(OrderState.FAILED);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await stateSyncer.start();
    });

    it('should clean up old completed orders', async () => {
      await stateSyncer.createOrder({
        orderId: 'cleanup_order',
        orderHash: 'hash_cleanup',
        direction: 'eth_to_ton',
        hashlock: 'hashlock_cleanup',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        amount: '1000000',
        initiator: '0x1234567890123456789012345678901234567890',
        recipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      await stateSyncer.updateOrderState('cleanup_order', OrderState.FULFILLED, 'Test completion');

      // Wait a tiny bit to ensure the order is considered old
      await new Promise(resolve => setTimeout(resolve, 1));

      // Clean up orders older than 0ms (all orders)
      stateSyncer.cleanupOldOrders(0);

      expect(stateSyncer.getOrder('cleanup_order')).toBeUndefined();
      expect(stateSyncer.getStats().totalOrders).toBe(0);
    });
  });
}); 