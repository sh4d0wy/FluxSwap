import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { TonEscrow } from '../wrappers/TonEscrow';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TonEscrow', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TonEscrow');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let tonEscrow: SandboxContract<TonEscrow>;

    const TEST_AMOUNT = toNano('1');
    const TEST_SECRET = "mysecret123";
    const TEST_SECRET_HASH = BigInt('0x' + require('crypto').createHash('sha256').update(TEST_SECRET).digest('hex'));
    const TEST_HASHLOCK = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    const TEST_ESCROW_ID = 1n;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        deployer = await blockchain.treasury('deployer');
        owner = await blockchain.treasury('owner');
        recipient = await blockchain.treasury('recipient');

        const timelock = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now

        tonEscrow = blockchain.openContract(
            await TonEscrow.fromInit(
                
                    owner.address,
                    recipient.address,
                    TEST_AMOUNT,
                    TEST_SECRET_HASH,
                    BigInt(timelock),
                    TEST_ESCROW_ID,
                
            )
        );

        const deployResult = await tonEscrow.send(deployer.getSender(), {value: toNano('0.05')}, {
            $$type: 'Deploy',
            queryId: 1n,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonEscrow.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy successfully', async () => {
        const escrowInfo = await tonEscrow.getGetEscrowInfo();
        expect(escrowInfo.owner).toEqualAddress(owner.address);
        expect(escrowInfo.recipient).toEqualAddress(recipient.address);
        expect(escrowInfo.amount).toBe(TEST_AMOUNT);
        expect(escrowInfo.hashlock).toBe(TEST_SECRET_HASH);
        expect(escrowInfo.status).toBe(0n); // PENDING
        expect(escrowInfo.escrowId).toBe(TEST_ESCROW_ID);
    });

    it('should return correct status checks', async () => {
        expect(await tonEscrow.getCanFulfill()).toBe(true);
        expect(await tonEscrow.getCanRefund()).toBe(false);
        expect(await tonEscrow.getIsExpired()).toBe(false);
    });

    it('should fulfill escrow with correct secret', async () => {
        const fulfillResult = await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'FulfillEscrow',
            secret: TEST_SECRET,
        });

        expect(fulfillResult.transactions).toHaveTransaction({
            from: recipient.address,
            to: tonEscrow.address,
            success: true,
        });

        // Check escrow is fulfilled
        const status = await tonEscrow.getGetStatus();
        expect(status).toBe(1n); // FULFILLED

        const secret = await tonEscrow.getGetSecret();
        expect(secret).toBe(TEST_SECRET);
    });

    it('should reject fulfillment with wrong secret', async () => {
        const wrongSecret = BigInt('0x123456');
        
        const fulfillResult = await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'FulfillEscrow',
            secret: wrongSecret.toString(),
        });

        expect(fulfillResult.transactions).toHaveTransaction({
            from: recipient.address,
            to: tonEscrow.address,
            success: false,
        });

        // Status should still be pending
        const status = await tonEscrow.getGetStatus();
        expect(status).toBe(0n); // PENDING
    });

    it('should allow refund after timelock expires', async () => {
        // Fast forward time past timelock
        blockchain.now = Math.floor(Date.now() / 1000) + 8000; // Beyond timelock

        expect(await tonEscrow.getIsExpired()).toBe(true);
        expect(await tonEscrow.getCanRefund()).toBe(true);

        const refundResult = await tonEscrow.send(owner.getSender(), {value: toNano('0.05')}, {
            $$type: 'RefundEscrow',
        });

        expect(refundResult.transactions).toHaveTransaction({
            from: owner.address,
            to: tonEscrow.address,
            success: true,
        });

        // Check escrow is refunded
        const status = await tonEscrow.getGetStatus();
        expect(status).toBe(2n); // REFUNDED
    });

    it('should reject refund before timelock expires', async () => {
        const refundResult = await tonEscrow.send(owner.getSender(), {value: toNano('0.05')}, {
            $$type: 'RefundEscrow',
        });

        expect(refundResult.transactions).toHaveTransaction({
            from: owner.address,
            to: tonEscrow.address,
            success: false,
        });

        // Status should still be pending
        const status = await tonEscrow.getGetStatus();
        expect(status).toBe(0n); // PENDING
    });

    it('should reject refund from non-owner', async () => {
        // Fast forward time past timelock
        blockchain.now = Math.floor(Date.now() / 1000) + 8000;

        const refundResult = await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'RefundEscrow',
        });

        expect(refundResult.transactions).toHaveTransaction({
            from: recipient.address,
            to: tonEscrow.address,
            success: false,
        });
    });

    it('should reject fulfillment after timelock expires', async () => {
        // Fast forward time past timelock
        blockchain.now = Math.floor(Date.now() / 1000) + 8000;

        const fulfillResult = await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'FulfillEscrow',
            secret: TEST_SECRET,
        });

        expect(fulfillResult.transactions).toHaveTransaction({
            from: recipient.address,
            to: tonEscrow.address,
            success: false,
        });
    });

    it('should reject operations on already fulfilled escrow', async () => {
        // First fulfill the escrow
        await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'FulfillEscrow',
            secret: TEST_SECRET,
        });

        // Try to fulfill again
            const secondFulfillResult = await tonEscrow.send(recipient.getSender(), {value: toNano('0.05')}, {
            $$type: 'FulfillEscrow',
            secret: TEST_SECRET,
        });

        expect(secondFulfillResult.transactions).toHaveTransaction({
            from: recipient.address,
            to: tonEscrow.address,
            success: false,
        });

        // Try to refund
        blockchain.now = Math.floor(Date.now() / 1000) + 8000;
        
        const refundResult = await tonEscrow.send(owner.getSender(), {value: toNano('0.05')}, {
            $$type: 'RefundEscrow',
        });

        expect(refundResult.transactions).toHaveTransaction({
            from: owner.address,
            to: tonEscrow.address,
            success: false,
        });
    });
}); 