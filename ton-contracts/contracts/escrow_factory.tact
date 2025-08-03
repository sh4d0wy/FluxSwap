import "@stdlib/ownable";
import "./escrow.tact";

// Escrow State information
struct EscrowInfo {
    params: EscrowParams;            // Escrow parameters
    contractAddress: Address;        // Escrow contract address
    withdrawn: Bool;                 // Whether funds were withdrawn
    refunded: Bool;                  // Whether funds were refunded
    secret: Int as uint256;          // Revealed secret (0 if not revealed)
    createdAt: Int as uint32;        // Creation timestamp
}

// ===========================
// Message Definitions
// ===========================

// Create new Escrow
message CreateEscrow {
    hashlock: Int as uint256;        // Hash of the secret
    receiver: Address;               // Who can claim with secret
    timelock: Int as uint32;         // Expiration timestamp (relative seconds)
    orderHash: String;       // Unique order identifier
    metadata: Cell?;                 // Additional data
}

// Escrow created response
message EscrowCreated {
    contractId: Int as uint256;      // Unique Escrow contract ID
    contractAddress: Address;        // Escrow contract address
    params: EscrowParams;            // Escrow parameters
}

// Factory configuration
message UpdateEscrowFactoryConfig {
    newMinAmount: Int as coins;      // Minimum Escrow amount
    newMaxTimelock: Int as uint32;   // Maximum timelock period
    newMinTimelock: Int as uint32;   // Minimum timelock period
    paused: Bool;                    // Factory pause state
}

// ===========================
// Escrow Factory Contract
// ===========================

contract EscrowFactory(
    owner: Address,                   // Factory owner
    totalEscrows: Int as uint64,   // Total Escrows created
    isPaused: Bool,          // Factory pause state
    minAmount: Int as coins,     // Minimum Escrow amount
    maxTimelock: Int as uint32,     // Maximum 30 days
    minTimelock: Int as uint32,       // Minimum 1 hour
    escrows: map<Int as uint256, EscrowInfo>,     // contractId -> Escrow info
    hashlockToContract: map<Int as uint256, Int as uint256> // hashlock -> contractId
) with Ownable {
   
    // Constants
    const MIN_DEPLOY_VALUE: Int = ton("0.05");

    // ===========================
    // Escrow Creation
    // ===========================

    receive(msg: CreateEscrow) {
        // Security validations
        require(!self.isPaused, "Factory is paused");
        require(msg.hashlock != 0, "Invalid hashlock");
        require(msg.orderHash != "", "Invalid order hash");
        require(msg.timelock >= self.minTimelock, "Timelock too short");
        require(msg.timelock <= self.maxTimelock, "Timelock too long");
        require(context().value >= self.minAmount + self.MIN_DEPLOY_VALUE, "Insufficient value");
        
        // Check hashlock not already used
        require(!self.hashlockToContract.exists(msg.hashlock), "Hashlock already used");
        
        let amount: Int = context().value - self.MIN_DEPLOY_VALUE;
        require(amount >= self.minAmount, "Amount below minimum");
        
        // Create Escrow parameters
        let escrowParams: EscrowParams = EscrowParams{
            hashlock: msg.hashlock,
            amount: amount,
            timelock: now() + msg.timelock,  // Convert relative to absolute
            sender: sender(),
            receiver: msg.receiver,
            orderHash: msg.orderHash,
            metadata: null
        };
        
        // Generate unique contract ID
        self.totalEscrows = self.totalEscrows + 1;
        let contractId: Int = self.generateContractId(msg.hashlock, sender(), self.totalEscrows);
        
        // Create Escrow contract
        let initState: StateInit = self.getEscrowStateInit(contractId, escrowParams);
        let contractAddress: Address = contractAddress(initState);
        
        // Deploy Escrow contract
        send(SendParameters{
            to: contractAddress,
            value: amount + self.MIN_DEPLOY_VALUE,
            mode: SendIgnoreErrors,
            bounce: true,
            data: initState.data,
            code: initState.code,
            body: EscrowInit{
                params: escrowParams,
                factory: myAddress(),
                metadata: msg.metadata
            }.toCell()
        });
        
        // Store Escrow info
        let escrowInfo: EscrowInfo = EscrowInfo{
            params: escrowParams,
            contractAddress: contractAddress,
            withdrawn: false,
            refunded: false,
            secret: 0,
            createdAt: now()
        };
        
        self.escrows.set(contractId, escrowInfo);
        self.hashlockToContract.set(msg.hashlock, contractId);
        
        // Emit creation event
        emit(EscrowCreated{
            contractId: contractId,
            contractAddress: contractAddress,
            params: escrowParams
        }.toCell());
        
        // Notify creator
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: EscrowCreated{
                contractId: contractId,
                contractAddress: contractAddress,
                params: escrowParams
            }.toCell()
        });
    }

    // Escrow withdrawal notification (called by Escrow contract)
    receive("escrow_withdrawn") {
        // Find Escrow by sender address
        let contractAddr: Address = sender();
        
        // Update Escrow status (simplified - in production would need reverse lookup)
        // For now, we'll accept the notification
    }

    // Escrow refund notification (called by Escrow contract)
    receive("escrow_refunded") {
        // Find Escrow by sender address
        let contractAddr: Address = sender();
        
        // Update Escrow status (simplified - in production would need reverse lookup)
        // For now, we'll accept the notification
    }

    // Factory configuration updates
    receive(msg: UpdateEscrowFactoryConfig) {
        self.requireOwner();
        
        if (msg.newMinAmount > 0) {
            self.minAmount = msg.newMinAmount;
        }
        
        if (msg.newMaxTimelock > 0) {
            require(msg.newMaxTimelock <= 31536000, "Max timelock too long"); // 1 year max
            self.maxTimelock = msg.newMaxTimelock;
        }
        
        if (msg.newMinTimelock > 0) {
            require(msg.newMinTimelock >= 60, "Min timelock too short"); // 1 minute min
            self.minTimelock = msg.newMinTimelock;
        }
        
        self.isPaused = msg.paused;
    }

    // Emergency controls
    receive("pause") {
        self.requireOwner();
        self.isPaused = true;
    }

    receive("unpause") {
        self.requireOwner();
        self.isPaused = false;
    }

    // Default receiver
    receive() {
        // Accept deployment funds, return excess to non-owner
        if (sender() != self.owner && context().value > 0) {
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingValue + SendIgnoreErrors,
                body: "Unexpected payment returned".asComment()
            });
        }
    }

    // ===========================
    // Helper Functions
    // ===========================

    // Generate unique contract ID
    fun generateContractId(hashlock: Int, sender: Address, nonce: Int): Int {
        // Simple ID generation - could be more sophisticated
        return hashlock + nonce * 1000000 + 12345;
    }

    // Generate state initialization for Escrow
    fun getEscrowStateInit(contractId: Int, params: EscrowParams): StateInit {
        let escrowStateInit:StateInit = initOf Escrow(
            contractId,     
            params,              
            myAddress(),                  
            false,          
            false,          
            "", 
            now(),       
            params.metadata   
        );
        return escrowStateInit;
    }

    // Encode Escrow data for initialization
    fun getEscrowData(contractId: Int, params: EscrowParams): Cell {
        let escrowInit:StateInit = self.getEscrowStateInit(contractId, params);
        return escrowInit.data;
    }

    // Hash function for secret verification (simplified)
    fun hashSecret(secret: String): Int {
        return sha256(secret);
    }

    // ===========================
    // Getters
    // ===========================

    get fun factoryInfo(): EscrowFactoryInfo {
        return EscrowFactoryInfo{
            owner: self.owner,
            totalEscrows: self.totalEscrows,
            minAmount: self.minAmount,
            maxTimelock: self.maxTimelock,
            minTimelock: self.minTimelock,
            isPaused: self.isPaused
        };
    }

    get fun getEscrow(contractId: Int): EscrowInfo? {
        return self.escrows.get(contractId);
    }

    get fun getEscrowByHashlock(hashlock: Int): EscrowInfo? {
        let contractId: Int? = self.hashlockToContract.get(hashlock);
        if (contractId == null) {
            return null;
        }
        return self.escrows.get(contractId!!);
    }

    get fun escrowAddress(contractId: Int, params: EscrowParams): Address {
        let initState: StateInit = self.getEscrowStateInit(contractId, params);
        return contractAddress(initState);
    }

    get fun canCreateEscrow(
        hashlock: Int,
        amount: Int,
        timelock: Int
    ): Bool {
        if (self.isPaused) {
            return false;
        }
        if (hashlock == 0) {
            return false;
        }
        if (amount < self.minAmount) {
            return false;
        }
        if (timelock < self.minTimelock || timelock > self.maxTimelock) {
            return false;
        }
        if (self.hashlockToContract.exists(hashlock)) {
            return false;
        }
        return true;
    }

    get fun isValidSecret(hashlock: Int, secret: String): Bool {
        return self.hashSecret(secret) == hashlock;
    }

}

// ===========================
// Support Structures
// ===========================

struct EscrowFactoryInfo {
    owner: Address;
    totalEscrows: Int as uint64;
    minAmount: Int as coins;
    maxTimelock: Int as uint32;
    minTimelock: Int as uint32;
    isPaused: Bool;
}

// Global validation function
fun validateTimelocks(timelocks: TimelockData, isSource: Bool) {
    if (isSource) {
        require(timelocks.srcWithdrawal < timelocks.srcPublicWithdrawal, "Invalid withdrawal sequence");
        require(timelocks.srcPublicWithdrawal < timelocks.srcCancellation, "Invalid cancellation sequence");
        require(timelocks.srcCancellation < timelocks.srcPublicCancellation, "Invalid public cancellation sequence");
    } else {
        require(timelocks.dstWithdrawal < timelocks.dstPublicWithdrawal, "Invalid dst withdrawal sequence");
        require(timelocks.dstPublicWithdrawal < timelocks.dstCancellation, "Invalid dst cancellation sequence");
    }
    
    // Ensure reasonable timeframes (at least 1 hour between stages)
    require(timelocks.srcPublicWithdrawal - timelocks.srcWithdrawal >= 3600, "Insufficient withdrawal window");
    require(timelocks.dstPublicWithdrawal - timelocks.dstWithdrawal >= 3600, "Insufficient dst withdrawal window");
}

// Legacy structures for backward compatibility
struct TimelockData {
    deployedAt: Int as uint32;
    srcWithdrawal: Int as uint32;
    srcPublicWithdrawal: Int as uint32;
    srcCancellation: Int as uint32;
    srcPublicCancellation: Int as uint32;
    dstWithdrawal: Int as uint32;
    dstPublicWithdrawal: Int as uint32;
    dstCancellation: Int as uint32;
}
