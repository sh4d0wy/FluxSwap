const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

console.log('🔍 Verifying NEAR Cleanup...\n');

// Test 1: Check package.json files for NEAR dependencies
console.log('1. Checking package.json files for NEAR dependencies...');
const packageJsonFiles = ['package.json', 'relayer/package.json', 'scripts/package.json'];
let nearDepsFound = false;

packageJsonFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };
    
    if (allDeps['near-api-js'] || allDeps['@near-js/api'] || allDeps['near-sdk-js']) {
      console.log(`❌ Found NEAR dependency in ${file}`);
      nearDepsFound = true;
    }
  }
});

if (!nearDepsFound) {
  console.log('✅ No NEAR dependencies found in package.json files');
}

// Test 2: Check for NEAR-specific scripts
console.log('\n2. Checking for NEAR-specific scripts...');
const scriptsPackageJson = path.join(projectRoot, 'scripts/package.json');
if (fs.existsSync(scriptsPackageJson)) {
  const content = JSON.parse(fs.readFileSync(scriptsPackageJson, 'utf-8'));
  const scripts = content.scripts || {};
  
  if (scripts['deploy:near-bridge'] || Object.values(scripts).join(' ').match(/near-bridge/i)) {
    console.log('❌ Found NEAR-specific scripts');
  } else {
    console.log('✅ No NEAR-specific scripts found');
  }
}

// Test 3: Check for NEAR imports in source files
console.log('\n3. Checking for NEAR imports in source files...');
const filesToCheck = [
  'relayer/src/index.ts',
  'relayer/src/services/chainSignatureService.ts',
  'relayer/src/relay/ethereum.ts',
  'relayer/src/__tests__/chainSignatureService.test.ts'
];

let nearImportsFound = false;
filesToCheck.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.match(/import.*from\s+['"]near-api-js['"]/) || 
        content.match(/import.*near-api-js/) || 
        content.match(/require\(['"]near-api-js['"]\)/)) {
      console.log(`❌ Found NEAR imports in ${file}`);
      nearImportsFound = true;
    }
  }
});

if (!nearImportsFound) {
  console.log('✅ No NEAR imports found in source files');
}

// Test 4: Check for NEAR service files
console.log('\n4. Checking for NEAR service files...');
const nearSpecificFiles = [
  'relayer/src/relay/near.ts',
  'relayer/src/relay/near-relayer.ts', 
  'relayer/test/near-relayer.test.ts',
  'scripts/src/deploy-near-bridge.ts',
  'tests/near-integration.spec.ts'
];

let nearFilesFound = false;
nearSpecificFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    console.log(`❌ Found NEAR-specific file: ${file}`);
    nearFilesFound = true;
  }
});

if (!nearFilesFound) {
  console.log('✅ No NEAR-specific files found');
}

// Test 5: Check documentation for NEAR references
console.log('\n5. Checking documentation for NEAR references...');
const readmePath = path.join(projectRoot, 'README.md');
if (fs.existsSync(readmePath)) {
  const content = fs.readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n');
  
  if (lines[0].match(/NEAR/i) || lines[2].match(/NEAR/i)) {
    console.log('❌ README.md still references NEAR in title or main description');
  } else {
    console.log('✅ README.md title and main description updated');
  }
}

const relayerPackageJson = path.join(projectRoot, 'relayer/package.json');
if (fs.existsSync(relayerPackageJson)) {
  const content = JSON.parse(fs.readFileSync(relayerPackageJson, 'utf-8'));
  if ((content.description || '').match(/NEAR/i)) {
    console.log('❌ Relayer package.json still references NEAR');
  } else if ((content.description || '').match(/TON/i)) {
    console.log('✅ Relayer package.json updated to reference TON');
  } else {
    console.log('⚠️  Relayer package.json description needs to reference TON');
  }
}

console.log('\n🏁 NEAR Cleanup Verification Complete!'); 