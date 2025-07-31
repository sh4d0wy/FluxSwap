import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageValidationService } from '../services/messageValidation';
import { SecurityUtils } from '../utils/securityUtils';
import { 
    EthereumToTonMessage, 
    TonToEthereumMessage
} from '../types/messageTypes';

describe('Relayer Security Tests', () => {
    let messageValidation: MessageValidationService;

    beforeEach(() => {
        messageValidation = new MessageValidationService();
        SecurityUtils.clearData(); // Clear any previous test data
    });

    describe('Message Validation Security', () => {
        it('should validate correct Ethereum to TON message', () => {
            const message: EthereumToTonMessage = {
                type: 'ETH_TO_TON_ESCROW',
                version: '1.0',
                messageId: 'msg_123',
                timestamp: Math.floor(Date.now() / 1000),
                relayerSignature: '0x' + 'a'.repeat(128),
                nonce: 1,
                orderId: '0x1234567890abcdef',
                ethereumTxHash: '0xabcdef1234567890',
                ethereumBlockNumber: 12345,
                ethereumLogIndex: 0,
                sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                tonRecipient: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                amount: '1000000000000000000', // 1 ETH
                tokenAddress: '0x0000000000000000000000000000000000000000', // ETH
                hashlock: '0x' + 'a'.repeat(64),
                timelock: Math.floor(Date.now() / 1000) + 3600,
                proof: {
                    merkleProof: [],
                    blockHeader: '0x',
                    txProof: '0x',
                    receiptProof: '0x'
                }
            };

            const isValid = messageValidation.validateEthereumToTonMessage(message);
            expect(isValid).toBe(true);
        });

        it('should reject Ethereum to TON message with invalid TON address', () => {
            const message: EthereumToTonMessage = {
                type: 'ETH_TO_TON_ESCROW',
                version: '1.0',
                messageId: 'msg_123',
                timestamp: Math.floor(Date.now() / 1000),
                relayerSignature: '0x' + 'a'.repeat(128),
                nonce: 1,
                orderId: '0x1234567890abcdef',
                ethereumTxHash: '0xabcdef1234567890',
                ethereumBlockNumber: 12345,
                ethereumLogIndex: 0,
                sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                tonRecipient: 'invalid_address',
                amount: '1000000000000000000',
                tokenAddress: '0x0000000000000000000000000000000000000000',
                hashlock: '0x' + 'a'.repeat(64),
                timelock: Math.floor(Date.now() / 1000) + 3600,
                proof: {
                    merkleProof: [],
                    blockHeader: '0x',
                    txProof: '0x',
                    receiptProof: '0x'
                }
            };

            const isValid = messageValidation.validateEthereumToTonMessage(message);
            expect(isValid).toBe(false);
        });

        it('should validate correct TON to Ethereum message', () => {
            const message: TonToEthereumMessage = {
                type: 'TON_TO_ETH_ESCROW',
                version: '1.0',
                messageId: 'msg_123',
                timestamp: Math.floor(Date.now() / 1000),
                relayerSignature: '0x' + 'a'.repeat(128),
                nonce: 1,
                orderId: '0x1234567890abcdef',
                tonTxHash: 'abc123def456',
                tonLt: '123456789',
                tonBlockSeqno: 12345,
                sender: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                ethereumRecipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                amount: '1000000000000000000',
                hashlock: '0x' + 'a'.repeat(64),
                timelock: Math.floor(Date.now() / 1000) + 3600,
                proof: {
                    merkleProof: '0x',
                    blockHeader: '0x',
                    transactionProof: '0x',
                    messageProof: '0x'
                }
            };

            const isValid = messageValidation.validateTonToEthereumMessage(message);
            expect(isValid).toBe(true);
        });

        it('should reject TON to Ethereum message with invalid Ethereum address', () => {
            const message: TonToEthereumMessage = {
                type: 'TON_TO_ETH_ESCROW',
                version: '1.0',
                messageId: 'msg_123',
                timestamp: Math.floor(Date.now() / 1000),
                relayerSignature: '0x' + 'a'.repeat(128),
                nonce: 1,
                orderId: '0x1234567890abcdef',
                tonTxHash: 'abc123def456',
                tonLt: '123456789',
                tonBlockSeqno: 12345,
                sender: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                ethereumRecipient: 'invalid_address',
                amount: '1000000000000000000',
                hashlock: '0x' + 'a'.repeat(64),
                timelock: Math.floor(Date.now() / 1000) + 3600,
                proof: {
                    merkleProof: '0x',
                    blockHeader: '0x',
                    transactionProof: '0x',
                    messageProof: '0x'
                }
            };

            const isValid = messageValidation.validateTonToEthereumMessage(message);
            expect(isValid).toBe(false);
        });
    });

    describe('SecurityUtils Integration', () => {
        it('should handle complete cross-chain message flow securely', () => {
            // 1. Generate secure secret
            const secret = SecurityUtils.generateSecureSecret();
            
            // 2. Create security parameters
            const params = SecurityUtils.createSecurityParams(secret, 3600);
            
            // 3. Create message
            const message: EthereumToTonMessage = {
                type: 'ETH_TO_TON_ESCROW',
                version: '1.0',
                messageId: 'msg_123',
                timestamp: Math.floor(Date.now() / 1000),
                relayerSignature: '0x' + 'a'.repeat(128),
                nonce: 1,
                orderId: '0x1234567890abcdef',
                ethereumTxHash: '0xabcdef1234567890',
                ethereumBlockNumber: 12345,
                ethereumLogIndex: 0,
                sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                tonRecipient: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                amount: '1000000000000000000',
                tokenAddress: '0x0000000000000000000000000000000000000000',
                hashlock: params.hashlock,
                timelock: params.timelock,
                proof: {
                    merkleProof: [],
                    blockHeader: '0x',
                    txProof: '0x',
                    receiptProof: '0x'
                }
            };
            
            // 4. Validate message
            const isValidMessage = messageValidation.validateEthereumToTonMessage(message);
            expect(isValidMessage).toBe(true);
            
            // 5. Validate timelock
            const isValidTimelock = SecurityUtils.validateTimelock(params.timelock);
            expect(isValidTimelock).toBe(true);
            
            // 6. Verify secret
            const isValidSecret = SecurityUtils.verifySecret(secret, params.hashlock);
            expect(isValidSecret).toBe(true);
            
            // 7. Process message
            const messageHash = '0x' + 'b'.repeat(64);
            const canProcess = SecurityUtils.processMessage(messageHash);
            expect(canProcess).toBe(true);
            
            // 8. Add confirmations
            const relayer1 = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
            const relayer2 = '0x1234567890abcdef1234567890abcdef12345678';
            
            SecurityUtils.addRelayerConfirmation(messageHash, relayer1);
            SecurityUtils.addRelayerConfirmation(messageHash, relayer2);
            
            // 9. Check sufficient confirmations
            const hasSufficient = SecurityUtils.hasSufficientConfirmations(messageHash);
            expect(hasSufficient).toBe(true);
        });

        it('should prevent message replay attacks', () => {
            const messageHash = '0x1234567890abcdef';
            
            // First processing should succeed
            const result1 = SecurityUtils.processMessage(messageHash);
            expect(result1).toBe(true);
            
            // Second processing should fail
            const result2 = SecurityUtils.processMessage(messageHash);
            expect(result2).toBe(false);
        });

        it('should handle relayer confirmations correctly', () => {
            const messageHash = '0x1234567890abcdef';
            const relayer1 = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
            const relayer2 = '0x1234567890abcdef1234567890abcdef12345678';
            
            // First confirmation
            const confirmations1 = SecurityUtils.addRelayerConfirmation(messageHash, relayer1);
            expect(confirmations1).toBe(1);
            
            // Second confirmation
            const confirmations2 = SecurityUtils.addRelayerConfirmation(messageHash, relayer2);
            expect(confirmations2).toBe(2);
            
            // Check sufficient confirmations
            const hasSufficient = SecurityUtils.hasSufficientConfirmations(messageHash);
            expect(hasSufficient).toBe(true);
        });
    });
}); 