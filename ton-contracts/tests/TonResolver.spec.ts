import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { TonResolver } from '../build/TonResolver/TonResolver_TonResolver';
import '@ton/test-utils';

describe('TonResolver', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tonResolver: SandboxContract<TonResolver>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        tonResolver = blockchain.openContract(await TonResolver.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await tonResolver.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonResolver.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tonResolver are ready to use
    });
});
