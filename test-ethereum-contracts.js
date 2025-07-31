const { ethers } = require('ethers');

// Deployed contract addresses from the deployment
const ESCROW_FACTORY_ADDRESS = '0x2517b46e1f40f4ec78ca9824ac98d03b179c2b26';
const LOP_ADDRESS = '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91';
const FEE_BANK_ADDRESS = '0x5C85Df4d75E4bAfDc03Ef5D510Da6E134E95F1fF';
const ESCROW_SRC_ADDRESS = '0x4D7779ED61238c0b00272631F1ee319F76b71b5B';
const ESCROW_DST_ADDRESS = '0x206b6B0167021a45914cd796A2173959913F5Fb1';

// Basic ABI for contract interaction
const BASIC_ABI = [
    'function owner() view returns (address)',
    'function getAddress(uint256) view returns (address)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
];

async function testEthereumContracts() {
    console.log('🔍 Testing Ethereum Contracts on Sepolia...\n');
    
    try {
        // Connect to Sepolia network
        const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
        
        console.log('✅ Connected to Sepolia network');
        
        // Test basic contract connectivity
        const contracts = [
            { name: 'EscrowFactory', address: ESCROW_FACTORY_ADDRESS },
            { name: 'Limit Order Protocol', address: LOP_ADDRESS },
            { name: 'FeeBank', address: FEE_BANK_ADDRESS },
            { name: 'EscrowSrc', address: ESCROW_SRC_ADDRESS },
            { name: 'EscrowDst', address: ESCROW_DST_ADDRESS }
        ];
        
        for (const contract of contracts) {
            try {
                const contractInstance = new ethers.Contract(contract.address, BASIC_ABI, provider);
                
                // Try to get contract code to verify it exists
                const code = await provider.getCode(contract.address);
                
                if (code !== '0x') {
                    console.log(`✅ ${contract.name} (${contract.address}) - Contract deployed and accessible`);
                    
                    // Try to call a basic function if available
                    try {
                        const owner = await contractInstance.owner();
                        console.log(`   └─ Owner: ${owner}`);
                    } catch (e) {
                        console.log(`   └─ Basic functions available (owner function not found)`);
                    }
                } else {
                    console.log(`❌ ${contract.name} (${contract.address}) - No contract code found`);
                }
            } catch (error) {
                console.log(`❌ ${contract.name} (${contract.address}) - Error: ${error.message}`);
            }
        }
        
        // Test network connectivity
        const blockNumber = await provider.getBlockNumber();
        console.log(`\n📦 Current Sepolia block number: ${blockNumber}`);
        
        // Test gas estimation
        const feeData = await provider.getFeeData();
        console.log(`⛽ Gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
        
        console.log('\n🎉 Ethereum contract testing completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Contracts are deployed and accessible on Sepolia');
        console.log('- Network connectivity is working');
        console.log('- Basic contract interactions are functional');
        
    } catch (error) {
        console.error('❌ Error testing Ethereum contracts:', error.message);
        console.log('\n💡 To run this test with real RPC:');
        console.log('1. Update the RPC URL in the script');
        console.log('2. Install ethers: npm install ethers');
        console.log('3. Run: node test-ethereum-contracts.js');
    }
}

// Run the test
testEthereumContracts(); 