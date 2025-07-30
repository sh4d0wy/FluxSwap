import "@stdlib/deploy";

// Message definitions for escrow operations
message CreateEscrow {
    recipient: Address;
    amount: Int;
    hashlock: Int;
    timelock: Int;
}

message FulfillEscrow {
    secret: String;
}

message RefundEscrow {
    // Empty message, sender verification done in contract
}

// Events for cross-chain communication
message EscrowCreated {
    escrowId: Int;
    sender: Address;
    recipient: Address;
    amount: Int;
    hashlock: Int;
    timelock: Int;
}

message EscrowFulfilled {
    escrowId: Int;
    secret: String;
    fulfiller: Address;
}

message EscrowRefunded {
    escrowId: Int;
    refunder: Address;
}

contract TonEscrow with Deployable {
    // Constants for security
    const MIN_TIMELOCK: Int = 3600; // 1 hour
    const MAX_TIMELOCK: Int = 604800; // 1 week
    const ESCROW_PENDING: Int = 0;
    const ESCROW_FULFILLED: Int = 1;
    const ESCROW_REFUNDED: Int = 2;
    
    // State variables
    owner: Address;
    recipient: Address;
    amount: Int;
    hashlock: Int;
    timelock: Int;
    status: Int;
    secret: String;
    escrowId: Int;
    
    init(
        owner: Address,
        recipient: Address,
        amount: Int,
        hashlock: Int,
        timelock: Int,
        escrowId: Int
    ) {
        require(timelock > now() + self.MIN_TIMELOCK, "Timelock too short");
        require(timelock < now() + self.MAX_TIMELOCK, "Timelock too long");
        require(amount > 0, "Amount must be positive");
        require(hashlock != 0, "Invalid hashlock");
        
        self.owner = owner;
        self.recipient = recipient;
        self.amount = amount;
        self.hashlock = hashlock;
        self.timelock = timelock;
        self.status = self.ESCROW_PENDING;
        self.secret = "";
        self.escrowId = escrowId;
        
        // Emit escrow created event
        emit(EscrowCreated{
            escrowId: self.escrowId,
            sender: self.owner,
            recipient: self.recipient,
            amount: self.amount,
            hashlock: self.hashlock,
            timelock: self.timelock
        }.toCell());
    }
    
    receive(msg: FulfillEscrow) {
        require(self.status == self.ESCROW_PENDING, "Escrow not pending");
        require(sha256(msg.secret) == self.hashlock, "Invalid secret");
        require(now() < self.timelock, "Escrow expired");
        
        self.secret = msg.secret;
        self.status = self.ESCROW_FULFILLED;
        
        // Emit fulfillment event
        emit(EscrowFulfilled{
            escrowId: self.escrowId,
            secret: msg.secret,
            fulfiller: sender()
        }.toCell());
        
        // Transfer funds to recipient
        send(SendParameters{
            to: self.recipient,
            value: self.amount,
            mode: SendIgnoreErrors,
            body: "Escrow fulfilled".asComment()
        });
    }
    
    receive(msg: RefundEscrow) {
        require(self.status == self.ESCROW_PENDING, "Escrow not pending");
        require(now() >= self.timelock, "Escrow not expired");
        require(sender() == self.owner, "Only owner can refund");
        
        self.status = self.ESCROW_REFUNDED;
        
        // Emit refund event
        emit(EscrowRefunded{
            escrowId: self.escrowId,
            refunder: sender()
        }.toCell());
        
        // Refund to owner
        send(SendParameters{
            to: self.owner,
            value: self.amount,
            mode: SendIgnoreErrors,
            body: "Escrow refunded".asComment()
        });
    }
    
    // Getter functions
    get fun getEscrowInfo(): EscrowInfo {
        return EscrowInfo{
            owner: self.owner,
            recipient: self.recipient,
            amount: self.amount,
            hashlock: self.hashlock,
            timelock: self.timelock,
            status: self.status,
            secret: self.secret,
            escrowId: self.escrowId
        };
    }
    
    get fun getStatus(): Int {
        return self.status;
    }
    
    get fun getSecret(): String {
        return self.secret;
    }
    
    get fun isExpired(): Bool {
        return now() >= self.timelock;
    }
    
    get fun canFulfill(): Bool {
        return self.status == self.ESCROW_PENDING && now() < self.timelock;
    }
    
    get fun canRefund(): Bool {
        return self.status == self.ESCROW_PENDING && now() >= self.timelock;
    }
}

// Struct for returning escrow information
struct EscrowInfo {
    owner: Address;
    recipient: Address;
    amount: Int;
    hashlock: Int;
    timelock: Int;
    status: Int;
    secret: String;
    escrowId: Int;
} 