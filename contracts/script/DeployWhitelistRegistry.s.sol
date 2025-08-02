// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Minimal ERC20 for testing
contract TestToken {
    string public name = "Test Delegation Token";
    string public symbol = "TDT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 _totalSupply) {
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}

// Minimal WhitelistRegistry
contract WhitelistRegistry {
    address public immutable TOKEN;
    uint256 public resolverPercentageThreshold;
    address public owner;
    
    mapping(address => bool) public isWhitelisted;
    mapping(address => mapping(uint256 => address)) public promotions;
    address[] private whitelistedAddresses;
    
    event Registered(address addr);
    event Unregistered(address addr);
    event Promotion(address promoter, uint256 chainId, address promotee);
    
    error BalanceLessThanThreshold();
    error AlreadyRegistered();
    error NotWhitelisted();
    
    constructor(address token_, uint256 resolverPercentageThreshold_) {
        TOKEN = token_;
        resolverPercentageThreshold = resolverPercentageThreshold_;
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function register() external {
        require(!isWhitelisted[msg.sender], "Already registered");
        
        // Check if user has enough tokens (percentage of total supply)
        uint256 userBalance = TestToken(TOKEN).balanceOf(msg.sender);
        uint256 totalSupply = TestToken(TOKEN).totalSupply();
        uint256 requiredBalance = (totalSupply * resolverPercentageThreshold) / 10000;
        
        if (userBalance < requiredBalance) {
            revert BalanceLessThanThreshold();
        }
        
        isWhitelisted[msg.sender] = true;
        whitelistedAddresses.push(msg.sender);
        emit Registered(msg.sender);
    }
    
    function promote(uint256 chainId, address promotee) external {
        require(isWhitelisted[msg.sender], "Not whitelisted");
        promotions[msg.sender][chainId] = promotee;
        emit Promotion(msg.sender, chainId, promotee);
    }
    
    function getWhitelist() external view returns (address[] memory) {
        return whitelistedAddresses;
    }
    
    function unregister(address addr) external onlyOwner {
        require(isWhitelisted[addr], "Not whitelisted");
        isWhitelisted[addr] = false;
        
        // Remove from array
        for (uint i = 0; i < whitelistedAddresses.length; i++) {
            if (whitelistedAddresses[i] == addr) {
                whitelistedAddresses[i] = whitelistedAddresses[whitelistedAddresses.length - 1];
                whitelistedAddresses.pop();
                break;
            }
        }
        
        emit Unregistered(addr);
    }
    
    function setResolverPercentageThreshold(uint256 threshold_) external onlyOwner {
        resolverPercentageThreshold = threshold_;
    }
}

contract DeployWhitelistRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("RESOLVER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying WhitelistRegistry system...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // 1. Deploy test token with 1M supply
        uint256 totalSupply = 1_000_000 * 10**18;
        TestToken token = new TestToken(totalSupply);
        console.log("Test Token deployed at:", address(token));
        console.log("Total supply:", totalSupply);
        
        // 2. Deploy WhitelistRegistry with 10% threshold
        uint256 threshold = 1000; // 10% = 1000/10000
        WhitelistRegistry registry = new WhitelistRegistry(address(token), threshold);
        console.log("WhitelistRegistry deployed at:", address(registry));
        console.log("Required threshold:", threshold, "basis points (10%)");
        
        // 3. Calculate required tokens for registration
        uint256 requiredTokens = (totalSupply * threshold) / 10000;
        console.log("Required tokens for registration:", requiredTokens);
        console.log("You have all tokens, so you can register!");
        
        vm.stopBroadcast();
        
        // 4. Create summary file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "network": "sepolia",\n',
            '  "deploymentDate": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "testToken": "', vm.toString(address(token)), '",\n',
            '    "whitelistRegistry": "', vm.toString(address(registry)), '"\n',
            '  },\n',
            '  "configuration": {\n',
            '    "totalSupply": "', vm.toString(totalSupply), '",\n',
            '    "threshold": "', vm.toString(threshold), '",\n',
            '    "requiredTokens": "', vm.toString(requiredTokens), '"\n',
            '  },\n',
            '  "deployer": "', vm.toString(vm.addr(deployerPrivateKey)), '"\n',
            '}'
        ));
        
        vm.writeFile("deployments/sepolia/whitelist-registry.json", json);
        
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Test Token:", address(token));
        console.log("WhitelistRegistry:", address(registry));
        console.log("Ready for registration!");
        console.log("\nNext steps:");
        console.log("1. Call registry.register() to register your resolver");
        console.log("2. Call registry.promote(11155111, workerAddress) to set worker for Sepolia");
        console.log("3. Use registry address in your LOP orders for private order validation");
    }
} 