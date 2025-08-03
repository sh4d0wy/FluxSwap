# TON Cross-Chain Resolver Flow Tests

This directory contains comprehensive tests for the TON Cross-Chain Resolver system that demonstrate the complete cross-chain order flow.

## Overview

The tests simulate the following cross-chain swap flow:
1. **User creates intent** on Ethereum via relayer
2. **Resolver catches event** and creates order on TON 
3. **Resolver deposits tokens** into TON escrow
4. **Relayer provides secret** to resolver
5. **Resolver unlocks both sides** atomically
6. **Tokens flow**: Ethereum → Resolver, TON Escrow → User

## Test Files

### 1. `tests/TonResolverFlow.spec.ts` - Comprehensive Test Suite
Complete Jest test suite covering:
- ✅ Cross-chain order creation
- ✅ Order withdrawal with secrets
- ✅ Order cancellation flow
- ✅ Security validations
- ✅ Access control tests
- ✅ Complete integration flow

### 2. `scripts/demoFlow.ts` - Interactive Demo
Standalone demo script that:
- 🚀 Shows complete flow step-by-step
- 📊 Displays balances and state changes
- 🔐 Tests security scenarios
- ⚡ Can be run independently

## Running the Tests

### Prerequisites
```bash
cd ton-contracts
npm install
```

### Run Complete Test Suite
```bash
npm test TonResolverFlow.spec.ts
```

### Run Interactive Demo
```bash
npx ts-node scripts/demoFlow.ts
```

### Run All Tests
```bash
npm test
```

## Test Scenarios Covered

### ✅ Happy Path Flow
1. Resolver creates cross-chain order
2. Order is stored with correct parameters
3. Resolver withdraws with correct secret
4. Tokens go to specified recipient
5. Order status updates to completed

### 🚫 Security Tests
1. Non-resolver cannot create orders
2. Non-resolver cannot withdraw
3. Wrong secret rejected
4. Duplicate orders rejected
5. Expired orders can be cancelled

### ⚙️ Configuration Tests
1. Pause/unpause functionality
2. Emergency resolution
3. Safety deposit management
4. Timelock validation

## Key Test Parameters

```typescript
const TEST_ORDER_HASH = BigInt("0x123456789abcdef...");
const TEST_SECRET = BigInt("42069420");
const TEST_HASHLOCK = BigInt("12345678901234567890");
const TEST_ETHEREUM_AMOUNT = BigInt("1000000000000000000"); // 1 ETH
const TEST_TON_AMOUNT = toNano('10'); // 10 TON
const TEST_SAFETY_DEPOSIT = toNano('1'); // 1 TON
const TEST_TIMELOCK = 3600; // 1 hour
```

## Contract Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TonResolver   │───▶│  EscrowFactory  │───▶│     Escrow      │
│                 │    │                 │    │                 │
│ - Order Management  │    │ - Deploy Escrows │    │ - Hold Tokens   │
│ - Access Control    │    │ - Track Escrows  │    │ - Secret Unlock │
│ - Secret Validation │    │                 │    │ - Time Lock     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Flow Validation

The tests verify that:

1. **Only resolver** can create/manage orders
2. **Tokens flow correctly**: Resolver → Escrow → Recipient
3. **Security deposits** are handled properly
4. **Timelock mechanism** works for expiration
5. **Secret verification** prevents unauthorized access
6. **State transitions** follow the expected order lifecycle

## Expected Output

### Demo Script Output Example:
```
🚀 TON Cross-Chain Resolver Flow Demo
=====================================

⚙️  Setting up blockchain environment...
👤 Resolver address: EQD4...
👤 TON User address: EQB2...
👤 Ethereum User address: EQA5...

📦 Compiling contracts...
🏭 Deploying Escrow Factory...
✅ Escrow Factory deployed at: EQCx...

🔗 Deploying TON Resolver...
✅ TON Resolver deployed at: EQDy...

📝 STEP 1: Creating Cross-Chain Order
   (Resolver creates order after catching Ethereum relayer event)
   Resolver balance before: 100000000000 nanotons
✅ Order created successfully!
   Order Status: 0 (0=Active, 1=Completed, 2=Cancelled)
   TON Amount: 10000000000 nanotons
   Total Orders Created: 1

🔐 STEP 2: Verifying Secret
   Can withdraw with secret: true
   Can withdraw with wrong secret: false

💰 STEP 3: Withdrawing with Secret
   (Relayer provides secret to resolver, resolver unlocks TON side)
   TON User balance before: 100000000000 nanotons
✅ Withdrawal successful!
   Order Status: 1 (0=Active, 1=Completed, 2=Cancelled)
   TON User balance after: 110000000000 nanotons
   TON User received: 10000000000 nanotons

🎉 DEMO COMPLETED SUCCESSFULLY!
```

## Real-World Integration

In production, these contracts would integrate with:
- **Ethereum Resolver Contract** (matching escrow system)
- **Relayer Network** (event monitoring and secret distribution)
- **Multi-chain Bridge** (token standards and address mapping)
- **Oracle Systems** (price feeds and validation)

## Security Considerations

The tests validate critical security features:
- 🔐 **Access Control**: Only resolver can manage orders
- ⏰ **Time Locks**: Prevents indefinite token locking
- 🔑 **Secret Verification**: Cryptographic proof of fulfillment
- 💰 **Safety Deposits**: Economic incentives for honest behavior
- 🚨 **Emergency Controls**: Admin override for critical situations

## Next Steps

1. Run the tests to see the flow in action
2. Modify parameters to test edge cases
3. Integrate with actual Ethereum contracts
4. Add real token standards (Jettons)
5. Implement proper secret generation (keccak256) 