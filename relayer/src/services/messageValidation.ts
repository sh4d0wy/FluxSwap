import { SecurityUtils } from '../utils/securityUtils';
import { 
  EthereumToTonMessage, 
  TonToEthereumMessage,
  CrossChainMessage 
} from '../types/messageTypes';

/**
 * Service for validating cross-chain messages
 */
export class MessageValidationService {
  
  /**
   * Validate an Ethereum to TON message
   * @param message The message to validate
   * @returns Whether the message is valid
   */
  public validateEthereumToTonMessage(message: EthereumToTonMessage): boolean {
    try {
      // Check required fields
      if (!message.orderId || !message.ethereumTxHash || !message.tonRecipient || 
          !message.amount || !message.hashlock || !message.tokenAddress) {
        return false;
      }

      // Validate TON address format (basic check)
      if (!this.isValidTonAddress(message.tonRecipient)) {
        return false;
      }

      // Validate amount
      if (!this.isValidAmount(message.amount)) {
        return false;
      }

      // Validate hashlock format
      if (!this.isValidHashlock(message.hashlock)) {
        return false;
      }

      // Validate timelock
      if (!SecurityUtils.validateTimelock(message.timelock)) {
        return false;
      }

      // Validate Ethereum address format
      if (!this.isValidEthereumAddress(message.tokenAddress)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate a TON to Ethereum message
   * @param message The message to validate
   * @returns Whether the message is valid
   */
  public validateTonToEthereumMessage(message: TonToEthereumMessage): boolean {
    try {
      // Check required fields
      if (!message.orderId || !message.tonTxHash || !message.ethereumRecipient || 
          !message.amount || !message.hashlock) {
        return false;
      }

      // Validate Ethereum address format
      if (!this.isValidEthereumAddress(message.ethereumRecipient)) {
        return false;
      }

      // Validate amount
      if (!this.isValidAmount(message.amount)) {
        return false;
      }

      // Validate hashlock format
      if (!this.isValidHashlock(message.hashlock)) {
        return false;
      }

      // Validate timelock
      if (!SecurityUtils.validateTimelock(message.timelock)) {
        return false;
      }

      // Validate TON address format if jettonMaster is provided
      if (message.jettonMaster && !this.isValidTonAddress(message.jettonMaster)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate a generic cross-chain message
   * @param message The message to validate
   * @returns Whether the message is valid
   */
  public validateCrossChainMessage(message: CrossChainMessage): boolean {
    try {
      // Check required fields
      if (!message.type) {
        return false;
      }

      // Validate based on message type
      switch (message.type) {
        case 'ETH_TO_TON_ESCROW':
          return this.validateEthereumToTonMessage(message as EthereumToTonMessage);
        case 'TON_TO_ETH_ESCROW':
          return this.validateTonToEthereumMessage(message as TonToEthereumMessage);
        case 'ETH_FULFILLMENT_REQUEST':
        case 'TON_FULFILLMENT':
        case 'RELAYER_AUTH':
        case 'BRIDGE_CONFIG_UPDATE':
        case 'ERROR':
          // These message types don't require hashlock/timelock validation
          return true;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate TON address format
   * @param address The address to validate
   * @returns Whether the address is valid
   */
  private isValidTonAddress(address: string): boolean {
    // Basic TON address validation
    // TON addresses start with EQ and are base64url encoded
    if (!address || address.length < 3) {
      return false;
    }

    // Check if it starts with EQ (mainnet) or UQ (testnet)
    if (!address.startsWith('EQ') && !address.startsWith('UQ')) {
      return false;
    }

    // Check if the rest is valid base64url
    const base64Part = address.substring(2);
    const base64Regex = /^[A-Za-z0-9_-]+$/;
    
    return base64Regex.test(base64Part) && base64Part.length >= 46;
  }

  /**
   * Validate Ethereum address format
   * @param address The address to validate
   * @returns Whether the address is valid
   */
  private isValidEthereumAddress(address: string): boolean {
    // Basic Ethereum address validation
    if (!address || address.length !== 42) {
      return false;
    }

    // Check if it starts with 0x
    if (!address.startsWith('0x')) {
      return false;
    }

    // Check if the rest is valid hex
    const hexPart = address.substring(2);
    const hexRegex = /^[0-9a-fA-F]{40}$/;
    
    return hexRegex.test(hexPart);
  }

  /**
   * Validate amount format
   * @param amount The amount to validate
   * @returns Whether the amount is valid
   */
  private isValidAmount(amount: string): boolean {
    if (!amount || amount.length === 0) {
      return false;
    }

    // Check if it's a valid number
    const num = BigInt(amount);
    return num > 0n;
  }

  /**
   * Validate hashlock format
   * @param hashlock The hashlock to validate
   * @returns Whether the hashlock is valid
   */
  private isValidHashlock(hashlock: string): boolean {
    if (!hashlock || hashlock.length !== 66) { // 0x + 64 hex chars
      return false;
    }

    // Check if it starts with 0x
    if (!hashlock.startsWith('0x')) {
      return false;
    }

    // Check if the rest is valid hex
    const hexPart = hashlock.substring(2);
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    
    return hexRegex.test(hexPart);
  }

  /**
   * Validate message signature
   * @param message The message to validate
   * @param signature The signature to validate
   * @param publicKey The public key to validate against
   * @returns Whether the signature is valid
   */
  public validateMessageSignature(
    message: CrossChainMessage, 
    signature: string, 
    publicKey: string
  ): boolean {
    try {
      // Create message hash
      const messageHash = this.createMessageHash(message);
      
      // Verify signature (this is a simplified version)
      // In production, you would use proper cryptographic verification
      return this.verifySignature(messageHash, signature, publicKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a hash of the message for signing
   * @param message The message to hash
   * @returns The message hash
   */
  private createMessageHash(message: CrossChainMessage): string {
    const { createHash } = require('crypto');
    const hash = createHash('sha256');
    
    // Create a deterministic string representation of the message
    const messageString = JSON.stringify(message, Object.keys(message).sort());
    hash.update(messageString);
    
    return '0x' + hash.digest('hex');
  }

  /**
   * Verify a signature
   * @param messageHash The message hash
   * @param signature The signature to verify
   * @param publicKey The public key to verify against
   * @returns Whether the signature is valid
   */
  private verifySignature(messageHash: string, signature: string, publicKey: string): boolean {
    // This is a simplified signature verification
    // In production, you would use proper cryptographic libraries
    try {
      // For now, just check if the signature has the right format
      if (!signature || signature.length < 128) {
        return false;
      }
      
      // Basic format check (should be hex)
      const hexRegex = /^[0-9a-fA-F]+$/;
      return hexRegex.test(signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate message replay protection
   * @param messageHash The message hash to check
   * @returns Whether the message can be processed
   */
  public validateMessageReplay(messageHash: string): boolean {
    return SecurityUtils.processMessage(messageHash);
  }

  /**
   * Validate relayer confirmation
   * @param messageHash The message hash
   * @param relayer The relayer address
   * @returns Whether the confirmation was added successfully
   */
  public validateRelayerConfirmation(messageHash: string, relayer: string): boolean {
    try {
      const confirmations = SecurityUtils.addRelayerConfirmation(messageHash, relayer);
      return confirmations > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a message has sufficient confirmations
   * @param messageHash The message hash
   * @returns Whether there are enough confirmations
   */
  public hasSufficientConfirmations(messageHash: string): boolean {
    return SecurityUtils.hasSufficientConfirmations(messageHash);
  }

  /**
   * Get comprehensive validation result for a message
   * @param message The message to validate
   * @returns Detailed validation result
   */
  public getValidationResult(message: CrossChainMessage): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!this.validateCrossChainMessage(message)) {
      errors.push('Message format is invalid');
    }

    // Type-specific validations
    if (message.type === 'ETH_TO_TON_ESCROW') {
      const ethMessage = message as EthereumToTonMessage;
      
      // Check timelock for escrow messages
      if (SecurityUtils.isTimelockExpired(ethMessage.timelock)) {
        errors.push('Timelock has expired');
      }

      // Check remaining time
      const remainingTime = SecurityUtils.getRemainingTime(ethMessage.timelock);
      if (remainingTime < 3600) { // Less than 1 hour
        warnings.push(`Timelock expires soon (${remainingTime} seconds remaining)`);
      }
      
      if (!this.isValidTonAddress(ethMessage.tonRecipient)) {
        errors.push('Invalid TON recipient address');
      }
      
      if (ethMessage.tokenAddress && !this.isValidEthereumAddress(ethMessage.tokenAddress)) {
        errors.push('Invalid token address');
      }
    } else if (message.type === 'TON_TO_ETH_ESCROW') {
      const tonMessage = message as TonToEthereumMessage;
      
      // Check timelock for escrow messages
      if (SecurityUtils.isTimelockExpired(tonMessage.timelock)) {
        errors.push('Timelock has expired');
      }

      // Check remaining time
      const remainingTime = SecurityUtils.getRemainingTime(tonMessage.timelock);
      if (remainingTime < 3600) { // Less than 1 hour
        warnings.push(`Timelock expires soon (${remainingTime} seconds remaining)`);
      }
      
      if (!this.isValidEthereumAddress(tonMessage.ethereumRecipient)) {
        errors.push('Invalid Ethereum recipient address');
      }
      
      if (tonMessage.jettonMaster && !this.isValidTonAddress(tonMessage.jettonMaster)) {
        errors.push('Invalid jetton master address');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 