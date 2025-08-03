# TON Cross-Chain Resolver Testing Guide

This guide explains how to test the TON cross-chain resolver contracts using the improved test suite.

## 🚀 Quick Start

```bash
cd ton-contracts
npm install
npm run test:quick
```

## 📋 Available Test Scripts

### 1. **Quick Test** (Recommended first step)
```bash
npm run test:quick
```
- ✅ Validates contract compilation
- ✅ Tests hash functions
- ✅ Verifies basic functionality
- ⏱️ **Duration:** ~30 seconds

### 2. **Escrow Tests** (HTLC functionality)
```bash
npm run test:escrow
```
- 🏭 Tests EscrowFactory deployment
- 🔐 Tests Escrow contract HTLC logic
- ⏰ Tests timelock scenarios
- 🔒 Tests security controls
- ⏱️ **Duration:** ~2-3 minutes

### 3. **Improved Demo** (Full cross-chain flow)
```bash
npm run demo:improved
```
- 🔗 Tests TonResolver deployment
- 📝 Tests cross-chain order creation
- 🔍 Tests secret verification
- 💰 Tests withdrawal flow
- ⏱️ **Duration:** ~1-2 minutes

### 4. **Comprehensive Test Suite**
```bash
npm run test:comprehensive
```
- Runs: Build → Escrow Tests → Improved Demo
- ⏱️ **Duration:** ~5-8 minutes

### 5. **Full Test Suite** (Everything)
```bash
npm run test:all
```
- Runs: Build → Escrow Tests → Resolver Tests → Jest Tests
- ⏱️ **Duration:** ~10-15 minutes

## 🔧 Test Features

### **Improved Hash Function Testing**
- Uses real `sha256` hashing (like the contracts)
- Validates secret-hashlock relationships
- Tests hash consistency

### **Proper Type Handling**
- Fixed type mismatches between contracts and tests
- Proper `BigInt` usage for large numbers
- Correct `Address` handling for TON addresses

### **Comprehensive Error Testing**
- Tests unauthorized access attempts
- Tests invalid secret submissions
- Tests pause/unpause functionality
- Tests timelock expiration scenarios

### **Real Contract Integration**
- Tests actual contract deployment
- Tests message handling
- Tests state transitions
- Tests inter-contract communication

## 📊 Test Coverage

### **EscrowFactory Contract**
- ✅ Deployment and initialization
- ✅ Escrow creation with validation
- ✅ Duplicate hashlock prevention
- ✅ Minimum amount enforcement
- ✅ Timelock validation
- ✅ Pause/unpause functionality

### **Escrow Contract (HTLC)**
- ✅ Initialization with parameters
- ✅ Secret-based withdrawals
- ✅ Timelock-based refunds
- ✅ Access control (anyone can withdraw with secret)
- ✅ State tracking (withdrawn/refunded flags)
- ✅ Emergency refund functionality

### **TonResolver Contract**
- ✅ Cross-chain order creation
- ✅ Order parameter validation
- ✅ Escrow integration
- ✅ Secret verification
- ✅ Order status management
- ✅ Safety deposit handling

## 🛡️ Security Test Scenarios

### **Access Control Tests**
```typescript
// Test: Non-owner tries to create order
await tonResolver.sendCreateCrossChainOrder(attacker.getSender(), {...});
// Expected: Should fail ✅
```

### **Invalid Secret Tests**
```typescript
// Test: Wrong secret withdrawal
await tonResolver.sendWithdrawWithSecret(resolver.getSender(), {
    orderHash: orderHash,
    secret: "wrong_secret"
});
// Expected: Should fail ✅
```

### **Timelock Tests**
```typescript
// Test: Withdrawal after expiration
blockchain.now = timelock + 10; // Fast-forward time
await escrow.sendWithdrawEscrow(user.getSender(), { secret: secret });
// Expected: Should fail ✅
```

### **Pause Tests**
```typescript
// Test: Operations while paused
await tonResolver.send(owner.getSender(), { value: toNano('0.05') }, 'pause');
await tonResolver.sendCreateCrossChainOrder(...);
// Expected: Should fail ✅
```

## 🐛 Debugging Failed Tests

### **Compilation Errors**
```bash
npm run build
# Check for Tact syntax errors in contracts/
```

### **Transaction Failures**
```typescript
console.log('Transaction details:', result.transactions);
// Look for success: false in transaction logs
```

### **Type Errors**
```bash
# Make sure you're using the correct types:
# - BigInt for uint256 values
# - toNano() for coin values
# - Address.parse() for addresses
```

## 📈 Performance Optimization

### **For Faster Testing**
1. Use `npm run test:quick` for basic validation
2. Use `npm run test:escrow` for HTLC-specific testing
3. Use `npm run demo:improved` for flow testing

### **For CI/CD**
```bash
npm run test:comprehensive
# Covers all critical functionality without redundant Jest tests
```

## 🔄 Test Development Workflow

1. **First time setup:**
   ```bash
   npm install
   npm run test:quick
   ```

2. **After contract changes:**
   ```bash
   npm run build
   npm run test:escrow    # If escrow contracts changed
   npm run demo:improved  # If resolver contracts changed
   ```

3. **Before committing:**
   ```bash
   npm run test:all
   ```

## 📝 Test Script Details

### **quickContractTest.ts**
- Basic contract compilation validation
- Hash function testing
- Address handling verification

### **fixedEscrowTests.ts**
- Comprehensive HTLC testing
- Factory pattern validation
- Timelock scenario testing

### **improvedTestFlow.ts**
- Full cross-chain resolver flow
- Advanced error scenario testing
- Security control validation

### **contractTestRunner.ts**
- Master test orchestrator
- Sequential test execution
- Comprehensive reporting

## ⚡ Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Contract not found" | Run `npm run build` first |
| "Type mismatch" | Check BigInt vs number usage |
| "Transaction failed" | Check gas values and parameters |
| "Test timeout" | Increase timeout or check infinite loops |
| "Hash mismatch" | Ensure consistent secret encoding |

## 🎯 Success Indicators

When tests pass successfully, you should see:
- ✅ All contracts compile without errors
- ✅ Deployments succeed with proper addresses
- ✅ Hash functions produce consistent results
- ✅ Secret verification works correctly
- ✅ Timelock logic functions properly
- ✅ Security controls prevent unauthorized access
- ✅ Cross-chain order flow completes successfully

## 🌉 Next Steps

After successful testing:
1. Deploy to TON testnet using `npx blueprint run`
2. Test with real testnet funds
3. Integrate with Ethereum contracts
4. Set up monitoring and alerting
5. Prepare for mainnet deployment

---

**Happy Testing!** 🧪✨

For issues or questions, check the contract documentation in `/contracts/` and the test logs for detailed error information. 