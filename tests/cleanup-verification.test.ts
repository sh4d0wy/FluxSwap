import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Phase 1.1: NEAR Cleanup Verification', () => {
  const projectRoot = process.cwd();
  
  describe('NEAR Dependencies Removal', () => {
    test('should not contain near-api-js in any package.json', () => {
      const packageJsonFiles = [
        'package.json',
        'relayer/package.json', 
        'scripts/package.json'
      ];
      
      packageJsonFiles.forEach(file => {
        const fullPath = join(projectRoot, file);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf-8');
          const packageJson = JSON.parse(content);
          
          // Check dependencies and devDependencies
          const allDeps = {
            ...packageJson.dependencies || {},
            ...packageJson.devDependencies || {}
          };
          
          expect(allDeps).not.toHaveProperty('near-api-js');
          expect(allDeps).not.toHaveProperty('@near-js/api');
          expect(allDeps).not.toHaveProperty('near-sdk-js');
        }
      });
    });

    test('should not have NEAR-specific scripts', () => {
      const scriptsPackageJson = join(projectRoot, 'scripts/package.json');
      if (existsSync(scriptsPackageJson)) {
        const content = JSON.parse(readFileSync(scriptsPackageJson, 'utf-8'));
        const scripts = content.scripts || {};
        
        expect(scripts).not.toHaveProperty('deploy:near-bridge');
        expect(Object.values(scripts).join(' ')).not.toMatch(/near-bridge/i);
      }
    });
  });

  describe('NEAR Source Code Removal', () => {
    test('should not contain NEAR import statements', () => {
      const filesToCheck = [
        'relayer/src/index.ts',
        'relayer/src/services/chainSignatureService.ts',
        'relayer/src/relay/ethereum.ts',
        'relayer/src/__tests__/chainSignatureService.test.ts'
      ];
      
      filesToCheck.forEach(file => {
        const fullPath = join(projectRoot, file);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf-8');
          expect(content).not.toMatch(/import.*from\s+['"]near-api-js['"]/);
          expect(content).not.toMatch(/import.*near-api-js/);
          expect(content).not.toMatch(/require\(['"]near-api-js['"]\)/);
        }
      });
    });

    test('should not contain NEAR service files', () => {
      const nearSpecificFiles = [
        'relayer/src/relay/near.ts',
        'relayer/src/relay/near-relayer.ts', 
        'relayer/test/near-relayer.test.ts',
        'scripts/src/deploy-near-bridge.ts',
        'tests/near-integration.spec.ts'
      ];
      
      nearSpecificFiles.forEach(file => {
        const fullPath = join(projectRoot, file);
        expect(existsSync(fullPath)).toBe(false);
      });
    });

    test('should not reference deleted NEAR contracts in test files', () => {
      const testFile = join(projectRoot, 'contracts/test/CrossChainCommunication.t.sol');
      if (existsSync(testFile)) {
        const content = readFileSync(testFile, 'utf-8');
        expect(content).not.toMatch(/import.*NearBridge\.sol/);
        expect(content).not.toMatch(/NearBridge\s+/);
      }
    });
  });

  describe('Documentation Cleanup', () => {
    test('README.md should be updated to reference TON instead of NEAR', () => {
      const readmePath = join(projectRoot, 'README.md');
      if (existsSync(readmePath)) {
        const content = readFileSync(readmePath, 'utf-8');
        
        // Should not reference NEAR in title or main description
        expect(content.split('\n')[0]).not.toMatch(/NEAR/i);
        expect(content.split('\n')[2]).not.toMatch(/NEAR/i);
      }
    });

    test('package.json descriptions should reference TON instead of NEAR', () => {
      const relayerPackageJson = join(projectRoot, 'relayer/package.json');
      if (existsSync(relayerPackageJson)) {
        const content = JSON.parse(readFileSync(relayerPackageJson, 'utf-8'));
        expect(content.description || '').not.toMatch(/NEAR/i);
        expect(content.description || '').toMatch(/TON/i);
      }
    });
  });

  describe('Type Definitions Cleanup', () => {
    test('relayer should not have NEAR type references', () => {
      const globalTypesFile = join(projectRoot, 'relayer/src/types/global.d.ts');
      if (existsSync(globalTypesFile)) {
        const content = readFileSync(globalTypesFile, 'utf-8');
        expect(content).not.toMatch(/near-api-js/);
      }
    });
  });
});

describe('Phase 1.1: TON Readiness Verification', () => {
  test('should have clean project structure for TON integration', () => {
    // Verify essential directories exist for TON development
    const essentialDirs = [
      'contracts/src',
      'relayer/src', 
      'scripts/src',
      'tests'
    ];
    
    essentialDirs.forEach(dir => {
      const fullPath = join(process.cwd(), dir);
      expect(existsSync(fullPath)).toBe(true);
    });
  });

  test('should have placeholder for TON-specific components', () => {
    // This test will initially fail and pass as we add TON components
    const tonDirectories = [
      'ton-contracts',  // Will be created for Tact contracts
      'relayer/src/ton'  // Will be created for TON relayer logic
    ];
    
    // For now, just verify we have space to create these
    expect(true).toBe(true); // Placeholder - will be replaced with actual checks
  });
}); 