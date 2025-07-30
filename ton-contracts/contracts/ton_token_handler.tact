import "@stdlib/deploy";

// Jetton transfer notification (TEP-74 standard)
message TransferNotification {
    queryId: Int;
    amount: Int;
    sender: Address;
    forwardPayload: Slice;
}

// Internal transfer for native TON
message TokenTransfer {
    queryId: Int;
    amount: Int;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardTonAmount: Int;
    forwardPayload: Slice;
}

// Jetton transfer message
message JettonTransfer {
    queryId: Int;
    amount: Int;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int;
    forwardPayload: Slice;
}

// Token deposit message
message TokenDeposit {
    amount: Int;
    tokenAddress: Address?; // null for native TON
    sender: Address;
    recipient: String; // Ethereum address as string
    hashlock: Int;
    timelock: Int;
}

// Token withdrawal message
message TokenWithdrawal {
    amount: Int;
    tokenAddress: Address?; // null for native TON
    recipient: Address;
    secret: Int;
}

// Events
message TokenDepositProcessed {
    depositId: Int;
    sender: Address;
    amount: Int;
    tokenAddress: Address?;
    recipient: String;
    hashlock: Int;
    timelock: Int;
}

message TokenWithdrawalProcessed {
    withdrawalId: Int;
    recipient: Address;
    amount: Int;
    tokenAddress: Address?;
    secret: Int;
}

contract TonTokenHandler with Deployable {
    // Constants
    const MIN_TON_FOR_STORAGE: Int = 100000000; // 0.1 TON for storage fees
    const GAS_CONSUMPTION: Int = 50000000; // 0.05 TON for gas
    
    // State variables
    owner: Address;
    bridge: Address; // TonBridge contract address
    supportedTokens: map<Address, Bool>; // Jetton master addresses
    tokenBalances: map<Address, Int>; // token -> balance
    nativeBalance: Int; // Native TON balance
    depositCounter: Int;
    withdrawalCounter: Int;
    
    // Deposit tracking
    deposits: map<Int, TokenDepositInfo>;
    withdrawals: map<Int, TokenWithdrawalInfo>;
    
    init(owner: Address, bridge: Address) {
        self.owner = owner;
        self.bridge = bridge;
        self.nativeBalance = 0;
        self.depositCounter = 0;
        self.withdrawalCounter = 0;
    }
    
    // Token management functions
    receive(msg: AddSupportedToken) {
        require(sender() == self.owner, "Only owner can add tokens");
        self.supportedTokens.set(msg.tokenAddress, true);
    }
    
    receive(msg: RemoveSupportedToken) {
        require(sender() == self.owner, "Only owner can remove tokens");
        self.supportedTokens.set(msg.tokenAddress, false);
    }
    
    // Handle native TON deposits
    receive(msg: TokenDeposit) {
        require(msg.amount > 0, "Amount must be positive");
        require(msg.timelock > now() + 3600, "Timelock too short");
        
        if (msg.tokenAddress == null) {
            // Native TON deposit
            require(context().value >= msg.amount + self.MIN_TON_FOR_STORAGE, "Insufficient TON sent");
            self.nativeBalance = self.nativeBalance + msg.amount;
        } else {
            // Jetton deposit - requires prior transfer notification
            require(self.supportedTokens.get(msg.tokenAddress!!) == true, "Token not supported");
        }
        
        self.depositCounter = self.depositCounter + 1;
        let depositId: Int = self.depositCounter;
        
        self.deposits.set(depositId, TokenDepositInfo{
            depositId: depositId,
            sender: msg.sender,
            amount: msg.amount,
            tokenAddress: msg.tokenAddress,
            recipient: msg.recipient,
            hashlock: msg.hashlock,
            timelock: msg.timelock,
            processed: false
        });
        
        emit(TokenDepositProcessed{
            depositId: depositId,
            sender: msg.sender,
            amount: msg.amount,
            tokenAddress: msg.tokenAddress,
            recipient: msg.recipient,
            hashlock: msg.hashlock,
            timelock: msg.timelock
        }.toCell());
    }
    
    // Handle Jetton transfer notifications (TEP-74)
    receive(msg: TransferNotification) {
        // Verify this is from a supported Jetton wallet
        let jettonMaster: Address = self.getJettonMaster(sender());
        require(self.supportedTokens.get(jettonMaster) == true, "Unsupported token");
        let currentBalance:Int = 0;
        // Update balance
        if(self.tokenBalances.get(jettonMaster) != null){
            currentBalance = self.tokenBalances.get(jettonMaster)!!;
        }
        currentBalance = currentBalance + msg.amount;
        self.tokenBalances.set(jettonMaster, currentBalance + msg.amount);
        
        // Parse forward payload for deposit info if available
        if (!msg.forwardPayload.empty()) {
            self.processJettonDeposit(msg.amount, jettonMaster, msg.sender, msg.forwardPayload);
        }
    }
    
    // Handle token withdrawals
    receive(msg: TokenWithdrawal) {
        require(sender() == self.bridge, "Only bridge can process withdrawals");
        require(msg.amount > 0, "Amount must be positive");
        
        self.withdrawalCounter = self.withdrawalCounter + 1;
        let withdrawalId: Int = self.withdrawalCounter;
        
        if (msg.tokenAddress == null) {
            // Native TON withdrawal
            require(self.nativeBalance >= msg.amount, "Insufficient native balance");
            self.nativeBalance = self.nativeBalance - msg.amount;
            
            // Send native TON
            send(SendParameters{
                to: msg.recipient,
                value: msg.amount,
                mode: SendIgnoreErrors,
                body: "Token withdrawal".asComment()
            });
        } else {
            // Jetton withdrawal
            let tokenBalance: Int = 0;
            if(self.tokenBalances.get(msg.tokenAddress!!) != null){
                tokenBalance = self.tokenBalances.get(msg.tokenAddress!!)!!;
            }
            require(tokenBalance >= msg.amount, "Insufficient token balance");
            
            self.tokenBalances.set(msg.tokenAddress!!, tokenBalance - msg.amount);
            
            // Send Jetton transfer message to Jetton wallet
            self.sendJettonTransfer(msg.tokenAddress!!, msg.amount, msg.recipient);
        }
        
        self.withdrawals.set(withdrawalId, TokenWithdrawalInfo{
            withdrawalId: withdrawalId,
            recipient: msg.recipient,
            amount: msg.amount,
            tokenAddress: msg.tokenAddress,
            secret: msg.secret,
            processed: true
        });
        
        emit(TokenWithdrawalProcessed{
            withdrawalId: withdrawalId,
            recipient: msg.recipient,
            amount: msg.amount,
            tokenAddress: msg.tokenAddress,
            secret: msg.secret
        }.toCell());
    }
    
    // Internal functions
    fun processJettonDeposit(
        amount: Int,
        jettonMaster: Address,
        sender: Address,
        payload: Slice
    ) {
        // Parse deposit parameters from payload
        // In a real implementation, this would decode the cross-chain deposit info
        // For now, we'll just acknowledge the deposit
    }
    
    fun sendJettonTransfer(jettonMaster: Address, amount: Int, recipient: Address) {
        // Get the sender's Jetton wallet address
        let jettonWallet: Address = self.getJettonWalletAddress(jettonMaster, myAddress());
        
        // Send transfer message to Jetton wallet
        send(SendParameters{
            to: jettonWallet,
            value: self.MIN_TON_FOR_STORAGE + self.GAS_CONSUMPTION,
            mode: SendIgnoreErrors,
            body: JettonTransfer{
                queryId: 0,
                amount: amount,
                destination: recipient,
                responseDestination: myAddress(),
                customPayload: null,
                forwardTonAmount: 1,
                forwardPayload: emptySlice()
            }.toCell()
        });
    }
    
    fun getJettonMaster(jettonWallet: Address): Address {
        // In a real implementation, this would query the Jetton wallet
        // to get its master contract address
        // For now, return a placeholder
        return jettonWallet; // Simplified
    }
    
    fun getJettonWalletAddress(jettonMaster: Address, owner: Address): Address {
        // Calculate Jetton wallet address for given master and owner
        // This uses the standard TEP-74 address calculation
        // For now, return a simplified calculation
        return jettonMaster; // Simplified
    }
    
    // Getter functions
    get fun getBalance(tokenAddress: Address?): Int {
        if (tokenAddress == null) {
            return self.nativeBalance;
        } else {
            let balance:Int = 0;
            if(self.tokenBalances.get(tokenAddress!!) != null){
                balance = self.tokenBalances.get(tokenAddress!!)!!;
            }
            return balance;
        }
    }
    
    get fun isTokenSupported(tokenAddress: Address): Bool {
        return self.supportedTokens.get(tokenAddress) == true;
    }
    
    get fun getDepositInfo(depositId: Int): TokenDepositInfo? {
        return self.deposits.get(depositId);
    }
    
    get fun getWithdrawalInfo(withdrawalId: Int): TokenWithdrawalInfo? {
        return self.withdrawals.get(withdrawalId);
    }
    
    get fun getDepositCounter(): Int {
        return self.depositCounter;
    }
    
    get fun getWithdrawalCounter(): Int {
        return self.withdrawalCounter;
    }
    
    get fun getHandlerInfo(): TokenHandlerInfo {
        return TokenHandlerInfo{
            owner: self.owner,
            bridge: self.bridge,
            nativeBalance: self.nativeBalance,
            depositCounter: self.depositCounter,
            withdrawalCounter: self.withdrawalCounter
        };
    }
}

// Additional message types
message AddSupportedToken {
    tokenAddress: Address;
}

message RemoveSupportedToken {
    tokenAddress: Address;
}

// Structs for data storage
struct TokenDepositInfo {
    depositId: Int;
    sender: Address;
    amount: Int;
    tokenAddress: Address?;
    recipient: String;
    hashlock: Int;
    timelock: Int;
    processed: Bool;
}

struct TokenWithdrawalInfo {
    withdrawalId: Int;
    recipient: Address;
    amount: Int;
    tokenAddress: Address?;
    secret: Int;
    processed: Bool;
}

struct TokenHandlerInfo {
    owner: Address;
    bridge: Address;
    nativeBalance: Int;
    depositCounter: Int;
    withdrawalCounter: Int;
} 