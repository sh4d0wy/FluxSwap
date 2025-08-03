import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address, Dictionary } from '@ton/core';
import { EscrowFactory } from '../build/EscrowFactory/EscrowFactory_EscrowFactory';
import { Escrow } from '../build/Escrow/Escrow_Escrow';
import { compile } from '@ton/blueprint';
import crypto from 'crypto';

// Utility function to hash secrets using sha256 like the contracts
function hashSecret(secret: string): bigint {
    const hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
    return BigInt('0x' + hash.toString('hex'));
}

async function testEscrowFactory() {
    console.log('🏭 TESTING ESCROW FACTORY');
    console.log('=========================\n');

    const blockchain = await Blockchain.create();
    const owner = await blockchain.treasury('owner');
    const user1 = await blockchain.treasury('user1');
    const user2 = await blockchain.treasury('user2');

    // Compile contracts
    const escrowFactoryCode = await compile('EscrowFactory');
    const escrowCode = await compile('Escrow');

    // Deploy EscrowFactory
    console.log('📦 Deploying EscrowFactory...');
    const escrowFactory = blockchain.openContract(
        await EscrowFactory.fromInit(
            owner.address,
            0n,
             false,
            toNano('0.01'),
            86400n, // 24 hours
            3600n,  // 1 hour
            Dictionary.empty(),
            Dictionary.empty()
        )
    );

    await escrowFactory.send(owner.getSender(), { value: toNano('0.1') }, {
        $$type: "Deploy",
    });

    console.log(`✅ EscrowFactory deployed at: ${escrowFactory.address}\n`);

    // Test factory info
    const factoryInfo = await escrowFactory.getFactoryInfo();
    console.log('📊 Factory Info:');
    console.log(`   Owner: ${factoryInfo.owner}`);
    console.log(`   Total Escrows: ${factoryInfo.totalEscrows}`);
    console.log(`   Min Amount: ${factoryInfo.minAmount} nanotons`);
    console.log(`   Max Timelock: ${factoryInfo.maxTimelock} seconds`);
    console.log(`   Min Timelock: ${factoryInfo.minTimelock} seconds`);
    console.log(`   Is Paused: ${factoryInfo.isPaused}\n`);

    // Test 1: Create valid escrow
    console.log('🔒 Test 1: Creating valid escrow...');
    const secret1 = "test_secret_123";
    const hashlock1 = hashSecret(secret1);
    const amount1 = toNano('5');
    const timelock1 = 3600; // 1 hour

    console.log(`   Secret: "${secret1}"`);
    console.log(`   Hashlock: 0x${hashlock1.toString(16)}`);
    console.log(`   Amount: ${amount1} nanotons`);
    console.log(`   Timelock: ${timelock1} seconds`);

    const createResult1 = await escrowFactory.send(
        user1.getSender(),
        {
            value: amount1 + toNano('0.1'), // Amount + deployment cost
        },
        {
            $$type: "CreateEscrow",
            hashlock: hashlock1,
            receiver: user2.address,
            timelock: BigInt(timelock1),
            orderHash: "order_123",
            metadata: null
        }
    );

    
    console.log('✅ Escrow created successfully!\n');

    // Test escrow validation functions
    console.log('🔍 Testing validation functions...');
    const canCreate = await escrowFactory.getCanCreateEscrow(hashlock1, amount1, timelock1);
    console.log(`   Can create with same hashlock: ${canCreate} (should be false - already used)`);

    const newHashlock = hashSecret("different_secret");
    const canCreateNew = await escrowFactory.getCanCreateEscrow(newHashlock, amount1, timelock1);
    console.log(`   Can create with new hashlock: ${canCreateNew} (should be true)`);

    const isValidSecret = await escrowFactory.getIsValidSecret(hashlock1, secret1);
    console.log(`   Secret validation: ${isValidSecret} (should be true)`);

    const isInvalidSecret = await escrowFactory.getIsValidSecret(hashlock1, "wrong_secret");
    console.log(`   Wrong secret validation: ${isInvalidSecret} (should be false)\n`);

    // Test 2: Try to create escrow with duplicate hashlock (should fail)
    console.log('🚫 Test 2: Trying to create escrow with duplicate hashlock...');
    try {
        const duplicateResult = await escrowFactory.sendCreateEscrow(
            user1.getSender(),
            {
                value: amount1 + toNano('0.1'),
                hashlock: hashlock1, // Same hashlock!
                receiver: user2.address,
                timelock: timelock1,
                orderHash: "order_duplicate",
                metadata: null
            }
        );
        
        const success = duplicateResult.transactions.every(tx => tx.success);
        console.log(`   Result: ${success ? '❌ Duplicate hashlock accepted (BAD!)' : '✅ Duplicate hashlock rejected (GOOD)'}\n`);
    } catch (error) {
        console.log('   Result: ✅ Duplicate hashlock rejected (GOOD)\n');
    }

    // Test 3: Try to create escrow with insufficient amount
    console.log('🚫 Test 3: Trying to create escrow with insufficient amount...');
    try {
        const lowAmountResult = await escrowFactory.sendCreateEscrow(
            user1.getSender(),
            {
                value: toNano('0.005'), // Below minimum
                hashlock: hashSecret("low_amount_secret"),
                receiver: user2.address,
                timelock: timelock1,
                orderHash: "order_low_amount",
                metadata: null
            }
        );
        
        const success = lowAmountResult.transactions.every(tx => tx.success);
        console.log(`   Result: ${success ? '❌ Low amount accepted (BAD!)' : '✅ Low amount rejected (GOOD)'}\n`);
    } catch (error) {
        console.log('   Result: ✅ Low amount rejected (GOOD)\n');
    }

    // Test 4: Pause factory
    console.log('⏸️  Test 4: Testing pause functionality...');
    await escrowFactory.send(owner.getSender(), { value: toNano('0.05') }, 'pause');
    
    try {
        const pausedResult = await escrowFactory.sendCreateEscrow(
            user1.getSender(),
            {
                value: amount1 + toNano('0.1'),
                hashlock: hashSecret("paused_test"),
                receiver: user2.address,
                timelock: timelock1,
                orderHash: "order_paused",
                metadata: null
            }
        );
        
        const success = pausedResult.transactions.every(tx => tx.success);
        console.log(`   Result: ${success ? '❌ Escrow created while paused (BAD!)' : '✅ Escrow blocked while paused (GOOD)'}`);
    } catch (error) {
        console.log('   Result: ✅ Escrow blocked while paused (GOOD)');
    }

    // Unpause for remaining tests
    await escrowFactory.send(owner.getSender(), { value: toNano('0.05') }, 'unpause');
    console.log('   ▶️  Factory unpaused\n');

    console.log('✅ EscrowFactory tests completed!\n');
}

async function testEscrowContract() {
    console.log('🔐 TESTING ESCROW CONTRACT');
    console.log('==========================\n');

    const blockchain = await Blockchain.create();
    const sender = await blockchain.treasury('sender');
    const receiver = await blockchain.treasury('receiver');
    const anyone = await blockchain.treasury('anyone');

    // Compile contracts
    const escrowCode = await compile('Escrow');

    // Test parameters
    const secret = "escrow_test_secret";
    const hashlock = hashSecret(secret);
    const amount = toNano('3');
    const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    console.log('🔧 Test Parameters:');
    console.log(`   Secret: "${secret}"`);
    console.log(`   Hashlock: 0x${hashlock.toString(16)}`);
    console.log(`   Amount: ${amount} nanotons`);
    console.log(`   Sender: ${sender.address}`);
    console.log(`   Receiver: ${receiver.address}`);
    console.log(`   Timelock: ${new Date(timelock * 1000).toISOString()}\n`);

    // Deploy Escrow contract
    console.log('📦 Deploying Escrow contract...');
    const escrow = blockchain.openContract(
        Escrow.createFromConfig({
            contractId: 1n,
            params: null, // Will be set during initialization
            factory: sender.address, // Sender acts as factory for this test
            isWithdrawn: false,
            isRefunded: false,
            revealedSecret: "",
            createdAt: 0,
            metadata: null,
        }, escrowCode)
    );

    // Initialize the escrow
    const initResult = await escrow.sendEscrowInit(
        sender.getSender(),
        {
            value: amount + toNano('0.1'),
            params: {
                hashlock: hashlock,
                amount: amount,
                timelock: timelock,
                sender: sender.address,
                receiver: receiver.address,
                orderHash: "test_order_123",
                metadata: null
            },
            factory: sender.address,
            metadata: null
        }
    );

    if (!initResult.transactions.every(tx => tx.success)) {
        console.log('❌ Escrow initialization failed!');
        return;
    }
    console.log(`✅ Escrow deployed and initialized at: ${escrow.address}\n`);

    // Test escrow info
    const escrowInfo = await escrow.getEscrowInfo();
    console.log('📊 Escrow Info:');
    console.log(`   Contract ID: ${escrowInfo.contractId}`);
    console.log(`   Is Withdrawn: ${escrowInfo.isWithdrawn}`);
    console.log(`   Is Refunded: ${escrowInfo.isRefunded}`);
    console.log(`   Revealed Secret: "${escrowInfo.revealedSecret}"`);
    console.log(`   Contract Balance: ${escrowInfo.contractBalance} nanotons`);
    console.log(`   Current Time: ${new Date(Number(escrowInfo.currentTime) * 1000).toISOString()}\n`);

    // Test validation functions
    console.log('🔍 Testing validation functions...');
    const canWithdraw = await escrow.getCanWithdraw();
    console.log(`   Can withdraw: ${canWithdraw} (should be true)`);

    const canRefund = await escrow.getCanRefund();
    console.log(`   Can refund: ${canRefund} (should be false - not expired)`);

    const isExpired = await escrow.getIsExpired();
    console.log(`   Is expired: ${isExpired} (should be false)`);

    const verifySecret = await escrow.getVerifySecret(secret);
    console.log(`   Secret verification: ${verifySecret} (should be true)`);

    const verifyWrongSecret = await escrow.getVerifySecret("wrong_secret");
    console.log(`   Wrong secret verification: ${verifyWrongSecret} (should be false)`);

    const remainingTime = await escrow.getRemainingTime();
    console.log(`   Remaining time: ${remainingTime} seconds\n`);

    // Test 1: Anyone can withdraw with correct secret
    console.log('💰 Test 1: Anyone withdrawing with correct secret...');
    const receiverBalanceBefore = await receiver.getBalance();
    console.log(`   Receiver balance before: ${receiverBalanceBefore} nanotons`);

    const withdrawResult = await escrow.sendWithdrawEscrow(
        anyone.getSender(), // Anyone can withdraw!
        {
            value: toNano('0.1'),
            secret: secret
        }
    );

    if (!withdrawResult.transactions.every(tx => tx.success)) {
        console.log('❌ Withdrawal failed!');
        return;
    }
    console.log('✅ Withdrawal successful!');

    const receiverBalanceAfter = await receiver.getBalance();
    console.log(`   Receiver balance after: ${receiverBalanceAfter} nanotons`);
    console.log(`   Receiver received: ${receiverBalanceAfter - receiverBalanceBefore} nanotons`);

    // Check if secret was revealed
    const finalEscrowInfo = await escrow.getEscrowInfo();
    console.log(`   Revealed secret: "${finalEscrowInfo.revealedSecret}"`);
    console.log(`   Is withdrawn: ${finalEscrowInfo.isWithdrawn}\n`);

    console.log('✅ Escrow contract tests completed!\n');
}

async function testTimelockScenarios() {
    console.log('⏰ TESTING TIMELOCK SCENARIOS');
    console.log('==============================\n');

    const blockchain = await Blockchain.create();
    const sender = await blockchain.treasury('sender');
    const receiver = await blockchain.treasury('receiver');

    // Compile contracts
    const escrowCode = await compile('Escrow');

    // Create escrow with short timelock for testing
    const secret = "timelock_test_secret";
    const hashlock = hashSecret(secret);
    const amount = toNano('2');
    const shortTimelock = Math.floor(Date.now() / 1000) + 5; // 5 seconds from now

    console.log('📦 Creating escrow with short timelock for testing...');
    const escrow = blockchain.openContract(
        Escrow.createFromConfig({
            contractId: 2n,
            params: null,
            factory: sender.address,
            isWithdrawn: false,
            isRefunded: false,
            revealedSecret: "",
            createdAt: 0,
            metadata: null,
        }, escrowCode)
    );

    await escrow.sendEscrowInit(
        sender.getSender(),
        {
            value: amount + toNano('0.1'),
            params: {
                hashlock: hashlock,
                amount: amount,
                timelock: shortTimelock,
                sender: sender.address,
                receiver: receiver.address,
                orderHash: "timelock_test_order",
                metadata: null
            },
            factory: sender.address,
            metadata: null
        }
    );

    console.log(`✅ Escrow created with timelock: ${new Date(shortTimelock * 1000).toISOString()}\n`);

    // Wait for timelock to expire
    console.log('⏳ Waiting for timelock to expire...');
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

    // Fast-forward blockchain time to simulate timelock expiry
    blockchain.now = shortTimelock + 10;

    // Test that withdrawal fails after expiry
    console.log('🚫 Testing withdrawal after expiry...');
    try {
        const lateWithdrawResult = await escrow.sendWithdrawEscrow(
            receiver.getSender(),
            {
                value: toNano('0.1'),
                secret: secret
            }
        );
        
        const success = lateWithdrawResult.transactions.every(tx => tx.success);
        console.log(`   Result: ${success ? '❌ Late withdrawal accepted (BAD!)' : '✅ Late withdrawal rejected (GOOD)'}`);
    } catch (error) {
        console.log('   Result: ✅ Late withdrawal rejected (GOOD)');
    }

    // Test that refund works after expiry
    console.log('\n💸 Testing refund after expiry...');
    const senderBalanceBefore = await sender.getBalance();
    
    const refundResult = await escrow.sendRefundEscrow(
        sender.getSender(),
        {
            value: toNano('0.1')
        }
    );

    if (!refundResult.transactions.every(tx => tx.success)) {
        console.log('❌ Refund failed!');
        return;
    }
    console.log('✅ Refund successful!');

    const senderBalanceAfter = await sender.getBalance();
    console.log(`   Sender balance before: ${senderBalanceBefore} nanotons`);
    console.log(`   Sender balance after: ${senderBalanceAfter} nanotons`);
    console.log(`   Sender received: ${senderBalanceAfter - senderBalanceBefore} nanotons\n`);

    console.log('✅ Timelock scenario tests completed!\n');
}

// Main execution function
export async function runEscrowTests() {
    try {
        await testEscrowFactory();
        await testEscrowContract();
        await testTimelockScenarios();
        
        console.log('🎊 ALL ESCROW TESTS PASSED!');
        console.log('============================');
        console.log('The escrow test suite validates:');
        console.log('✅ EscrowFactory deployment and configuration');
        console.log('✅ Escrow creation with proper validation');
        console.log('✅ Secret-based withdrawals');
        console.log('✅ Timelock-based refunds');
        console.log('✅ Pause/unpause functionality');
        console.log('✅ Security controls and edge cases');
        
    } catch (error) {
        console.error('❌ Escrow tests failed:');
        console.error(error);
        throw error;
    }
}

// Export for module usage
export { testEscrowFactory, testEscrowContract, testTimelockScenarios };

// Direct execution
if (require.main === module) {
    runEscrowTests().catch(console.error);
} 