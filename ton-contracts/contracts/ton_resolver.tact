import "@stdlib/ownable";

// ===========================
// Cross-Chain Order Structures
// ===========================

// Cross-chain order information
struct CrossChainOrder {
    orderHash: Int as uint256;           // Unique order identifier
    maker: Address;                      // Order creator (on Ethereum)
    tonRecipient: Address;               // TON user who will receive tokens
    ethereumToken: String;               // Ethereum token address (as string)
    tonToken: Address;                   // TON token address
    ethereumAmount: Int as uint256;      // Amount on Ethereum side
    tonAmount: Int as coins;             // Amount on TON side
    hashlock: Int as uint256;            // Hash of the secret
    timelock: Int as uint32;             // Order expiration timestamp
    safetyDeposit: Int as coins;         // Security deposit amount
    status: Int as uint8;                // Order status
    createdAt: Int as uint32;            // Creation timestamp
}

// Escrow creation request
struct EscrowRequest {
    order: CrossChainOrder;              // Associated order
    receiver: Address;                   // Who can claim the funds
    metadata: Cell?;                     // Additional escrow metadata
}

// Order status constants
const ORDER_ACTIVE: Int = 0;
const ORDER_COMPLETED: Int = 1;
const ORDER_CANCELLED: Int = 2;
const ORDER_EXPIRED: Int = 3;

// ===========================
// Message Definitions
// ===========================

// Create cross-chain order (called by resolver based on relayer events)
message CreateCrossChainOrder {
    orderHash: Int as uint256;           // Ethereum order hash
    maker: String;                       // Ethereum maker address (as string)
    tonRecipient: Address;               // TON user who will receive tokens
    ethereumToken: String;               // Ethereum token address
    tonToken: Address;                   // TON token address
    ethereumAmount: Int as uint256;      // Ethereum side amount
    tonAmount: Int as coins;             // TON side amount
    hashlock: Int as uint256;            // Hash of secret
    timelock: Int as uint32;             // Order expiration (relative seconds)
    safetyDepositAmount: Int as coins;   // Required safety deposit
    metadata: Cell?;                     // Additional order data
}

// Order created confirmation
message OrderCreated {
    orderHash: Int as uint256;           // Order identifier
    escrowAddress: Address;              // Created escrow address
    order: CrossChainOrder;              // Full order details
}

// Withdraw from escrow with secret (called by resolver)
message WithdrawWithSecret {
    orderHash: Int as uint256;           // Order to withdraw from
    secret: String;              // Secret that unlocks the escrow
}

// Cancel expired order
message CancelOrder {
    orderHash: Int as uint256;           // Order to cancel
    reason: String;                      // Cancellation reason
}

// Deposit security fee
message DepositSecurityFee {
    orderHash: Int as uint256;           // Order to deposit for
    amount: Int as coins;                // Security fee amount
}

// Emergency order resolution
message EmergencyResolveOrder {
    orderHash: Int as uint256;           // Order to resolve
    action: Int as uint8;                // 0=refund, 1=release
    signature: Cell?;                    // Admin signature
}

// Event messages
message OrderCompleted {
    orderHash: Int as uint256;           // Completed order
    secret: String;              // Revealed secret
    withdrawer: Address;                 // Who withdrew
    amount: Int as coins;                // Amount withdrawn
}

message OrderCancelled {
    orderHash: Int as uint256;           // Cancelled order
    refundee: Address;                   // Who got refunded
    reason: String;                      // Cancellation reason
}

// ===========================
// TON Cross-Chain Resolver
// ===========================

contract TonResolver(
    owner: Address,                      // Resolver owner
    escrowFactory: Address,             // EscrowFactory contract address
    // Resolver state
    totalOrders: Int as uint64,      // Total orders created
    isPaused: Bool,              // Resolver pause state
    minSafetyDeposit: Int as coins,  // Minimum safety deposit
    maxOrderTimelock: Int as uint32,      // Maximum 24 hours
    minOrderTimelock: Int as uint32,       // Minimum 1 hour
    
    // Order tracking
    orders: map<Int as uint256, CrossChainOrder>,     // orderHash -> Order
    orderToEscrow: map<Int as uint256, Address>,      // orderHash -> Escrow address
    safetyDeposits: map<Int as uint256, Int as coins>, // orderHash -> Deposited amount
    
    // Security features
    emergencyDelay: Int as uint32,       // 24 hour emergency delay
    lastEmergencyAction: Int as uint32,      // Last emergency action timestamp
    
) with Ownable {
    
    
    // Constants
    const MIN_CREATE_VALUE: Int = ton("0.15");   // Minimum value for order creation
    const ESCROW_DEPLOY_VALUE: Int = ton("0.1"); // Value for escrow deployment

    // ===========================
    // Order Management
    // ===========================

    receive(msg: CreateCrossChainOrder) {
        // Only resolver can create orders (based on relayer events)
        self.requireOwner();
        
        // Security validations
        require(!self.isPaused, "Resolver is paused");
        require(msg.orderHash != 0, "Invalid order hash");
        require(msg.hashlock != 0, "Invalid hashlock");
        require(msg.tonAmount > 0, "Invalid TON amount");
        require(msg.ethereumAmount > 0, "Invalid Ethereum amount");
        require(msg.timelock >= self.minOrderTimelock, "Timelock too short");
        require(msg.timelock <= self.maxOrderTimelock, "Timelock too long");
        require(msg.safetyDepositAmount >= self.minSafetyDeposit, "Safety deposit too low");
        require(context().value >= msg.tonAmount + msg.safetyDepositAmount + self.MIN_CREATE_VALUE, "Insufficient value");
        
        // Check order doesn't already exist
        require(!self.orders.exists(msg.orderHash), "Order already exists");
        
        // Parse Ethereum maker address (simplified)
        let makerAddress: Address = self.parseEthereumAddress(msg.maker);
        
        // Create cross-chain order
        let order: CrossChainOrder = CrossChainOrder{
            orderHash: msg.orderHash,
            maker: makerAddress,
            tonRecipient: msg.tonRecipient,
            ethereumToken: msg.ethereumToken,
            tonToken: msg.tonToken,
            ethereumAmount: msg.ethereumAmount,
            tonAmount: msg.tonAmount,
            hashlock: msg.hashlock,
            timelock: now() + msg.timelock,  // Convert to absolute timestamp
            safetyDeposit: msg.safetyDepositAmount,
            status: ORDER_ACTIVE,
            createdAt: now()
        };
        
        // Create escrow via factory (resolver provides the tokens)
        let escrowAddress: Address = self.createEscrowForOrder(order);
        
        // Store order and mappings
        self.orders.set(msg.orderHash, order);
        self.orderToEscrow.set(msg.orderHash, escrowAddress);
        self.safetyDeposits.set(msg.orderHash, msg.safetyDepositAmount);
        self.totalOrders = self.totalOrders + 1;
        
        // Emit order created event
        emit(OrderCreated{
            orderHash: msg.orderHash,
            escrowAddress: escrowAddress,
            order: order
        }.toCell());
        
        // Return confirmation to resolver
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: OrderCreated{
                orderHash: msg.orderHash,
                escrowAddress: escrowAddress,
                order: order
            }.toCell()
        });
    }

    // Deposit additional security fee for an order (resolver only)
    receive(msg: DepositSecurityFee) {
        // Only resolver can deposit additional security
        self.requireOwner();
        
        require(self.orders.exists(msg.orderHash), "Order not found");
        let order: CrossChainOrder = self.orders.get(msg.orderHash)!!;
        require(order.status == ORDER_ACTIVE, "Order not active");
        require(context().value >= msg.amount, "Insufficient deposit");
        
        // Add to existing safety deposit
        let currentDeposit: Int = self.safetyDeposits.get(msg.orderHash)!!;
        self.safetyDeposits.set(msg.orderHash, currentDeposit + msg.amount);
        
        // Forward deposit to escrow
        let escrowAddress: Address = self.orderToEscrow.get(msg.orderHash)!!;
        send(SendParameters{
            to: escrowAddress,
            value: msg.amount,
            mode: SendIgnoreErrors,
            body: "Additional security deposit".asComment()
        });
    }

    // Withdraw from escrow using secret (only resolver can call this)
    receive(msg: WithdrawWithSecret) {
        // Only resolver can unlock with secret
        self.requireOwner();
        
        require(self.orders.exists(msg.orderHash), "Order not found");
        let order: CrossChainOrder = self.orders.get(msg.orderHash)!!;
        require(order.status == ORDER_ACTIVE, "Order not active");
        require(now() <= order.timelock, "Order expired");
        
        // Verify secret matches hashlock
        require(self.hashSecret(msg.secret) == order.hashlock, "Invalid secret");
        
        // Get escrow address
        let escrowAddress: Address = self.orderToEscrow.get(msg.orderHash)!!;
        
        // Forward withdrawal request to escrow - tokens go to tonRecipient
        send(SendParameters{
            to: escrowAddress,
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: WithdrawToRecipient{
                secret: msg.secret,
                recipient: order.tonRecipient, // Tokens go to tonRecipient
                resolver: myAddress()
            }.toCell()
        });
        
        // Update order status  
        order.status = ORDER_COMPLETED;
        self.orders.set(msg.orderHash, order);
        
        // Emit completion event
        emit(OrderCompleted{
            orderHash: msg.orderHash,
            secret: msg.secret,
            withdrawer: order.tonRecipient, // Who withdrew is the tonRecipient
            amount: order.tonAmount
        }.toCell());
    }

    // Cancel expired order (resolver can cancel)
    receive(msg: CancelOrder) {
        // Only resolver can cancel orders
        self.requireOwner();
        
        require(self.orders.exists(msg.orderHash), "Order not found");
        let order: CrossChainOrder = self.orders.get(msg.orderHash)!!;
        require(order.status == ORDER_ACTIVE, "Order not active");
        require(now() > order.timelock, "Order not expired yet");
        
        // Get escrow and request refund
        let escrowAddress: Address = self.orderToEscrow.get(msg.orderHash)!!;
        
        // Request refund from escrow - tokens and security deposit should return to resolver
        send(SendParameters{
            to: escrowAddress,
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: RefundToResolver{
                resolver: myAddress(),
                originalTaker: order.tonRecipient // For reference
            }.toCell()
        });
        
        // Update order status
        order.status = ORDER_CANCELLED;
        self.orders.set(msg.orderHash, order);
        
        // Emit cancellation event
        emit(OrderCancelled{
            orderHash: msg.orderHash,
            refundee: order.tonRecipient, // Original intended recipient
            reason: msg.reason
        }.toCell());
    }

    // Emergency order resolution (admin only)
    receive(msg: EmergencyResolveOrder) {
        self.requireOwner();
        require(now() >= self.lastEmergencyAction + self.emergencyDelay, "Emergency delay not met");
        require(self.orders.exists(msg.orderHash), "Order not found");
        
        let order: CrossChainOrder = self.orders.get(msg.orderHash)!!;
        let escrowAddress: Address = self.orderToEscrow.get(msg.orderHash)!!;
        
        // Execute emergency action on escrow
        send(SendParameters{
            to: escrowAddress,
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: "emergency_refund".asComment()
        });
        
        // Update order status
        order.status = ORDER_CANCELLED;
        self.orders.set(msg.orderHash, order);
        self.lastEmergencyAction = now();
    }

    // Handle refunded tokens from cancelled orders
    receive("order_refunded") {
        // This is called by escrow when returning tokens from a cancelled order
        // The escrow should include the order hash and original taker info in subsequent messages
        // For now, just accept the refund
    }

    // Configuration updates
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
        // Accept direct payments for gas and operations
        if (context().value > 0 && sender() != self.owner) {
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingValue + SendIgnoreErrors,
                body: "Direct payment returned".asComment()
            });
        }
    }

    // ===========================
    // Helper Functions
    // ===========================

    // Create escrow for a cross-chain order
    fun createEscrowForOrder(order: CrossChainOrder): Address {
        // Create escrow parameters
        let escrowParams: EscrowParams = EscrowParams{
            hashlock: order.hashlock,
            amount: order.tonAmount,
            timelock: order.timelock,
            sender: myAddress(),  // Resolver is the sender
            receiver: order.tonRecipient,  // TON user receives the tokens
            orderHash: order.orderHash
        };
        
        // Send create escrow message to factory
        send(SendParameters{
            to: self.escrowFactory,
            value: order.tonAmount + order.safetyDeposit + self.ESCROW_DEPLOY_VALUE,
            mode: SendIgnoreErrors,
            bounce: true,
            body: CreateEscrow{
                hashlock: order.hashlock,
                receiver: order.tonRecipient,  // TON user receives tokens
                timelock: order.timelock - now(), // Convert back to relative
                orderHash: order.orderHash,
                metadata: emptyCell()
            }.toCell()
        });
        
        // Calculate expected escrow address (simplified)
        return self.computeEscrowAddress(order.orderHash);
    }

    // Compute expected escrow address (simplified)
    fun computeEscrowAddress(orderHash: Int): Address {
        // In production, this would compute the actual CREATE2-style address
        // For now, return a placeholder based on orderHash
        return newAddress(0, orderHash);
    }

    // Parse Ethereum address string to TON address (simplified)
    fun parseEthereumAddress(ethAddr: String): Address {
        // In production, this would properly convert Ethereum address to TON format
        // For now, return a placeholder address
        return newAddress(0, 12345);
    }

    // Hash function for secret verification
    fun hashSecret(secret: String): Int {
        // Use the same hash function as the escrow
        return sha256(secret);
    }

    // ===========================
    // Getters
    // ===========================

    get fun resolverInfo(): ResolverInfo {
        return ResolverInfo{
            owner: self.owner,
            escrowFactory: self.escrowFactory,
            totalOrders: self.totalOrders,
            isPaused: self.isPaused,
            minSafetyDeposit: self.minSafetyDeposit,
            maxOrderTimelock: self.maxOrderTimelock,
            minOrderTimelock: self.minOrderTimelock
        };
    }

    get fun getOrder(orderHash: Int): CrossChainOrder? {
        return self.orders.get(orderHash);
    }

    get fun getOrderEscrow(orderHash: Int): Address? {
        return self.orderToEscrow.get(orderHash);
    }

    get fun getOrderSafetyDeposit(orderHash: Int): Int? {
        return self.safetyDeposits.get(orderHash);
    }

    get fun getOrderEscrowBalance(orderHash: Int): Int? {
        let escrowAddress: Address? = self.orderToEscrow.get(orderHash);
        if (escrowAddress == null) {
            return null;
        }
        // In production, this would query the escrow contract for its balance
        // For now, return the expected amount if order exists and is active
        let order: CrossChainOrder? = self.orders.get(orderHash);
        if (order == null) {
            return null;
        }
        if (order!!.status != ORDER_ACTIVE) {
            return 0;
        }
        return order!!.tonAmount;
    }

    get fun canWithdrawOrder(orderHash: Int, secret: String): Bool {
        let order: CrossChainOrder? = self.orders.get(orderHash);
        if (order == null){
            return false;
        }
        
        let orderData: CrossChainOrder = order!!;
        if (orderData.status != ORDER_ACTIVE){
            return false;
        }
        if (now() > orderData.timelock){
            return false;
        }
        if (self.hashSecret(secret) != orderData.hashlock){
            return false;
        }
        
        return true;
    }

    get fun canCancelOrder(orderHash: Int): Bool {
        let order: CrossChainOrder? = self.orders.get(orderHash);
        if (order == null){
            return false;
        }
        
        let orderData: CrossChainOrder = order!!;
        return orderData.status == ORDER_ACTIVE && now() > orderData.timelock; 
    }

    get fun getOrderStatus(orderHash: Int): Int? {
        let order: CrossChainOrder? = self.orders.get(orderHash);
        if (order == null){
            return null;
        }
        return order!!.status;
    }

    get fun verifySecret(orderHash: Int, secret: String): Bool {
        let order: CrossChainOrder? = self.orders.get(orderHash);
        if (order == null){
            return false;
        }
        return self.hashSecret(secret) == order!!.hashlock;
    }
}

// ===========================
// Support Structures
// ===========================

struct ResolverInfo {
    owner: Address;
    escrowFactory: Address;
    totalOrders: Int as uint64;
    isPaused: Bool;
    minSafetyDeposit: Int as coins;
    maxOrderTimelock: Int as uint32;
    minOrderTimelock: Int as uint32;
}

// Import escrow structures and messages from escrow contracts
struct EscrowParams {
    hashlock: Int as uint256;
    amount: Int as coins;
    timelock: Int as uint32;
    sender: Address;      // Resolver address
    receiver: Address;    // TON recipient address
    orderHash: Int as uint256;
}

message CreateEscrow {
    hashlock: Int as uint256;
    receiver: Address;
    timelock: Int as uint32;
    orderHash: Int as uint256;
    metadata: Cell?;
}
message WithdrawEscrow {
    secret: String;
}

message RefundEscrow {}

message WithdrawToRecipient {
    secret: String;
    recipient: Address;
    resolver: Address;
}

message RefundToResolver {
    resolver: Address;
    originalTaker: Address;
}

