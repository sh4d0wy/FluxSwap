import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses on Sepolia testnet
const CONTRACTS = {
  RESOLVER: '0x9eE1C558C26992c07e8228A428c9626faAaf2037',
  LIMIT_ORDER_PROTOCOL: '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91',
  ESCROW_FACTORY: '0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26',
  SIMPLE_TON_RESOLVER: '0x0326213728dC72d464CBAd7Fed2d9EA497FbACEC', // Same as resolver for now
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // WETH on Sepolia
};

// ABI for the events we want to listen to
const CROSS_CHAIN_ORDER_FILLED_ABI = [
  'event CrossChainOrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, string tonRecipient, address tokenAddress, uint256 amount, string hashlock, uint256 timelock)'
];

// ABI for Resolver contract - corrected to match the actual contract
const RESOLVER_ABI = [
  'function deploySrc(tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables, tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable',
  'function deployDst(tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) dstImmutables, uint256 srcCancellationTimestamp) external payable',
  'function withdraw(address escrow, bytes32 secret, tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external',
  'function cancel(address escrow, tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external',
  'function arbitraryCalls(address[] targets, bytes[] arguments) external'
];

// ABI for LimitOrderProtocol
const LOP_ABI = [
  'function fillOrderArgs(tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)',
  'event OrderFilled(bytes32 orderHash, uint256 remainingAmount)'
];

// ABI for WETH
const WETH_ABI = [
  'function deposit() external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
];

// Helper function to convert address to uint256 (Address type)
function addressToUint256(addr: string): bigint {
  return BigInt(addr);
}

// Helper function to create timelocks
function createTimelocks(): bigint {
  const currentTime = Math.floor(Date.now() / 1000);
  // Create a simple timelock structure - in real usage this would be more complex
  return BigInt(currentTime + 3600); // 1 hour from now
}

class ResolverInteraction {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private resolverContract: ethers.Contract;
  private lopContract: ethers.Contract;
  private simpleTonResolverContract: ethers.Contract;
  private wethContract: ethers.Contract;

  constructor(privateKey: string, rpcUrl: string = 'https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.resolverContract = new ethers.Contract(
      CONTRACTS.RESOLVER,
      RESOLVER_ABI,
      this.wallet
    );
    
    this.lopContract = new ethers.Contract(
      CONTRACTS.LIMIT_ORDER_PROTOCOL,
      LOP_ABI,
      this.wallet
    );
    
    this.simpleTonResolverContract = new ethers.Contract(
      CONTRACTS.SIMPLE_TON_RESOLVER,
      CROSS_CHAIN_ORDER_FILLED_ABI,
      this.provider
    );
    
    this.wethContract = new ethers.Contract(
      CONTRACTS.WETH,
      WETH_ABI,
      this.wallet
    );
  }

  /**
   * Listen to CrossChainOrderFilled events
   */
  async listenToCrossChainOrderFilled() {
    console.log('🎧 Listening to CrossChainOrderFilled events...');
    
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
      console.log('==========================================\n');
    });

    // Also listen to regular OrderFilled events from LOP
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
      console.log('==============================\n');
    });
  }

  /**
   * Create a sample order for testing
   */
  createSampleOrder() {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Sample order structure - using uint256 for Address types
    const order = {
      salt: BigInt(ethers.hexlify(ethers.randomBytes(32))), // Convert to BigInt
      maker: addressToUint256(this.wallet.address),
      receiver: addressToUint256(this.wallet.address),
      makerAsset: addressToUint256(CONTRACTS.WETH), // WETH
      takerAsset: addressToUint256(CONTRACTS.WETH), // WETH
      makingAmount: ethers.parseEther('0.001'), // 0.001 ETH
      takingAmount: ethers.parseEther('0.001'), // 0.001 ETH
      makerTraits: 0n
    };

    // Create hashlock from a secret
    const secret = ethers.randomBytes(32);
    const hashlock = ethers.keccak256(ethers.hexlify(secret));

    // Sample immutables structure - corrected to match IBaseEscrow.Immutables
    const immutables = {
      orderHash: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        [order.salt, order.maker, order.receiver, order.makerAsset, order.takerAsset, order.makingAmount, order.takingAmount, order.makerTraits]
      )),
      hashlock: hashlock,
      maker: addressToUint256(this.wallet.address),
      taker: addressToUint256(CONTRACTS.RESOLVER),
      token: addressToUint256(CONTRACTS.WETH), // WETH
      amount: ethers.parseEther('0.001'), // 0.001 ETH
      safetyDeposit: ethers.parseEther('0.0001'), // 0.0001 ETH safety deposit
      timelocks: createTimelocks()
    };

    return { order, immutables, secret };
  }

  /**
   * Deploy source escrow and create order
   */
  async deploySrcAndCreateOrder() {
    try {
      console.log('🚀 Deploying source escrow and creating order...');
      
      const { order, immutables } = this.createSampleOrder();
      
      console.log('📋 Order details:');
      console.log(`  Maker: ${this.wallet.address}`);
      console.log(`  Making Amount: ${ethers.formatEther(order.makingAmount)} ETH`);
      console.log(`  Taking Amount: ${ethers.formatEther(order.takingAmount)} ETH`);
      console.log(`  Maker Asset: ${CONTRACTS.WETH}`);
      console.log(`  Taker Asset: ${CONTRACTS.WETH}`);
      
      console.log('🔐 Creating signature...');
      
      // Create a proper signature for the order
      // In a real scenario, this would be signed by the maker
      const orderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        [order.salt, order.maker, order.receiver, order.makerAsset, order.takerAsset, order.makingAmount, order.takingAmount, order.makerTraits]
      ));
      
      // Sign the order hash with the wallet's private key
      const signature = await this.wallet.signMessage(ethers.getBytes(orderHash));
      const r = signature.slice(0, 66);
      const vs = '0x' + signature.slice(66, 130);
      
      // Create TON order data
      const tonOrderData = this.encodeTonOrderData({
        tonRecipient: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        tonTokenAddress: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        hashlock: ethers.keccak256(ethers.randomBytes(32)),
        timelock: BigInt(Math.floor(Date.now() / 1000) + 7200) // 2 hours from now
      });
      
      // Prepare arguments for the order
      const args = ethers.concat([
        ethers.zeroPadValue(CONTRACTS.SIMPLE_TON_RESOLVER, 20), // target address
        tonOrderData
      ]);
      
      // Taker traits with target flag set
      const takerTraits = BigInt(1 << 251); // _ARGS_HAS_TARGET flag
      
      console.log('💸 Sending transaction...');
      console.log(`  Value: 0 ETH (using WETH)`);
      console.log(`  To: ${CONTRACTS.RESOLVER}`);
      
      // For WETH orders, we don't send ETH value since we're using WETH tokens
      // The safety deposit will be handled by the resolver contract internally
      const tx = await this.resolverContract.deploySrc(
        immutables,
        order,
        r,
        vs,
        ethers.parseEther('0.001'), // amount
        takerTraits,
        args,
        {
          value: 0 // No ETH value since we're using WETH
        }
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      return { tx, receipt };
    } catch (error) {
      console.error('❌ Error deploying source escrow:', error);
      throw error;
    }
  }

  /**
   * Encode TON order data
   */
  encodeTonOrderData(tonData: {
    tonRecipient: string;
    tonTokenAddress: string;
    hashlock: string;
    timelock: bigint;
  }): string {
    const tonRecipientBytes = ethers.toUtf8Bytes(tonData.tonRecipient);
    const tonTokenBytes = ethers.toUtf8Bytes(tonData.tonTokenAddress);
    const hashlockBytes = ethers.toUtf8Bytes(tonData.hashlock);
    
    return ethers.concat([
      ethers.zeroPadValue(ethers.toBeHex(tonRecipientBytes.length), 32),
      tonRecipientBytes,
      ethers.zeroPadValue(ethers.toBeHex(tonTokenBytes.length), 32),
      tonTokenBytes,
      ethers.zeroPadValue(ethers.toBeHex(hashlockBytes.length), 32),
      hashlockBytes,
      ethers.zeroPadValue(ethers.toBeHex(tonData.timelock), 32)
    ]);
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
   * Get wallet balance
   */
  async getWalletBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    console.log(`💰 Wallet balance: ${ethers.formatEther(balance)} ETH`);
    return balance;
  }

  /**
   * Prepare WETH tokens for trading
   */
  async prepareWETH() {
    console.log('🔄 Preparing WETH tokens...');
    
    // Check current WETH balance
    const wethBalance = await this.wethContract.balanceOf(this.wallet.address);
    console.log(`  Current WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
    
    const requiredWETH = ethers.parseEther('0.001');
    
    if (wethBalance < requiredWETH) {
      console.log(`  Need to deposit ${ethers.formatEther(requiredWETH)} ETH to get WETH...`);
      
      // Deposit ETH to get WETH
      const depositTx = await this.wethContract.deposit({
        value: requiredWETH
      });
      
      console.log(`  Deposit transaction: ${depositTx.hash}`);
      await depositTx.wait();
      console.log('  ✅ WETH deposit confirmed');
      
      // Approve WETH spending by the LimitOrderProtocol
      const approveTx = await this.wethContract.approve(CONTRACTS.LIMIT_ORDER_PROTOCOL, requiredWETH);
      console.log(`  Approve transaction: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('  ✅ WETH approval confirmed');
    } else {
      console.log('  ✅ Sufficient WETH balance');
      
      // Still approve WETH spending
      const approveTx = await this.wethContract.approve(CONTRACTS.LIMIT_ORDER_PROTOCOL, requiredWETH);
      console.log(`  Approve transaction: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('  ✅ WETH approval confirmed');
    }
  }

  /**
   * Stop listening to events
   */
  stopListening() {
    this.simpleTonResolverContract.removeAllListeners();
    this.lopContract.removeAllListeners();
    console.log('🛑 Stopped listening to events');
  }
}

// Main execution function
async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable is required');
    console.log('Please set your private key in a .env file:');
    console.log('PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }

  const resolver = new ResolverInteraction(privateKey);
  
  try {
    // Check balances
    await resolver.getWalletBalance();
    await resolver.getContractBalance();
    
    // Prepare WETH tokens for trading
    await resolver.prepareWETH();
    
    // Deploy source escrow and create order
    await resolver.deploySrcAndCreateOrder();
    
    console.log('\n✅ Transaction completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
}

main().catch(console.error);

export { ResolverInteraction }; 