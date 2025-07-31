import { TonSignatureService } from '../services/tonSignatureService';
import { TonRelayer } from '../relay/tonRelayer';
import { MessageSerializer } from '../utils/messageValidation';
import { EthereumToTonMessage, TonToEthereumMessage } from '../types/messageTypes';

describe('TonSignatureService', () => {
  let tonSignatureService: TonSignatureService;

  beforeEach(() => {
    tonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
      privateKey: 'test_private_key'
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      await tonSignatureService.initialize();
      expect(tonSignatureService.isServiceInitialized()).toBe(true);
    });

    it('should throw error when wallet address is missing', async () => {
      const invalidService = new TonSignatureService({
        networkType: 'testnet',
        tonApiUrl: 'https://testnet.toncenter.com/api/v2'
      });

      await expect(invalidService.initialize()).rejects.toThrow('TON wallet address is required');
    });

    it('should get wallet address after initialization', async () => {
      await tonSignatureService.initialize();
      expect(tonSignatureService.getWalletAddress()).toBe('EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=');
    });

    it('should get network type', () => {
      expect(tonSignatureService.getNetworkType()).toBe('testnet');
    });
  });

  describe('message signing', () => {
    beforeEach(async () => {
      await tonSignatureService.initialize();
    });

    it('should sign a cross-chain message', async () => {
      const message = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'test_message_123',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        orderId: 'test_order_123',
        ethereumTxHash: '0x123456789abcdef',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const signature = await tonSignatureService.signMessage(message);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.startsWith('ton_sig_')).toBe(true);
    });

    it('should throw error when signing without initialization', async () => {
      const uninitializedService = new TonSignatureService({
        networkType: 'testnet',
        tonApiUrl: 'https://testnet.toncenter.com/api/v2',
        walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      const message = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'test_message_123',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        orderId: 'test_order_123',
        ethereumTxHash: '0x123456789abcdef',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      await expect(uninitializedService.signMessage(message)).rejects.toThrow('TON signature service not initialized');
    });

    it('should verify signatures correctly', async () => {
      const message = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'test_message_123',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        orderId: 'test_order_123',
        ethereumTxHash: '0x123456789abcdef',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const signature = await tonSignatureService.signMessage(message);
      const isValid = await tonSignatureService.verifySignature(message, signature);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', async () => {
      const message = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: '1.0.0',
        messageId: 'test_message_123',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 1,
        orderId: 'test_order_123',
        ethereumTxHash: '0x123456789abcdef',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const invalidSignature = 'invalid_signature';
      const isValid = await tonSignatureService.verifySignature(message, invalidSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('transaction handling', () => {
    beforeEach(async () => {
      await tonSignatureService.initialize();
    });

    it('should submit transaction and return hash', async () => {
      const txData = { test: 'data' };
      const txHash = await tonSignatureService.submitTransaction(txData);
      
      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
      expect(txHash.startsWith('ton_tx_')).toBe(true);
    });

    it('should get transaction status', async () => {
      const txHash = 'ton_tx_123456789_abc';
      const status = await tonSignatureService.getTransactionStatus(txHash);
      
      expect(status).toBe('confirmed'); // Mocked to return confirmed
    });

    it('should throw error when submitting transaction without initialization', async () => {
      const uninitializedService = new TonSignatureService({
        networkType: 'testnet',
        tonApiUrl: 'https://testnet.toncenter.com/api/v2',
        walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL='
      });

      const txData = { test: 'data' };
      await expect(uninitializedService.submitTransaction(txData)).rejects.toThrow('TON signature service not initialized');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await tonSignatureService.initialize();
      expect(tonSignatureService.isServiceInitialized()).toBe(true);
      
      await tonSignatureService.cleanup();
      expect(tonSignatureService.isServiceInitialized()).toBe(false);
    });
  });
});

describe('TonRelayer', () => {
  let tonSignatureService: TonSignatureService;
  let tonRelayer: TonRelayer;

  beforeEach(async () => {
    tonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
      privateKey: 'test_private_key'
    });

    tonRelayer = new TonRelayer({
      tonSignatureService,
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      networkType: 'testnet',
      pollInterval: 1000 // 1 second for testing
    });
  });

  describe('initialization and control', () => {
    it('should start successfully', async () => {
      await tonRelayer.start();
      const status = tonRelayer.getStatus();
      expect(status.isRunning).toBe(true);
      await tonRelayer.stop();
    });

    it('should stop successfully', async () => {
      await tonRelayer.start();
      await tonRelayer.stop();
      const status = tonRelayer.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle starting when already running', async () => {
      await tonRelayer.start();
      // Should not throw error when starting again
      await tonRelayer.start();
      await tonRelayer.stop();
    });

    it('should handle stopping when not running', async () => {
      // Should not throw error when stopping before starting
      await tonRelayer.stop();
    });
  });

  describe('status reporting', () => {
    it('should return correct status', async () => {
      const status = tonRelayer.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastProcessedBlock');
      expect(status).toHaveProperty('networkType');
      expect(status).toHaveProperty('walletAddress');
      
      expect(status.networkType).toBe('testnet');
      expect(status.walletAddress).toBe('EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=');
    });
  });

  describe('message submission', () => {
    beforeEach(async () => {
      await tonRelayer.start();
    });

    afterEach(async () => {
      await tonRelayer.stop();
    });

    it('should submit valid cross-chain message to TON', async () => {
      const message: EthereumToTonMessage = {
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

      const txHash = await tonRelayer.submitToTon(message);
      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
      expect(txHash.startsWith('ton_tx_')).toBe(true);
    });

    it('should reject invalid cross-chain message', async () => {
      const invalidMessage = {
        type: 'ETH_TO_TON_ESCROW',
        version: '1.0.0',
        messageId: 'test',
        // Missing required fields
      } as any;

      await expect(tonRelayer.submitToTon(invalidMessage)).rejects.toThrow();
    });
  });

  describe('transaction verification', () => {
    beforeEach(async () => {
      await tonRelayer.start();
    });

    afterEach(async () => {
      await tonRelayer.stop();
    });

    it('should verify TON transaction', async () => {
      const txHash = 'ton_tx_123456789_abc';
      const isVerified = await tonRelayer.verifyTonTransaction(txHash);
      expect(typeof isVerified).toBe('boolean');
      expect(isVerified).toBe(true); // Mocked to return true
    });

    it('should handle verification errors gracefully', async () => {
      // Test with potentially invalid hash
      const invalidTxHash = '';
      const isVerified = await tonRelayer.verifyTonTransaction(invalidTxHash);
      expect(isVerified).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  let tonSignatureService: TonSignatureService;
  let tonRelayer: TonRelayer;

  beforeEach(async () => {
    tonSignatureService = new TonSignatureService({
      networkType: 'testnet',
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      walletAddress: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
      privateKey: 'test_private_key'
    });

    tonRelayer = new TonRelayer({
      tonSignatureService,
      tonApiUrl: 'https://testnet.toncenter.com/api/v2',
      networkType: 'testnet',
      pollInterval: 1000
    });
  });

  it('should integrate TON signature service with relayer', async () => {
    await tonRelayer.start();
    
    const status = tonRelayer.getStatus();
    expect(status.isRunning).toBe(true);
    expect(status.walletAddress).toBe('EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=');
    
    await tonRelayer.stop();
  });

  it('should handle service initialization in correct order', async () => {
    // TON signature service should be initialized when relayer starts
    expect(tonSignatureService.isServiceInitialized()).toBe(false);
    
    await tonRelayer.start();
    expect(tonSignatureService.isServiceInitialized()).toBe(true);
    
    await tonRelayer.stop();
    expect(tonSignatureService.isServiceInitialized()).toBe(false);
  });
}); 