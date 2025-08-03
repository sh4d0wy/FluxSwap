import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { TonLOP } from '../build/TonLOP/TonLOP_TonLOP';
import '@ton/test-utils';

describe('TonLOP', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tonLOP: SandboxContract<TonLOP>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        tonLOP = blockchain.openContract(await TonLOP.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await tonLOP.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonLOP.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tonLOP are ready to use
    });
});
