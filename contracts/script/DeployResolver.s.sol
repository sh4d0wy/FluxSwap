// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Resolver} from "../src/Resolver.sol";
import {IEscrowFactory} from "../lib/cross-chain-swap/contracts/interfaces/IEscrowFactory.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";

contract DeployResolver is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.envAddress("DEPLOYER_ADDRESS");
        
        // Contract addresses from deployment summary
        address escrowFactoryAddress = vm.envAddress("ESCROW_FACTORY_ADDRESS");
        address lopAddress = vm.envAddress("LOP_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Resolver contract
        Resolver resolver = new Resolver(
            IEscrowFactory(escrowFactoryAddress),
            IOrderMixin(lopAddress),
            deployerAddress
        );
        
        vm.stopBroadcast();
        
        console.log("Resolver deployed successfully!");
        console.log("Resolver address:", address(resolver));
        console.log("EscrowFactory address:", escrowFactoryAddress);
        console.log("Limit Order Protocol address:", lopAddress);
        console.log("Owner address:", deployerAddress);
        
        
    }
} 