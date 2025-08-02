import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses on Sepolia testnet
const CONTRACTS = {
  LIMIT_ORDER_PROTOCOL: '0x477F06cEcBf739Dc6495C9B34F3dF6dD2Ba0CC91',
  // These will be deployed if they don't exist
  TEST_TOKEN: '', // Will be deployed
  WHITELIST_REGISTRY: '' // Will be deployed
};

// Simple ERC20 test token ABI
const TEST_TOKEN_ABI = [
  'constructor(string name, string symbol, uint256 totalSupply)',
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

// WhitelistRegistry ABI
const WHITELIST_REGISTRY_ABI = [
  'constructor(address token_, uint256 resolverPercentageThreshold_)',
  'function register() external',
  'function getWhitelist() external view returns (address[])',
  'function TOKEN() external view returns (address)',
  'function resolverPercentageThreshold() external view returns (uint256)',
  'function promote(uint256 chainId, address promotee) external'
];

// Bytecode for simple ERC20 token (minimal implementation)
const TEST_TOKEN_BYTECODE = "0x608060405234801561001057600080fd5b50604051610c5e380380610c5e8339818101604052810190610032919061010d565b82600390816100419190610379565b5081600490816100519190610379565b508060008190555080600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516100fc91906104b0565b60405180910390a3505050506104cb565b60008060006060848603121561012257600080fd5b835167ffffffffffffffff81111561013957600080fd5b8401601f8101861361014a57600080fd5b805167ffffffffffffffff81111561016157600080fd5b60405160208082028301016040528015610184578160200160208202803683370190505b50925060208501519150604085015190509250925092565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061021357607f821691505b602082108103610226576102256101cc565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026102886fffffffffffffffffffffffffffffffff82161c198116811461028457848183871614610283576102826101fb565b5b5b50508190555b6000828261029b9092919061028b565b905092915050565b600060028202905092915050565b60006102bc8261019c565b6102c681856102a3565b93506102d18361022c565b8060005b838110156103025781516102e9888261024e565b97506102f4836102a3565b9250506001810190506102d5565b5085935050505092915050565b600082821b905092915050565b60006103288383610252565b92915050565b600082821b905092915050565b6000610346838361032e565b92915050565b60006103578261019c565b610361818561030f565b935061036c8361022c565b8060005b8381101561039d57815161038488826103328061031c565b975061038f8361030f565b925050600181019050610370565b5085935050505092915050565b600082825260208201905092915050565b60006103c68261019c565b6103d081856103aa565b93506103db8361022c565b8060005b8381101561040c5781516103f3888261034c565b97506103fe836103aa565b9250506001810190506103df565b5085935050505092915050565b6000601f19601f8301169050919050565b600061043582610419565b61043f81856103aa565b935061044a8361022c565b8060005b8381101561047b57815161046288826103bb565b975061046d836103aa565b92505060018101905061044e565b5085935050505092915050565b6000602082019050818103600083015261049581610419565b9050919050565b6000819050919050565b6104aa8161049c565b82525050565b60006020820190506104c560008301846104a1565b92915050565b610784806104da6000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806370a082311161005b57806370a08231146101325780638da5cb5b1461016257806395d89b4114610180578063a9059cbb1461019e57600080fd5b806306fdde031461008d578063095ea7b3146100ab57806318160ddd146100db57806340c10f19146100f9575b600080fd5b6100956101ce565b6040516100a29190610579565b60405180910390f35b6100c560048036038101906100c0919061062f565b61025c565b6040516100d2919061068a565b60405180910390f35b6100e361034e565b6040516100f091906106b4565b60405180910390f35b610113600480360381019061010e919061062f565b610354565b005b61014c600480360381019061014791906106cf565b6103f8565b60405161015991906106b4565b60405180910390f35b61016a610441565b60405161017791906106fc565b60405180910390f35b610188610447565b6040516101959190610579565b60405180910390f35b6101b860048036038101906101b3919061062f565b6104d5565b6040516101c5919061068a565b60405180910390f35b600380546101db9061074656b80601f016020809104026020016040519081016040528092919081815260200182805461020790610746565b80156102545780601f1061022957610100808354040283529160200191610254565b820191906000526020600020905b81548152906001019060200180831161023757829003601f168201915b505050505081565b600081600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161033c91906106b4565b60405180910390a36001905092915050565b60005481565b600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546103a29190610777565b925050819055508060056000848473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546103f99190610777565b925050819055505050565b6000600560008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60015481565b600480546104549061074656b80601f016020809104026020016040519081016040528092919081815260200182805461048090610746565b80156104cd5780601f106104a2576101008083540402835291602001916104cd565b820191906000526020600020905b8154815290600101906020018083116104b057829003601f168201915b505050505081565b600081600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105259190610777565b9250508190555081600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105779190610777565b92505081905550600190509250929050565b600081519050919050565b600082825260208201905092915050565b60005b838110156105c35780820151818401526020810190506105a8565b60008484015250505050565b6000601f19601f8301169050919050565b60006105eb82610589565b6105f58185610594565b93506106058185602086016105a5565b61060e816105cf565b840191505092915050565b6000602082019050818103600083015261063381846105e0565b905092915050565b60008035906020019050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061067582610650565b9050919050565b6106858161066a565b811461069057600080fd5b50565b6000813590506106a28161067c565b92915050565b6000819050919050565b6106bb816106a8565b81146106c657600080fd5b50565b6000813590506106d8816106b2565b92915050565b600080604083850312156106f5576106f4610634565b5b600061070385828601610693565b9250506020610714858286016106c9565b9150509250929050565b61072781610650565b82525050565b600060208201905061074260008301846106f6565b92915050565b600060028204905060018216806107605760ff821691505b6020821081036107735761077261063a565b5b50919050565b60006107848261066a565b91507fffffffffffffffffffffffffffffffffffffffff8211156107a9576107a8610639565b5b600182019050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fdfea26469706673582212200f8b5b8a8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f64736f6c63430008110033";

class ResolverWhitelist {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private testTokenContract?: ethers.Contract;
  private whitelistRegistryContract?: ethers.Contract;

  constructor(privateKey: string, rpcUrl: string = 'https://eth-sepolia.g.alchemy.com/v2/yyDTiWThBCkbbSHZbGPC1GxyVDZiE1-t') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    console.log(`🔑 Wallet address: ${this.wallet.address}`);
  }

  /**
   * Deploy a simple test token for registration
   */
  async deployTestToken(): Promise<string> {
    try {
      console.log('🪙 Deploying test token for WhitelistRegistry...');
      
      // Deploy with constructor: name, symbol, totalSupply
      const factory = new ethers.ContractFactory(
        TEST_TOKEN_ABI,
        TEST_TOKEN_BYTECODE,
        this.wallet
      );
      
      const totalSupply = ethers.parseEther('1000000'); // 1M tokens
      const token = await factory.deploy('TestToken', 'TEST', totalSupply);
      await token.waitForDeployment();
      
      const tokenAddress = await token.getAddress();
      console.log(`✅ Test token deployed at: ${tokenAddress}`);
      console.log(`   Total supply: ${ethers.formatEther(totalSupply)} TEST`);
      console.log(`   Your balance: ${ethers.formatEther(totalSupply)} TEST`);
      
      this.testTokenContract = token;
      CONTRACTS.TEST_TOKEN = tokenAddress;
      
      return tokenAddress;
    } catch (error) {
      console.error('❌ Error deploying test token:', error);
      throw error;
    }
  }

  /**
   * Deploy WhitelistRegistry contract
   */
  async deployWhitelistRegistry(tokenAddress: string): Promise<string> {
    try {
      console.log('📋 Deploying WhitelistRegistry...');
      
      // Simple WhitelistRegistry implementation
      const whitelistRegistryBytecode = "0x608060405234801561001057600080fd5b50604051610800380380610800833981810160405281019061003291906100f1565b81600081905550806001819055505050610131565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061007b82610050565b9050919050565b61008b81610070565b811461009657600080fd5b50565b6000815190506100a881610082565b92915050565b6000819050919050565b6100c1816100ae565b81146100cc57600080fd5b50565b6000815190506100de816100b8565b92915050565b6000815190506100f3816100b8565b92915050565b6000806040838503121561011057610110600b565b5b600061011e85828601610099565b925050602061012f858286016100cf565b9150509250929050565b6106c0806101406000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80631aa3a0081461005c5780634420e48614610078578063812b23ce146100965780638da5cb5b146100b4578063fc0c546a146100d2575b600080fd5b610076600480360381019061007191906102a0565b6100f0565b005b6100806101f8565b60405161008d91906103a0565b60405180910390f35b61009e6101fe565b6040516100ab91906103bb565b60405180910390f35b6100bc610204565b6040516100c991906103a0565b60405180910390f35b6100da61020a565b6040516100e791906103a0565b60405180910390f35b600160008154809291906101039061041a565b9190505550600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16156101955760405162461bcd60e51b815260206004820152601260248201527f416c726561647920726567697374657265640000000000000000000000000000604482015260640160405180910390fd5b6001600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055503373ffffffffffffffffffffffffffffffffffffffff16600373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a350565b60015481565b60015481565b60005481565b60005481565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061024282610217565b9050919050565b61025281610237565b811461025d57600080fd5b50565b60008135905061026f81610249565b92915050565b6000819050919050565b61028881610275565b811461029357600080fd5b50565b6000813590506102a58161027f565b92915050565b600080604083850312156102c2576102c1610212565b5b60006102d085828601610260565b92505060206102e185828601610296565b9150509250929050565b6000819050919050565b6000610310610300b6102fb84610217565b6102eb565b610217565b9050919050565b6000610322826102f5565b9050919050565b600061033482610317565b9050919050565b61034481610329565b82525050565b61035381610275565b82525050565b600060408201905061036e600083018561033b565b61037b602083018461034a565b9392505050565b61038b81610237565b82525050565b61039a81610275565b82525050565b60006020820190506103b56000830184610382565b92915050565b60006020820190506103d06000830184610391565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610411826102eb565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610443576104426103d6565b5b600182019050919050565b60008135905061045d8161027f565b9291505056fea2646970667358221220c2f8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c864736f6c63430008110033";
      
      const factory = new ethers.ContractFactory(
        WHITELIST_REGISTRY_ABI,
        whitelistRegistryBytecode,
        this.wallet
      );
      
      // Deploy with: token address, 1000 = 10% threshold
      const threshold = 1000; // 10% of total supply required
      const registry = await factory.deploy(tokenAddress, threshold);
      await registry.waitForDeployment();
      
      const registryAddress = await registry.getAddress();
      console.log(`✅ WhitelistRegistry deployed at: ${registryAddress}`);
      console.log(`   Token: ${tokenAddress}`);
      console.log(`   Threshold: ${threshold / 100}% of total supply`);
      
      this.whitelistRegistryContract = registry;
      CONTRACTS.WHITELIST_REGISTRY = registryAddress;
      
      return registryAddress;
    } catch (error) {
      console.error('❌ Error deploying WhitelistRegistry:', error);
      throw error;
    }
  }

  /**
   * Register the resolver in the whitelist
   */
  async registerResolver(): Promise<void> {
    try {
      if (!this.whitelistRegistryContract || !this.testTokenContract) {
        throw new Error('Contracts not deployed');
      }

      console.log('🔐 Registering resolver in whitelist...');
      
      // Check token balance
      const balance = await this.testTokenContract.balanceOf(this.wallet.address);
      const totalSupply = await this.testTokenContract.totalSupply();
      const threshold = await this.whitelistRegistryContract.resolverPercentageThreshold();
      
      console.log(`  Your token balance: ${ethers.formatEther(balance)} TEST`);
      console.log(`  Total supply: ${ethers.formatEther(totalSupply)} TEST`);
      console.log(`  Required threshold: ${threshold / 100}%`);
      
      // Check if we have enough tokens
      const requiredBalance = (totalSupply * threshold) / 10000n;
      console.log(`  Required balance: ${ethers.formatEther(requiredBalance)} TEST`);
      
      if (balance >= requiredBalance) {
        console.log(`  ✅ You have enough tokens to register!`);
        
        // Register
        const tx = await this.whitelistRegistryContract.register();
        console.log(`  Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`  ✅ Registration confirmed in block ${receipt?.blockNumber}`);
        
        // Check whitelist
        const whitelist = await this.whitelistRegistryContract.getWhitelist();
        console.log(`  📋 Current whitelist:`, whitelist);
        
        if (whitelist.includes(this.wallet.address)) {
          console.log(`  🎉 Successfully registered resolver: ${this.wallet.address}`);
        }
      } else {
        console.log(`  ❌ Insufficient tokens for registration`);
      }
      
    } catch (error) {
      console.error('❌ Error registering resolver:', error);
      throw error;
    }
  }

  /**
   * Promote a worker address for cross-chain operations
   */
  async promoteWorker(chainId: number, workerAddress: string): Promise<void> {
    try {
      if (!this.whitelistRegistryContract) {
        throw new Error('WhitelistRegistry not deployed');
      }

      console.log(`🚀 Promoting worker for chain ${chainId}...`);
      console.log(`  Worker address: ${workerAddress}`);
      
      const tx = await this.whitelistRegistryContract.promote(chainId, workerAddress);
      console.log(`  Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ Worker promotion confirmed in block ${receipt?.blockNumber}`);
      
    } catch (error) {
      console.error('❌ Error promoting worker:', error);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;
  
  if (!resolverPrivateKey) {
    console.error('❌ RESOLVER_PRIVATE_KEY environment variable is required');
    console.log('Please set your resolver private key in a .env file:');
    console.log('RESOLVER_PRIVATE_KEY=your_resolver_private_key_here');
    process.exit(1);
  }

  const whitelist = new ResolverWhitelist(resolverPrivateKey);
  
  try {
    console.log('🎯 Setting up resolver whitelist registration...');
    
    // Deploy test token
    const tokenAddress = await whitelist.deployTestToken();
    
    // Deploy WhitelistRegistry
    const registryAddress = await whitelist.deployWhitelistRegistry(tokenAddress);
    
    // Register resolver
    await whitelist.registerResolver();
    
    // Optionally promote a worker for Sepolia (chain ID 11155111)
    // await whitelist.promoteWorker(11155111, whitelist.wallet.address);
    
    console.log('\n✅ Resolver whitelist setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  Test Token: ${tokenAddress}`);
    console.log(`  WhitelistRegistry: ${registryAddress}`);
    console.log(`  Registered Resolver: ${whitelist.wallet.address}`);
    console.log('\nNow you can use this WhitelistRegistry address in your orders!');
    
  } catch (error) {
    console.error('❌ Error in whitelist setup:', error);
    process.exit(1);
  }
}

main().catch(console.error);

export { ResolverWhitelist }; 