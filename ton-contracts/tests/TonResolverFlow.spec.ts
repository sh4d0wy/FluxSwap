import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { TonResolver } from '../build/TonResolver/TonResolver_TonResolver';
import { EscrowFactory } from '../build/EscrowFactory/EscrowFactory_EscrowFactory';
import { Escrow } from '../build/Escrow/Escrow_Escrow';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TON Cross-Chain Resolver Flow Tests', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>; // Acts as resolver
    let user: SandboxContract<TreasuryContract>; // TON recipient
    let ethereumUser: SandboxContract<TreasuryContract>; // Mock Ethereum user
    
    let escrowFactory: SandboxContract<EscrowFactory>;
    let tonResolver: SandboxContract<TonResolver>;
    
    let escrowFactoryCode: Cell;
    let escrowCode: Cell;
    let tonResolverCode: Cell;

    // Test order parameters
    const TEST_ORDER_HASH = BigInt("0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0");
    const TEST_ETHEREUM_TOKEN = "0x1234567890123456789012345678901234567890";
    const TEST_SECRET = BigInt("42069420");
    const TEST_HASHLOCK = BigInt("12345678901234567890"); // In production, this would be keccak256(secret)
    const TEST_ETHEREUM_AMOUNT = BigInt("1000000000000000000"); // 1 ETH in wei
    const TEST_TON_AMOUNT = toNano('10'); // 10 TON
    const TEST_SAFETY_DEPOSIT = toNano('1'); // 1 TON security deposit
    const TEST_TIMELOCK = 3600; // 1 hour

    beforeAll(async () => {
        // Compile contracts
        escrowFactoryCode = await compile('EscrowFactory');
        escrowCode = await compile('Escrow');
        tonResolverCode = await compile('TonResolver');
    });

    beforeEach(async () => {
        // Initialize blockchain and accounts
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer'); // Resolver
        user = await blockchain.treasury('user'); // TON recipient
        ethereumUser = await blockchain.treasury('ethereumUser'); // Mock Ethereum user

        // Deploy Escrow Factory
        escrowFactory = blockchain.openContract(
            EscrowFactory.createFromConfig({
                owner: deployer.address,
                escrowCode: escrowCode,
                nextId: 0n,
            }, escrowFactoryCode)
        );

        const escrowFactoryDeployResult = await escrowFactory.sendDeploy(
            deployer.getSender(), 
            toNano('0.1')
        );

        expect(escrowFactoryDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: escrowFactory.address,
            deploy: true,
            success: true,
        });

        // Deploy TON Resolver
        tonResolver = blockchain.openContract(
            TonResolver.createFromConfig({
                owner: deployer.address,
                escrowFactory: escrowFactory.address,
                totalOrders: 0n,
                isPaused: false,
                minSafetyDeposit: toNano('0.1'),
                maxOrderTimelock: 86400, // 24 hours
                minOrderTimelock: 3600,  // 1 hour
                orders: Dictionary.empty(),
                orderToEscrow: Dictionary.empty(),
                safetyDeposits: Dictionary.empty(),
                emergencyDelay: 86400, // 24 hours
                lastEmergencyAction: 0,
            }, tonResolverCode)
        );

        const resolverDeployResult = await tonResolver.sendDeploy(
            deployer.getSender(),
            toNano('0.1')
        );

        expect(resolverDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonResolver.address,
            deploy: true,
            success: true,
        });
    });

    describe('Cross-Chain Order Creation', () => {
        it('should allow resolver to create a cross-chain order', async () => {
            // Mock: Resolver creates order after catching relayer event from Ethereum
            const createOrderResult = await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'), // Tokens + deposit + gas
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(), // Ethereum user address (as string in production)
                    tonRecipient: user.address, // TON user who will receive tokens
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address, // Mock TON token address
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            expect(createOrderResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Check that order was created
            const orderInfo = await tonResolver.getGetOrder(TEST_ORDER_HASH);
            expect(orderInfo).toBeDefined();
            expect(orderInfo!.orderHash).toBe(TEST_ORDER_HASH);
            expect(orderInfo!.tonAmount).toBe(TEST_TON_AMOUNT);
            expect(orderInfo!.status).toBe(0n); // ORDER_ACTIVE

            // Check resolver info updated
            const resolverInfo = await tonResolver.getResolverInfo();
            expect(resolverInfo.totalOrders).toBe(1n);
        });

        it('should reject order creation from non-resolver', async () => {
            // Non-resolver tries to create order
            const createOrderResult = await tonResolver.sendCreateCrossChainOrder(
                user.getSender(), // Not the resolver
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            expect(createOrderResult.transactions).toHaveTransaction({
                from: user.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject duplicate order hash', async () => {
            // Create first order
            await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            // Try to create duplicate
            const duplicateResult = await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH, // Same hash
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            expect(duplicateResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Order Withdrawal Flow', () => {
        beforeEach(async () => {
            // Create an order first
            await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );
        });

        it('should allow resolver to withdraw with correct secret', async () => {
            // Mock: Relayer provides secret to resolver, resolver unlocks TON side
            const withdrawResult = await tonResolver.sendWithdrawWithSecret(
                deployer.getSender(),
                {
                    value: toNano('0.1'), // Gas for withdrawal
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    secret: TEST_SECRET,
                }
            );

            expect(withdrawResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Check order status updated
            const orderInfo = await tonResolver.getGetOrder(TEST_ORDER_HASH);
            expect(orderInfo!.status).toBe(1n); // ORDER_COMPLETED
        });

        it('should reject withdrawal from non-resolver', async () => {
            const withdrawResult = await tonResolver.sendWithdrawWithSecret(
                user.getSender(), // Not the resolver
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    secret: TEST_SECRET,
                }
            );

            expect(withdrawResult.transactions).toHaveTransaction({
                from: user.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject withdrawal with incorrect secret', async () => {
            const wrongSecret = BigInt("999999");
            
            const withdrawResult = await tonResolver.sendWithdrawWithSecret(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    secret: wrongSecret,
                }
            );

            expect(withdrawResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject withdrawal for non-existent order', async () => {
            const nonExistentOrderHash = BigInt("0x999999999999999999999999999999999999999999999999999999999999999");
            
            const withdrawResult = await tonResolver.sendWithdrawWithSecret(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: nonExistentOrderHash,
                    secret: TEST_SECRET,
                }
            );

            expect(withdrawResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Order Cancellation Flow', () => {
        beforeEach(async () => {
            // Create an order first
            await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );
        });

        it('should allow resolver to cancel expired order', async () => {
            // Fast-forward time past the timelock
            blockchain.now = Math.floor(Date.now() / 1000) + TEST_TIMELOCK + 1;

            const cancelResult = await tonResolver.sendCancelOrder(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    reason: "Order expired",
                }
            );

            expect(cancelResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Check order status updated
            const orderInfo = await tonResolver.getGetOrder(TEST_ORDER_HASH);
            expect(orderInfo!.status).toBe(2n); // ORDER_CANCELLED
        });

        it('should reject cancellation of non-expired order', async () => {
            // Try to cancel before expiration
            const cancelResult = await tonResolver.sendCancelOrder(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    reason: "Test cancellation",
                }
            );

            expect(cancelResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: false,
            });
        });

        it('should reject cancellation from non-resolver', async () => {
            // Fast-forward time past the timelock
            blockchain.now = Math.floor(Date.now() / 1000) + TEST_TIMELOCK + 1;

            const cancelResult = await tonResolver.sendCancelOrder(
                user.getSender(), // Not the resolver
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    reason: "Order expired",
                }
            );

            expect(cancelResult.transactions).toHaveTransaction({
                from: user.address,
                to: tonResolver.address,
                success: false,
            });
        });
    });

    describe('Security and Validation Tests', () => {
        it('should verify secret correctly', async () => {
            // Create order first
            await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            const canWithdraw = await tonResolver.getCanWithdrawOrder(TEST_ORDER_HASH, TEST_SECRET);
            expect(canWithdraw).toBe(true);

            const cannotWithdrawWrong = await tonResolver.getCanWithdrawOrder(TEST_ORDER_HASH, BigInt("999"));
            expect(cannotWithdrawWrong).toBe(false);
        });

        it('should check order cancellation eligibility', async () => {
            // Create order first
            await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            // Before expiration
            const canCancelBefore = await tonResolver.getCanCancelOrder(TEST_ORDER_HASH);
            expect(canCancelBefore).toBe(false);

            // After expiration
            blockchain.now = Math.floor(Date.now() / 1000) + TEST_TIMELOCK + 1;
            const canCancelAfter = await tonResolver.getCanCancelOrder(TEST_ORDER_HASH);
            expect(canCancelAfter).toBe(true);
        });

        it('should allow resolver to pause and unpause', async () => {
            // Pause the resolver
            const pauseResult = await tonResolver.sendPause(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                    queryId: 0n,
                }
            );

            expect(pauseResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Try to create order while paused (should fail)
            const createOrderResult = await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            expect(createOrderResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: false,
            });

            // Unpause
            const unpauseResult = await tonResolver.sendUnpause(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                    queryId: 0n,
                }
            );

            expect(unpauseResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });
        });
    });

    describe('Complete Flow Integration Test', () => {
        it('should execute complete cross-chain order flow', async () => {
            console.log('🚀 Starting complete cross-chain order flow test...');

            // Step 1: Resolver creates order (after catching Ethereum event)
            console.log('📝 Step 1: Creating cross-chain order...');
            const createResult = await tonResolver.sendCreateCrossChainOrder(
                deployer.getSender(),
                {
                    value: TEST_TON_AMOUNT + TEST_SAFETY_DEPOSIT + toNano('0.2'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    maker: ethereumUser.address.toString(),
                    tonRecipient: user.address,
                    ethereumToken: TEST_ETHEREUM_TOKEN,
                    tonToken: user.address,
                    ethereumAmount: TEST_ETHEREUM_AMOUNT,
                    tonAmount: TEST_TON_AMOUNT,
                    hashlock: TEST_HASHLOCK,
                    timelock: TEST_TIMELOCK,
                    safetyDepositAmount: TEST_SAFETY_DEPOSIT,
                    metadata: null,
                }
            );

            expect(createResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Step 2: Verify order exists and is active
            console.log('✅ Step 2: Verifying order creation...');
            const orderInfo = await tonResolver.getGetOrder(TEST_ORDER_HASH);
            expect(orderInfo).toBeDefined();
            expect(orderInfo!.status).toBe(0n); // ORDER_ACTIVE

            // Step 3: Mock relayer providing secret to resolver
            console.log('🔐 Step 3: Resolver withdrawing with secret...');
            const withdrawResult = await tonResolver.sendWithdrawWithSecret(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                    queryId: 0n,
                },
                {
                    orderHash: TEST_ORDER_HASH,
                    secret: TEST_SECRET,
                }
            );

            expect(withdrawResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: tonResolver.address,
                success: true,
            });

            // Step 4: Verify order completion
            console.log('🎉 Step 4: Verifying order completion...');
            const completedOrderInfo = await tonResolver.getGetOrder(TEST_ORDER_HASH);
            expect(completedOrderInfo!.status).toBe(1n); // ORDER_COMPLETED

            console.log('✨ Complete flow test passed! Cross-chain order successfully executed.');
        });
    });
}); 