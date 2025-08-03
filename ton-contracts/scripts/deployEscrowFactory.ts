import { toNano } from '@ton/core';
import { EscrowFactory } from '../build/EscrowFactory/EscrowFactory_EscrowFactory';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const escrowFactory = provider.open(await EscrowFactory.fromInit());

    await escrowFactory.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(escrowFactory.address);

    // run methods on `escrowFactory`
}
