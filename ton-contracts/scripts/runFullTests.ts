#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { demo, testErrorScenarios } from './demoFlow';

async function runFullTestSuite() {
    console.log('🔧 TON Cross-Chain Resolver - Full Test Suite');
    console.log('==============================================\n');

    try {
        // Step 1: Build contracts
        console.log('📦 Step 1: Building contracts...');
        execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
        console.log('✅ Contracts built successfully!\n');

        // Step 2: Run interactive demo
        console.log('🎭 Step 2: Running interactive demo...');
        await demo();
        console.log('\n');

        // Step 3: Run security tests
        console.log('🔒 Step 3: Running security tests...');
        await testErrorScenarios();
        console.log('\n');

        // Step 4: Run Jest test suite
        console.log('🧪 Step 4: Running Jest test suite...');
        execSync('npm run test:flow', { stdio: 'inherit', cwd: process.cwd() });
        console.log('✅ Jest tests completed!\n');

        console.log('🎉 ALL TESTS PASSED!');
        console.log('====================');
        console.log('The TON Cross-Chain Resolver is working correctly!');
        console.log('\nFlow validated:');
        console.log('✅ Resolver creates orders');
        console.log('✅ Escrows deployed with tokens');
        console.log('✅ Secret verification works');
        console.log('✅ Tokens flow to recipients');
        console.log('✅ Security controls active');
        console.log('✅ Access control enforced');

    } catch (error) {
        console.error('❌ Test suite failed:');
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    runFullTestSuite().catch(console.error);
}

export { runFullTestSuite }; 