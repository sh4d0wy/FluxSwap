import { toNano } from '@ton/core';
import { TonBridge } from '../wrappers/TonBridge';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonBridge = provider.open(await TonBridge.fromInit(
        provider.sender().address!
    ));

    await tonBridge.send(provider.sender(), 
    {value: toNano('0.05')},
    {$$type: 'Deploy', queryId: 1n});
    await provider.waitForDeploy(tonBridge.address);

    console.log('TON Bridge deployed at:', tonBridge.address);
    
    // Test the deployed contract
    const bridgeInfo = await tonBridge.getGetBridgeInfo();
    console.log('Bridge Info:', {
        admin: bridgeInfo.admin.toString(),
        relayerCount: bridgeInfo.relayerCount.toString(),
        requiredConfirmations: bridgeInfo.requiredConfirmations.toString(),
    });
} 
//TODO: Add tests for the deployed contract
//kQByYeaV-f2CiO2mbLZXG3AdIyEPiXE4X6qJ7B0T2D9oo1Uh
