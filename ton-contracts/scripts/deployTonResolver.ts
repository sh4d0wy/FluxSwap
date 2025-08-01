import { toNano } from '@ton/core';
import { TonResolver } from '../build/TonResolver/TonResolver_TonResolver';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonResolver = provider.open(await TonResolver.fromInit());

    await tonResolver.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(tonResolver.address);

    // run methods on `tonResolver`
}
