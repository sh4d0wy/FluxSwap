import { toNano } from '@ton/core';
import { TonTokenHandler } from '../build/TonTokenHandler/TonTokenHandler_TonTokenHandler';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonTokenHandler = provider.open(await TonTokenHandler.fromInit());

    await tonTokenHandler.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(tonTokenHandler.address);

    // run methods on `tonTokenHandler`
}
