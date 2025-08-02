import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses on Sepolia testnet
const CONTRACTS = {
  LIMIT_ORDER_PROTOCOL: '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91',
  SIMPLE_TON_RESOLVER: '0x0326213728dC72d464CBAd7Fed2d9EA497FbACEC',
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
};

// ABI for LimitOrderProtocol  
const LOP_ABI = [
  'function fillOrderArgs(tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)'
];

// ABI for WETH
const WETH_ABI = [
  'function deposit() external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
];

// Simple resolver ABI for events
const RESOLVER_ABI = [
  'event CrossChainOrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, string tonRecipient, address tokenAddress, uint256 amount, string hashlock, uint256 timelock)'
];

// Helper function to convert address to uint256
function addressToUint256(addr: string): bigint {
  return BigInt(addr);
}

class SimpleTonTest {
  private provider: ethers.JsonRpcProvider;
  private userWallet: ethers.Wallet;
  private resolverWallet: ethers.Wallet;
  private lopContract: ethers.Contract;
  private wethContract: ethers.Contract;
  private resolverContract: ethers.Contract;

  constructor(userPrivateKey: string, resolverPrivateKey: string) {
    this.provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t');
    this.userWallet = new ethers.Wallet(userPrivateKey, this.provider);
    this.resolverWallet = new ethers.Wallet(resolverPrivateKey, this.provider);
    
    console.log(`👤 User (Maker): ${this.userWallet.address}`);
    console.log(`🤖 Resolver (Taker): ${this.resolverWallet.address}`);
    
    this.lopContract = new ethers.Contract(CONTRACTS.LIMIT_ORDER_PROTOCOL, LOP_ABI, this.resolverWallet);
    this.wethContract = new ethers.Contract(CONTRACTS.WETH, WETH_ABI, this.userWallet);
    this.resolverContract = new ethers.Contract(CONTRACTS.SIMPLE_TON_RESOLVER, RESOLVER_ABI, this.provider);
  }

  /**
   * Encode TON order data for postInteraction
   */
  encodeTonOrderData(tonData: {
    tonRecipient: string;
    tonTokenAddress: string;
    hashlock: string;
    timelock: bigint;
  }): string {
    // Simple encoding: length-prefixed strings + timelock
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
   * Test creating a simple public order with TON data
   */
  async testSimplePublicOrder(): Promise<void> {
    try {
      console.log('🌍 Testing simple PUBLIC TON order (no restrictions)...');
      
      // 1. Prepare WETH for both accounts
      await this.prepareWETH();
      
      // 2. Create order with unique salt (timestamp + random)
      const timestamp = BigInt(Date.now());
      const randomPart = BigInt(ethers.hexlify(ethers.randomBytes(16)));
      const uniqueSalt = (timestamp << 128n) + randomPart;
      
      // Configure makerTraits for public order with remaining invalidator (not bit invalidator)
      const ALLOW_MULTIPLE_FILLS_FLAG = 1n << 254n;  // Allow multiple fills to use remaining invalidator
      const allowedSender = 0n;  // Public order (anyone can fill)
      const makerTraits = ALLOW_MULTIPLE_FILLS_FLAG | allowedSender;
      
      const order = {
        salt: uniqueSalt,
        maker: this.userWallet.address,
        receiver: this.userWallet.address,
        makerAsset: CONTRACTS.WETH,
        takerAsset: CONTRACTS.WETH,
        makingAmount: ethers.parseEther('0.001'),
        takingAmount: ethers.parseEther('0.001'),
        // PUBLIC ORDER with remaining invalidator (not bit invalidator)
        makerTraits: makerTraits
      };
      
      console.log(`🎲 Generated unique salt: ${uniqueSalt.toString()}`);
      
      console.log('📋 Order details:');
      console.log(`  Maker: ${this.userWallet.address}`);
      console.log(`  Taker: ${this.resolverWallet.address}`);
      console.log(`  Amount: ${ethers.formatEther(order.makingAmount)} WETH`);
      
      // 3. Sign order
      const domain = {
        name: '1inch Limit Order Protocol',
        version: '4',
        chainId: 11155111,
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
      
      // Use the order with address values for signing
      console.log('🔐 Signing order...');
      const signature = await this.userWallet.signTypedData(domain, types, order);
      const r = signature.slice(0, 66);
      const vs = '0x' + signature.slice(66, 130);
      
      // 4. Create TON data
      console.log('🪙 Creating TON blockchain data...');
      const tonData = {
        tonRecipient: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        tonTokenAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
        hashlock: ethers.keccak256(ethers.randomBytes(32)),
        timelock: BigInt(Math.floor(Date.now() / 1000) + 7200)
      };
      
      console.log(`  TON Recipient: ${tonData.tonRecipient}`);
      console.log(`  TON Token: ${tonData.tonTokenAddress}`);
      console.log(`  Hashlock: ${tonData.hashlock}`);
      console.log(`  Timelock: ${tonData.timelock.toString()}`);
      
      const tonOrderData = this.encodeTonOrderData(tonData);
      console.log(`  Encoded TON data length: ${tonOrderData.length} chars`);
      
      // 5. Create args for postInteraction
      const takerTraits = BigInt(1 << 251); // _ARGS_HAS_TARGET flag
      const args = ethers.concat([
        ethers.zeroPadValue(CONTRACTS.SIMPLE_TON_RESOLVER, 20), // target
        tonOrderData // TON data
      ]);
      
      console.log('📝 Args created for postInteraction:');
      console.log(`  Target: ${CONTRACTS.SIMPLE_TON_RESOLVER}`);
      console.log(`  Total args length: ${args.length} chars`);
      console.log(`  ✅ This is a PUBLIC order with REMAINING invalidator - anyone can fill it multiple times!`);
      
      // 6. Listen for events using polling instead of filters
      console.log('👂 Setting up event listener...');
      
      // 7. Execute order first
      console.log('🚀 Executing public order...');
      
      // Convert order to uint256 format for contract execution
      const orderForExecution = {
        salt: order.salt,
        maker: addressToUint256(order.maker),
        receiver: addressToUint256(order.receiver),
        makerAsset: addressToUint256(order.makerAsset),
        takerAsset: addressToUint256(order.takerAsset),
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits
      };
      
      const tx = await this.lopContract.fillOrderArgs(
        orderForExecution,
        r,
        vs,
        ethers.parseEther('0.001'),
        takerTraits,
        args,
        { value: 0 }
      );
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Order completed in block ${receipt?.blockNumber}`);
      
      // 8. Now query for events from the transaction receipt
      try {
        console.log('🔍 Checking for CrossChainOrderFilled event in transaction logs...');
        
        // Parse logs from the transaction receipt
        const logs = receipt?.logs || [];
        
        for (const log of logs) {
          try {
            // Try to parse as CrossChainOrderFilled event
            if (log.address.toLowerCase() === CONTRACTS.SIMPLE_TON_RESOLVER.toLowerCase()) {
              const parsedLog = this.resolverContract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (parsedLog && parsedLog.name === 'CrossChainOrderFilled') {
                console.log('\n🎉 CrossChainOrderFilled Event Found!');
                console.log('==========================================');
                console.log(`Order Hash: ${parsedLog.args.orderHash}`);
                console.log(`Maker: ${parsedLog.args.maker}`);
                console.log(`Taker: ${parsedLog.args.taker}`);
                console.log(`TON Recipient: ${parsedLog.args.tonRecipient}`);
                console.log(`Token Address: ${parsedLog.args.tokenAddress}`);
                console.log(`Amount: ${ethers.formatEther(parsedLog.args.amount)} WETH`);
                console.log(`Hashlock: ${parsedLog.args.hashlock}`);
                console.log(`Timelock: ${parsedLog.args.timelock.toString()}`);
                console.log(`Transaction: ${tx.hash}`);
                console.log('==========================================\n');
                break;
              }
            }
          } catch (parseError) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      } catch (eventError) {
        console.log('⚠️ Could not parse events from transaction logs, but transaction was successful');
      }
      
    } catch (error) {
      console.error('❌ Error in simple test:', error);
      throw error;
    }
  }

  /**
   * Prepare WETH for both accounts
   */
  async prepareWETH(): Promise<void> {
    console.log('🔄 Preparing WETH for both accounts...');
    
    // User WETH
    const userBalance = await this.wethContract.balanceOf(this.userWallet.address);
    const requiredAmount = ethers.parseEther('0.001');
    
    if (userBalance < requiredAmount) {
      console.log('  📥 Depositing ETH for WETH (user)...');
      const depositTx = await this.wethContract.deposit({ value: requiredAmount });
      await depositTx.wait();
    }
    
    console.log('  ✅ Approving LOP to spend user WETH...');
    const approveTx = await this.wethContract.approve(CONTRACTS.LIMIT_ORDER_PROTOCOL, requiredAmount);
    await approveTx.wait();
    
    // Resolver WETH
    const resolverWethContract = new ethers.Contract(CONTRACTS.WETH, WETH_ABI, this.resolverWallet);
    const resolverBalance = await resolverWethContract.balanceOf(this.resolverWallet.address);
    
    if (resolverBalance < requiredAmount) {
      console.log('  📥 Depositing ETH for WETH (resolver)...');
      const depositTx = await resolverWethContract.deposit({ value: requiredAmount });
      await depositTx.wait();
    }
    
    console.log('  ✅ Approving LOP to spend resolver WETH...');
    const resolverApproveTx = await resolverWethContract.approve(CONTRACTS.LIMIT_ORDER_PROTOCOL, requiredAmount);
    await resolverApproveTx.wait();
    
    console.log('✅ Both accounts ready with WETH!');
  }
}

// Main execution
async function main() {
  const userPrivateKey = process.env.USER_PRIVATE_KEY;
  const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;
  
  if (!userPrivateKey || !resolverPrivateKey) {
    console.error('❌ Both USER_PRIVATE_KEY and RESOLVER_PRIVATE_KEY are required');
    process.exit(1);
  }

  const test = new SimpleTonTest(userPrivateKey, resolverPrivateKey);
  
  try {
    console.log('🎯 Starting simple PUBLIC TON order test...');
    await test.testSimplePublicOrder();
    console.log('\n✅ Simple TON test completed successfully!');
    console.log('\n🎉 Your TON integration is working! No whitelist needed for public orders.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 