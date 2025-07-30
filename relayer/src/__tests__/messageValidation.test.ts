import { 
  AddressValidator, 
  MessageValidator, 
  MessageSerializer, 
  MessageError,
  PROTOCOL_VERSION,
  MINIMUM_TIMELOCK,
  MAXIMUM_TIMELOCK
} from '../utils/messageValidation';
import { 
  EthereumToTonMessage, 
  TonToEthereumMessage,
  MessageErrorCode 
} from '../types/messageTypes';

describe('AddressValidator', () => {
  describe('isValidEthereumAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefABCDEF1234567890123456789012345678',
        '0x0000000000000000000000000000000000000000'
      ];

      validAddresses.forEach(addr => {
        expect(AddressValidator.isValidEthereumAddress(addr)).toBe(true);
      });
    });

    it('should reject invalid Ethereum addresses', () => {
      const invalidAddresses = [
        '1234567890123456789012345678901234567890', // missing 0x
        '0x123456789012345678901234567890123456789', // too short
        '0x12345678901234567890123456789012345678900', // too long
        '0x123456789012345678901234567890123456789G', // invalid character
        '',
        null,
        undefined
      ];

      invalidAddresses.forEach(addr => {
        expect(AddressValidator.isValidEthereumAddress(addr as string)).toBe(false);
      });
    });
  });

  describe('isValidTonAddress', () => {
    it('should validate correct TON addresses', () => {
      const validAddresses = [
        'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        'UQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
        'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      ];

      validAddresses.forEach(addr => {
        expect(AddressValidator.isValidTonAddress(addr)).toBe(true);
      });
    });

    it('should reject invalid TON addresses', () => {
      const invalidAddresses = [
        'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5j', // too short
        'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jLL=', // too long
        'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5j@=', // invalid character
        '',
        null,
        undefined
      ];

      invalidAddresses.forEach(addr => {
        expect(AddressValidator.isValidTonAddress(addr as string)).toBe(false);
      });
    });
  });

  describe('validateAddress', () => {
    it('should validate addresses for correct chains', () => {
      expect(AddressValidator.validateAddress('0x1234567890123456789012345678901234567890', 'ethereum')).toBe(true);
      expect(AddressValidator.validateAddress('EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=', 'ton')).toBe(true);
    });

    it('should reject addresses for wrong chains', () => {
      expect(AddressValidator.validateAddress('0x1234567890123456789012345678901234567890', 'ton')).toBe(false);
      expect(AddressValidator.validateAddress('EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=', 'ethereum')).toBe(false);
    });
  });
});

describe('MessageValidator', () => {
  const validBaseMessage = {
    type: 'ETH_TO_TON_ESCROW',
    version: PROTOCOL_VERSION,
    messageId: 'msg_123456789_abc',
    timestamp: Math.floor(Date.now() / 1000),
    relayerSignature: '0x1234567890abcdef',
    nonce: 1
  };

  describe('validateBaseMessage', () => {
    it('should validate correct base message', () => {
      const errors = MessageValidator.validateBaseMessage(validBaseMessage);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidMessage = { ...validBaseMessage };
      delete (invalidMessage as any).type;

      const errors = MessageValidator.validateBaseMessage(invalidMessage);
      expect(errors).toContain('Message type is required');
    });

    it('should detect invalid version', () => {
      const invalidMessage = { ...validBaseMessage, version: '2.0.0' };
      const errors = MessageValidator.validateBaseMessage(invalidMessage);
      expect(errors).toContain(`Invalid protocol version. Expected ${PROTOCOL_VERSION}`);
    });

    it('should detect old timestamps', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      const invalidMessage = { ...validBaseMessage, timestamp: oldTimestamp };
      const errors = MessageValidator.validateBaseMessage(invalidMessage);
      expect(errors).toContain('Message timestamp is too old');
    });

    it('should detect future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const invalidMessage = { ...validBaseMessage, timestamp: futureTimestamp };
      const errors = MessageValidator.validateBaseMessage(invalidMessage);
      expect(errors).toContain('Message timestamp is too far in future');
    });

    it('should detect invalid nonce', () => {
      const invalidMessage = { ...validBaseMessage, nonce: -1 };
      const errors = MessageValidator.validateBaseMessage(invalidMessage);
      expect(errors).toContain('Valid nonce is required');
    });
  });

  describe('validateTimelock', () => {
    it('should validate correct timelock', () => {
      const futureTime = Math.floor(Date.now() / 1000) + MINIMUM_TIMELOCK + 100;
      const errors = MessageValidator.validateTimelock(futureTime);
      expect(errors).toHaveLength(0);
    });

    it('should reject past timelock', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 100;
      const errors = MessageValidator.validateTimelock(pastTime);
      expect(errors).toContain('Timelock must be in the future');
    });

    it('should reject timelock too soon', () => {
      const soonTime = Math.floor(Date.now() / 1000) + 100; // 100 seconds
      const errors = MessageValidator.validateTimelock(soonTime);
      expect(errors).toContain(`Timelock must be at least ${MINIMUM_TIMELOCK} seconds in the future`);
    });

    it('should reject timelock too far', () => {
      const farTime = Math.floor(Date.now() / 1000) + MAXIMUM_TIMELOCK + 1000;
      const errors = MessageValidator.validateTimelock(farTime);
      expect(errors).toContain(`Timelock cannot be more than ${MAXIMUM_TIMELOCK} seconds in the future`);
    });
  });

  describe('validateHashlock', () => {
    it('should validate correct hashlock', () => {
      const hashlock = 'a'.repeat(64);
      const errors = MessageValidator.validateHashlock(hashlock);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid hashlock format', () => {
      const invalidHashlocks = [
        'a'.repeat(63), // too short
        'a'.repeat(65), // too long
        'G'.repeat(64), // invalid character
        '',
        null,
        undefined
      ];

      invalidHashlocks.forEach(hashlock => {
        const errors = MessageValidator.validateHashlock(hashlock as string);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      const validAmounts = ['1000000000', '1', '999999999999999999'];
      
      validAmounts.forEach(amount => {
        const errors = MessageValidator.validateAmount(amount);
        expect(errors).toHaveLength(0);
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = ['0', '-1', 'abc', '', null, undefined];

      invalidAmounts.forEach(amount => {
        const errors = MessageValidator.validateAmount(amount as string);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateCrossChainMessage', () => {
    const validEthToTonMessage: EthereumToTonMessage = {
      ...validBaseMessage,
      type: 'ETH_TO_TON_ESCROW',
      orderId: 'order_123',
      ethereumTxHash: '0x' + 'a'.repeat(64),
      ethereumBlockNumber: 12345,
      ethereumLogIndex: 0,
      sender: '0x1234567890123456789012345678901234567890',
      tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL=',
      amount: '1000000000',
      hashlock: 'a'.repeat(64),
      timelock: Math.floor(Date.now() / 1000) + MINIMUM_TIMELOCK + 100,
      proof: {
        merkleProof: [],
        blockHeader: '',
        txProof: '',
        receiptProof: ''
      }
    };

    it('should validate correct ETH_TO_TON_ESCROW message', () => {
      const result = MessageValidator.validateCrossChainMessage(validEthToTonMessage);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid sender address in ETH_TO_TON_ESCROW', () => {
      const invalidMessage = {
        ...validEthToTonMessage,
        sender: 'invalid_address'
      };
      
      const result = MessageValidator.validateCrossChainMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Ethereum sender address');
    });

    it('should detect invalid TON recipient address', () => {
      const invalidMessage = {
        ...validEthToTonMessage,
        tonRecipient: 'invalid_ton_address'
      };
      
      const result = MessageValidator.validateCrossChainMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid TON recipient address');
    });
  });
});

describe('MessageSerializer', () => {
  describe('calculateMessageHash', () => {
    it('should produce consistent hashes for same message', () => {
      const message = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: PROTOCOL_VERSION,
        messageId: 'test',
        timestamp: 1234567890,
        nonce: 1,
        orderId: 'order_123',
        ethereumTxHash: '0x123',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const hash1 = MessageSerializer.calculateMessageHash(message);
      const hash2 = MessageSerializer.calculateMessageHash(message);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different messages', () => {
      const baseMessage = {
        type: 'ETH_TO_TON_ESCROW' as const,
        version: PROTOCOL_VERSION,
        timestamp: 1234567890,
        nonce: 1,
        orderId: 'order_123',
        ethereumTxHash: '0x123',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const message1 = {
        ...baseMessage,
        messageId: 'test1'
      };

      const message2 = {
        ...baseMessage,
        messageId: 'test2'
      };

      const hash1 = MessageSerializer.calculateMessageHash(message1);
      const hash2 = MessageSerializer.calculateMessageHash(message2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should be order-independent (deterministic)', () => {
      const commonFields = {
        type: 'ETH_TO_TON_ESCROW' as const,
        messageId: 'test',
        version: PROTOCOL_VERSION,
        timestamp: 1234567890,
        nonce: 1,
        orderId: 'order_123',
        ethereumTxHash: '0x123',
        tonRecipient: 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL',
        amount: '1000000000000000000',
        hashlock: '0x' + 'a'.repeat(64),
        timelock: Math.floor(Date.now() / 1000) + 3600,
        tokenAddress: '0x0000000000000000000000000000000000000000'
      };

      const message1 = {
        type: commonFields.type,
        messageId: commonFields.messageId,
        version: commonFields.version,
        timestamp: commonFields.timestamp,
        nonce: commonFields.nonce,
        orderId: commonFields.orderId,
        ethereumTxHash: commonFields.ethereumTxHash,
        tonRecipient: commonFields.tonRecipient,
        amount: commonFields.amount,
        hashlock: commonFields.hashlock,
        timelock: commonFields.timelock,
        tokenAddress: commonFields.tokenAddress
      };

      const message2 = {
        timestamp: commonFields.timestamp,
        nonce: commonFields.nonce,
        type: commonFields.type,
        version: commonFields.version,
        messageId: commonFields.messageId,
        orderId: commonFields.orderId,
        ethereumTxHash: commonFields.ethereumTxHash,
        tonRecipient: commonFields.tonRecipient,
        amount: commonFields.amount,
        hashlock: commonFields.hashlock,
        timelock: commonFields.timelock,
        tokenAddress: commonFields.tokenAddress
      };

      const hash1 = MessageSerializer.calculateMessageHash(message1);
      const hash2 = MessageSerializer.calculateMessageHash(message2);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateMessageId', () => {
    it('should generate unique message IDs', () => {
      const id1 = MessageSerializer.generateMessageId();
      const id2 = MessageSerializer.generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const id = MessageSerializer.generateMessageId('test');
      expect(id).toMatch(/^test_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateHashlock', () => {
    it('should generate valid hashlock from secret', () => {
      const secret = 'a'.repeat(64);
      const hashlock = MessageSerializer.generateHashlock(secret);
      
      expect(hashlock).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const secret = 'a'.repeat(64);
      const hashlock1 = MessageSerializer.generateHashlock(secret);
      const hashlock2 = MessageSerializer.generateHashlock(secret);
      
      expect(hashlock1).toBe(hashlock2);
    });
  });

  describe('verifySecret', () => {
    it('should verify correct secret', () => {
      const secret = 'a'.repeat(64);
      const hashlock = MessageSerializer.generateHashlock(secret);
      
      expect(MessageSerializer.verifySecret(secret, hashlock)).toBe(true);
    });

    it('should reject incorrect secret', () => {
      const secret1 = 'a'.repeat(64);
      const secret2 = 'b'.repeat(64);
      const hashlock = MessageSerializer.generateHashlock(secret1);
      
      expect(MessageSerializer.verifySecret(secret2, hashlock)).toBe(false);
    });

    it('should handle case insensitive hashlock', () => {
      const secret = 'a'.repeat(64);
      const hashlock = MessageSerializer.generateHashlock(secret).toUpperCase();
      
      expect(MessageSerializer.verifySecret(secret, hashlock)).toBe(true);
    });
  });
});

describe('MessageError', () => {
  it('should create error with code and message', () => {
    const error = new MessageError(
      MessageErrorCode.INVALID_PROOF,
      'Proof verification failed'
    );

    expect(error.code).toBe(MessageErrorCode.INVALID_PROOF);
    expect(error.message).toBe('Proof verification failed');
    expect(error.name).toBe('MessageError');
  });

  it('should include details when provided', () => {
    const details = { expectedHash: 'abc', actualHash: 'def' };
    const error = new MessageError(
      MessageErrorCode.INVALID_PROOF,
      'Proof verification failed',
      details
    );

    expect(error.details).toEqual(details);
  });
}); 