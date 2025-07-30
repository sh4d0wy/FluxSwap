import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { TonTokenHandler } from '../build/TonTokenHandler/TonTokenHandler_TonTokenHandler';
import '@ton/test-utils';

describe('TonTokenHandler', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tonTokenHandler: SandboxContract<TonTokenHandler>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        tonTokenHandler = blockchain.openContract(await TonTokenHandler.fromInit(deployer.address, deployer.address));

        const deployResult = await tonTokenHandler.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 1n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonTokenHandler.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tonTokenHandler are ready to use
    });
});
