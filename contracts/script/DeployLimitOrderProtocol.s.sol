// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { LimitOrderProtocol } from "limit-order-protocol/contracts/LimitOrderProtocol.sol";
import { IWETH } from "@1inch/solidity-utils/contracts/interfaces/IWETH.sol";

contract DeployLimitOrderProtocol is Script {
    // WETH addresses by chain
    mapping(uint256 => address) public WETH_ADDRESSES;
    
    function setUp() public {
        // Mainnet
        WETH_ADDRESSES[1] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        // Sepolia
        WETH_ADDRESSES[11155111] = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
        // Goerli
        WETH_ADDRESSES[5] = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;
        // Polygon
        WETH_ADDRESSES[137] = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
        // Mumbai
        WETH_ADDRESSES[80001] = 0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889;
        // BSC
        WETH_ADDRESSES[56] = 0xbB4cDB9Cbd36b01bd1cBAef2Af88c6e6ff4FB4C2;
        // BSC Testnet
        WETH_ADDRESSES[97] = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;
        // Arbitrum One
        WETH_ADDRESSES[42161] = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        // Arbitrum Sepolia
        WETH_ADDRESSES[421614] = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73;
        // Optimism
        WETH_ADDRESSES[10] = 0x4200000000000000000000000000000000000006;
        // Optimism Sepolia
        WETH_ADDRESSES[11155420] = 0x4200000000000000000000000000000000000006;
        // Base
        WETH_ADDRESSES[8453] = 0x4200000000000000000000000000000000000006;
        // Base Sepolia
        WETH_ADDRESSES[84532] = 0x4200000000000000000000000000000000000006;
        // Avalanche
        WETH_ADDRESSES[43114] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
        // Avalanche Fuji
        WETH_ADDRESSES[43113] = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;
        // Gnosis
        WETH_ADDRESSES[100] = 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d;
        // Linea
        WETH_ADDRESSES[59144] = 0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f;
        // Linea Sepolia
        WETH_ADDRESSES[59141] = 0x2C1b868d6596a18e32E61B901E4060C872647b6C;
    }

    function run() external {
        uint256 chainId = block.chainid;
        address wethAddress = WETH_ADDRESSES[chainId];
        
        if (wethAddress == address(0)) {
            revert("WETH address not configured for this chain");
        }

        vm.startBroadcast();
        
        LimitOrderProtocol limitOrderProtocol = new LimitOrderProtocol(IWETH(wethAddress));
        
        vm.stopBroadcast();

        console.log("LimitOrderProtocol deployed at:", address(limitOrderProtocol));
        console.log("Chain ID:", chainId);
        console.log("WETH address:", wethAddress);
        
        // Save deployment info
        string memory deploymentInfo = string.concat(
            "LimitOrderProtocol deployed at: ",
            vm.toString(address(limitOrderProtocol)),
            "\nChain ID: ",
            vm.toString(chainId),
            "\nWETH address: ",
            vm.toString(wethAddress)
        );
        
        // vm.writeFile("deployment-lop.txt", deploymentInfo); // Commented out due to Foundry restrictions
    }
} 