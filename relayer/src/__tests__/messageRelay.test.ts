import { MessageRelay, MessageStatus } from '../services/messageRelay';
import { TonRelayer } from '../relay/tonRelayer';
import { EthereumRelayer } from '../relay/ethereum';
import { TonSignatureService } from '../services/tonSignatureService';
import { MessageSerializer } from '../utils/messageValidation';
import { EthereumToTonMessage, TonToEthereumMessage } from '../types/messageTypes';

// Mock the relayers
jest.mock('../relay/tonRelayer');
jest.mock('../relay/ethereum');
jest.mock('../services/tonSignatureService');

describe('MessageRelay', () => {
  let messageRelay: MessageRelay;
  let mockTonRelayer: jest.Mocked<TonRelayer>;
  let mockEthereumRelayer: jest.Mocked<EthereumRelayer>;
  let mockTonSignatureService: jest.Mocked<TonSignatureService>;

  beforeEach(() => {
    // Create mock signature service
    mockTonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
    }) as jest.Mocked<TonSignatureService>;

    // Create mock relayers
    mockTonRelayer = new TonRelayer({
      tonSignatureService: mockTonSignatureService,
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      networkType: 'testnet'
    }) as jest.Mocked<TonRelayer>;

    // Mock signer for Ethereum relayer
    const mockSigner = {
      provider: {
        connection: { url: 'http://localhost:8545' }
      }
    } as any;

    mockEthereumRelayer = new EthereumRelayer(mockSigner, mockTonRelayer) as jest.Mocked<EthereumRelayer>;

    // Mock the methods we'll use
    mockTonRelayer.submitToTon = jest.fn();
    mockTonRelayer.verifyTonTransaction = jest.fn();
    mockEthereumRelayer.processFromTon = jest.fn();

    // Create message relay
    messageRelay = new MessageRelay({
      ethereumRelayer: mockEthereumRelayer,
      tonRelayer: mockTonRelayer,
      maxRetries: 2,
      retryDelay: 100, // Short delays for testing
      processingInterval: 50
    });
  });

  afterEach(async () => {
    await messageRelay.stop();
  });

  describe('initialization and control', () => {
    it('should start successfully', async () => {
      await messageRelay.start();
      expect(messageRelay.getPendingMessagesCount()).toBe(0);
    });

    it('should stop successfully', async () => {
      await messageRelay.start();
      await messageRelay.stop();
      // Should not throw errors
    });

    it('should handle starting when already running', async () => {
      await messageRelay.start();
      await messageRelay.start(); // Should not throw
    });

    it('should emit started and stopped events', async () => {
      const startedPromise = new Promise(resolve => messageRelay.once('started', resolve));
      const stoppedPromise = new Promise(resolve => messageRelay.once('stopped', resolve));

      await messageRelay.start();
      await startedPromise;

      await messageRelay.stop();
      await stoppedPromise;
    });
  });

  describe('message queueing', () => {
    beforeEach(async () => {
      await messageRelay.start();
    });

    it('should queue Ethereum to TON message', async () => {
      const message: EthereumToTonMessage = createValidEthToTonMessage();
      
      const messageId = await messageRelay.relayToTon(message);
      
      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^relay_\d+_[a-z0-9]+$/);
      
      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage).toBeDefined();
      expect(queuedMessage!.message).toEqual(message);
      expect(queuedMessage!.targetChain).toBe('ton');
      expect(queuedMessage!.status).toBe(MessageStatus.PENDING);
    });

    it('should queue TON to Ethereum message', async () => {
      const message: TonToEthereumMessage = createValidTonToEthMessage();
      
      const messageId = await messageRelay.relayToEthereum(message);
      
      expect(messageId).toBeDefined();
      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage!.targetChain).toBe('ethereum');
    });

    it('should reject invalid messages', async () => {
      const invalidMessage = {
        type: 'ETH_TO_TON_ESCROW',
        version: '1.0.0',
        // Missing required fields
      } as any;

      await expect(messageRelay.queueMessage(invalidMessage, 'ton')).rejects.toThrow('Invalid message');
    });

    it('should emit messageQueued event', async () => {
      const message = createValidEthToTonMessage();
      
      const queuedPromise = new Promise(resolve => 
        messageRelay.once('messageQueued', resolve)
      );

      await messageRelay.relayToTon(message);
      await queuedPromise;
    });
  });

  describe('message processing', () => {
    beforeEach(async () => {
      await messageRelay.start();
    });

    it('should successfully deliver message to TON', async () => {
      // Mock successful delivery
      mockTonRelayer.submitToTon.mockResolvedValue('ton_tx_123');
      mockTonRelayer.verifyTonTransaction.mockResolvedValue(true);

      const message = createValidEthToTonMessage();
      const messageId = await messageRelay.relayToTon(message);

      // Wait for processing
      await waitForMessageStatus(messageRelay, messageId, MessageStatus.DELIVERED);

      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage!.status).toBe(MessageStatus.DELIVERED);
      expect(queuedMessage!.attempts).toBe(1);
    });

    it('should successfully deliver message to Ethereum', async () => {
      // Mock successful delivery
      mockEthereumRelayer.processFromTon.mockResolvedValue();

      const message = createValidTonToEthMessage();
      const messageId = await messageRelay.relayToEthereum(message);

      // Wait for processing
      await waitForMessageStatus(messageRelay, messageId, MessageStatus.DELIVERED);

      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage!.status).toBe(MessageStatus.DELIVERED);
    });

    it('should retry failed messages', async () => {
      // Mock failed delivery
      mockTonRelayer.submitToTon.mockRejectedValue(new Error('Network error'));

      const message = createValidEthToTonMessage();
      const messageId = await messageRelay.relayToTon(message);

      // Wait for retry
      await waitForMessageStatus(messageRelay, messageId, MessageStatus.RETRY);

      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage!.status).toBe(MessageStatus.RETRY);
      expect(queuedMessage!.attempts).toBe(1);
    });

    it('should fail message after max retries', async () => {
      // Mock failed delivery
      mockTonRelayer.submitToTon.mockRejectedValue(new Error('Persistent error'));

      const message = createValidEthToTonMessage();
      const messageId = await messageRelay.relayToTon(message);

      // Wait for failure
      await waitForMessageStatus(messageRelay, messageId, MessageStatus.FAILED, 5000);

      const queuedMessage = messageRelay.getMessageStatus(messageId);
      expect(queuedMessage!.status).toBe(MessageStatus.FAILED);
      expect(queuedMessage!.attempts).toBe(2); // maxRetries = 2
    });

    it('should emit message delivery events', async () => {
      mockTonRelayer.submitToTon.mockResolvedValue('ton_tx_123');
      mockTonRelayer.verifyTonTransaction.mockResolvedValue(true);

      const deliveredPromise = new Promise(resolve => 
        messageRelay.once('messageDelivered', resolve)
      );

      const message = createValidEthToTonMessage();
      await messageRelay.relayToTon(message);

      await deliveredPromise;
    });

    it('should emit message failure events', async () => {
      mockTonRelayer.submitToTon.mockRejectedValue(new Error('Fatal error'));

      const failedPromise = new Promise(resolve => 
        messageRelay.once('messageFailed', resolve)
      );

      const message = createValidEthToTonMessage();
      await messageRelay.relayToTon(message);

      await failedPromise;
    });
  });

  describe('statistics and monitoring', () => {
    beforeEach(async () => {
      await messageRelay.start();
    });

    it('should track message statistics', async () => {
      const message1 = createValidEthToTonMessage();
      const message2 = createValidTonToEthMessage();

      await messageRelay.relayToTon(message1);
      await messageRelay.relayToEthereum(message2);

      const stats = messageRelay.getStats();
      expect(stats.totalMessages).toBe(2);
      expect(stats.pendingMessages).toBe(2);
    });

    it('should return pending messages count', async () => {
      const message = createValidEthToTonMessage();
      await messageRelay.relayToTon(message);

      expect(messageRelay.getPendingMessagesCount()).toBe(1);
    });

    it('should update statistics after message delivery', async () => {
      mockTonRelayer.submitToTon.mockResolvedValue('ton_tx_123');
      mockTonRelayer.verifyTonTransaction.mockResolvedValue(true);

      const message = createValidEthToTonMessage();
      const messageId = await messageRelay.relayToTon(message);

      await waitForMessageStatus(messageRelay, messageId, MessageStatus.DELIVERED);

      const stats = messageRelay.getStats();
      expect(stats.deliveredMessages).toBe(1);
      expect(stats.pendingMessages).toBe(0);
      expect(stats.averageDeliveryTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await messageRelay.start();
    });

    it('should clean up old completed messages', async () => {
      mockTonRelayer.submitToTon.mockResolvedValue('ton_tx_123');
      mockTonRelayer.verifyTonTransaction.mockResolvedValue(true);

      const message = createValidEthToTonMessage();
      const messageId = await messageRelay.relayToTon(message);

      await waitForMessageStatus(messageRelay, messageId, MessageStatus.DELIVERED);

      // Clean up messages older than 0ms (all messages)
      messageRelay.cleanupOldMessages(0);

      expect(messageRelay.getMessageStatus(messageId)).toBeUndefined();
      expect(messageRelay.getStats().totalMessages).toBe(0);
    });
  });
});

// Helper functions
function createValidEthToTonMessage(): EthereumToTonMessage {
  return {
    type: 'ETH_TO_TON_ESCROW',
    version: '1.0.0',
    messageId: MessageSerializer.generateMessageId('test'),
    orderId: 'test_order_123',
    ethereumTxHash: '0x' + 'a'.repeat(64),
    ethereumBlockNumber: 12345,
    ethereumLogIndex: 0,
    sender: '0x1234567890123456789012345678901234567890',
    tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
    amount: '1000000000',
    hashlock: 'a'.repeat(64),
    timelock: Math.floor(Date.now() / 1000) + 3600,
    proof: {
      merkleProof: [],
      blockHeader: '',
      txProof: '',
      receiptProof: ''
    },
    timestamp: Math.floor(Date.now() / 1000),
    relayerSignature: 'test_signature',
    nonce: Date.now()
  };
}

function createValidTonToEthMessage(): TonToEthereumMessage {
  return {
    type: 'TON_TO_ETH_ESCROW',
    version: '1.0.0',
    messageId: MessageSerializer.generateMessageId('test'),
    orderId: 'test_order_456',
    tonTxHash: 'ton_tx_' + 'b'.repeat(32),
    tonLt: '12345678',
    tonBlockSeqno: 54321,
    sender: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
    ethereumRecipient: '0x1234567890123456789012345678901234567890',
    amount: '2000000000',
    hashlock: 'b'.repeat(64),
    timelock: Math.floor(Date.now() / 1000) + 3600,
    proof: {
      merkleProof: '',
      blockHeader: '',
      transactionProof: '',
      messageProof: ''
    },
    timestamp: Math.floor(Date.now() / 1000),
    relayerSignature: 'test_signature',
    nonce: Date.now()
  };
}

async function waitForMessageStatus(
  relay: MessageRelay, 
  messageId: string, 
  status: MessageStatus, 
  timeout: number = 1000
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const message = relay.getMessageStatus(messageId);
    if (message && message.status === status) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error(`Message ${messageId} did not reach status ${status} within ${timeout}ms`);
} 