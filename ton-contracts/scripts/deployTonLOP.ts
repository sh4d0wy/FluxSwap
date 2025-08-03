import { toNano } from '@ton/core';
import { TonLOP } from '../build/TonLOP/TonLOP_TonLOP';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonLOP = provider.open(await TonLOP.fromInit());

    await tonLOP.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(tonLOP.address);

    // run methods on `tonLOP`
}
