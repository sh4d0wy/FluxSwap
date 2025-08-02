import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses on Sepolia testnet
const CONTRACTS = {
  RESOLVER: '0x9eE1C558C26992c07e8228A428c9626faAaf2037',
  LIMIT_ORDER_PROTOCOL: '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91',
  ESCROW_FACTORY: '0x2517B46E1f40f4EC78cA9824AC98d03B179C2B26'
};

async function testConnection() {
  const rpcUrl = process.env.RPC_URL || 'https://1rpc.io/sepolia';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  try {
    console.log('🔍 Testing connection to Sepolia testnet...');
    console.log(`📡 RPC URL: ${rpcUrl}`);
    
    // Test network connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Test block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current block number: ${blockNumber}`);
    
    // Test contract addresses
    console.log('\n🔍 Testing contract addresses...');
    
    for (const [name, address] of Object.entries(CONTRACTS)) {
      try {
        const code = await provider.getCode(address);
        if (code === '0x') {
          console.log(`❌ ${name}: No contract found at ${address}`);
        } else {
          console.log(`✅ ${name}: Contract found at ${address}`);
        }
      } catch (error) {
        console.log(`❌ ${name}: Error checking ${address} - ${error}`);
      }
    }
    
    // Test wallet connection if private key is provided
    const privateKey = process.env.PRIVATE_KEY;
    if (privateKey) {
      console.log('\n🔍 Testing wallet connection...');
      try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log(`✅ Wallet address: ${wallet.address}`);
        console.log(`✅ Wallet balance: ${ethers.formatEther(balance)} ETH`);
      } catch (error) {
        console.log(`❌ Wallet error: ${error}`);
      }
    } else {
      console.log('\n⚠️  No PRIVATE_KEY found in environment variables');
      console.log('   Set PRIVATE_KEY in .env file to test wallet functionality');
    }
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error); 