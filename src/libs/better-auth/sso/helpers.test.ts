import { describe, expect, it } from 'vitest';

import { buildOidcConfig, DEFAULT_OIDC_SCOPES, pickEnv } from './helpers';

describe('pickEnv', () => {
  it('should return the first non-empty trimmed value', () => {
    const result = pickEnv('', '  value1  ', 'value2');
    expect(result).toBe('value1');
  });

  it('should skip null and undefined values', () => {
    const result = pickEnv(null, undefined, 'valid-value');
    expect(result).toBe('valid-value');
  });

  it('should skip empty strings', () => {
    const result = pickEnv('', '   ', 'valid');
    expect(result).toBe('valid');
  });

  it('should return undefined when all values are empty', () => {
    const result = pickEnv('', null, undefined, '   ');
    expect(result).toBeUndefined();
  });

  it('should return undefined when no values provided', () => {
    const result = pickEnv();
    expect(result).toBeUndefined();
  });

  it('should trim whitespace from values', () => {
    const result = pickEnv('  spaced-value  ');
    expect(result).toBe('spaced-value');
  });

  it('should handle multiple whitespace characters', () => {
    const result = pickEnv('  \n\t  ', '  trimmed  ');
    expect(result).toBe('trimmed');
  });
});

describe('buildOidcConfig', () => {
  const validInput = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    issuer: 'https://example.com',
    providerId: 'test-provider',
  };

  describe('valid configurations', () => {
    it('should build config with required fields', () => {
      const config = buildOidcConfig(validInput);

      expect(config).toEqual({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        discoveryUrl: 'https://example.com/.well-known/openid-configuration',
        pkce: true,
        providerId: 'test-provider',
        scopes: DEFAULT_OIDC_SCOPES,
      });
    });

    it('should use default OIDC scopes when not provided', () => {
      const config = buildOidcConfig(validInput);

      expect(config.scopes).toEqual(['openid', 'email', 'profile']);
    });

    it('should use custom scopes when provided', () => {
      const config = buildOidcConfig({
        ...validInput,
        scopes: ['openid', 'custom-scope'],
      });

      expect(config.scopes).toEqual(['openid', 'custom-scope']);
    });

    it('should enable PKCE by default', () => {
      const config = buildOidcConfig(validInput);

      expect(config.pkce).toBe(true);
    });

    it('should allow disabling PKCE', () => {
      const config = buildOidcConfig({
        ...validInput,
        pkce: false,
      });

      expect(config.pkce).toBe(false);
    });

    it('should apply overrides to config', () => {
      const config = buildOidcConfig({
        ...validInput,
        overrides: {
          redirectURI: 'https://custom-redirect.com/callback',
        },
      });

      expect(config.redirectURI).toBe('https://custom-redirect.com/callback');
    });

    it('should merge overrides with base config', () => {
      const config = buildOidcConfig({
        ...validInput,
        overrides: {
          pkce: false,
          redirectURI: 'https://custom.com/callback',
        },
      });

      expect(config.pkce).toBe(false);
      expect(config.redirectURI).toBe('https://custom.com/callback');
      expect(config.clientId).toBe('test-client-id');
    });
  });

  describe('issuer URL normalization', () => {
    it('should remove trailing slash from issuer', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com/',
      });

      expect(config.discoveryUrl).toBe('https://example.com/.well-known/openid-configuration');
    });

    it('should handle issuer without trailing slash', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com',
      });

      expect(config.discoveryUrl).toBe('https://example.com/.well-known/openid-configuration');
    });

    it('should preserve issuer with existing .well-known path', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com/.well-known/openid-configuration',
      });

      expect(config.discoveryUrl).toBe('https://example.com/.well-known/openid-configuration');
    });

    it('should handle issuer with .well-known in the middle of path', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com/.well-known/custom-path',
      });

      expect(config.discoveryUrl).toBe('https://example.com/.well-known/custom-path');
    });

    it('should trim whitespace from issuer', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: '  https://example.com  ',
      });

      expect(config.discoveryUrl).toBe('https://example.com/.well-known/openid-configuration');
    });

    it('should handle multiple trailing slashes', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com///',
      });

      // Only removes one trailing slash at a time, which is the current behavior
      expect(config.discoveryUrl).toBe('https://example.com//.well-known/openid-configuration');
    });
  });

  describe('error handling', () => {
    it('should throw error when clientId is missing', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          clientId: undefined,
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when clientSecret is missing', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          clientSecret: undefined,
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when issuer is missing', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          issuer: undefined,
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when issuer is empty string', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          issuer: '',
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when issuer is only whitespace', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          issuer: '   ',
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when clientId is empty string', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          clientId: '',
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should throw error when clientSecret is empty string', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          clientSecret: '',
        }),
      ).toThrow('[Better-Auth] test-provider OAuth enabled but missing credentials');
    });

    it('should include provider ID in error message', () => {
      expect(() =>
        buildOidcConfig({
          ...validInput,
          clientId: undefined,
          providerId: 'custom-provider',
        }),
      ).toThrow('custom-provider');
    });
  });

  describe('edge cases', () => {
    it('should handle empty scopes array', () => {
      const config = buildOidcConfig({
        ...validInput,
        scopes: [],
      });

      expect(config.scopes).toEqual([]);
    });

    it('should handle issuer with port number', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com:8080',
      });

      expect(config.discoveryUrl).toBe(
        'https://example.com:8080/.well-known/openid-configuration',
      );
    });

    it('should handle issuer with path', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com/auth/realms/master',
      });

      expect(config.discoveryUrl).toBe(
        'https://example.com/auth/realms/master/.well-known/openid-configuration',
      );
    });

    it('should handle issuer with query parameters', () => {
      const config = buildOidcConfig({
        ...validInput,
        issuer: 'https://example.com?param=value',
      });

      expect(config.discoveryUrl).toBe(
        'https://example.com?param=value/.well-known/openid-configuration',
      );
    });
  });
});
