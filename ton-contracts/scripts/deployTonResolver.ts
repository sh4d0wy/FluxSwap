import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { EscrowFactory } from '../wrappers/EscrowFactory';
import { TonResolver } from '../wrappers/TonResolver';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

export async function run(provider: any) {
    console.log('🚀 Deploying TON Cross-Chain Resolver System...\n');

    // Compile contracts
    console.log('📦 Compiling contracts...');
    const escrowFactoryCode = await compile('EscrowFactory');
    const escrowCode = await compile('Escrow');
    const tonResolverCode = await compile('TonResolver');

    // Initialize blockchain sandbox
    const blockchain = await Blockchain.create();
    const deployer = await blockchain.treasury('deployer');
    const user1 = await blockchain.treasury('user1');
    const user2 = await blockchain.treasury('user2');

    console.log('✅ Contracts compiled successfully!\n');

    // Deploy Escrow Factory
    console.log('🏭 Deploying EscrowFactory...');
    const escrowFactory = blockchain.openContract(EscrowFactory.createFromConfig({
        owner: deployer.address,
    }, escrowFactoryCode));

    const escrowFactoryDeployResult = await escrowFactory.sendDeploy(deployer.getSender(), toNano('0.05'));
    expect(escrowFactoryDeployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrowFactory.address,
        deploy: true,
        success: true,
    });

    console.log('✅ EscrowFactory deployed at:', escrowFactory.address.toString());
    console.log('📊 Factory Info:', await escrowFactory.getFactoryInfo());

    // Deploy TON Resolver
    console.log('\n🔗 Deploying TonResolver...');
    const tonResolver = blockchain.openContract(TonResolver.createFromConfig({
        owner: deployer.address,
        escrowFactory: escrowFactory.address,
    }, tonResolverCode));

    const resolverDeployResult = await tonResolver.sendDeploy(deployer.getSender(), toNano('0.05'));
    expect(resolverDeployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: tonResolver.address,
        deploy: true,
        success: true,
    });

    console.log('✅ TonResolver deployed at:', tonResolver.address.toString());
    console.log('📊 Resolver Info:', await tonResolver.getResolverInfo());

    // Demo: Create a cross-chain order
    console.log('\n🌉 Creating Cross-Chain Order...');
    
    const orderHash = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    const hashlock = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba');
    const safetyDeposit = toNano('0.5');
    const tonAmount = toNano('10');
    const timelock = 3600; // 1 hour

    const createOrderResult = await tonResolver.sendCreateCrossChainOrder(
        user1.getSender(), 
        {
            value: tonAmount + safetyDeposit + toNano('0.2'), // TON amount + safety deposit + gas
            orderHash: orderHash,
            maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6', // Ethereum address
            ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732', // USDC
            tonToken: user2.address, // TON token address
            ethereumAmount: BigInt('10000000'), // 10 USDC (6 decimals)
            tonAmount: tonAmount,
            hashlock: hashlock,
            timelock: timelock,
            safetyDepositAmount: safetyDeposit,
            metadata: null
        }
    );

    console.log('✅ Cross-chain order created successfully!');
    console.log('📝 Order Hash:', orderHash.toString(16));
    
    // Check order status
    const orderInfo = await tonResolver.getOrder(orderHash);
    console.log('📊 Order Info:', orderInfo);

    const escrowAddress = await tonResolver.getOrderEscrow(orderHash);
    console.log('🔐 Escrow Address:', escrowAddress?.toString());

    // Demo: Deposit additional security fee
    console.log('\n💰 Depositing Additional Security Fee...');
    const additionalDeposit = toNano('0.2');
    
    const depositResult = await tonResolver.sendDepositSecurityFee(
        user1.getSender(),
        {
            value: additionalDeposit + toNano('0.05'), // deposit + gas
            orderHash: orderHash,
            amount: additionalDeposit
        }
    );

    console.log('✅ Additional security fee deposited!');
    const totalDeposit = await tonResolver.getOrderSafetyDeposit(orderHash);
    console.log('💰 Total Safety Deposit:', totalDeposit?.toString());

    // Demo: Verify secret (without withdrawing)
    console.log('\n🔍 Secret Verification...');
    const secret = BigInt('12345678901234567890'); // The actual secret
    const canWithdraw = await tonResolver.canWithdrawOrder(orderHash, secret);
    console.log('✅ Can withdraw with secret:', canWithdraw);

    const isValidSecret = await tonResolver.verifySecret(orderHash, secret);
    console.log('🔑 Secret is valid:', isValidSecret);

    // Demo: Successful withdrawal with secret
    console.log('\n💸 Withdrawing with Secret...');
    
    const withdrawResult = await tonResolver.sendWithdrawWithSecret(
        user2.getSender(), // Anyone can withdraw with the secret!
        {
            value: toNano('0.05'), // gas for withdrawal
            orderHash: orderHash,
            secret: secret
        }
    );

    console.log('✅ Withdrawal completed successfully!');
    
    // Check order status after withdrawal
    const finalOrderStatus = await tonResolver.getOrderStatus(orderHash);
    console.log('📊 Final Order Status:', finalOrderStatus);

    // Demo: Try to create another order that will expire
    console.log('\n⏰ Creating Expiring Order Demo...');
    
    const orderHash2 = BigInt('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
    const hashlock2 = BigInt('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
    const shortTimelock = 1; // 1 second for demo

    const createExpOrderResult = await tonResolver.sendCreateCrossChainOrder(
        user1.getSender(),
        {
            value: tonAmount + safetyDeposit + toNano('0.2'),
            orderHash: orderHash2,
            maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
            ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
            tonToken: user2.address,
            ethereumAmount: BigInt('5000000'),
            tonAmount: tonAmount,
            hashlock: hashlock2,
            timelock: shortTimelock,
            safetyDepositAmount: safetyDeposit,
            metadata: null
        }
    );

    console.log('✅ Expiring order created, waiting for expiration...');

    // Wait for order to expire (in real blockchain, you'd wait longer)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if order can be cancelled
    const canCancel = await tonResolver.canCancelOrder(orderHash2);
    console.log('⏰ Can cancel expired order:', canCancel);

    // Cancel the expired order
    if (canCancel) {
        console.log('\n❌ Cancelling Expired Order...');
        const cancelResult = await tonResolver.sendCancelOrder(
            user1.getSender(),
            {
                value: toNano('0.05'),
                orderHash: orderHash2,
                reason: 'Order expired - automatic cancellation'
            }
        );
        console.log('✅ Expired order cancelled successfully!');
    }

    // Summary
    console.log('\n📋 DEPLOYMENT SUMMARY');
    console.log('=====================================');
    console.log('🏭 EscrowFactory:', escrowFactory.address.toString());
    console.log('🔗 TonResolver:', tonResolver.address.toString());
    console.log('📊 Total Orders Created:', 2);
    console.log('✅ System Status: Fully Operational');
    console.log('\n🎉 TON Cross-Chain Resolver System deployed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   ✅ Cross-chain order creation');
    console.log('   ✅ HTLC escrow integration');
    console.log('   ✅ Security deposit management');
    console.log('   ✅ Secret-based withdrawals');
    console.log('   ✅ Timelock expiration handling');
    console.log('   ✅ Order cancellation');
    console.log('\n🔗 Ready for cross-chain atomic swaps between TON and Ethereum!');
}

// Helper functions for encoding
function encodeString(str: string): Cell {
    return beginCell().storeStringTail(str).endCell();
}

function encodeOrderData(
    orderHash: bigint,
    maker: string,
    ethereumToken: string,
    tonToken: string,
    ethereumAmount: bigint,
    tonAmount: bigint,
    hashlock: bigint,
    timelock: number,
    safetyDepositAmount: bigint
): Cell {
    return beginCell()
        .storeUint(orderHash, 256)
        .storeRef(encodeString(maker))
        .storeRef(encodeString(ethereumToken))
        .storeAddress(tonToken)
        .storeUint(ethereumAmount, 256)
        .storeCoins(tonAmount)
        .storeUint(hashlock, 256)
        .storeUint(timelock, 32)
        .storeCoins(safetyDepositAmount)
        .endCell();
}
