// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import {IPostInteraction} from "limit-order-protocol/contracts/interfaces/IPostInteraction.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {AddressLib} from "solidity-utils/contracts/libraries/AddressLib.sol";

/**
 * @title SimpleTonResolver
 * @notice Simple post-interaction contract for TON cross-chain orders
 * @dev Only creates escrow and emits events - no swap logic
 */
contract SimpleTonResolver is IPostInteraction, Ownable {
    
    // Events
    event CrossChainOrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        string tonRecipient,
        address tokenAddress,
        uint256 amount,
        string hashlock,
        uint256 timelock
    );
    
    // Escrow factory for creating escrow contracts
    address public immutable escrowFactory;
    
    // TON chain configuration
    uint256 public constant TON_MAINNET_CHAIN_ID = 607;
    uint256 public constant TON_TESTNET_CHAIN_ID = 0;
    
    // Order data structure for TON
    struct TonOrderData {
        string tonRecipient;
        string tonTokenAddress;
        string hashlock;
        uint256 timelock;
    }
    
    constructor(address initialOwner, address _escrowFactory) Ownable(initialOwner) {
        escrowFactory = _escrowFactory;
    }
    
    /**
     * @notice Post-interaction callback for TON cross-chain orders
     * @param order The order being processed
     * @param orderHash Hash of the order
     * @param taker Taker address
     * @param makingAmount Actual making amount
     * @param extraData Additional data (TON order data)
     */
    function postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 /* takingAmount */,
        uint256 /* remainingMakingAmount */,
        bytes calldata extraData
    ) external override {
        // Decode TON order data from extraData
        TonOrderData memory tonData = _decodeTonOrderData(extraData);
        
        // Validate TON address format
        require(_isValidTonAddress(tonData.tonRecipient), "Invalid TON address");
        
        // Emit event for relayer to pick up
        emit CrossChainOrderFilled(
            orderHash,
            AddressLib.get(order.maker),
            taker,
            tonData.tonRecipient,
            AddressLib.get(order.makerAsset),
            makingAmount,
            tonData.hashlock,
            tonData.timelock
        );
    }
    
    /**
     * @notice Decodes TON order data from extraData
     * @param extraData Encoded TON order data
     * @return tonData Decoded TON order data
     */
    function _decodeTonOrderData(bytes calldata extraData) internal pure returns (TonOrderData memory tonData) {
        require(extraData.length >= 32, "Invalid extraData length");
        
        // Simple decoding - in production use proper ABI encoding
        uint256 offset = 0;
        
        // Read tonRecipient length
        uint256 tonRecipientLength = uint256(bytes32(extraData[offset:offset+32]));
        offset += 32;
        
        // Read tonRecipient
        bytes memory tonRecipientBytes = extraData[offset:offset+tonRecipientLength];
        tonData.tonRecipient = string(tonRecipientBytes);
        offset += tonRecipientLength;
        
        // Read tonTokenAddress length
        uint256 tonTokenLength = uint256(bytes32(extraData[offset:offset+32]));
        offset += 32;
        
        // Read tonTokenAddress
        bytes memory tonTokenBytes = extraData[offset:offset+tonTokenLength];
        tonData.tonTokenAddress = string(tonTokenBytes);
        offset += tonTokenLength;
        
        // Read hashlock length
        uint256 hashlockLength = uint256(bytes32(extraData[offset:offset+32]));
        offset += 32;
        
        // Read hashlock
        bytes memory hashlockBytes = extraData[offset:offset+hashlockLength];
        tonData.hashlock = string(hashlockBytes);
        offset += hashlockLength;
        
        // Read timelock
        tonData.timelock = uint256(bytes32(extraData[offset:offset+32]));
        offset += 32;

        return tonData;
    }
    
    /**
     * @notice Validates TON address format
     * @param tonAddress TON address to validate
     * @return bool True if valid TON address
     */
    function _isValidTonAddress(string memory tonAddress) internal pure returns (bool) {
        bytes memory addrBytes = bytes(tonAddress);
        
        // Basic TON address validation (base64 format, 48 characters)
        if (addrBytes.length != 48) {
            return false;
        }
        
        // Check if it's a valid base64 string
        for (uint i = 0; i < addrBytes.length; i++) {
            bytes1 char = addrBytes[i];
            if (!((char >= 0x41 && char <= 0x5A) || // A-Z
                  (char >= 0x61 && char <= 0x7A) || // a-z
                  (char >= 0x30 && char <= 0x39) || // 0-9
                  char == 0x2B || char == 0x2F ||   // + /
                  char == 0x3D)) {                  // =
                return false;
            }
        }
        
        return true;
    }
} 