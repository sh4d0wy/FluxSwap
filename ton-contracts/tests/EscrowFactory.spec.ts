import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { EscrowFactory } from '../build/EscrowFactory/EscrowFactory_EscrowFactory';
import '@ton/test-utils';

describe('EscrowFactory', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let escrowFactory: SandboxContract<EscrowFactory>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        escrowFactory = blockchain.openContract(await EscrowFactory.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await escrowFactory.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: escrowFactory.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and escrowFactory are ready to use
    });
});
