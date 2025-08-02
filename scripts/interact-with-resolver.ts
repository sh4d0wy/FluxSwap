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

/*
Required Environment Variables in .env file:

USER_PRIVATE_KEY=0x... (The user who creates and signs the order - maker)
RESOLVER_PRIVATE_KEY=0x... (The resolver who fills the order - taker)

Example .env file content:
USER_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
RESOLVER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

Make sure both accounts have some Sepolia ETH for gas fees.
The user account needs WETH for the order.
The resolver account will act as the taker.
*/

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

// ABI for EscrowFactory
const ESCROW_FACTORY_ABI = [
  'function addressOfEscrowSrc(tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external view returns (address)',
  'function addressOfEscrowDst(tuple(bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external view returns (address)'
];

// ABI for LimitOrderProtocol  
const LOP_ABI = [
  'function fillOrderArgs(tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)',
  'event OrderFilled(bytes32 orderHash, uint256 remainingAmount)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)'
];

// ABI for WETH
const WETH_ABI = [
  'function deposit() external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)'
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
  private userWallet: ethers.Wallet;  // The user who creates orders (maker)
  private resolverWallet: ethers.Wallet;  // The resolver who fills orders (taker)
  private resolverContract: ethers.Contract;
  private lopContract: ethers.Contract;
  private simpleTonResolverContract: ethers.Contract;
  private wethContract: ethers.Contract;
  private escrowFactoryContract: ethers.Contract;

  constructor(userPrivateKey: string, resolverPrivateKey: string, rpcUrl: string = 'https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.userWallet = new ethers.Wallet(userPrivateKey, this.provider);
    this.resolverWallet = new ethers.Wallet(resolverPrivateKey, this.provider);
    
    console.log(`👤 User (Maker): ${this.userWallet.address}`);
    console.log(`🤖 Resolver (Taker): ${this.resolverWallet.address}`);
    
    // Resolver contract is controlled by the resolver wallet
    this.resolverContract = new ethers.Contract(
      CONTRACTS.RESOLVER,
      RESOLVER_ABI,
      this.resolverWallet
    );
    
    // LOP contract can be called by either wallet depending on the operation
    this.lopContract = new ethers.Contract(
      CONTRACTS.LIMIT_ORDER_PROTOCOL,
      LOP_ABI,
      this.resolverWallet  // Resolver fills orders
    );
    
    this.simpleTonResolverContract = new ethers.Contract(
      CONTRACTS.SIMPLE_TON_RESOLVER,
      CROSS_CHAIN_ORDER_FILLED_ABI,
      this.provider
    );
    
    // WETH contract is used by the user wallet (maker)
    this.wethContract = new ethers.Contract(
      CONTRACTS.WETH,
      WETH_ABI,
      this.userWallet
    );

    this.escrowFactoryContract = new ethers.Contract(
      CONTRACTS.ESCROW_FACTORY,
      ESCROW_FACTORY_ABI,
      this.provider
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
   * Create whitelist data for the order
   */
  createWhitelistData(): string {
    // Whitelist format: (bytes10,bytes2)[N] resolversAddressesAndTimeDeltas
    // We'll include our resolver wallet address with a time delta of 0 (immediate access)
    
    // Take the last 10 bytes of the resolver wallet address (not contract address)
    const resolverAddress = this.resolverWallet.address.slice(2); // Remove '0x'
    const last10Bytes = resolverAddress.slice(-20); // Take last 10 bytes (20 hex chars)
    
    // Convert to bytes10 format 
    const addressBytes = ethers.zeroPadValue('0x' + last10Bytes, 10);
    
    // Time delta of 0 (immediate access)
    const timeDelta = ethers.zeroPadValue('0x00', 2);
    
    // Combine address and time delta
    const whitelistEntry = ethers.concat([addressBytes, timeDelta]);
    
    return whitelistEntry;
  }

  /**
   * Create extra data for the order including whitelist
   */
  createExtraData(): string {
    // ExtraData format:
    // [0:4] - Resolver fee information (0 for no fee)
    // [4:8] - The time after which interaction with the order is allowed (0 for immediate)
    // [8:k] - Whitelist data
    // [k] - Bitmap indicating usage flags
    
    const resolverFee = ethers.zeroPadValue('0x00', 4); // No fee
    const allowedTime = ethers.zeroPadValue('0x00', 4); // Immediate access
    const whitelist = this.createWhitelistData();
    
    // Bitmap: resolver count (1) shifted left by 3 bits = 0x08
    // This encodes 1 resolver in the whitelist
    const bitmap = '0x08';
    
    return ethers.concat([resolverFee, allowedTime, whitelist, bitmap]);
  }

  /**
   * Create a sample order for testing
   */
  createSampleOrder() {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Sample order structure - using uint256 for Address types
    const order = {
      salt: BigInt(ethers.hexlify(ethers.randomBytes(32))), // Convert to BigInt
      maker: addressToUint256(this.userWallet.address),
      receiver: addressToUint256(this.userWallet.address),
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
      maker: addressToUint256(this.userWallet.address),
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
      console.log('🚀 Creating and filling limit order with escrow deployment...');
      
      const { order, immutables } = this.createSampleOrder();
      
      console.log('📋 Order details:');
      console.log(`  Maker: ${this.userWallet.address}`);
      console.log(`  Making Amount: ${ethers.formatEther(order.makingAmount)} ETH`);
      console.log(`  Taking Amount: ${ethers.formatEther(order.takingAmount)} ETH`);
      console.log(`  Maker Asset: ${CONTRACTS.WETH}`);
      console.log(`  Taker Asset: ${CONTRACTS.WETH}`);
      
      // The Resolver contract will handle escrow creation and funding internally
      console.log('📝 Resolver will handle escrow deployment and LOP interaction...');
      const computedEscrowAddress = await this.escrowFactoryContract.addressOfEscrowSrc(immutables);
      console.log(`  Computed escrow address: ${computedEscrowAddress}`);
      console.log(`  Safety deposit: ${ethers.formatEther(immutables.safetyDeposit)} ETH`);
      
      console.log('🔐 Creating signature...');
      
      // Get the domain separator from the LimitOrderProtocol contract
      const domainSeparator = await this.lopContract.DOMAIN_SEPARATOR();
      console.log(`  Domain separator: ${domainSeparator}`);
      
      // Define the EIP-712 domain and types for the order
      const domain = {
        name: '1inch Limit Order Protocol',
        version: '4',
        chainId: 11155111, // Sepolia chain ID
        verifyingContract: CONTRACTS.LIMIT_ORDER_PROTOCOL
      };
      
      const types = {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ]
      };
      
      // Convert Address types back to regular addresses for signing
      const orderForSigning = {
        salt: order.salt,
        maker: ethers.getAddress('0x' + order.maker.toString(16).padStart(40, '0')),
        receiver: ethers.getAddress('0x' + order.receiver.toString(16).padStart(40, '0')),
        makerAsset: ethers.getAddress('0x' + order.makerAsset.toString(16).padStart(40, '0')),
        takerAsset: ethers.getAddress('0x' + order.takerAsset.toString(16).padStart(40, '0')),
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits
      };
      
      console.log('  Order for signing:', orderForSigning);
      
      // Sign using EIP-712
      const signature = await this.userWallet.signTypedData(domain, types, orderForSigning);
      const r = signature.slice(0, 66);
      const vs = '0x' + signature.slice(66, 130);
      
      // Create the args for deploySrc
      // The resolver will prepend escrow address, so we provide extension data + interaction data
      const extraData = this.createExtraData();
      const tonOrderData = this.encodeTonOrderData({
        tonRecipient: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        tonTokenAddress: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        hashlock: ethers.keccak256(ethers.randomBytes(32)),
        timelock: BigInt(Math.floor(Date.now() / 1000) + 7200) // 2 hours from now
      });
      
      // Args = extension data + interaction data (resolver will prepend escrow address)
      const args = ethers.concat([extraData, tonOrderData]);
      
      // Taker traits - resolver will set _ARGS_HAS_TARGET flag internally
      const takerTraits = BigInt(0); // No special flags needed
      
      console.log('💸 Calling resolver deploySrc function...');
      console.log(`  Value: ${ethers.formatEther(immutables.safetyDeposit)} ETH (safety deposit)`);
      console.log(`  To: ${CONTRACTS.RESOLVER}`);
      
      // Call deploySrc on the Resolver contract instead of fillOrderArgs on LOP
      const tx = await this.resolverContract.deploySrc(
        immutables,
        order,
        r,
        vs,
        ethers.parseEther('0.001'), // amount
        takerTraits,
        args, // args (with escrow address prepended)
        {
          value: immutables.safetyDeposit // Send safety deposit
        }
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      return { tx, receipt };
    } catch (error) {
      console.error('❌ Error filling order:', error);
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
   * Get wallet balances for both user and resolver
   */
  async getWalletBalances() {
    const userBalance = await this.provider.getBalance(this.userWallet.address);
    const resolverBalance = await this.provider.getBalance(this.resolverWallet.address);
    console.log(`💰 User wallet balance: ${ethers.formatEther(userBalance)} ETH`);
    console.log(`💰 Resolver wallet balance: ${ethers.formatEther(resolverBalance)} ETH`);
    return { userBalance, resolverBalance };
  }

  /**
   * Get wallet balance (kept for compatibility)
   */
  async getWalletBalance() {
    const balance = await this.provider.getBalance(this.userWallet.address);
    console.log(`💰 User wallet balance: ${ethers.formatEther(balance)} ETH`);
    return balance;
  }

  /**
   * Prepare WETH tokens for trading
   */
  async prepareWETH() {
    console.log('🔄 Preparing WETH tokens...');
    
    // Check current WETH balance
    const wethBalance = await this.wethContract.balanceOf(this.userWallet.address);
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

  /**
   * Simple test that directly calls LOP fillOrderArgs (bypassing resolver)
   */
  async testDirectLOP() {
    try {
      console.log('🧪 Testing direct LOP fillOrderArgs (bypassing resolver)...');
      
      // Create a simple WETH -> WETH order (like a cross-chain swap simulation)
      const currentTime = Math.floor(Date.now() / 1000);
      
      const order = {
        salt: BigInt(ethers.hexlify(ethers.randomBytes(32))),
        maker: addressToUint256(this.userWallet.address),
        receiver: addressToUint256(this.userWallet.address), 
        makerAsset: addressToUint256(CONTRACTS.WETH), // We provide WETH
        takerAsset: addressToUint256(CONTRACTS.WETH), // Taker also provides WETH (simulating cross-chain)
        makingAmount: ethers.parseEther('0.001'), // We give 0.001 WETH
        takingAmount: ethers.parseEther('0.001'), // We want 0.001 WETH back
        makerTraits: 0n
      };
      
      console.log('📋 Simple Order details:');
      console.log(`  Maker: ${this.userWallet.address}`);
      console.log(`  Taker: ${this.resolverWallet.address}`);
      console.log(`  Making Amount: ${ethers.formatEther(order.makingAmount)} WETH`);
      console.log(`  Taking Amount: ${ethers.formatEther(order.takingAmount)} WETH`);
      console.log(`  Maker Asset: ${CONTRACTS.WETH} (WETH)`);
      console.log(`  Taker Asset: ${CONTRACTS.WETH} (WETH)`);
      
      // Ensure the resolver has WETH to provide
      console.log('🔄 Checking resolver WETH balance...');
      const resolverWethContract = new ethers.Contract(CONTRACTS.WETH, WETH_ABI, this.resolverWallet);
      const resolverWethBalance = await resolverWethContract.balanceOf(this.resolverWallet.address);
      console.log(`  Resolver WETH balance: ${ethers.formatEther(resolverWethBalance)} WETH`);
      
      if (resolverWethBalance < order.takingAmount) {
        console.log(`  🔄 Converting ETH to WETH for resolver...`);
        const depositTx = await resolverWethContract.deposit({
          value: order.takingAmount
        });
        await depositTx.wait();
        console.log(`  ✅ Resolver now has WETH`);
      }
      
      // Approve LOP to spend resolver's WETH
      console.log('🔄 Approving LOP to spend resolver WETH...');
      const approveTx = await resolverWethContract.approve(CONTRACTS.LIMIT_ORDER_PROTOCOL, order.takingAmount);
      await approveTx.wait();
      console.log('  ✅ Resolver WETH approval confirmed');
      
      // Get the domain separator from the LimitOrderProtocol contract
      const domainSeparator = await this.lopContract.DOMAIN_SEPARATOR();
      console.log(`  Domain separator: ${domainSeparator}`);
      
      // Define the EIP-712 domain and types for the order
      const domain = {
        name: '1inch Limit Order Protocol',
        version: '4',
        chainId: 11155111, // Sepolia chain ID
        verifyingContract: CONTRACTS.LIMIT_ORDER_PROTOCOL
      };
      
      const types = {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ]
      };
      
      // Convert Address types back to regular addresses for signing
      const orderForSigning = {
        salt: order.salt,
        maker: ethers.getAddress('0x' + order.maker.toString(16).padStart(40, '0')),
        receiver: ethers.getAddress('0x' + order.receiver.toString(16).padStart(40, '0')),
        makerAsset: ethers.getAddress('0x' + order.makerAsset.toString(16).padStart(40, '0')),
        takerAsset: ethers.getAddress('0x' + order.takerAsset.toString(16).padStart(40, '0')),
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits
      };
      
      console.log('🔐 Creating signature for direct LOP test...');
      const signature = await this.userWallet.signTypedData(domain, types, orderForSigning);
      const r = signature.slice(0, 66);
      const vs = '0x' + signature.slice(66, 130);
      
      // Simple args - just whitelist data without resolver target
      const extraData = this.createExtraData();
      
      // Taker traits with no special flags for direct LOP test
      const takerTraits = BigInt(0);
      
      console.log('💸 Calling LOP fillOrderArgs directly...');
      console.log(`  Value: 0 ETH (WETH to WETH swap)`);
      console.log(`  To: ${CONTRACTS.LIMIT_ORDER_PROTOCOL}`);
      
      // Call fillOrderArgs directly on LOP, no ETH value needed for WETH-WETH swap
      const tx = await this.lopContract.fillOrderArgs(
        order,
        r,
        vs,
        ethers.parseEther('0.001'), // amount
        takerTraits,
        extraData, // just extension data
        {
          value: 0 // No ETH value for WETH-WETH swap
        }
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Direct LOP test completed in block ${receipt?.blockNumber}`);
      
      return { tx, receipt };
    } catch (error) {
      console.error('❌ Error in direct LOP test:', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const userPrivateKey = process.env.USER_PRIVATE_KEY;
  const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;
  
  if (!userPrivateKey) {
    console.error('❌ USER_PRIVATE_KEY environment variable is required');
    console.log('Please set your user private key in a .env file:');
    console.log('USER_PRIVATE_KEY=your_user_private_key_here');
    process.exit(1);
  }

  if (!resolverPrivateKey) {
    console.error('❌ RESOLVER_PRIVATE_KEY environment variable is required');
    console.log('Please set your resolver private key in a .env file:');
    console.log('RESOLVER_PRIVATE_KEY=your_resolver_private_key_here');
    process.exit(1);
  }

  const resolver = new ResolverInteraction(userPrivateKey, resolverPrivateKey);
  
  try {
    // Check balances
    await resolver.getWalletBalances();
    await resolver.getContractBalance();
    
    // Prepare WETH tokens for trading
    await resolver.prepareWETH();
    
    // Test direct LOP interaction (bypassing resolver restrictions)
    await resolver.testDirectLOP();
    
    console.log('\n✅ Direct LOP test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
}

main().catch(console.error);

export { ResolverInteraction }; 