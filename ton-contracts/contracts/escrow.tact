import "@stdlib/ownable";

// ===========================
// Escrow Message Definitions
// ===========================

// Escrow initialization (from factory)
message EscrowInit {
    params: EscrowParams;
    factory: Address;
    metadata: Cell?;
}

// Withdraw funds with secret (anyone can call this)
message WithdrawEscrow {
    secret: String;          // The secret that unlocks the Escrow
}

// Refund expired Escrow (only sender can call after timelock)
message RefundEscrow {}

// Escrow event messages
message EscrowWithdrawn {
    secret: String;          // Secret used for withdrawal
    withdrawer: Address;             // Who withdrew the funds
    amount: Int as coins;            // Amount withdrawn
}

message EscrowRefunded {
    amount: Int as coins;            // Amount refunded
    refunder: Address;               // Who got the refund
}

// ===========================
// Main Escrow Contract (HTLC Implementation)
// ===========================

contract Escrow(
    // Contract state
    contractId: Int as uint256,    // Unique contract identifier
    params: EscrowParams?,              // Escrow parameters
    factory: Address?,                  // Factory contract address
    isWithdrawn: Bool,          // Whether funds were withdrawn
    isRefunded: Bool,           // Whether funds were refunded
    revealedSecret: String, // Revealed secret (0 if not revealed)
    
    // Contract metadata
    createdAt: Int as uint32,       // Creation timestamp
    metadata: Cell?,          // Additional metadata
) {
    
    // ===========================
    // Initialization
    // ===========================

    receive(msg: EscrowInit) {
        // Only allow initialization once
        require(self.params == null, "Already initialized");
        require(msg.params.amount > 0, "Invalid amount");
        require(msg.params.hashlock != 0, "Invalid hashlock");
        require(msg.params.timelock > now(), "Invalid timelock");
        
        // Store Escrow parameters
        self.params = msg.params;
        self.factory = msg.factory;
        self.metadata = msg.metadata;
        self.createdAt = now();
        
        // Contract is now ready to receive the locked funds
    }

    // ===========================
    // Core Escrow Logic
    // ===========================

    // Anyone can withdraw with the correct secret
    receive(msg: WithdrawEscrow) {
        let params: EscrowParams = self.params!!;
        
        // Validation checks
        require(!self.isWithdrawn, "Already withdrawn");
        require(!self.isRefunded, "Already refunded");
        require(now() <= params.timelock, "Escrow expired");
        
        // Verify the secret matches the hashlock
        let hashedSecret: Int = self.hashSecret(msg.secret);
        require(hashedSecret == params.hashlock, "Invalid secret");
        
        // Mark as withdrawn and store the revealed secret
        self.isWithdrawn = true;
        self.revealedSecret = msg.secret;
        
        // Transfer funds to the receiver
        send(SendParameters{
            to: params.receiver,
            value: params.amount,
            mode: SendPayGasSeparately,
            bounce: false,
            body: EscrowWithdrawn{
                secret: msg.secret,
                withdrawer: sender(),
                amount: params.amount
            }.toCell()
        });
        
        // Notify factory
        if (self.factory != null) {
            send(SendParameters{
                to: self.factory!!,
                value: 0,
                mode: SendRemainingValue + SendIgnoreErrors,
                body: "escrow_withdrawn".asComment()
            });
        }
        
        // Emit withdrawal event
        emit(EscrowWithdrawn{
            secret: msg.secret,
            withdrawer: sender(),
            amount: params.amount
        }.toCell());
    }

    // Only the sender can refund after timelock expires
    receive(msg: RefundEscrow) {
        let params: EscrowParams = self.params!!;
        
        // Validation checks
        require(sender() == params.sender, "Only sender can refund");
        require(!self.isWithdrawn, "Already withdrawn");
        require(!self.isRefunded, "Already refunded");
        require(now() > params.timelock, "Timelock not expired");
        
        // Mark as refunded
        self.isRefunded = true;
        
        // Refund to sender
        send(SendParameters{
            to: params.sender,
            value: params.amount,
            mode: SendPayGasSeparately,
            bounce: false,
            body: EscrowRefunded{
                amount: params.amount,
                refunder: params.sender
            }.toCell()
        });
        
        // Notify factory
        if (self.factory != null) {
            send(SendParameters{
                to: self.factory!!,
                value: 0,
                mode: SendRemainingValue + SendIgnoreErrors,
                body: "escrow_refunded".asComment()
            });
        }
        
        // Emit refund event
        emit(EscrowRefunded{
            amount: params.amount,
            refunder: params.sender
        }.toCell());
    }

    // Emergency refund (factory owner only, for stuck contracts)
    receive("emergency_refund") {
        require(self.factory != null, "No factory set");
        require(sender() == self.factory!!, "Only factory");
        require(!self.isWithdrawn && !self.isRefunded, "Already processed");
        
        let params: EscrowParams = self.params!!;
        self.isRefunded = true;
        
        // Emergency refund to sender
        send(SendParameters{
            to: params.sender,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            body: "Emergency refund executed".asComment()
        });
    }

    // Default receiver - accept funds for locking
    receive() {
        // Accept funds only if initialized and not processed
        require(self.params != null, "Not initialized");
        require(!self.isWithdrawn && !self.isRefunded, "Already processed");
        
        // Funds are now locked in the contract
    }

    // ===========================
    // Helper Functions
    // ===========================

    // Hash function for secret verification (simplified)
    fun hashSecret(secret: String): Int {
        return sha256(secret);
    }

    // ===========================
    // Getters
    // ===========================

    get fun escrowInfo(): EscrowContractInfo {
        return EscrowContractInfo{
            contractId: self.contractId,
            params: self.params,
            factory: self.factory,
            isWithdrawn: self.isWithdrawn,
            isRefunded: self.isRefunded,
            revealedSecret: self.revealedSecret,
            createdAt: self.createdAt,
            currentTime: now(),
            contractBalance: myBalance()
        };
    }

    get fun isExpired(): Bool {
        if (self.params == null){
            return false;
        }
        return now() > self.params!!.timelock;
    }

    get fun canWithdraw(): Bool {
        if (self.params == null){
            return false;
        }
        return !self.isWithdrawn && !self.isRefunded && now() <= self.params!!.timelock;
    }

    get fun canRefund(): Bool {
        if (self.params == null){
            return false;
        }
        return !self.isWithdrawn && !self.isRefunded && now() > self.params!!.timelock;
    }

    get fun secretRevealed(): Bool {
        return self.revealedSecret != "";
    }

    get fun verifySecret(secret: String): Bool {
        if (self.params == null){
            return false;
        }
        return self.hashSecret(secret) == self.params!!.hashlock;
    }

    get fun remainingTime(): Int {
        if (self.params == null){
            return 0;
        }
        let timeLeft: Int = self.params!!.timelock - now();
        return timeLeft > 0 ? timeLeft : 0;
    }
}

// ===========================
// Support Structures
// ===========================

// Comprehensive Escrow information
struct EscrowContractInfo {
    contractId: Int as uint256;
    params: EscrowParams?;
    factory: Address?;
    isWithdrawn: Bool;
    isRefunded: Bool;
    revealedSecret: String;
    createdAt: Int as uint32;
    currentTime: Int as uint32;
    contractBalance: Int as coins;
}

// Escrow parameters (must match factory definition)
struct EscrowParams {
    hashlock: Int as uint256;        // Hash of the secret
    amount: Int as coins;            // Amount to lock
    timelock: Int as uint32;         // Expiration timestamp
    sender: Address;                 // Who locked the funds
    receiver: Address;               // Who can claim with secret
    orderHash: String;       // Unique order identifier
    metadata: Cell?;                 // Additional metadata
}
