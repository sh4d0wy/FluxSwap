import { toNano } from '@ton/core';
import { TonEscrow } from '../wrappers/TonEscrow';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonEscrow = provider.open(TonEscrow.createFromConfig({
        owner: provider.sender().address!,
        recipient: provider.sender().address!, // For demo purposes, same address
        amount: toNano('1'),
        hashlock: BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
        timelock: BigInt(Math.floor(Date.now() / 1000) + 7200), // 2 hours from now
        escrowId: 1n,
    }, await compile('TonEscrow')));

    await tonEscrow.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tonEscrow.address);

    console.log('TON Escrow deployed at:', tonEscrow.address);
    
    // Test the deployed contract
    const escrowInfo = await tonEscrow.getEscrowInfo();
    console.log('Escrow Info:', {
        owner: escrowInfo.owner.toString(),
        recipient: escrowInfo.recipient.toString(),
        amount: escrowInfo.amount.toString(),
        status: escrowInfo.status.toString(),
        escrowId: escrowInfo.escrowId.toString(),
    });
} 