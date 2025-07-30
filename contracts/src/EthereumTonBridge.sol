// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EthereumTonBridge
 * @dev Bridge contract for cross-chain communication between Ethereum and TON
 * Handles message verification, order lifecycle management, and atomic swap coordination
 */
contract EthereumTonBridge is Ownable, ReentrancyGuard {
    // Events
    event TonEscrowCreated(
        bytes32 indexed orderId,
        address indexed sender,
        string tonRecipient,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        address token
    );

    event TonEscrowFulfilled(
        bytes32 indexed orderId,
        bytes32 secret,
        address fulfiller
    );

    event TonEscrowRefunded(
        bytes32 indexed orderId,
        address refunder
    );

    event TonMessageVerified(
        bytes32 indexed messageHash,
        address indexed relayer,
        bool verified
    );

    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    // Structs
    struct EscrowOrder {
        address sender;
        string tonRecipient;
        uint256 amount;
        address token; // address(0) for ETH
        bytes32 hashlock;
        uint256 timelock;
        EscrowStatus status;
        bytes32 secret;
    }

    struct TonMessage {
        bytes32 messageId;
        address sourceAddress;
        string destAddress;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool verified;
    }

    enum EscrowStatus {
        Pending,
        Fulfilled,
        Refunded
    }

    // State variables
    mapping(bytes32 => bool) public processedMessages;
    mapping(bytes32 => EscrowOrder) public orders;
    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => TonMessage) public tonMessages;
    mapping(bytes32 => uint256) public messageConfirmations;
    mapping(bytes32 => mapping(address => bool)) public relayerConfirmations;

    uint256 public constant MIN_CONFIRMATIONS = 2;
    uint256 public constant MAX_TIMELOCK = 7 days;
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public relayerCount;

    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Add an authorized relayer
     * @param relayer Address of the relayer to add
     */
    function addRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "Invalid relayer address");
        require(!authorizedRelayers[relayer], "Relayer already exists");
        
        authorizedRelayers[relayer] = true;
        relayerCount++;
        
        emit RelayerAdded(relayer);
    }

    /**
     * @notice Remove an authorized relayer
     * @param relayer Address of the relayer to remove
     */
    function removeRelayer(address relayer) external onlyOwner {
        require(authorizedRelayers[relayer], "Relayer does not exist");
        
        authorizedRelayers[relayer] = false;
        relayerCount--;
        
        emit RelayerRemoved(relayer);
    }

    /**
     * @notice Create TON escrow order
     * @param orderId Unique order identifier
     * @param tonRecipient TON address of recipient
     * @param hashlock Hash of the secret
     * @param timelock Expiration timestamp
     * @param token Token address (address(0) for ETH)
     */
    function createTonEscrow(
        bytes32 orderId,
        string calldata tonRecipient,
        bytes32 hashlock,
        uint256 timelock,
        address token
    ) external payable nonReentrant {
        require(orders[orderId].sender == address(0), "Order already exists");
        require(timelock > block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");
        require(bytes(tonRecipient).length > 0, "Invalid TON recipient");
        require(hashlock != bytes32(0), "Invalid hashlock");

        uint256 amount;
        if (token == address(0)) {
            // ETH deposit
            require(msg.value > 0, "Amount must be greater than 0");
            amount = msg.value;
        } else {
            // ERC20 deposit
            require(msg.value == 0, "ETH not allowed for token deposits");
            // Note: In production, implement proper ERC20 transfer logic here
            // For now, assume amount is encoded in the call or verified elsewhere
            revert("ERC20 deposits not implemented yet");
        }

        orders[orderId] = EscrowOrder({
            sender: msg.sender,
            tonRecipient: tonRecipient,
            amount: amount,
            token: token,
            hashlock: hashlock,
            timelock: timelock,
            status: EscrowStatus.Pending,
            secret: bytes32(0)
        });

        emit TonEscrowCreated(
            orderId,
            msg.sender,
            tonRecipient,
            amount,
            hashlock,
            timelock,
            token
        );
    }

    /**
     * @notice Fulfill escrow with secret revelation
     * @param orderId Order identifier
     * @param secret The secret that hashes to the hashlock
     */
    function fulfillFromTon(
        bytes32 orderId,
        bytes32 secret
    ) external onlyRelayer nonReentrant {
        EscrowOrder storage order = orders[orderId];
        
        require(order.sender != address(0), "Order does not exist");
        require(order.status == EscrowStatus.Pending, "Order not pending");
        require(keccak256(abi.encodePacked(secret)) == order.hashlock, "Invalid secret");
        require(block.timestamp <= order.timelock, "Order expired");

        order.status = EscrowStatus.Fulfilled;
        order.secret = secret;

        emit TonEscrowFulfilled(orderId, secret, msg.sender);
    }

    /**
     * @notice Refund expired escrow
     * @param orderId Order identifier
     */
    function refundExpiredEscrow(bytes32 orderId) external nonReentrant {
        EscrowOrder storage order = orders[orderId];
        
        require(order.sender != address(0), "Order does not exist");
        require(order.status == EscrowStatus.Pending, "Order not pending");
        require(block.timestamp > order.timelock, "Order not expired");
        require(msg.sender == order.sender, "Only sender can refund");

        order.status = EscrowStatus.Refunded;

        // Refund the funds
        if (order.token == address(0)) {
            // Refund ETH
            (bool success, ) = order.sender.call{value: order.amount}("");
            require(success, "ETH refund failed");
        } else {
            // Refund ERC20 tokens (implementation needed)
            revert("ERC20 refunds not implemented yet");
        }

        emit TonEscrowRefunded(orderId, msg.sender);
    }

    /**
     * @notice Verify TON transaction proof (simplified implementation)
     * @param txHash TON transaction hash
     * @param proof Cryptographic proof
     * @return True if valid
     */
    function verifyTonTransaction(
        bytes32 txHash,
        bytes calldata proof
    ) external view returns (bool) {
        // Simplified verification - in production this would:
        // 1. Verify Merkle proofs against TON block headers
        // 2. Check transaction inclusion
        // 3. Validate cryptographic signatures
        // 4. Ensure proper confirmation depth
        
        // For now, basic validation
        return txHash != bytes32(0) && proof.length > 0;
    }

    /**
     * @notice Relay message from TON (with multi-relayer consensus)
     * @param messageId Unique message identifier
     * @param tonTxHash TON transaction hash
     * @param sourceAddress Source address on TON
     * @param destAddress Destination address on Ethereum
     * @param amount Amount involved
     * @param hashlock Hash of the secret
     * @param timelock Expiration timestamp
     * @param proof Cryptographic proof
     */
    function relayTonMessage(
        bytes32 messageId,
        bytes32 tonTxHash,
        string calldata sourceAddress,
        address destAddress,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        bytes calldata proof
    ) external onlyRelayer {
        require(!processedMessages[messageId], "Message already processed");
        require(!relayerConfirmations[messageId][msg.sender], "Relayer already confirmed");

        // Verify the proof
        // require(verifyTonTransaction(tonTxHash, proof), "Invalid TON proof");

        // Record relayer confirmation
        relayerConfirmations[messageId][msg.sender] = true;
        messageConfirmations[messageId]++;

        // Store message details
        tonMessages[messageId] = TonMessage({
            messageId: messageId,
            sourceAddress: address(0),
            destAddress: _addressToString(destAddress),
            amount: amount,
            hashlock: hashlock,
            timelock: timelock,
            verified: false
        });

        // Check if we have enough confirmations
        if (messageConfirmations[messageId] >= MIN_CONFIRMATIONS) {
            processedMessages[messageId] = true;
            tonMessages[messageId].verified = true;

            emit TonMessageVerified(messageId, msg.sender, true);
            
            // Create corresponding escrow on Ethereum side
            _createEscrowFromTonMessage(messageId, destAddress, amount, hashlock, timelock);
        }
    }

    /**
     * @dev Internal function to create escrow from verified TON message
     */
    function _createEscrowFromTonMessage(
        bytes32 messageId,
        address destAddress,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock
    ) internal {
        // In a full implementation, this would create an escrow that can be
        // fulfilled by providing the secret, allowing the destAddress to
        // withdraw funds once the TON side is confirmed
        
        // For now, we emit an event that can be picked up by off-chain services
        emit TonEscrowCreated(
            messageId,
            address(this), // Bridge as sender
            _addressToString(destAddress),
            amount,
            hashlock,
            timelock,
            address(0) // ETH
        );
    }

    /**
     * @dev Convert address to string
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    // Getter functions
    function getOrder(bytes32 orderId) external view returns (EscrowOrder memory) {
        return orders[orderId];
    }

    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }

    function getMessageConfirmations(bytes32 messageId) external view returns (uint256) {
        return messageConfirmations[messageId];
    }

    function isRelayerAuthorized(address relayer) external view returns (bool) {
        return authorizedRelayers[relayer];
    }

    /**
     * @notice Emergency withdrawal function (owner only)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        if (token == address(0)) {
            // Withdraw ETH
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            // Withdraw ERC20 tokens
            IERC20(token).transfer(recipient, amount);
        }
    }
} 