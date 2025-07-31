import { toNano } from '@ton/core';
import { TonTokenHandler } from '../build/TonTokenHandler/TonTokenHandler_TonTokenHandler';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonTokenHandler = provider.open(await TonTokenHandler.fromInit(
        provider.sender().address!,
        provider.sender().address!,
    ));
    await tonTokenHandler.send(
        provider.sender(),
        {value: toNano('0.05')},
        {$$type: 'Deploy', queryId: 1n});

    await provider.waitForDeploy(tonTokenHandler.address);

    // run methods on `tonTokenHandler`
}
//kQC6P3F9qIyCPO3vj3e8n4DyxWUImPMdfzZ6ylAHhfZgqxfR

