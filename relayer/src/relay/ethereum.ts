import { ethers, type Contract, type EventLog, type JsonRpcProvider, type Signer } from 'ethers';
import { logger } from '../utils/logger';
import { sleep } from '../utils/common';
import { TonRelayer } from './tonRelayer';
import { 
  EthereumToTonMessage, 
  EthereumFulfillmentMessage,
  CrossChainMessage 
} from '../types/messageTypes';
import { 
  MessageValidator, 
  MessageSerializer 
} from '../utils/messageValidation';

// Define the Escrow ABI that we'll use to interact with escrow contracts
const EscrowABI = [
  'function getDetails() view returns (tuple(uint8 status, address token, uint256 amount, uint256 timelock, bytes32 secretHash, address initiator, address recipient, uint256 chainId))',
  'function setStatus(uint8 status) external',
  'event StatusChanged(uint8 newStatus)'
] as const;

declare global {
  // For Node.js environment
  // eslint-disable-next-line no-var
  var process: NodeJS.Process;
}

// ABI definitions for contracts
const EscrowFactoryABI = [
  'function createDstEscrow(tuple(uint256,address,address,uint256,bytes32,bytes32,uint256,uint256,uint256,uint8,uint256,uint256,bytes32,bytes32) immutables, uint256 srcCancellationTimestamp) external payable returns (address)',
  'function addressOfEscrowSrc(tuple(uint256,address,address,uint256,bytes32,bytes32,uint256,uint256,uint256,uint8,uint256,uint256,bytes32,bytes32) immutables) external view returns (address)',
  'event EscrowCreated(address indexed escrow, address indexed initiator, address token, uint256 amount, string targetChain, string targetAddress)'
];

// Updated ABI for TON integration
const ResolverABI = [
  'event TonDepositInitiated(address indexed sender, string tonRecipient, uint256 amount, bytes32 secretHash, uint256 timelock)',
  'event TonWithdrawalCompleted(bytes32 indexed secretHash, string tonRecipient, uint256 amount)',
  'event TonRefunded(bytes32 indexed secretHash, string tonRecipient, uint256 amount)'
] as const;

// Type definitions for better type safety
type BigNumberish = ethers.BigNumberish;

// Updated event interfaces for TON
interface TonDepositInitiatedEvent {
  sender: string;
  tonRecipient: string;
  secretHash: string;
  timelock: BigNumberish;
  amount: BigNumberish;
}

interface TonWithdrawalCompletedEvent {
  secretHash: string;
  tonRecipient: string;
  amount: BigNumberish;
}

interface TonRefundedEvent {
  secretHash: string;
  tonRecipient: string;
  amount: BigNumberish;
}

export class EthereumRelayer {
  private readonly provider: JsonRpcProvider;
  private readonly signer: Signer;
  private readonly tonRelayer: TonRelayer;
  private isRunning = false;
  private readonly pollInterval: number;
  private pollTimer: NodeJS.Timeout | null | undefined = null;
  private resolverContract: ethers.Contract;
  private escrowFactoryContract: ethers.Contract;

  constructor(signer: ethers.Signer, tonRelayer: TonRelayer) {
    if (!signer.provider) {
      throw new Error('Signer must be connected to a provider');
    }

    this.signer = signer;
    this.provider = signer.provider as ethers.JsonRpcProvider;
    this.tonRelayer = tonRelayer;
    this.pollInterval = parseInt(process.env.RELAYER_POLL_INTERVAL || '5000', 10);
    
    // Initialize contracts
    const resolverAddress = process.env.RESOLVER_ADDRESS;
    const escrowFactoryAddress = process.env.ESCROW_FACTORY_ADDRESS;
    
    if (!resolverAddress || !escrowFactoryAddress) {
      throw new Error('RESOLVER_ADDRESS and ESCROW_FACTORY_ADDRESS must be set in environment variables');
    }
    
    // Type-safe contract instances
    this.resolverContract = new ethers.Contract(
      resolverAddress,
      ResolverABI,
      this.signer
    ) as ethers.Contract & {
      on: (eventName: string, listener: (...args: any[]) => void) => ethers.Contract;
      filters: {
        TonDepositInitiated: (sender?: string, tonRecipient?: string) => ethers.EventFilter;
        TonWithdrawalCompleted: (secretHash?: string, tonRecipient?: string) => ethers.EventFilter;
        TonRefunded: (secretHash?: string, tonRecipient?: string) => ethers.EventFilter;
      };
    };
    
    this.escrowFactoryContract = new ethers.Contract(
      escrowFactoryAddress,
      EscrowFactoryABI,
      this.signer
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Ethereum relayer is already running');
      return;
    }

    try {
      logger.info('Starting Ethereum relayer...');
      this.isRunning = true;

      // Set up event listeners
      this.setupEventListeners();

      logger.info('Ethereum relayer started successfully');
    } catch (error) {
      logger.error('Failed to start Ethereum relayer:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Ethereum relayer...');
    this.isRunning = false;

    // Remove event listeners
    this.resolverContract.removeAllListeners();
    this.escrowFactoryContract.removeAllListeners();

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    logger.info('Ethereum relayer stopped');
  }

  private setupEventListeners(): void {
    logger.info('Setting up Ethereum event listeners...');

    // Listen for TON deposit initiated events
    this.resolverContract.on(
      this.resolverContract.filters.TonDepositInitiated(),
      async (sender: string, tonRecipient: string, amount: BigNumberish, secretHash: string, timelock: BigNumberish, event: EventLog) => {
        try {
          await this.handleTonDepositInitiated({
            sender,
            tonRecipient,
            secretHash,
            timelock,
            amount
          }, event);
        } catch (error) {
          logger.error('Error handling TonDepositInitiated event:', error);
        }
      }
    );

    // Listen for TON withdrawal completed events
    this.resolverContract.on(
      this.resolverContract.filters.TonWithdrawalCompleted(),
      async (secretHash: string, tonRecipient: string, amount: BigNumberish, event: EventLog) => {
        try {
          await this.handleTonWithdrawalCompleted({
            secretHash,
            tonRecipient,
            amount
          }, event);
        } catch (error) {
          logger.error('Error handling TonWithdrawalCompleted event:', error);
        }
      }
    );

    // Listen for TON refund events
    this.resolverContract.on(
      this.resolverContract.filters.TonRefunded(),
      async (secretHash: string, tonRecipient: string, amount: BigNumberish, event: EventLog) => {
        try {
          await this.handleTonRefunded({
            secretHash,
            tonRecipient,
            amount
          }, event);
        } catch (error) {
          logger.error('Error handling TonRefunded event:', error);
        }
      }
    );

    logger.info('Ethereum event listeners configured');
  }

  /**
   * Handle Ethereum to TON deposit initiation
   */
  private async handleTonDepositInitiated(
    eventData: TonDepositInitiatedEvent,
    event: EventLog
  ): Promise<void> {
    try {
      logger.info(`Processing Ethereum to TON deposit: ${eventData.sender} -> ${eventData.tonRecipient}`);

      // Create cross-chain message for TON
      const message: Omit<EthereumToTonMessage, 'relayerSignature'> = {
        type: 'ETH_TO_TON_ESCROW',
        version: '1.0.0',
        messageId: MessageSerializer.generateMessageId('eth_deposit'),
        orderId: `eth_${event.transactionHash}_${event.index || 0}`,
        ethereumTxHash: event.transactionHash,
        ethereumBlockNumber: event.blockNumber,
        ethereumLogIndex: event.index || 0,
        sender: eventData.sender,
        tonRecipient: eventData.tonRecipient,
        amount: eventData.amount.toString(),
        hashlock: eventData.secretHash,
        timelock: Number(eventData.timelock),
        proof: {
          merkleProof: [], // TODO: Generate actual proof
          blockHeader: '',
          txProof: '',
          receiptProof: ''
        },
        timestamp: Math.floor(Date.now() / 1000),
        nonce: Date.now()
      };

      // Validate message
      const validation = MessageValidator.validateCrossChainMessage(message as EthereumToTonMessage);
      if (!validation.isValid) {
        logger.error(`Invalid message for deposit ${message.orderId}:`, validation.errors);
        return;
      }

      // Submit to TON relayer
      await this.tonRelayer.submitToTon(message as EthereumToTonMessage);
      
      logger.info(`Successfully relayed Ethereum deposit to TON: ${message.orderId}`);
    } catch (error) {
      logger.error('Failed to handle TON deposit initiation:', error);
    }
  }

  /**
   * Handle TON withdrawal completion on Ethereum
   */
  private async handleTonWithdrawalCompleted(
    eventData: TonWithdrawalCompletedEvent,
    event: EventLog
  ): Promise<void> {
    try {
      logger.info(`Processing TON withdrawal completion: ${eventData.tonRecipient}`);
      // TODO: Implement withdrawal completion logic
    } catch (error) {
      logger.error('Failed to handle TON withdrawal completion:', error);
    }
  }

  /**
   * Handle TON refund on Ethereum
   */
  private async handleTonRefunded(
    eventData: TonRefundedEvent,
    event: EventLog
  ): Promise<void> {
    try {
      logger.info(`Processing TON refund: ${eventData.tonRecipient}`);
      // TODO: Implement refund logic
    } catch (error) {
      logger.error('Failed to handle TON refund:', error);
    }
  }

  /**
   * Process a message from TON for Ethereum execution
   */
  async processFromTon(message: CrossChainMessage): Promise<void> {
    try {
      logger.info(`Processing message from TON: ${message.messageId}`);

      // Validate message
      const validation = MessageValidator.validateCrossChainMessage(message);
      if (!validation.isValid) {
        logger.error(`Invalid message from TON ${message.messageId}:`, validation.errors);
        return;
      }

      switch (message.type) {
        case 'TON_TO_ETH_ESCROW':
          await this.handleTonToEthereumEscrow(message);
          break;
        case 'TON_FULFILLMENT':
          await this.handleTonFulfillment(message);
          break;
        default:
          logger.warn(`Unknown message type from TON: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Failed to process message from TON ${message.messageId}:`, error);
    }
  }

  /**
   * Handle TON to Ethereum escrow creation
   */
  private async handleTonToEthereumEscrow(message: any): Promise<void> {
    try {
      logger.info(`Creating Ethereum escrow for TON order: ${message.orderId}`);
      // TODO: Implement escrow creation on Ethereum side
    } catch (error) {
      logger.error(`Failed to create Ethereum escrow for ${message.orderId}:`, error);
    }
  }

  /**
   * Handle fulfillment message from TON
   */
  private async handleTonFulfillment(message: any): Promise<void> {
    try {
      logger.info(`Processing fulfillment from TON: ${message.orderId}`);
      // TODO: Implement fulfillment on Ethereum side using the revealed secret
    } catch (error) {
      logger.error(`Failed to process TON fulfillment for ${message.orderId}:`, error);
    }
  }

  /**
   * Get relayer status
   */
  getStatus(): {
    isRunning: boolean;
    contractAddresses: {
      resolver: string;
      escrowFactory: string;
    };
    provider: string;
  } {
    return {
      isRunning: this.isRunning,
      contractAddresses: {
        resolver: this.resolverContract.target as string,
        escrowFactory: this.escrowFactoryContract.target as string
      },
      provider: 'ethereum-provider'
    };
  }
}
