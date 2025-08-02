import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses on Sepolia testnet
const CONTRACTS = {
  RESOLVER: '0x9eE1C558C26992c07e8228A428c9626faAaf2037',
  LIMIT_ORDER_PROTOCOL: '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91',
  ESCROW_FACTORY: '0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26',
  SIMPLE_TON_RESOLVER: '0x0326213728dC72d464CBAd7Fed2d9EA497FbACEC'
};

// ABI for the events we want to listen to
const CROSS_CHAIN_ORDER_FILLED_ABI = [
  'event CrossChainOrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, string tonRecipient, address tokenAddress, uint256 amount, string hashlock, uint256 timelock)'
];

const LOP_ABI = [
  'event OrderFilled(bytes32 orderHash, uint256 remainingAmount)'
];

class EventListener {
  provider: ethers.JsonRpcProvider;
  private simpleTonResolverContract: ethers.Contract;
  private lopContract: ethers.Contract;

  constructor(rpcUrl: string = 'https://1rpc.io/sepolia') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    this.simpleTonResolverContract = new ethers.Contract(
      CONTRACTS.SIMPLE_TON_RESOLVER,
      CROSS_CHAIN_ORDER_FILLED_ABI,
      this.provider
    );
    
    this.lopContract = new ethers.Contract(
      CONTRACTS.LIMIT_ORDER_PROTOCOL,
      LOP_ABI,
      this.provider
    );
  }

  /**
   * Listen to CrossChainOrderFilled events
   */
  async listenToCrossChainOrderFilled() {
    console.log('🎧 Listening to CrossChainOrderFilled events...');
    console.log(`📡 Contract: ${CONTRACTS.SIMPLE_TON_RESOLVER}`);
    console.log(`🌐 Network: Sepolia (Chain ID: 11155111)`);
    console.log('⏳ Waiting for events...\n');
    
    this.simpleTonResolverContract.on('CrossChainOrderFilled', (
      orderHash: string,
      maker: string,
      taker: string,
      tonRecipient: string,
      tokenAddress: string,
      amount: bigint,
      hashlock: string,
      timelock: bigint,
      event: ethers.EventLog
    ) => {
      console.log('\n🚀 CrossChainOrderFilled Event Detected!');
      console.log('==========================================');
      console.log(`Order Hash: ${orderHash}`);
      console.log(`Maker: ${maker}`);
      console.log(`Taker: ${taker}`);
      console.log(`TON Recipient: ${tonRecipient}`);
      console.log(`Token Address: ${tokenAddress}`);
      console.log(`Amount: ${ethers.formatEther(amount)} ETH`);
      console.log(`Hashlock: ${hashlock}`);
      console.log(`Timelock: ${timelock.toString()}`);
      console.log(`Block Number: ${event.blockNumber}`);
      console.log(`Transaction Hash: ${event.transactionHash}`);
      console.log(`Block Timestamp: ${new Date().toISOString()}`);
      console.log('==========================================\n');
    });
  }

  /**
   * Listen to OrderFilled events from LimitOrderProtocol
   */
  async listenToOrderFilled() {
    console.log('📋 Listening to OrderFilled events from LimitOrderProtocol...');
    console.log(`📡 Contract: ${CONTRACTS.LIMIT_ORDER_PROTOCOL}\n`);
    
    this.lopContract.on('OrderFilled', (
      orderHash: string,
      remainingAmount: bigint,
      event: ethers.EventLog
    ) => {
      console.log('\n📋 OrderFilled Event Detected!');
      console.log('==============================');
      console.log(`Order Hash: ${orderHash}`);
      console.log(`Remaining Amount: ${ethers.formatEther(remainingAmount)} ETH`);
      console.log(`Block Number: ${event.blockNumber}`);
      console.log(`Transaction Hash: ${event.transactionHash}`);
      console.log(`Block Timestamp: ${new Date().toISOString()}`);
      console.log('==============================\n');
    });
  }

  /**
   * Listen to all events
   */
  async listenToAllEvents() {
    await this.listenToCrossChainOrderFilled();
    await this.listenToOrderFilled();
  }

  /**
   * Get current block number
   */
  async getCurrentBlock() {
    const blockNumber = await this.provider.getBlockNumber();
    console.log(`📦 Current block number: ${blockNumber}`);
    return blockNumber;
  }

  /**
   * Get contract balance
   */
  async getContractBalance() {
    const balance = await this.provider.getBalance(CONTRACTS.RESOLVER);
    console.log(`💰 Resolver contract balance: ${ethers.formatEther(balance)} ETH`);
    return balance;
  }

  /**
   * Stop listening to events
   */
  stopListening() {
    this.simpleTonResolverContract.removeAllListeners();
    this.lopContract.removeAllListeners();
    console.log('🛑 Stopped listening to events');
  }

  /**
   * Get recent events (last 1000 blocks)
   */
  async getRecentEvents() {
    console.log('🔍 Fetching recent events...');
    
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    try {
      // Get recent CrossChainOrderFilled events
      const crossChainEvents = await this.simpleTonResolverContract.queryFilter(
        'CrossChainOrderFilled',
        fromBlock,
        currentBlock
      );
      
      console.log(`📊 Found ${crossChainEvents.length} recent CrossChainOrderFilled events`);
      
      for (const event of crossChainEvents) {
        console.log(`  - Block ${event.blockNumber}: ${event.transactionHash}`);
      }
      
      // Get recent OrderFilled events
      const orderEvents = await this.lopContract.queryFilter(
        'OrderFilled',
        fromBlock,
        currentBlock
      );
      
      console.log(`📊 Found ${orderEvents.length} recent OrderFilled events`);
      
      for (const event of orderEvents) {
        console.log(`  - Block ${event.blockNumber}: ${event.transactionHash}`);
      }
      
    } catch (error) {
      console.error('❌ Error fetching recent events:', error);
    }
  }
}

// Main execution function
async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://1rpc.io/sepolia';
  const listener = new EventListener(rpcUrl);
  
  try {
    // Get current network info
    const network = await listener.provider.getNetwork();
    console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get current block and contract balance
    await listener.getCurrentBlock();
    await listener.getContractBalance();
    
    // Get recent events
    await listener.getRecentEvents();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎧 Starting event listeners...');
    console.log('='.repeat(60) + '\n');
    
    // Start listening to all events
    await listener.listenToAllEvents();
    
    // Keep the script running to listen for events
    console.log('🎧 Script is running and listening for events...');
    console.log('Press Ctrl+C to stop\n');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, cleaning up...');
      listener.stopListening();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    listener.stopListening();
    process.exit(1);
  }
}

main().catch(console.error);

export { EventListener }; 