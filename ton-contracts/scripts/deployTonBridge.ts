import { toNano } from '@ton/core';
import { TonBridge } from '../wrappers/TonBridge';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonBridge = provider.open(TonBridge.createFromConfig({
        admin: provider.sender().address!,
    }, await compile('TonBridge')));

    await tonBridge.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tonBridge.address);

    console.log('TON Bridge deployed at:', tonBridge.address);
    
    // Test the deployed contract
    const bridgeInfo = await tonBridge.getBridgeInfo();
    console.log('Bridge Info:', {
        admin: bridgeInfo.admin.toString(),
        relayerCount: bridgeInfo.relayerCount.toString(),
        requiredConfirmations: bridgeInfo.requiredConfirmations.toString(),
    });
} 