// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "cross-chain-swap/EscrowFactory.sol";
import "cross-chain-swap/libraries/ImmutablesLib.sol";
import "cross-chain-swap/libraries/TimelocksLib.sol";
import "cross-chain-swap/interfaces/IBaseEscrow.sol";

/**
 * @title TestEscrowFactory with TON Protocol Support
 * @dev Extends the base EscrowFactory to support TON Protocol integration
 */
contract TestEscrowFactory is EscrowFactory, Ownable {
    // TON-specific events
    event TonEscrowCreated(
        address indexed escrowAddress,
        string tonRecipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock,
        bytes32 orderId
    );
    
    event TonOrderProcessed(
        bytes32 indexed orderId,
        address indexed creator,
        string tonRecipient,
        uint256 amount,
        EscrowType escrowType
    );
    
    // TON chain ID (following EIP-155 extension)
    uint256 public constant TON_CHAIN_ID = 607; // TON Mainnet
    uint256 public constant TON_TESTNET_CHAIN_ID = 0; // TON Testnet
    
    // Escrow types for TON integration
    enum EscrowType {
        Standard,
        TonCrossChain,
        TonAtomicSwap
    }
    
    // Mapping to track TON escrows
    mapping(address => bool) public tonEscrows;
    mapping(bytes32 => TonOrder) public tonOrders;
    
    // TON address validation constants
    uint8 public constant MIN_TON_ADDRESS_LENGTH = 48; // Base64 encoded address
    uint8 public constant MAX_TON_ADDRESS_LENGTH = 48;
    
    // Bridge contract address for TON communication
    address public tonBridge;
    
    // Supported token mapping for TON
    mapping(address => string) public ethereumToTonTokenMapping;
    mapping(string => address) public tonToEthereumTokenMapping;
    
    struct TonOrder {
        address creator;
        string tonRecipient;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        EscrowType escrowType;
        bool processed;
        address tokenAddress; // address(0) for ETH
    }

    constructor(
        address limitOrderProtocol,
        IERC20 feeToken,
        IERC20 accessToken,
        address owner,
        uint32 rescueDelaySrc,
        uint32 rescueDelayDst
    ) Ownable(owner) EscrowFactory(limitOrderProtocol, feeToken, accessToken, owner, rescueDelaySrc, rescueDelayDst) {
        // Ownership is already set by Ownable(owner)
    }
    
    /**
     * @notice Set TON bridge contract address
     * @param _tonBridge Address of the TON bridge contract
     */
    function setTonBridge(address _tonBridge) external onlyOwner {
        require(_tonBridge != address(0), "Invalid bridge address");
        tonBridge = _tonBridge;
    }
    
    /**
     * @notice Add token mapping between Ethereum and TON
     * @param ethereumToken Ethereum token contract address
     * @param tonToken TON token identifier (Jetton master address)
     */
    function addTokenMapping(
        address ethereumToken,
        string calldata tonToken
    ) external onlyOwner {
        require(ethereumToken != address(0), "Invalid Ethereum token");
        require(bytes(tonToken).length > 0, "Invalid TON token");
        
        ethereumToTonTokenMapping[ethereumToken] = tonToken;
        tonToEthereumTokenMapping[tonToken] = ethereumToken;
    }
    
    /**
     * @notice Creates a destination escrow with TON-specific logic
     * @param dstImmutables Immutable parameters for the destination escrow
     * @param srcCancellationTimestamp Source escrow cancellation timestamp
     * @param tonRecipient TON address of the recipient
     * @param orderId Unique order identifier
     * @return escrowAddress Address of the created escrow
     */
    function createTonEscrow(
        IBaseEscrow.Immutables calldata dstImmutables,
        uint256 srcCancellationTimestamp,
        string calldata tonRecipient,
        bytes32 orderId
    ) external payable onlyOwner returns (address escrowAddress) {
        // Validate TON address format
        require(_isValidTonAddress(tonRecipient), "Invalid TON address format");
        
        // Create the destination escrow
        this.createDstEscrow(dstImmutables, srcCancellationTimestamp);
        
        // Get the escrow address using the deterministic address function
        escrowAddress = this.addressOfEscrowDst(dstImmutables);
        
        // Mark as TON escrow
        tonEscrows[escrowAddress] = true;
        
        // Store TON order details
        tonOrders[orderId] = TonOrder({
            creator: msg.sender,
            tonRecipient: tonRecipient,
            amount: dstImmutables.amount,
            secretHash: bytes32(0), // Will be set when secret is revealed
            timelock: block.timestamp + 24 hours, // Default 24-hour timelock
            escrowType: EscrowType.TonCrossChain,
            processed: false,
            tokenAddress: AddressLib.get(dstImmutables.token)
        });
        
        emit TonEscrowCreated(
            escrowAddress,
            tonRecipient,
            dstImmutables.amount,
            bytes32(0), // Secret hash not known yet
            block.timestamp + 24 hours,
            orderId
        );
        
        emit TonOrderProcessed(
            orderId,
            msg.sender,
            tonRecipient,
            dstImmutables.amount,
            EscrowType.TonCrossChain
        );
    }
    
    /**
     * @notice Creates atomic swap escrow for TON integration
     * @param tonRecipient TON address of recipient
     * @param amount Amount to escrow
     * @param secretHash Hash of the secret for atomic swap
     * @param timelock Expiration timestamp
     * @param tokenAddress Token contract address (address(0) for ETH)
     * @param orderId Unique order identifier
     */
    function createTonAtomicSwap(
        string calldata tonRecipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock,
        address tokenAddress,
        bytes32 orderId
    ) external payable {
        require(_isValidTonAddress(tonRecipient), "Invalid TON address format");
        require(amount > 0, "Amount must be greater than 0");
        require(secretHash != bytes32(0), "Invalid secret hash");
        require(timelock > block.timestamp + 1 hours, "Timelock too short");
        require(timelock <= block.timestamp + 7 days, "Timelock too long");
        
        // Handle payment
        if (tokenAddress == address(0)) {
            // ETH payment
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "ETH not allowed for token swaps");
            IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        }
        
        // Store the atomic swap order
        tonOrders[orderId] = TonOrder({
            creator: msg.sender,
            tonRecipient: tonRecipient,
            amount: amount,
            secretHash: secretHash,
            timelock: timelock,
            escrowType: EscrowType.TonAtomicSwap,
            processed: false,
            tokenAddress: tokenAddress
        });
        
        emit TonEscrowCreated(
            address(this), // Factory holds the funds for atomic swaps
            tonRecipient,
            amount,
            secretHash,
            timelock,
            orderId
        );
        
        emit TonOrderProcessed(
            orderId,
            msg.sender,
            tonRecipient,
            amount,
            EscrowType.TonAtomicSwap
        );
    }
    
    /**
     * @notice Fulfill atomic swap with secret revelation
     * @param orderId Order identifier
     * @param secret The secret that hashes to secretHash
     */
    function fulfillTonAtomicSwap(
        bytes32 orderId,
        bytes32 secret
    ) external {
        TonOrder storage order = tonOrders[orderId];
        
        require(order.creator != address(0), "Order does not exist");
        require(order.escrowType == EscrowType.TonAtomicSwap, "Not an atomic swap order");
        require(!order.processed, "Order already processed");
        require(keccak256(abi.encodePacked(secret)) == order.secretHash, "Invalid secret");
        require(block.timestamp <= order.timelock, "Order expired");
        
        order.processed = true;
        
        // The fulfillment allows the TON side to proceed
        // In a full implementation, this would trigger cross-chain communication
        // For now, we emit an event that can be picked up by the relayer
    }
    
    /**
     * @notice Refund expired atomic swap
     * @param orderId Order identifier
     */
    function refundTonAtomicSwap(bytes32 orderId) external {
        TonOrder storage order = tonOrders[orderId];
        
        require(order.creator != address(0), "Order does not exist");
        require(order.escrowType == EscrowType.TonAtomicSwap, "Not an atomic swap order");
        require(!order.processed, "Order already processed");
        require(block.timestamp > order.timelock, "Order not expired");
        require(msg.sender == order.creator, "Only creator can refund");
        
        order.processed = true;
        
        // Refund the payment
        if (order.tokenAddress == address(0)) {
            // Refund ETH
            (bool success, ) = order.creator.call{value: order.amount}("");
            require(success, "ETH refund failed");
        } else {
            // Refund ERC20 tokens
            IERC20(order.tokenAddress).transfer(order.creator, order.amount);
        }
    }
    
    /**
     * @dev Validates TON address format
     * @param tonAddress TON address to validate
     * @return True if valid TON address format
     */
    function _isValidTonAddress(string memory tonAddress) internal pure returns (bool) {
        bytes memory addrBytes = bytes(tonAddress);
        
        // Check length (TON addresses are typically 48 characters in base64)
        if (addrBytes.length < MIN_TON_ADDRESS_LENGTH || addrBytes.length > MAX_TON_ADDRESS_LENGTH) {
            return false;
        }
        
        // Check for valid characters (simplified - basic validation)
        for (uint256 i = 0; i < addrBytes.length; i++) {
            bytes1 char = addrBytes[i];
            if (!(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) || // a-z
                char == 0x2B || // +
                char == 0x2F || // /
                char == 0x3D    // =
            )) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @notice Check if an escrow is a TON escrow
     * @param escrowAddress Address of the escrow
     * @return True if it's a TON escrow
     */
    function isTonEscrow(address escrowAddress) external view returns (bool) {
        return tonEscrows[escrowAddress];
    }
    
    /**
     * @notice Get TON order details
     * @param orderId Order identifier
     * @return TonOrder struct with order details
     */
    function getTonOrder(bytes32 orderId) external view returns (TonOrder memory) {
        return tonOrders[orderId];
    }
    
    /**
     * @notice Get supported TON token for Ethereum token
     * @param ethereumToken Ethereum token address
     * @return TON token identifier
     */
    function getTonToken(address ethereumToken) external view returns (string memory) {
        return ethereumToTonTokenMapping[ethereumToken];
    }
    
    /**
     * @notice Get supported Ethereum token for TON token
     * @param tonToken TON token identifier
     * @return Ethereum token address
     */
    function getEthereumToken(string calldata tonToken) external view returns (address) {
        return tonToEthereumTokenMapping[tonToken];
    }
    
    /**
     * @notice Get factory information including TON support
     * @return tonBridgeAddress The TON bridge contract address
     * @return tonChainId The TON mainnet chain ID
     * @return tonTestnetChainId The TON testnet chain ID
     */
    function getFactoryInfo() external view returns (
        address tonBridgeAddress,
        uint256 tonChainId,
        uint256 tonTestnetChainId
    ) {
        return (
            tonBridge,
            TON_CHAIN_ID,
            TON_TESTNET_CHAIN_ID
        );
    }
}
