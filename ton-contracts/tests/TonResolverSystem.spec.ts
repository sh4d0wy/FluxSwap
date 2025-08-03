import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { EscrowFactory } from '../wrappers/EscrowFactory';
import { Escrow } from '../wrappers/Escrow';
import { TonResolver } from '../wrappers/TonResolver';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TON Cross-Chain Resolver System', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    
    let escrowFactory: SandboxContract<EscrowFactory>;
    let tonResolver: SandboxContract<TonResolver>;
    
    let escrowFactoryCode: Cell;
    let escrowCode: Cell;
    let tonResolverCode: Cell;

    beforeAll(async () => {
        // Compile contracts
        escrowFactoryCode = await compile('EscrowFactory');
        escrowCode = await compile('Escrow');
        tonResolverCode = await compile('TonResolver');
    });

    beforeEach(async () => {
        // Initialize blockchain and accounts
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');

        // Deploy Escrow Factory
        escrowFactory = blockchain.openContract(EscrowFactory.createFromConfig({
            owner: deployer.address,
        }, escrowFactoryCode));

        const escrowFactoryDeployResult = await escrowFactory.sendDeploy(
            deployer.getSender(), 
            toNano('0.05')
        );
        expect(escrowFactoryDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: escrowFactory.address,
            deploy: true,
            success: true,
        });

        // Deploy TON Resolver
        tonResolver = blockchain.openContract(TonResolver.createFromConfig({
            owner: deployer.address,
            escrowFactory: escrowFactory.address,
        }, tonResolverCode));

        const resolverDeployResult = await tonResolver.sendDeploy(
            deployer.getSender(), 
            toNano('0.05')
        );
        expect(resolverDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonResolver.address,
            deploy: true,
            success: true,
        });
    });

    describe('Factory Integration', () => {
        it('should correctly link resolver to escrow factory', async () => {
            const resolverInfo = await tonResolver.getResolverInfo();
            expect(resolverInfo.escrowFactory.toString()).toBe(escrowFactory.address.toString());
            expect(resolverInfo.owner.toString()).toBe(deployer.address.toString());
        });

        it('should have correct initial configuration', async () => {
            const resolverInfo = await tonResolver.getResolverInfo();
            expect(resolverInfo.totalOrders).toBe(0n);
            expect(resolverInfo.isPaused).toBe(false);
            expect(resolverInfo.minSafetyDeposit).toBeGreaterThan(0n);
        });
    });

    describe('Cross-Chain Order Creation', () => {
        const orderHash = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        const hashlock = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba');
        
        it('should create cross-chain order successfully', async () => {
            const safetyDeposit = toNano('0.5');
            const tonAmount = toNano('10');
            const timelock = 3600; // 1 hour

            const result = await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: true,
            });

            // Verify order was created
            const order = await tonResolver.getOrder(orderHash);
            expect(order).toBeDefined();
            expect(order!.orderHash).toBe(orderHash);
            expect(order!.tonAmount).toBe(tonAmount);
            expect(order!.status).toBe(0n); // ORDER_ACTIVE

            // Verify escrow was created
            const escrowAddress = await tonResolver.getOrderEscrow(orderHash);
            expect(escrowAddress).toBeDefined();

            // Verify safety deposit tracking
            const safetyDepositAmount = await tonResolver.getOrderSafetyDeposit(orderHash);
            expect(safetyDepositAmount).toBe(safetyDeposit);
        });

        it('should reject duplicate order hash', async () => {
            const safetyDeposit = toNano('0.5');
            const tonAmount = toNano('10');
            const timelock = 3600;

            // Create first order
            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );

            // Try to create duplicate - should fail
            const duplicateResult = await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.2'),
                    orderHash: orderHash, // Same order hash
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );

            expect(duplicateResult.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject insufficient value', async () => {
            const safetyDeposit = toNano('0.5');
            const tonAmount = toNano('10');
            const timelock = 3600;

            const result = await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: toNano('0.1'), // Insufficient value
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Security Deposit Management', () => {
        const orderHash = BigInt('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
        const hashlock = BigInt('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        beforeEach(async () => {
            // Create initial order
            const safetyDeposit = toNano('0.5');
            const tonAmount = toNano('10');
            const timelock = 3600;

            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );
        });

        it('should allow additional security deposit', async () => {
            const additionalDeposit = toNano('0.3');
            const initialDeposit = await tonResolver.getOrderSafetyDeposit(orderHash);

            const result = await tonResolver.sendDepositSecurityFee(
                user1.getSender(),
                {
                    value: additionalDeposit + toNano('0.05'),
                    orderHash: orderHash,
                    amount: additionalDeposit
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: true,
            });

            const finalDeposit = await tonResolver.getOrderSafetyDeposit(orderHash);
            expect(finalDeposit).toBe(initialDeposit! + additionalDeposit);
        });

        it('should reject deposit from non-taker', async () => {
            const additionalDeposit = toNano('0.3');

            const result = await tonResolver.sendDepositSecurityFee(
                user2.getSender(), // Different user (not taker)
                {
                    value: additionalDeposit + toNano('0.05'),
                    orderHash: orderHash,
                    amount: additionalDeposit
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user2.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Secret-based Withdrawals', () => {
        const orderHash = BigInt('0x2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff');
        const secret = BigInt('12345678901234567890');
        let hashlock: bigint;

        beforeEach(async () => {
            // Generate hashlock from secret (using same hash function as contracts)
            hashlock = secret * BigInt('2654435761') % (BigInt(2) ** BigInt(256) - BigInt(1));

            // Create order with this hashlock
            const safetyDeposit = toNano('0.5');
            const tonAmount = toNano('10');
            const timelock = 3600;

            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );
        });

        it('should verify secret correctly', async () => {
            const isValid = await tonResolver.verifySecret(orderHash, secret);
            expect(isValid).toBe(true);

            const canWithdraw = await tonResolver.canWithdrawOrder(orderHash, secret);
            expect(canWithdraw).toBe(true);
        });

        it('should allow withdrawal with correct secret', async () => {
            const result = await tonResolver.sendWithdrawWithSecret(
                user2.getSender(), // Anyone can withdraw with the secret!
                {
                    value: toNano('0.05'),
                    orderHash: orderHash,
                    secret: secret
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user2.address,
                to: tonResolver.address,
                success: true,
            });

            // Check order status changed to completed
            const orderStatus = await tonResolver.getOrderStatus(orderHash);
            expect(orderStatus).toBe(1n); // ORDER_COMPLETED
        });

        it('should reject withdrawal with wrong secret', async () => {
            const wrongSecret = BigInt('99999999999999999999');

            const result = await tonResolver.sendWithdrawWithSecret(
                user2.getSender(),
                {
                    value: toNano('0.05'),
                    orderHash: orderHash,
                    secret: wrongSecret
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user2.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject withdrawal from expired order', async () => {
            // Create order with very short timelock
            const shortOrderHash = BigInt('0x3333444455556666777788889999000011112222aaaabbbbccccddddeeeeffff');
            const shortTimelock = 1; // 1 second

            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: toNano('10') + toNano('0.5') + toNano('0.2'),
                    orderHash: shortOrderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: toNano('10'),
                    hashlock: hashlock,
                    timelock: shortTimelock,
                    safetyDepositAmount: toNano('0.5'),
                    metadata: null
                }
            );

            // Wait for expiration
            blockchain.now = blockchain.now!! + 2;

            const result = await tonResolver.sendWithdrawWithSecret(
                user2.getSender(),
                {
                    value: toNano('0.05'),
                    orderHash: shortOrderHash,
                    secret: secret
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user2.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Order Cancellation', () => {
        const orderHash = BigInt('0x4444555566667777888899990000111122223333aaaabbbbccccddddeeeeffff');
        const hashlock = BigInt('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

        it('should allow cancellation of expired orders', async () => {
            const shortTimelock = 1; // 1 second for quick expiration

            // Create order with short timelock
            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: toNano('10') + toNano('0.5') + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: toNano('10'),
                    hashlock: hashlock,
                    timelock: shortTimelock,
                    safetyDepositAmount: toNano('0.5'),
                    metadata: null
                }
            );

            // Fast-forward time to expire the order
            blockchain.now = blockchain.now!! + 2;

            // Check can cancel
            const canCancel = await tonResolver.canCancelOrder(orderHash);
            expect(canCancel).toBe(true);

            // Cancel the order
            const result = await tonResolver.sendCancelOrder(
                user1.getSender(),
                {
                    value: toNano('0.05'),
                    orderHash: orderHash,
                    reason: 'Test cancellation'
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: true,
            });

            // Check order status changed
            const orderStatus = await tonResolver.getOrderStatus(orderHash);
            expect(orderStatus).toBe(2n); // ORDER_CANCELLED
        });

        it('should reject cancellation of active orders', async () => {
            const longTimelock = 7200; // 2 hours

            // Create order with long timelock
            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: toNano('10') + toNano('0.5') + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: toNano('10'),
                    hashlock: hashlock,
                    timelock: longTimelock,
                    safetyDepositAmount: toNano('0.5'),
                    metadata: null
                }
            );

            // Try to cancel before expiration
            const result = await tonResolver.sendCancelOrder(
                user1.getSender(),
                {
                    value: toNano('0.05'),
                    orderHash: orderHash,
                    reason: 'Premature cancellation'
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject cancellation from non-taker', async () => {
            const shortTimelock = 1;

            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: toNano('10') + toNano('0.5') + toNano('0.2'),
                    orderHash: orderHash,
                    maker: '0x742d35Cc82966C5C0B0b5D6c0B8b7b2c14c4c5B6',
                    ethereumToken: '0xA0b86991c431E566F0c9e9E0d6F9b1c9e3f56732',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('10000000'),
                    tonAmount: toNano('10'),
                    hashlock: hashlock,
                    timelock: shortTimelock,
                    safetyDepositAmount: toNano('0.5'),
                    metadata: null
                }
            );

            blockchain.now = blockchain.now!! + 2;

            // Try to cancel from different user
            const result = await tonResolver.sendCancelOrder(
                user3.getSender(), // Different user
                {
                    value: toNano('0.05'),
                    orderHash: orderHash,
                    reason: 'Unauthorized cancellation'
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user3.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Emergency Controls', () => {
        it('should allow owner to pause/unpause resolver', async () => {
            // Pause
            const pauseResult = await tonResolver.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                'pause'
            );

            expect(pauseResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Unpause
            const unpauseResult = await tonResolver.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                'unpause'
            );

            expect(unpauseResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });
        });

        it('should reject pause from non-owner', async () => {
            const result = await tonResolver.send(
                user1.getSender(),
                { value: toNano('0.05') },
                'pause'
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete cross-chain swap lifecycle', async () => {
            const orderHash = BigInt('0x5555666677778888999900001111222233334444aaaabbbbccccddddeeeeffff');
            const secret = BigInt('9876543210987654321');
            const hashlock = secret * BigInt('2654435761') % (BigInt(2) ** BigInt(256) - BigInt(1));
            
            const safetyDeposit = toNano('1');
            const tonAmount = toNano('50');
            const timelock = 7200; // 2 hours

            // 1. Create cross-chain order
            console.log('Creating cross-chain order...');
            await tonResolver.sendCreateCrossChainOrder(
                user1.getSender(),
                {
                    value: tonAmount + safetyDeposit + toNano('0.3'),
                    orderHash: orderHash,
                    maker: '0xEthereumMakerAddress1234567890123456789012',
                    ethereumToken: '0xUSDCTokenAddress1234567890123456789012345',
                    tonToken: user2.address,
                    ethereumAmount: BigInt('50000000'), // 50 USDC
                    tonAmount: tonAmount,
                    hashlock: hashlock,
                    timelock: timelock,
                    safetyDepositAmount: safetyDeposit,
                    metadata: null
                }
            );

            // 2. Verify order exists and is active
            const order = await tonResolver.getOrder(orderHash);
            expect(order!.status).toBe(0n); // ORDER_ACTIVE

            // 3. Add additional security deposit
            console.log('Adding additional security deposit...');
            await tonResolver.sendDepositSecurityFee(
                user1.getSender(),
                {
                    value: toNano('0.5') + toNano('0.05'),
                    orderHash: orderHash,
                    amount: toNano('0.5')
                }
            );

            // 4. Verify total deposit
            const totalDeposit = await tonResolver.getOrderSafetyDeposit(orderHash);
            expect(totalDeposit).toBe(safetyDeposit + toNano('0.5'));

            // 5. Verify secret and withdrawal capability
            const canWithdraw = await tonResolver.canWithdrawOrder(orderHash, secret);
            expect(canWithdraw).toBe(true);

            // 6. Execute withdrawal with secret
            console.log('Executing withdrawal with secret...');
            await tonResolver.sendWithdrawWithSecret(
                user3.getSender(), // Anyone can withdraw with the secret!
                {
                    value: toNano('0.1'),
                    orderHash: orderHash,
                    secret: secret
                }
            );

            // 7. Verify order completed
            const finalStatus = await tonResolver.getOrderStatus(orderHash);
            expect(finalStatus).toBe(1n); // ORDER_COMPLETED

            // 8. Verify resolver stats updated
            const resolverInfo = await tonResolver.getResolverInfo();
            expect(resolverInfo.totalOrders).toBeGreaterThan(0n);

            console.log('✅ Complete cross-chain swap lifecycle test passed!');
        });
    });
}); 