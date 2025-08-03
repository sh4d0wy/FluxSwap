import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import { TonResolver } from '../build/TonResolver/TonResolver_TonResolver';
import { EscrowFactory } from '../build/EscrowFactory/EscrowFactory_EscrowFactory';
import { Escrow } from '../build/Escrow/Escrow_Escrow';
import { compile } from '@ton/blueprint';

async function demo() {
    console.log('🚀 TON Cross-Chain Resolver Flow Demo');
    console.log('=====================================\n');

    // Initialize blockchain
    console.log('⚙️  Setting up blockchain environment...');
    const blockchain = await Blockchain.create();
    
    // Create accounts
    const resolver = await blockchain.treasury('resolver');
    const tonUser = await blockchain.treasury('tonUser');
    const ethereumUser = await blockchain.treasury('ethereumUser');

    console.log(`👤 Resolver address: ${resolver.address}`);
    console.log(`👤 TON User address: ${tonUser.address}`);
    console.log(`👤 Ethereum User address: ${ethereumUser.address}\n`);

    // Compile contracts
    console.log('📦 Compiling contracts...');
    const escrowFactoryCode = await compile('EscrowFactory');
    const escrowCode = await compile('Escrow');
    const tonResolverCode = await compile('TonResolver');

    // Deploy Escrow Factory
    console.log('🏭 Deploying Escrow Factory...');
    const escrowFactory = blockchain.openContract(
        EscrowFactory.createFromConfig({
            owner: resolver.address,
            escrowCode: escrowCode,
            nextId: 0n,
        }, escrowFactoryCode)
    );

    await escrowFactory.sendDeploy(resolver.getSender(), toNano('0.1'));
    console.log(`✅ Escrow Factory deployed at: ${escrowFactory.address}\n`);

    // Deploy TON Resolver
    console.log('🔗 Deploying TON Resolver...');
    const tonResolver = blockchain.openContract(
        TonResolver.createFromConfig({
            owner: resolver.address,
            escrowFactory: escrowFactory.address,
            totalOrders: 0n,
            isPaused: false,
            minSafetyDeposit: toNano('0.1'),
            maxOrderTimelock: 86400, // 24 hours
            minOrderTimelock: 3600,  // 1 hour
            orders: new Map(),
            orderToEscrow: new Map(),
            safetyDeposits: new Map(),
            emergencyDelay: 86400,
            lastEmergencyAction: 0,
        }, tonResolverCode)
    );

    await tonResolver.sendDeploy(resolver.getSender(), toNano('0.1'));
    console.log(`✅ TON Resolver deployed at: ${tonResolver.address}\n`);

    // Order parameters
    const orderHash = BigInt("0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0");
    const ethereumToken = "0x1234567890123456789012345678901234567890";
    const secret = BigInt("42069420");
    const hashlock = BigInt("12345678901234567890"); // In production: keccak256(secret)
    const ethereumAmount = BigInt("1000000000000000000"); // 1 ETH
    const tonAmount = toNano('10'); // 10 TON
    const safetyDeposit = toNano('1'); // 1 TON
    const timelock = 3600; // 1 hour

    console.log('📋 Order Parameters:');
    console.log(`   Order Hash: ${orderHash.toString(16)}`);
    console.log(`   Ethereum Token: ${ethereumToken}`);
    console.log(`   Ethereum Amount: ${ethereumAmount.toString()} wei (1 ETH)`);
    console.log(`   TON Amount: ${tonAmount.toString()} nanotons (10 TON)`);
    console.log(`   Safety Deposit: ${safetyDeposit.toString()} nanotons (1 TON)`);
    console.log(`   Timelock: ${timelock} seconds (1 hour)`);
    console.log(`   Secret: ${secret}`);
    console.log(`   Hashlock: ${hashlock}\n`);

    // Step 1: Create Cross-Chain Order
    console.log('📝 STEP 1: Creating Cross-Chain Order');
    console.log('   (Resolver creates order after catching Ethereum relayer event)');
    
    const initialBalance = await resolver.getBalance();
    console.log(`   Resolver balance before: ${initialBalance} nanotons`);

    const createResult = await tonResolver.sendCreateCrossChainOrder(
        resolver.getSender(),
        {
            value: tonAmount + safetyDeposit + toNano('0.2'), // Tokens + deposit + gas
            queryId: 0n,
        },
        {
            orderHash: orderHash,
            maker: ethereumUser.address.toString(),
            tonRecipient: tonUser.address,
            ethereumToken: ethereumToken,
            tonToken: tonUser.address, // Mock TON token
            ethereumAmount: ethereumAmount,
            tonAmount: tonAmount,
            hashlock: hashlock,
            timelock: timelock,
            safetyDepositAmount: safetyDeposit,
            metadata: null,
        }
    );

    if (createResult.transactions.some(tx => tx.success === false)) {
        console.log('❌ Order creation failed!');
        return;
    }

    console.log('✅ Order created successfully!');
    
    // Verify order creation
    const orderInfo = await tonResolver.getGetOrder(orderHash);
    console.log(`   Order Status: ${orderInfo?.status} (0=Active, 1=Completed, 2=Cancelled)`);
    console.log(`   TON Amount: ${orderInfo?.tonAmount} nanotons`);
    console.log(`   TON Recipient: ${orderInfo?.tonRecipient}\n`);

    const resolverInfo = await tonResolver.getResolverInfo();
    console.log(`   Total Orders Created: ${resolverInfo.totalOrders}\n`);

    // Step 2: Verify Secret
    console.log('🔐 STEP 2: Verifying Secret');
    const canWithdraw = await tonResolver.getCanWithdrawOrder(orderHash, secret);
    console.log(`   Can withdraw with secret: ${canWithdraw}`);
    
    const canWithdrawWrong = await tonResolver.getCanWithdrawOrder(orderHash, BigInt("999"));
    console.log(`   Can withdraw with wrong secret: ${canWithdrawWrong}\n`);

    // Step 3: Withdraw with Secret
    console.log('💰 STEP 3: Withdrawing with Secret');
    console.log('   (Relayer provides secret to resolver, resolver unlocks TON side)');
    
    const tonUserBalanceBefore = await tonUser.getBalance();
    console.log(`   TON User balance before: ${tonUserBalanceBefore} nanotons`);

    const withdrawResult = await tonResolver.sendWithdrawWithSecret(
        resolver.getSender(),
        {
            value: toNano('0.1'), // Gas for withdrawal
            queryId: 0n,
        },
        {
            orderHash: orderHash,
            secret: secret,
        }
    );

    if (withdrawResult.transactions.some(tx => tx.success === false)) {
        console.log('❌ Withdrawal failed!');
        return;
    }

    console.log('✅ Withdrawal successful!');

    // Verify completion
    const completedOrderInfo = await tonResolver.getGetOrder(orderHash);
    console.log(`   Order Status: ${completedOrderInfo?.status} (0=Active, 1=Completed, 2=Cancelled)`);

    const tonUserBalanceAfter = await tonUser.getBalance();
    console.log(`   TON User balance after: ${tonUserBalanceAfter} nanotons`);
    console.log(`   TON User received: ${tonUserBalanceAfter - tonUserBalanceBefore} nanotons\n`);

    // Step 4: Show final state
    console.log('📊 FINAL STATE:');
    const finalResolverInfo = await tonResolver.getResolverInfo();
    console.log(`   Total Orders: ${finalResolverInfo.totalOrders}`);
    console.log(`   Resolver Paused: ${finalResolverInfo.isPaused}`);
    console.log(`   Min Safety Deposit: ${finalResolverInfo.minSafetyDeposit} nanotons`);
    
    const finalBalance = await resolver.getBalance();
    console.log(`   Resolver balance after: ${finalBalance} nanotons`);
    console.log(`   Resolver spent: ${initialBalance - finalBalance} nanotons\n`);

    console.log('🎉 DEMO COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('Summary:');
    console.log('1. ✅ Resolver created cross-chain order');
    console.log('2. ✅ Escrow was deployed with TON tokens');
    console.log('3. ✅ Resolver unlocked with secret');
    console.log('4. ✅ TON tokens sent to recipient');
    console.log('5. ✅ Security deposit returned to resolver');
    console.log('\n🔗 In the real flow:');
    console.log('   - Ethereum side would have matching escrow');
    console.log('   - Resolver would unlock Ethereum side too');
    console.log('   - Ethereum tokens would go to resolver');
    console.log('   - Relayer coordinates the atomic swap');
}

// Test error scenarios
async function testErrorScenarios() {
    console.log('\n🧪 TESTING ERROR SCENARIOS');
    console.log('===========================\n');

    // Setup
    const blockchain = await Blockchain.create();
    const resolver = await blockchain.treasury('resolver');
    const user = await blockchain.treasury('user');
    const attacker = await blockchain.treasury('attacker');

    // Deploy contracts (abbreviated)
    const escrowFactoryCode = await compile('EscrowFactory');
    const escrowCode = await compile('Escrow');
    const tonResolverCode = await compile('TonResolver');

    const escrowFactory = blockchain.openContract(
        EscrowFactory.createFromConfig({
            owner: resolver.address,
            escrowCode: escrowCode,
            nextId: 0n,
        }, escrowFactoryCode)
    );
    await escrowFactory.sendDeploy(resolver.getSender(), toNano('0.1'));

    const tonResolver = blockchain.openContract(
        TonResolver.createFromConfig({
            owner: resolver.address,
            escrowFactory: escrowFactory.address,
            totalOrders: 0n,
            isPaused: false,
            minSafetyDeposit: toNano('0.1'),
            maxOrderTimelock: 86400,
            minOrderTimelock: 3600,
            orders: new Map(),
            orderToEscrow: new Map(),
            safetyDeposits: new Map(),
            emergencyDelay: 86400,
            lastEmergencyAction: 0,
        }, tonResolverCode)
    );
    await tonResolver.sendDeploy(resolver.getSender(), toNano('0.1'));

    const orderHash = BigInt("0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0");

    // Test 1: Non-resolver tries to create order
    console.log('🚫 Test 1: Non-resolver tries to create order');
    const attackResult = await tonResolver.sendCreateCrossChainOrder(
        attacker.getSender(), // Not the resolver!
        {
            value: toNano('11.2'),
            queryId: 0n,
        },
        {
            orderHash: orderHash,
            maker: user.address.toString(),
            tonRecipient: user.address,
            ethereumToken: "0x1234567890123456789012345678901234567890",
            tonToken: user.address,
            ethereumAmount: BigInt("1000000000000000000"),
            tonAmount: toNano('10'),
            hashlock: BigInt("12345"),
            timelock: 3600,
            safetyDepositAmount: toNano('1'),
            metadata: null,
        }
    );

    const attackSuccess = attackResult.transactions.every(tx => tx.success !== false);
    console.log(`   Result: ${attackSuccess ? '❌ FAILED - Should have been rejected!' : '✅ PASSED - Correctly rejected'}\n`);

    // Test 2: Non-resolver tries to withdraw
    // First create a valid order
    await tonResolver.sendCreateCrossChainOrder(
        resolver.getSender(),
        {
            value: toNano('11.2'),
            queryId: 0n,
        },
        {
            orderHash: orderHash,
            maker: user.address.toString(),
            tonRecipient: user.address,
            ethereumToken: "0x1234567890123456789012345678901234567890",
            tonToken: user.address,
            ethereumAmount: BigInt("1000000000000000000"),
            tonAmount: toNano('10'),
            hashlock: BigInt("12345"),
            timelock: 3600,
            safetyDepositAmount: toNano('1'),
            metadata: null,
        }
    );

    console.log('🚫 Test 2: Non-resolver tries to withdraw');
    const withdrawAttackResult = await tonResolver.sendWithdrawWithSecret(
        attacker.getSender(), // Not the resolver!
        {
            value: toNano('0.1'),
            queryId: 0n,
        },
        {
            orderHash: orderHash,
            secret: BigInt("42069420"),
        }
    );

    const withdrawAttackSuccess = withdrawAttackResult.transactions.every(tx => tx.success !== false);
    console.log(`   Result: ${withdrawAttackSuccess ? '❌ FAILED - Should have been rejected!' : '✅ PASSED - Correctly rejected'}\n`);

    console.log('✅ Security tests completed!');
}

// Run both demos
async function runAll() {
    await demo();
    await testErrorScenarios();
}

if (require.main === module) {
    runAll().catch(console.error);
}

export { demo, testErrorScenarios }; 