// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {SecurityUtils} from "../src/SecurityUtils.sol";

contract SecurityUtilsMinimalTest is Test {
    SecurityUtils public securityUtils;
    
    address public owner;
    address public user1;
    
    bytes32 public testSecret;
    bytes32 public testHashlock;
    
    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        
        vm.prank(owner);
        securityUtils = new SecurityUtils(owner);
        
        // Generate test data
        testSecret = keccak256("test_secret_123");
        testHashlock = keccak256(abi.encodePacked(testSecret));
    }
    
    function testGenerateHashlock() public {
        vm.prank(user1);
        bytes32 generatedHashlock = securityUtils.generateHashlock(testSecret);
        
        assertEq(generatedHashlock, testHashlock);
    }
    
    function testVerifySecretValid() public {
        vm.prank(user1);
        bool isValid = securityUtils.verifySecret(testSecret, testHashlock);
        
        assertTrue(isValid);
    }
    
    function testVerifySecretInvalid() public {
        bytes32 wrongSecret = keccak256("wrong_secret");
        vm.prank(user1);
        bool isValid = securityUtils.verifySecret(wrongSecret, testHashlock);
        
        assertFalse(isValid);
    }
    
    function testValidateTimelockValid() public {
        uint256 validTimelock = block.timestamp + 2 hours;
        bool isValid = securityUtils.validateTimelock(validTimelock);
        
        assertTrue(isValid);
    }
    
    function testValidateTimelockTooShort() public {
        uint256 shortTimelock = block.timestamp + 30 minutes;
        bool isValid = securityUtils.validateTimelock(shortTimelock);
        
        assertFalse(isValid);
    }
    
    function testIsTimelockExpiredNotExpired() public {
        uint256 futureTimelock = block.timestamp + 1 hours;
        bool isExpired = securityUtils.isTimelockExpired(futureTimelock);
        
        assertFalse(isExpired);
    }
    
    function testIsTimelockExpiredExpired() public {
        // Set block timestamp to a known value
        vm.warp(10000); // Set block timestamp to 10000
        
        uint256 pastTimelock = 5000; // Timelock at 5000 (in the past)
        bool isExpired = securityUtils.isTimelockExpired(pastTimelock);
        
        assertTrue(isExpired);
    }
    
    function testConstants() public {
        assertEq(securityUtils.MIN_TIMELOCK(), 1 hours);
        assertEq(securityUtils.MAX_TIMELOCK(), 7 days);
        assertEq(securityUtils.SECRET_LENGTH(), 32);
        assertEq(securityUtils.MIN_CONFIRMATIONS(), 2);
    }
    
    function testProtectMessageReplay() public {
        bytes32 messageHash = keccak256("test_message");
        
        vm.prank(user1);
        bool success = securityUtils.protectMessageReplay(messageHash);
        
        assertTrue(success);
        assertTrue(securityUtils.processedMessages(messageHash));
    }
    
    function testAddRelayerConfirmation() public {
        bytes32 messageHash = keccak256("test_message");
        address relayer = makeAddr("relayer");
        
        vm.prank(relayer);
        uint256 confirmations = securityUtils.addRelayerConfirmation(messageHash, relayer);
        
        assertEq(confirmations, 1);
        assertTrue(securityUtils.relayerConfirmations(messageHash, relayer));
    }
    
    function testHasSufficientConfirmations() public {
        bytes32 messageHash = keccak256("test_message");
        address relayer1 = makeAddr("relayer1");
        address relayer2 = makeAddr("relayer2");
        
        // Add one confirmation
        vm.prank(relayer1);
        securityUtils.addRelayerConfirmation(messageHash, relayer1);
        
        bool hasSufficient = securityUtils.hasSufficientConfirmations(messageHash);
        assertFalse(hasSufficient);
        
        // Add second confirmation
        vm.prank(relayer2);
        securityUtils.addRelayerConfirmation(messageHash, relayer2);
        
        hasSufficient = securityUtils.hasSufficientConfirmations(messageHash);
        assertTrue(hasSufficient);
    }
} 