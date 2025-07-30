const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

console.log('🔍 Verifying System Architecture Documentation...\n');

// Test 1: Check architecture documentation exists
console.log('1. Checking system architecture documentation...');
const archDoc = path.join(projectRoot, 'docs/system-architecture.md');
if (!fs.existsSync(archDoc)) {
  console.log('❌ System architecture document not found');
  process.exit(1);
}

const content = fs.readFileSync(archDoc, 'utf-8');

// Test 2: Core architecture sections
console.log('2. Verifying core architecture sections...');
const coreSections = [
  'High-Level Architecture',
  'Detailed Component Architecture',
  'Data Flow Architecture',
  'Security Architecture',
  'Performance Architecture',
  'Deployment Architecture',
  'Monitoring & Observability'
];

let missingSections = [];
coreSections.forEach(section => {
  if (!content.match(new RegExp(section, 'i'))) {
    missingSections.push(section);
  }
});

if (missingSections.length > 0) {
  console.log(`❌ Missing sections: ${missingSections.join(', ')}`);
} else {
  console.log('✅ All core sections present');
}

// Test 3: System component definitions
console.log('\n3. Verifying system component definitions...');
const components = [
  'CrossChainResolver',
  'EthEscrow',
  'EthBridge',
  'TonEscrow',
  'TonBridge',
  'RelayerService',
  'EthereumMonitor',
  'TonMonitor'
];

let missingComponents = [];
components.forEach(component => {
  if (!content.includes(component)) {
    missingComponents.push(component);
  }
});

if (missingComponents.length > 0) {
  console.log(`❌ Missing components: ${missingComponents.join(', ')}`);
} else {
  console.log('✅ All system components defined');
}

// Test 4: Contract code examples
console.log('\n4. Verifying contract code examples...');
const contractExamples = [
  '```solidity',
  '```tact',
  '```typescript',
  'contract.*{',
  'function.*\\(',
  'receive\\(msg:'
];

let missingExamples = [];
contractExamples.forEach((pattern, index) => {
  if (!content.match(new RegExp(pattern))) {
    missingExamples.push(`Example ${index + 1}: ${pattern}`);
  }
});

if (missingExamples.length > 0) {
  console.log(`❌ Missing code examples: ${missingExamples.length} patterns`);
} else {
  console.log('✅ Contract code examples present');
}

// Test 5: Data flow specifications
console.log('\n5. Verifying data flow specifications...');
const dataFlowElements = [
  'Ethereum.*TON Swap Flow',
  'TON.*Ethereum Swap Flow',
  'Order validation',
  'Event emission',
  'Secret reveal',
  'Swap completion'
];

let missingDataFlow = [];
dataFlowElements.forEach(element => {
  if (!content.match(new RegExp(element, 'i'))) {
    missingDataFlow.push(element);
  }
});

if (missingDataFlow.length > 0) {
  console.log(`❌ Missing data flow elements: ${missingDataFlow.join(', ')}`);
} else {
  console.log('✅ Data flow specifications complete');
}

// Test 6: Security architecture
console.log('\n6. Verifying security architecture...');
const securityElements = [
  'Security Layers',
  'Threat Model',
  'APPLICATION SECURITY',
  'PROTOCOL SECURITY',
  'INFRASTRUCTURE SECURITY',
  'networkThreats',
  'protocolThreats',
  'contractThreats'
];

let missingSecurity = [];
securityElements.forEach(element => {
  if (!content.includes(element)) {
    missingSecurity.push(element);
  }
});

if (missingSecurity.length > 0) {
  console.log(`❌ Missing security elements: ${missingSecurity.join(', ')}`);
} else {
  console.log('✅ Security architecture complete');
}

// Test 7: Performance specifications
console.log('\n7. Verifying performance specifications...');
const performanceElements = [
  'Scalability Design',
  'Performance Metrics',
  'HORIZONTAL SCALING',
  'MESSAGE QUEUE',
  'DATA PERSISTENCE',
  'PerformanceTargets',
  'latency',
  'throughput',
  'availability'
];

let missingPerformance = [];
performanceElements.forEach(element => {
  if (!content.includes(element)) {
    missingPerformance.push(element);
  }
});

if (missingPerformance.length > 0) {
  console.log(`❌ Missing performance elements: ${missingPerformance.join(', ')}`);
} else {
  console.log('✅ Performance specifications complete');
}

// Test 8: Deployment architecture
console.log('\n8. Verifying deployment architecture...');
const deploymentElements = [
  'Environment Structure',
  'CI/CD Pipeline',
  'PRODUCTION',
  'STAGING',
  'DEVELOPMENT',
  'Kubernetes',
  'Docker',
  'github/workflows'
];

let missingDeployment = [];
deploymentElements.forEach(element => {
  if (!content.includes(element)) {
    missingDeployment.push(element);
  }
});

if (missingDeployment.length > 0) {
  console.log(`❌ Missing deployment elements: ${missingDeployment.join(', ')}`);
} else {
  console.log('✅ Deployment architecture complete');
}

// Test 9: Monitoring and observability
console.log('\n9. Verifying monitoring and observability...');
const monitoringElements = [
  'Monitoring Stack',
  'Health Checks',
  'METRICS COLLECTION',
  'LOGGING',
  'ALERTING',
  'Prometheus',
  'Grafana',
  'ServiceLevelIndicators'
];

let missingMonitoring = [];
monitoringElements.forEach(element => {
  if (!content.includes(element)) {
    missingMonitoring.push(element);
  }
});

if (missingMonitoring.length > 0) {
  console.log(`❌ Missing monitoring elements: ${missingMonitoring.join(', ')}`);
} else {
  console.log('✅ Monitoring and observability complete');
}

// Test 10: Implementation readiness
console.log('\n10. Verifying implementation readiness...');
const readinessElements = [
  'Implementation Readiness Checklist',
  'Phase 1 Completion',
  'Ready for Phase 2',
  'TON Side Implementation'
];

let missingReadiness = [];
readinessElements.forEach((element, index) => {
  if (index < 3 && !content.includes(element)) {
    missingReadiness.push(element);
  } else if (index >= 3 && !content.match(new RegExp(element))) {
    missingReadiness.push(element);
  }
});

if (missingReadiness.length > 0) {
  console.log(`❌ Missing readiness elements: ${missingReadiness.join(', ')}`);
} else {
  console.log('✅ Implementation readiness verified');
}

// Test 11: Architecture diagrams and visual elements
console.log('\n11. Verifying architecture diagrams...');
const diagramCount = (content.match(/```\s*\n┌/g) || []).length;
const flowCount = (content.match(/┌.*┐/g) || []).length;
const arrowCount = (content.match(/[├└│┘┐┌▼◄►]/g) || []).length;

if (diagramCount < 3) {
  console.log(`❌ Insufficient architecture diagrams: ${diagramCount}/3 minimum`);
} else if (flowCount < 10) {
  console.log(`❌ Insufficient flow diagrams: ${flowCount}/10 minimum`);
} else {
  console.log(`✅ Architecture diagrams complete (${diagramCount} diagrams, ${flowCount} flows)`);
}

console.log('\n🏁 System Architecture Verification Complete!');

// Summary
const totalIssues = missingSections.length + missingComponents.length + 
                   missingExamples.length + missingDataFlow.length +
                   missingSecurity.length + missingPerformance.length +
                   missingDeployment.length + missingMonitoring.length +
                   missingReadiness.length;

const additionalIssues = (diagramCount < 3 ? 1 : 0) + (flowCount < 10 ? 1 : 0);

if (totalIssues === 0 && additionalIssues === 0) {
  console.log('\n🎉 Phase 1.4: Architecture Documentation - COMPLETE!');
  console.log('✅ Phase 1: Research & Design - FULLY COMPLETE!');
  console.log('🚀 Ready to proceed to Phase 2: TON Side Implementation');
} else {
  console.log(`\n⚠️  Phase 1.4: Architecture Documentation - ${totalIssues + additionalIssues} issues found`);
  console.log('🔄 Please address the issues above before proceeding');
} 