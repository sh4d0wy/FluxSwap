// Add TextEncoder to global scope for tests if not already available
// This is needed for some libraries that use these Web APIs
global.TextEncoder = global.TextEncoder || TextEncoder;

// Add a simple mock for TextDecoder
class TextDecoderMock {
  decode(input?: ArrayBuffer | Uint8Array | null): string {
    if (!input) return '';
    const buffer = input instanceof ArrayBuffer 
      ? new Uint8Array(input)
      : input;
    return Buffer.from(buffer).toString('utf-8');
  }
}

global.TextDecoder = global.TextDecoder || (TextDecoderMock as any);

// Add global test timeout
const JEST_TIMEOUT = 10000; // 10 seconds

// Add global test setup
beforeAll(() => {
  // Increase the timeout for all tests
  jest.setTimeout(JEST_TIMEOUT);
  
  // Set up environment variables for tests
  process.env.RESOLVER_ADDRESS = '0x1234567890123456789012345678901234567890';
  process.env.ESCROW_FACTORY_ADDRESS = '0x0987654321098765432109876543210987654321';
  process.env.TON_WALLET_ADDRESS = 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL';
  process.env.TON_PRIVATE_KEY = 'test_private_key_for_testing_only';
  process.env.TON_NETWORK = 'testnet';
  process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.alchemyapi.io/v2/test';
  process.env.ETHEREUM_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
