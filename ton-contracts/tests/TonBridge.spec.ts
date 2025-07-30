import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { TonBridge } from '../wrappers/TonBridge';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TonBridge', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TonBridge');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let relayer1: SandboxContract<TreasuryContract>;
    let relayer2: SandboxContract<TreasuryContract>;
    let relayer3: SandboxContract<TreasuryContract>;
    let tonBridge: SandboxContract<TonBridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');
        relayer1 = await blockchain.treasury('relayer1');
        relayer2 = await blockchain.treasury('relayer2');
        relayer3 = await blockchain.treasury('relayer3');

        tonBridge = blockchain.openContract(
            await TonBridge.fromInit(admin.address)
        );

        const deployResult = await tonBridge.send(deployer.getSender(), {value: toNano('0.05')}, {
            $$type: 'Deploy',
            queryId: 1n,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonBridge.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy successfully', async () => {
        const bridgeInfo = await tonBridge.getGetBridgeInfo();
        expect(bridgeInfo.admin).toEqualAddress(admin.address);
        expect(bridgeInfo.relayerCount).toBe(0n);
        expect(bridgeInfo.requiredConfirmations).toBe(2n);
    });

    it('should allow admin to add relayers', async () => {
        // Add first relayer
        const addResult1 = await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer1.address,
        });

        expect(addResult1.transactions).toHaveTransaction({
            from: admin.address,
            to: tonBridge.address,
            success: true,
        });

        expect(await tonBridge.getIsRelayer(relayer1.address)).toBe(true);
        expect(await tonBridge.getGetRelayerCount()).toBe(1n);

        // Add second relayer
        const addResult2 = await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer2.address,
        });

        expect(addResult2.transactions).toHaveTransaction({
            from: admin.address,
            to: tonBridge.address,
            success: true,
        });

        expect(await tonBridge.getIsRelayer(relayer2.address)).toBe(true);
        expect(await tonBridge.getGetRelayerCount()).toBe(2n);
    });

    it('should reject non-admin adding relayers', async () => {
        const addResult = await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer2.address,
        });

        expect(addResult.transactions).toHaveTransaction({
            from: relayer1.address,
            to: tonBridge.address,
            success: false,
        });

        expect(await tonBridge.getIsRelayer(relayer2.address)).toBe(false);
    });

    it('should allow admin to remove relayers', async () => {
        // First add a relayer
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer1.address,
        });
        expect(await tonBridge.getIsRelayer(relayer1.address)).toBe(true);

        // Then remove it
        const removeResult = await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'RemoveRelayer',
            relayer: relayer1.address,
        });

        expect(removeResult.transactions).toHaveTransaction({
            from: admin.address,
            to: tonBridge.address,
            success: true,
        });

        expect(await tonBridge.getIsRelayer(relayer1.address)).toBe(false);
        expect(await tonBridge.getGetRelayerCount()).toBe(0n);
    });

    it('should handle message relay with required confirmations', async () => {
        // Add relayers
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer1.address,
        });
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer2.address,
        });

        const messageId = 12345n;
        const sourceChain = 'ethereum';
        const sourceAddress = '0x1234567890123456789012345678901234567890';
        const amount = toNano('10');
        const hashlock = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        const timelock = BigInt(Math.floor(Date.now() / 1000) + 7200);

        // First relayer confirms message
        const relay1Result = await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
                messageId,
                sourceChain,
                sourceAddress,
                destAddress: deployer.address,
                amount,
                hashlock,
                timelock,
                proof: new Cell(),
            }
        );

        expect(relay1Result.transactions).toHaveTransaction({
            from: relayer1.address,
            to: tonBridge.address,
            success: true,
        });     

        // Message should not be processed yet (need 2 confirmations)
        expect(await tonBridge.getIsMessageProcessed(messageId)).toBe(false);
        expect(await tonBridge.getGetMessageConfirmations(messageId)).toBe(1n);

        // Second relayer confirms message
        const relay2Result = await tonBridge.send(relayer2.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
                messageId,
                sourceChain,
                sourceAddress,
                destAddress: deployer.address,
                amount,
                hashlock,
                timelock,
                proof: new Cell(),
            }
        );

        expect(relay2Result.transactions).toHaveTransaction({
            from: relayer2.address,
            to: tonBridge.address,
            success: true,
        });

        // Message should now be processed
        expect(await tonBridge.getIsMessageProcessed(messageId)).toBe(true);
        expect(await tonBridge.getGetMessageConfirmations(messageId)).toBe(2n);
    });

    it('should reject duplicate relayer confirmations', async () => {
        // Add relayer
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer1.address,
        });

        const messageId = 12345n;

        // First confirmation
        const relay1Result = await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
                messageId,
                sourceChain: 'ethereum',
                sourceAddress: '0x1234567890123456789012345678901234567890',
                destAddress: deployer.address,
                amount: toNano('10'),
                hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
                timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
                proof: new Cell(),
            }
        );

        expect(relay1Result.transactions).toHaveTransaction({
            from: relayer1.address,
            to: tonBridge.address,
            success: true,
        });

        // Second confirmation from same relayer should fail
        const relay2Result = await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
                messageId,
                sourceChain: 'ethereum',
                sourceAddress: '0x1234567890123456789012345678901234567890',
                destAddress: deployer.address,
                amount: toNano('10'),
                hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
                timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
                proof: new Cell(),
            }
        );

        expect(relay2Result.transactions).toHaveTransaction({
            from: relayer1.address,
            to: tonBridge.address,
            success: false,
        });

        // Confirmation count should still be 1
        expect(await tonBridge.getGetMessageConfirmations(messageId)).toBe(1n);
    });

    it('should reject relay from unauthorized address', async () => {
        const messageId = 12345n;

        const relayResult = await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
                messageId,
                sourceChain: 'ethereum',
                sourceAddress: '0x1234567890123456789012345678901234567890',
                destAddress: deployer.address,
                amount: toNano('10'),
                hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
                timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
                proof: new Cell(),
            }
        );

        expect(relayResult.transactions).toHaveTransaction({
            from: relayer1.address,
            to: tonBridge.address,
            success: false,
        });
    });

    it('should reject processing already processed messages', async () => {
        // Add relayers and process a message
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer1.address,
        });
        await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer2.address,
        });

        const messageId = 12345n;
        const messageParams = {
            messageId,
            sourceChain: 'ethereum',
            sourceAddress: '0x1234567890123456789012345678901234567890',
            destAddress: deployer.address,
            amount: toNano('10'),
            hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
            timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
            proof: new Cell(),
        };

        // Process message with 2 confirmations
        await tonBridge.send(relayer1.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
            messageId,
            sourceChain: 'ethereum',
            sourceAddress: '0x1234567890123456789012345678901234567890',
            destAddress: deployer.address,
            amount: toNano('10'),
            hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
            timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
            proof: new Cell(),
        });

        // Second confirmation needed
        await tonBridge.send(relayer2.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
            messageId,
            sourceChain: 'ethereum',
            sourceAddress: '0x1234567890123456789012345678901234567890',
            destAddress: deployer.address,
            amount: toNano('10'),
            hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
            timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
            proof: new Cell(),
        });

        expect(await tonBridge.getIsMessageProcessed(messageId)).toBe(true);

        // Try to relay the same message again with third relayer
            await tonBridge.send(admin.getSender(), {value: toNano('0.05')}, {
            $$type: 'AddRelayer',
            relayer: relayer3.address,
        });
        
        const relay3Result = await tonBridge.send(relayer3.getSender(), {value: toNano('0.05')}, {
            $$type: 'RelayMessage',
            messageId,
            sourceChain: 'ethereum',
            sourceAddress: '0x1234567890123456789012345678901234567890',
            destAddress: deployer.address,
            amount: toNano('10'),
            hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
            timelock: BigInt(Math.floor(Date.now() / 1000) + 7200),
            proof: new Cell(),
        });

        expect(relay3Result.transactions).toHaveTransaction({
            from: relayer3.address,
            to: tonBridge.address,
            success: false,
        });
    });
}); 