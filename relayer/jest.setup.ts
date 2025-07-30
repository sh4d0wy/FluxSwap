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
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
