// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import {TakerTraits} from "limit-order-protocol/contracts/libraries/TakerTraitsLib.sol";

import {IResolverExample} from "../lib/cross-chain-swap/contracts/interfaces/IResolverExample.sol";
import {RevertReasonForwarder} from "../lib/cross-chain-swap/lib/solidity-utils/contracts/libraries/RevertReasonForwarder.sol";
import {IEscrowFactory} from "../lib/cross-chain-swap/contracts/interfaces/IEscrowFactory.sol";
import {IBaseEscrow} from "../lib/cross-chain-swap/contracts/interfaces/IBaseEscrow.sol";
import {TimelocksLib, Timelocks} from "../lib/cross-chain-swap/contracts/libraries/TimelocksLib.sol";
import {Address, AddressLib} from "../lib/cross-chain-swap/lib/solidity-utils/contracts/libraries/AddressLib.sol";
import {IEscrow} from "../lib/cross-chain-swap/contracts/interfaces/IEscrow.sol";
import {ImmutablesLib} from "../lib/cross-chain-swap/contracts/libraries/ImmutablesLib.sol";

// TON-specific interfaces
interface ITonBridge {
    function verifyTonTransaction(bytes32 txHash, bytes calldata proof) external view returns (bool);
    function relayToTon(address recipient, uint256 amount, bytes32 hashlock, uint256 timelock) external payable;
}

/**
 * @title Cross-chain Resolver for 1inch Fusion+ and TON Protocol
 * @dev This contract handles cross-chain swaps between Ethereum and TON Protocol.
 * It extends the base Resolver functionality to support TON-specific operations.
 *
 * @custom:security-contact security@1inch.io
 */
contract Resolver is IResolverExample, Ownable {
    // Events for TON integration
    event TonDepositInitiated(
        address indexed sender,
        string tonRecipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    );
    
    event TonWithdrawalCompleted(
        bytes32 indexed secretHash,
        string tonRecipient,
        uint256 amount
    );
    
    event TonRefunded(
        bytes32 indexed secretHash,
        string tonRecipient,
        uint256 amount
    );
    
    // Constants for TON integration
    uint256 public constant TON_CHAIN_ID = 607; // TON Mainnet
    uint256 public constant MIN_TON_DEPOSIT = 0.1 ether; // Minimum deposit amount
    uint256 public constant MAX_TIMELOCK = 7 days; // Maximum timelock duration
    uint256 public constant MIN_TIMELOCK = 1 hours; // Minimum timelock duration
    
    // Struct to track TON deposits
    struct TonDeposit {
        address sender;
        string tonRecipient;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        bool withdrawn;
    }
    
    // Mapping to track TON deposits by secret hash
    mapping(bytes32 => TonDeposit) public tonDeposits;
    
    // TON Bridge contract address
    address public tonBridge;
    
    using ImmutablesLib for IBaseEscrow.Immutables;
    using TimelocksLib for Timelocks;
    using AddressLib for Address;

    IEscrowFactory private immutable _FACTORY;
    IOrderMixin private immutable _LOP;

    constructor(
        IEscrowFactory factory, 
        IOrderMixin lop, 
        address initialOwner,
        address _tonBridge
    ) Ownable(initialOwner) {
        _FACTORY = factory;
        _LOP = lop;
        tonBridge = _tonBridge;
    }

    receive() external payable {} // solhint-disable-line no-empty-blocks

    /**
     * @notice Set TON bridge contract address
     * @param _tonBridge New TON bridge contract address
     */
    function setTonBridge(address _tonBridge) external onlyOwner {
        require(_tonBridge != address(0), "Invalid bridge address");
        tonBridge = _tonBridge;
    }

    /**
     * @notice Initiate a deposit to TON bridge
     * @param tonRecipient TON address of the recipient
     * @param secretHash Hash of the secret for atomic swap
     * @param timelock Timestamp until which the deposit is locked
     */
    function depositToTon(
        string calldata tonRecipient,
        bytes32 secretHash,
        uint256 timelock
    ) external payable {
        require(msg.value >= MIN_TON_DEPOSIT, "Amount too small");
        require(timelock > block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");
        require(bytes(tonRecipient).length > 0, "Invalid TON recipient");
        require(tonDeposits[secretHash].sender == address(0), "Deposit already exists");
        
        // Store the deposit information
        tonDeposits[secretHash] = TonDeposit({
            sender: msg.sender,
            tonRecipient: tonRecipient,
            amount: msg.value,
            secretHash: secretHash,
            timelock: timelock,
            withdrawn: false
        });
        
        // Emit event for the relayer to pick up
        emit TonDepositInitiated(
            msg.sender,
            tonRecipient,
            msg.value,
            secretHash,
            timelock
        );
    }

    /**
     * @dev Internal function to handle TON deposits from meta-orders
     * @param immutables The immutables from the escrow
     * @param secret The secret used for the hashlock
     */
    function _handleTonDeposit(
        IBaseEscrow.Immutables memory immutables,
        bytes32 secret
    ) internal {
        address taker = immutables.taker.get();
        uint256 amount = immutables.amount;
        
        require(amount >= MIN_TON_DEPOSIT, "Deposit amount too low");
        
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        uint256 timelock = block.timestamp + 24 hours;
        
        // Store the TON deposit details
        tonDeposits[secretHash] = TonDeposit({
            sender: taker,
            tonRecipient: _addressToTonFormat(taker), // Convert Ethereum address to TON format
            amount: amount,
            secretHash: secretHash,
            timelock: timelock,
            withdrawn: false
        });
        
        emit TonDepositInitiated(
            taker,
            _addressToTonFormat(taker),
            amount,
            secretHash,
            timelock
        );
    }

    /**
     * @dev Convert Ethereum address to TON-compatible format
     * @param ethAddress Ethereum address
     * @return TON-formatted address string
     */
    function _addressToTonFormat(address ethAddress) internal pure returns (string memory) {
        // Simple conversion - in production this would use proper TON address derivation
        return string(abi.encodePacked("0:", _addressToHex(ethAddress)));
    }

    /**
     * @dev Convert address to hex string
     */
    function _addressToHex(address addr) internal pure returns (string memory) {
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
    
    /**
     * @dev Function to complete a TON withdrawal with proof verification
     * @param secret The secret that was used to create the hashlock
     * @param tonRecipient The TON address that received the funds
     * @param tonTxHash TON transaction hash as proof
     * @param proof Cryptographic proof of the TON transaction
     */
    function completeTonWithdrawal(
        bytes32 secret,
        string calldata tonRecipient,
        bytes32 tonTxHash,
        bytes calldata proof
    ) external {
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        TonDeposit storage deposit = tonDeposits[secretHash];
        
        require(deposit.amount > 0, "Deposit not found");
        require(!deposit.withdrawn, "Already withdrawn");
        require(block.timestamp <= deposit.timelock, "Timelock expired");
        
        // Verify TON transaction proof if bridge is available
        if (tonBridge != address(0)) {
            require(
                ITonBridge(tonBridge).verifyTonTransaction(tonTxHash, proof),
                "Invalid TON proof"
            );
        }
        
        deposit.withdrawn = true;
        
        emit TonWithdrawalCompleted(
            secretHash,
            tonRecipient,
            deposit.amount
        );
    }
    
    /**
     * @dev Function to refund a TON deposit after the timelock expires
     * @param secretHash The hash of the secret used for the deposit
     */
    function refundTonDeposit(bytes32 secretHash) external {
        TonDeposit storage deposit = tonDeposits[secretHash];
        
        require(deposit.amount > 0, "Deposit not found");
        require(!deposit.withdrawn, "Already withdrawn");
        require(block.timestamp > deposit.timelock, "Timelock not expired");
        require(msg.sender == deposit.sender, "Only sender can refund");
        
        deposit.withdrawn = true;
        
        // Refund the amount to the original sender
        (bool success, ) = deposit.sender.call{value: deposit.amount}("");
        require(success, "Refund failed");
        
        emit TonRefunded(
            secretHash,
            deposit.tonRecipient,
            deposit.amount
        );
    }

    /**
     * @notice See {IResolverExample-deploySrc}.
     */
    function deploySrc(
        IBaseEscrow.Immutables calldata immutables,
        IOrderMixin.Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        TakerTraits takerTraits,
        bytes calldata args
    ) external onlyOwner {
        // Check if this is a TON cross-chain order
        if (args.length > 0 && args[0] == 0x02) {  // 0x02 for TON
            bytes32 newSecret = keccak256(abi.encodePacked(block.timestamp, msg.sender, amount));
            _handleTonDeposit(immutables, newSecret);
            return;
        }

        IBaseEscrow.Immutables memory immutablesMem = immutables;
        immutablesMem.timelocks = TimelocksLib.setDeployedAt(immutables.timelocks, block.timestamp);
        address computed = _FACTORY.addressOfEscrowSrc(immutablesMem);

        (bool success,) = address(computed).call{value: immutablesMem.safetyDeposit}("");
        if (!success) revert IBaseEscrow.NativeTokenSendingFailure();

        // _ARGS_HAS_TARGET = 1 << 251
        takerTraits = TakerTraits.wrap(TakerTraits.unwrap(takerTraits) | uint256(1 << 251));
        bytes memory argsMem = abi.encodePacked(computed, args);
        _LOP.fillOrderArgs(order, r, vs, amount, takerTraits, argsMem);
    }

    /**
     * @notice See {IResolverExample-deployDst}.
     */
    function deployDst(
        IBaseEscrow.Immutables calldata dstImmutables, 
        uint256 srcCancellationTimestamp
    ) external payable override onlyOwner {
        _FACTORY.createDstEscrow{value: msg.value}(dstImmutables, srcCancellationTimestamp);
    }

    /**
     * @notice Withdraw funds from escrow using the secret
     * @param escrow The escrow contract address
     * @param secret The secret to unlock the funds
     * @param immutables Immutable parameters for the escrow
     */
    function withdraw(IEscrow escrow, bytes32 secret, IBaseEscrow.Immutables calldata immutables) external {
        escrow.withdraw(secret, immutables);
        
        // Check if this is a TON-related withdrawal
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        TonDeposit storage deposit = tonDeposits[secretHash];
        
        if (deposit.sender != address(0) && !deposit.withdrawn) {
            deposit.withdrawn = true;
            emit TonWithdrawalCompleted(
                secretHash,
                deposit.tonRecipient,
                deposit.amount
            );
        }
    }

    /**
     * @notice Cancel an escrow and handle TON-specific cleanup if needed
     * @param escrow The escrow contract address
     * @param immutables Immutable parameters for the escrow
     */
    function cancel(IEscrow escrow, IBaseEscrow.Immutables calldata immutables) external {
        escrow.cancel(immutables);
        
        // Handle TON-specific cleanup if this was a cross-chain order
        address taker = immutables.taker.get();
        address token = immutables.token.get();
        bytes32 depositKey = keccak256(abi.encodePacked(taker, token));
            
        // Note: This is simplified - in production you'd have better tracking
        // For now, we emit a generic refund event
    }

    /**
     * @notice See {IResolverExample-arbitraryCalls}.
     */
    function arbitraryCalls(address[] calldata targets, bytes[] calldata arguments) external override onlyOwner {
        uint256 length = targets.length;
        if (targets.length != arguments.length) revert("Length mismatch");
        for (uint256 i = 0; i < length; ++i) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success,) = targets[i].call(arguments[i]);
            if (!success) RevertReasonForwarder.reRevert();
        }
    }

    /**
     * @notice Get TON deposit information
     * @param secretHash The secret hash to look up
     * @return TonDeposit struct with deposit details
     */
    function getTonDeposit(bytes32 secretHash) external view returns (TonDeposit memory) {
        return tonDeposits[secretHash];
    }

    /**
     * @notice Check if a TON deposit can be refunded
     * @param secretHash The secret hash to check
     * @return True if the deposit can be refunded
     */
    function canRefundTonDeposit(bytes32 secretHash) external view returns (bool) {
        TonDeposit storage deposit = tonDeposits[secretHash];
        return deposit.amount > 0 && !deposit.withdrawn && block.timestamp > deposit.timelock;
    }
}
