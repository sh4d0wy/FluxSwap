import { toNano } from '@ton/core';
import { TonEscrow } from '../wrappers/TonEscrow';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonEscrow = provider.open(await TonEscrow.fromInit(
        provider.sender().address!,
        provider.sender().address!, // For demo purposes, same address
        toNano('1'),
        BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
        BigInt(Math.floor(Date.now() / 1000) + 7200), // 2 hours from now
        1n,
    ));

    await tonEscrow.send(provider.sender(), 
    {value: toNano('0.05')},
    {$$type: 'Deploy', queryId: 1n});

    await provider.waitForDeploy(tonEscrow.address);

    console.log('TON Escrow deployed at:', tonEscrow.address);
    
    // Test the deployed contract
    const escrowInfo = await tonEscrow.getGetEscrowInfo();
    console.log('Escrow Info:', {
        owner: escrowInfo.owner.toString(),
        recipient: escrowInfo.recipient.toString(),
        amount: escrowInfo.amount.toString(),
        status: escrowInfo.status.toString(),
        escrowId: escrowInfo.escrowId.toString(),
    });
} 
//kQBrueQRdP--s4gQROFhwqVQXb6QEoSAIhigzTip-Xsz7JS8
