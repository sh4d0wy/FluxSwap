// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SecurityUtils
 * @dev Security utilities for cross-chain atomic swaps including hashlock generation,
 * verification, timelock enforcement, and message replay protection
 */
contract SecurityUtils is Ownable, ReentrancyGuard {
    constructor(address initialOwner) Ownable(initialOwner) {}
    // Security constants
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 7 days;
    uint256 public constant SECRET_LENGTH = 32;
    uint256 public constant MIN_CONFIRMATIONS = 2;
    
    // State variables for replay protection
    mapping(bytes32 => bool) public processedMessages;
    mapping(bytes32 => uint256) public messageTimestamps;
    mapping(bytes32 => mapping(address => bool)) public relayerConfirmations;
    mapping(bytes32 => uint256) public messageConfirmations;
    
    // Events
    event HashlockGenerated(bytes32 indexed hashlock, address indexed generator);
    event SecretVerified(bytes32 indexed hashlock, bytes32 secret, address indexed verifier);
    event TimelockExpired(bytes32 indexed orderId, uint256 expiredAt);
    event MessageReplayProtected(bytes32 indexed messageHash, address indexed sender);
    event RelayerConfirmation(bytes32 indexed messageHash, address indexed relayer);
    
    // Structs
    struct SecurityParams {
        bytes32 hashlock;
        uint256 timelock;
        uint256 createdAt;
        bool isValid;
    }
    
    struct MessageSecurity {
        bytes32 messageHash;
        uint256 timestamp;
        uint256 confirmations;
        bool processed;
    }
    
    // Modifiers
    modifier validTimelock(uint256 timelock) {
        require(timelock >= block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");
        _;
    }
    
    modifier validSecret(bytes32 secret) {
        require(secret != bytes32(0), "Invalid secret");
        _;
    }
    
    modifier messageNotProcessed(bytes32 messageHash) {
        require(!processedMessages[messageHash], "Message already processed");
        _;
    }
    
    /**
     * @notice Generate a hashlock from a secret
     * @param secret The secret to hash
     * @return hashlock The generated hashlock
     */
    function generateHashlock(bytes32 secret) 
        external 
        validSecret(secret) 
        returns (bytes32 hashlock) 
    {
        hashlock = keccak256(abi.encodePacked(secret));
        emit HashlockGenerated(hashlock, msg.sender);
        return hashlock;
    }
    
    /**
     * @notice Verify a secret against a hashlock
     * @param secret The secret to verify
     * @param hashlock The expected hashlock
     * @return isValid Whether the secret matches the hashlock
     */
    function verifySecret(bytes32 secret, bytes32 hashlock) 
        external 
        validSecret(secret) 
        returns (bool isValid) 
    {
        bytes32 computedHashlock = keccak256(abi.encodePacked(secret));
        isValid = computedHashlock == hashlock;
        
        if (isValid) {
            emit SecretVerified(hashlock, secret, msg.sender);
        }
        
        return isValid;
    }
    
    /**
     * @notice Check if a timelock has expired
     * @param timelock The timelock timestamp
     * @return isExpired Whether the timelock has expired
     */
    function isTimelockExpired(uint256 timelock) external view returns (bool isExpired) {
        isExpired = block.timestamp >= timelock;
        return isExpired;
    }
    
    /**
     * @notice Validate timelock parameters
     * @param timelock The timelock timestamp
     * @return isValid Whether the timelock is valid
     */
    function validateTimelock(uint256 timelock) 
        external 
        view 
        returns (bool isValid) 
    {
        isValid = timelock >= block.timestamp + MIN_TIMELOCK && 
                  timelock <= block.timestamp + MAX_TIMELOCK;
        return isValid;
    }
    
    /**
     * @notice Create security parameters for an atomic swap
     * @param secret The secret for the swap
     * @param timelock The timelock duration
     * @return params The security parameters
     */
    function createSecurityParams(bytes32 secret, uint256 timelock) 
        external 
        view 
        validSecret(secret) 
        validTimelock(block.timestamp + timelock) 
        returns (SecurityParams memory params) 
    {
        params.hashlock = keccak256(abi.encodePacked(secret));
        params.timelock = block.timestamp + timelock;
        params.createdAt = block.timestamp;
        params.isValid = true;
        return params;
    }
    
    /**
     * @notice Protect against message replay attacks
     * @param messageHash The hash of the message to protect
     * @return success Whether the protection was successful
     */
    function protectMessageReplay(bytes32 messageHash) 
        external 
        messageNotProcessed(messageHash) 
        returns (bool success) 
    {
        processedMessages[messageHash] = true;
        messageTimestamps[messageHash] = block.timestamp;
        
        emit MessageReplayProtected(messageHash, msg.sender);
        return true;
    }
    
    /**
     * @notice Add relayer confirmation for a message
     * @param messageHash The hash of the message
     * @param relayer The relayer address
     * @return confirmations The total number of confirmations
     */
    function addRelayerConfirmation(bytes32 messageHash, address relayer) 
        external 
        returns (uint256 confirmations) 
    {
        require(!relayerConfirmations[messageHash][relayer], "Already confirmed by this relayer");
        
        relayerConfirmations[messageHash][relayer] = true;
        messageConfirmations[messageHash]++;
        confirmations = messageConfirmations[messageHash];
        
        emit RelayerConfirmation(messageHash, relayer);
        return confirmations;
    }
    
    /**
     * @notice Check if a message has sufficient confirmations
     * @param messageHash The hash of the message
     * @return hasSufficientConfirmations Whether there are enough confirmations
     */
    function hasSufficientConfirmations(bytes32 messageHash) 
        external 
        view 
        returns (bool) 
    {
        return messageConfirmations[messageHash] >= MIN_CONFIRMATIONS;
    }
    
    /**
     * @notice Get message security information
     * @param messageHash The hash of the message
     * @return security The security information
     */
    function getMessageSecurity(bytes32 messageHash) 
        external 
        view 
        returns (MessageSecurity memory security) 
    {
        security.messageHash = messageHash;
        security.timestamp = messageTimestamps[messageHash];
        security.confirmations = messageConfirmations[messageHash];
        security.processed = processedMessages[messageHash];
        return security;
    }
    
    /**
     * @notice Emergency function to reset message processing (owner only)
     * @param messageHash The hash of the message to reset
     */
    function emergencyResetMessage(bytes32 messageHash) external onlyOwner {
        processedMessages[messageHash] = false;
        messageTimestamps[messageHash] = 0;
        messageConfirmations[messageHash] = 0;
    }
    
    /**
     * @notice Get remaining time until timelock expires
     * @param timelock The timelock timestamp
     * @return remainingTime The remaining time in seconds
     */
    function getRemainingTime(uint256 timelock) external view returns (uint256 remainingTime) {
        if (block.timestamp >= timelock) {
            return 0;
        }
        return timelock - block.timestamp;
    }
} 