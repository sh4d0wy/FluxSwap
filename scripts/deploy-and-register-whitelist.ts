import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const WHITELIST_REGISTRY_ABI = [
  'function register() external',
  'function promote(uint256 chainId, address promotee) external',
  'function getWhitelist() external view returns (address[])',
  'function isWhitelisted(address) external view returns (bool)',
  'function TOKEN() external view returns (address)',
  'function resolverPercentageThreshold() external view returns (uint256)'
];

const TEST_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)'
];

class WhitelistManager {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t');
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    console.log(`🔑 Wallet: ${this.wallet.address}`);
  }

  async deployWithFoundry(): Promise<{ tokenAddress: string; registryAddress: string }> {
    console.log('🚀 Deploying WhitelistRegistry with Foundry...');
    
    // Using child_process to run forge script
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const forgeProcess = spawn('forge', [
        'script',
        'contracts/script/DeployWhitelistRegistry.s.sol:DeployWhitelistRegistry',
        '--rpc-url',
        'https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t',
        '--broadcast',
        '--verify'
      ], {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let output = '';
      forgeProcess.stdout.on('data', (data) => {
        const str = data.toString();
        console.log(str);
        output += str;
      });

      forgeProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      forgeProcess.on('close', (code) => {
        if (code === 0) {
          // Parse output for contract addresses
          const tokenMatch = output.match(/Test Token deployed at: (0x[a-fA-F0-9]{40})/);
          const registryMatch = output.match(/WhitelistRegistry deployed at: (0x[a-fA-F0-9]{40})/);
          
          if (tokenMatch && registryMatch) {
            resolve({
              tokenAddress: tokenMatch[1],
              registryAddress: registryMatch[1]
            });
          } else {
            reject(new Error('Could not parse contract addresses from output'));
          }
        } else {
          reject(new Error(`Forge script failed with code ${code}`));
        }
      });
    });
  }

  async registerInWhitelist(registryAddress: string, tokenAddress: string): Promise<void> {
    console.log('📋 Registering in WhitelistRegistry...');
    
    const registry = new ethers.Contract(registryAddress, WHITELIST_REGISTRY_ABI, this.wallet);
    const token = new ethers.Contract(tokenAddress, TEST_TOKEN_ABI, this.wallet);
    
    // Check current status
    const [balance, totalSupply, threshold, isRegistered] = await Promise.all([
      token.balanceOf(this.wallet.address),
      token.totalSupply(),
      registry.resolverPercentageThreshold(),
      registry.isWhitelisted(this.wallet.address)
    ]);
    
    console.log(`  Token balance: ${ethers.formatEther(balance)} TDT`);
    console.log(`  Total supply: ${ethers.formatEther(totalSupply)} TDT`);
    console.log(`  Required threshold: ${threshold} basis points`);
    console.log(`  Already registered: ${isRegistered}`);
    
    const requiredBalance = (totalSupply * threshold) / 10000n;
    console.log(`  Required balance: ${ethers.formatEther(requiredBalance)} TDT`);
    
    if (isRegistered) {
      console.log(`  ✅ Already registered!`);
      return;
    }
    
    if (balance >= requiredBalance) {
      console.log(`  ✅ Sufficient balance, registering...`);
      
      const tx = await registry.register();
      console.log(`  Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ Registered in block ${receipt?.blockNumber}`);
      
      // Verify registration
      const newStatus = await registry.isWhitelisted(this.wallet.address);
      console.log(`  Registration verified: ${newStatus}`);
    } else {
      console.log(`  ❌ Insufficient tokens for registration`);
    }
  }

  async promoteWorker(registryAddress: string, chainId: number, workerAddress: string): Promise<void> {
    console.log(`🚀 Promoting worker for chain ${chainId}...`);
    
    const registry = new ethers.Contract(registryAddress, WHITELIST_REGISTRY_ABI, this.wallet);
    
    const tx = await registry.promote(chainId, workerAddress);
    console.log(`  Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`  ✅ Worker promoted in block ${receipt?.blockNumber}`);
  }

  async checkWhitelistStatus(registryAddress: string): Promise<void> {
    console.log('📊 Checking whitelist status...');
    
    const registry = new ethers.Contract(registryAddress, WHITELIST_REGISTRY_ABI, this.wallet);
    
    const [whitelist, isRegistered] = await Promise.all([
      registry.getWhitelist(),
      registry.isWhitelisted(this.wallet.address)
    ]);
    
    console.log(`  Total whitelisted addresses: ${whitelist.length}`);
    console.log(`  You are registered: ${isRegistered}`);
    console.log(`  Whitelist:`, whitelist);
  }
}

async function main() {
  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ RESOLVER_PRIVATE_KEY required in .env');
    process.exit(1);
  }

  const manager = new WhitelistManager(privateKey);
  
  try {
    console.log('🎯 Deploying and setting up WhitelistRegistry...');
    
    // Deploy contracts
    const { tokenAddress, registryAddress } = await manager.deployWithFoundry();
    
    console.log(`\n✅ Contracts deployed:`);
    console.log(`  Test Token: ${tokenAddress}`);
    console.log(`  WhitelistRegistry: ${registryAddress}`);
    
    // Register in whitelist
    await manager.registerInWhitelist(registryAddress, tokenAddress);
    
    // Promote worker for Sepolia
    await manager.promoteWorker(registryAddress, 11155111, manager.wallet.address);
    
    // Check final status
    await manager.checkWhitelistStatus(registryAddress);
    
    console.log('\n🎉 WhitelistRegistry setup complete!');
    console.log('\n📋 Summary:');
    console.log(`  Test Token: ${tokenAddress}`);
    console.log(`  WhitelistRegistry: ${registryAddress}`);
    console.log(`  Registered Resolver: ${manager.wallet.address}`);
    console.log('\n🔗 Usage in orders:');
    console.log('  1. Use order-level whitelisting in extraData (current approach)');
    console.log('  2. OR reference this registry in ResolverValidationExtension');
    console.log('  3. Both approaches will validate your resolver access');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 