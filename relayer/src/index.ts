import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { EthereumRelayer } from './relay/ethereum';
import { TonRelayer } from './relay/tonRelayer';
import { TonSignatureService } from './services/tonSignatureService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'ETHEREUM_RPC_URL',
  'ETHEREUM_CHAIN_ID',
  'DEPLOYER_PRIVATE_KEY',
  'TON_NETWORK_TYPE',
  'TON_API_URL',
  'TON_WALLET_ADDRESS',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

async function main() {
  try {
    logger.info('Starting cross-chain relayer...');

    // Initialize Ethereum provider and signer
    const ethereumProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const ethereumSigner = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, ethereumProvider);
    logger.info(`Connected to Ethereum network: ${await ethereumProvider.getNetwork().then(n => n.name)} (${process.env.ETHEREUM_CHAIN_ID})`);
    logger.info(`Ethereum relayer address: ${await ethereumSigner.getAddress()}`);

    // Initialize TON signature service
    const tonSignatureService = new TonSignatureService({
      networkType: process.env.TON_NETWORK_TYPE as 'mainnet' | 'testnet',
      tonApiUrl: process.env.TON_API_URL!,
      walletAddress: process.env.TON_WALLET_ADDRESS,
      privateKey: process.env.TON_PRIVATE_KEY
    });

    // Initialize TON relayer
    const tonRelayer = new TonRelayer({
      tonSignatureService,
      tonApiUrl: process.env.TON_API_URL!,
      networkType: process.env.TON_NETWORK_TYPE as 'mainnet' | 'testnet',
      pollInterval: parseInt(process.env.TON_POLL_INTERVAL || '5000', 10)
    });

    logger.info(`Connected to TON network: ${process.env.TON_NETWORK_TYPE}`);
    logger.info(`TON wallet address: ${process.env.TON_WALLET_ADDRESS}`);

    // Initialize Ethereum relayer with TON integration
    const ethereumRelayer = new EthereumRelayer(ethereumSigner, tonRelayer);

    // Start both relayers
    await Promise.all([
      ethereumRelayer.start(),
      tonRelayer.start()
    ]);

    logger.info('Cross-chain relayer started successfully');
    logger.info('Monitoring for cross-chain events...');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await Promise.all([
          ethereumRelayer.stop(),
          tonRelayer.stop()
        ]);
        logger.info('Relayer stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Log status periodically
    setInterval(() => {
      const ethereumStatus = ethereumRelayer.getStatus();
      const tonStatus = tonRelayer.getStatus();
      
      logger.debug('Relayer Status:', {
        ethereum: ethereumStatus,
        ton: tonStatus
      });
    }, 60000); // Every minute

  } catch (error) {
    logger.error('Failed to start cross-chain relayer:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main:', error);
    process.exit(1);
  });
}
