// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTonResolver} from "../src/SimpleTonResolver.sol";

contract DeploySimpleTonResolver is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.envAddress("DEPLOYER_ADDRESS");
        
        // For now, we'll use a placeholder escrow factory address
        // In production, you'd deploy or use an actual escrow factory
        address escrowFactoryAddress = vm.envAddress("ESCROW_FACTORY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SimpleTonResolver contract
        SimpleTonResolver resolver = new SimpleTonResolver(
            deployerAddress,
            escrowFactoryAddress
        );
        
        vm.stopBroadcast();
        
        console.log("SimpleTonResolver deployed successfully!");
        console.log("SimpleTonResolver address:", address(resolver));
        console.log("Resolver address:", address(resolver));
        console.log("EscrowFactory address:", escrowFactoryAddress);
        console.log("Owner address:", deployerAddress);       
        
    }
} 