// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config module before importing the module under test
vi.mock('@/config/klavis', () => ({
  getServerKlavisApiKey: vi.fn(),
}));

// Mock KlavisClient
vi.mock('klavis', () => ({
  KlavisClient: vi.fn().mockImplementation((config: any) => ({
    apiKey: config.apiKey,
    mockMethod: vi.fn(),
  })),
}));

describe('Klavis Client', () => {
  let getServerKlavisApiKey: any;
  let KlavisClient: any;

  beforeEach(async () => {
    // Reset modules to ensure clean state
    vi.resetModules();

    // Get mocked functions
    getServerKlavisApiKey = (await import('@/config/klavis')).getServerKlavisApiKey;
    KlavisClient = (await import('klavis')).KlavisClient;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getKlavisClient', () => {
    it('should create a new client when API key is provided', async () => {
      getServerKlavisApiKey.mockReturnValue('test-api-key');

      const { getKlavisClient } = await import('./index');
      const client = getKlavisClient();

      expect(getServerKlavisApiKey).toHaveBeenCalled();
      expect(KlavisClient).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(client).toBeDefined();
    });

    it('should throw error when API key is not configured', async () => {
      getServerKlavisApiKey.mockReturnValue(undefined);

      const { getKlavisClient } = await import('./index');

      expect(() => getKlavisClient()).toThrow('Klavis API key is not configured on server');
    });

    it('should throw error when API key is empty string', async () => {
      getServerKlavisApiKey.mockReturnValue('');

      const { getKlavisClient } = await import('./index');

      expect(() => getKlavisClient()).toThrow('Klavis API key is not configured on server');
    });

    it('should reuse cached client instance when API key has not changed', async () => {
      getServerKlavisApiKey.mockReturnValue('test-api-key');

      const { getKlavisClient } = await import('./index');

      const client1 = getKlavisClient();
      const client2 = getKlavisClient();

      expect(KlavisClient).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
    });

    it('should create new client instance when API key changes', async () => {
      const { getKlavisClient } = await import('./index');

      // First call with first API key
      getServerKlavisApiKey.mockReturnValue('api-key-1');
      const client1 = getKlavisClient();

      // Second call with different API key
      getServerKlavisApiKey.mockReturnValue('api-key-2');
      const client2 = getKlavisClient();

      expect(KlavisClient).toHaveBeenCalledTimes(2);
      expect(KlavisClient).toHaveBeenNthCalledWith(1, { apiKey: 'api-key-1' });
      expect(KlavisClient).toHaveBeenNthCalledWith(2, { apiKey: 'api-key-2' });
      expect(client1).not.toBe(client2);
    });

    it('should handle multiple consecutive calls with same API key', async () => {
      getServerKlavisApiKey.mockReturnValue('consistent-key');

      const { getKlavisClient } = await import('./index');

      const client1 = getKlavisClient();
      const client2 = getKlavisClient();
      const client3 = getKlavisClient();

      expect(KlavisClient).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
    });
  });

  describe('isKlavisClientAvailable', () => {
    it('should return true when API key is configured', async () => {
      getServerKlavisApiKey.mockReturnValue('test-api-key');

      const { isKlavisClientAvailable } = await import('./index');

      expect(isKlavisClientAvailable()).toBe(true);
      expect(getServerKlavisApiKey).toHaveBeenCalled();
    });

    it('should return false when API key is not configured', async () => {
      getServerKlavisApiKey.mockReturnValue(undefined);

      const { isKlavisClientAvailable } = await import('./index');

      expect(isKlavisClientAvailable()).toBe(false);
    });

    it('should return false when API key is empty string', async () => {
      getServerKlavisApiKey.mockReturnValue('');

      const { isKlavisClientAvailable } = await import('./index');

      expect(isKlavisClientAvailable()).toBe(false);
    });

    it('should return false when API key is null', async () => {
      getServerKlavisApiKey.mockReturnValue(null);

      const { isKlavisClientAvailable } = await import('./index');

      expect(isKlavisClientAvailable()).toBe(false);
    });

    it('should not throw error when checking availability without API key', async () => {
      getServerKlavisApiKey.mockReturnValue(undefined);

      const { isKlavisClientAvailable } = await import('./index');

      expect(() => isKlavisClientAvailable()).not.toThrow();
    });
  });

  describe('Client instance caching behavior', () => {
    it('should maintain separate cache state across different API keys', async () => {
      const { getKlavisClient } = await import('./index');

      // Set first API key and create client
      getServerKlavisApiKey.mockReturnValue('key-1');
      getKlavisClient();
      expect(KlavisClient).toHaveBeenCalledTimes(1);

      // Change to second key
      getServerKlavisApiKey.mockReturnValue('key-2');
      getKlavisClient();
      expect(KlavisClient).toHaveBeenCalledTimes(2);

      // Change back to first key - should create new instance
      getServerKlavisApiKey.mockReturnValue('key-1');
      getKlavisClient();
      expect(KlavisClient).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive calls efficiently', async () => {
      getServerKlavisApiKey.mockReturnValue('rapid-test-key');

      const { getKlavisClient } = await import('./index');

      // Make 10 rapid calls
      for (let i = 0; i < 10; i++) {
        getKlavisClient();
      }

      // Should only create client once due to caching
      expect(KlavisClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error scenarios', () => {
    it('should handle getServerKlavisApiKey throwing an error', async () => {
      getServerKlavisApiKey.mockImplementation(() => {
        throw new Error('Config error');
      });

      const { getKlavisClient } = await import('./index');

      expect(() => getKlavisClient()).toThrow('Config error');
    });

    it('should handle KlavisClient constructor throwing an error', async () => {
      getServerKlavisApiKey.mockReturnValue('test-key');
      KlavisClient.mockImplementation(() => {
        throw new Error('Client initialization failed');
      });

      const { getKlavisClient } = await import('./index');

      expect(() => getKlavisClient()).toThrow('Client initialization failed');
    });
  });
});
