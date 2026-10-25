import { describe, expect, it } from 'vitest';

import { isBuiltinProvider, normalizeProviderId } from './common';

describe('normalizeProviderId', () => {
  it('should return the canonical ID for known aliases', () => {
    const result = normalizeProviderId('microsoft-entra-id');
    expect(result).toBe('microsoft');
  });

  it('should return the original provider ID when no alias exists', () => {
    const result = normalizeProviderId('google');
    expect(result).toBe('google');
  });

  it('should return the original provider ID for unknown providers', () => {
    const result = normalizeProviderId('custom-provider');
    expect(result).toBe('custom-provider');
  });

  it('should handle empty string', () => {
    const result = normalizeProviderId('');
    expect(result).toBe('');
  });

  it('should handle providers with special characters', () => {
    const result = normalizeProviderId('provider-with-dashes');
    expect(result).toBe('provider-with-dashes');
  });
});

describe('isBuiltinProvider', () => {
  describe('built-in providers', () => {
    it('should return true for apple provider', () => {
      expect(isBuiltinProvider('apple')).toBe(true);
    });

    it('should return true for google provider', () => {
      expect(isBuiltinProvider('google')).toBe(true);
    });

    it('should return true for github provider', () => {
      expect(isBuiltinProvider('github')).toBe(true);
    });

    it('should return true for cognito provider', () => {
      expect(isBuiltinProvider('cognito')).toBe(true);
    });

    it('should return true for microsoft provider', () => {
      expect(isBuiltinProvider('microsoft')).toBe(true);
    });
  });

  describe('provider aliases', () => {
    it('should return true for microsoft-entra-id (alias of microsoft)', () => {
      expect(isBuiltinProvider('microsoft-entra-id')).toBe(true);
    });

    it('should normalize alias before checking', () => {
      // microsoft-entra-id should be normalized to microsoft
      const result = isBuiltinProvider('microsoft-entra-id');
      expect(result).toBe(true);
    });
  });

  describe('non-built-in providers', () => {
    it('should return false for custom providers', () => {
      expect(isBuiltinProvider('custom-provider')).toBe(false);
    });

    it('should return false for auth0 provider', () => {
      expect(isBuiltinProvider('auth0')).toBe(false);
    });

    it('should return false for okta provider', () => {
      expect(isBuiltinProvider('okta')).toBe(false);
    });

    it('should return false for keycloak provider', () => {
      expect(isBuiltinProvider('keycloak')).toBe(false);
    });

    it('should return false for generic-oidc provider', () => {
      expect(isBuiltinProvider('generic-oidc')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isBuiltinProvider('')).toBe(false);
    });

    it('should return false for unknown providers', () => {
      expect(isBuiltinProvider('unknown-provider')).toBe(false);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-sensitive for provider IDs', () => {
      expect(isBuiltinProvider('Google')).toBe(false);
      expect(isBuiltinProvider('GITHUB')).toBe(false);
      expect(isBuiltinProvider('Apple')).toBe(false);
    });

    it('should be case-sensitive for aliases', () => {
      expect(isBuiltinProvider('Microsoft-Entra-ID')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle providers with extra whitespace', () => {
      // Note: The function does not trim, so this should return false
      expect(isBuiltinProvider(' google ')).toBe(false);
    });

    it('should handle partial matches correctly', () => {
      expect(isBuiltinProvider('google-custom')).toBe(false);
      expect(isBuiltinProvider('my-microsoft')).toBe(false);
    });
  });
});
