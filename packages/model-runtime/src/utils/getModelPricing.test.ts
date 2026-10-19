import { describe, expect, it, vi } from 'vitest';

import { getModelPricing } from './getModelPricing';

// Mock LOBE_DEFAULT_MODEL_LIST for testing
vi.mock('model-bank', () => ({
  LOBE_DEFAULT_MODEL_LIST: [
    {
      id: 'gpt-4',
      providerId: 'openai',
      pricing: {
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.03, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.06, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
    },
    {
      id: 'gpt-4',
      providerId: 'azure',
      pricing: {
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.035, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.07, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
    },
    {
      id: 'claude-3',
      providerId: 'anthropic',
      pricing: {
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.015, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.075, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
    },
    {
      id: 'dall-e-3',
      providerId: 'openai',
      // No pricing specified
    },
    {
      id: 'llama-2',
      providerId: 'meta',
      // No pricing specified
    },
    {
      id: 'gemini-pro',
      providerId: 'google',
      pricing: {
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.0005, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.0015, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
    },
  ],
}));

describe('getModelPricing', () => {
  describe('with exact provider match', () => {
    it('should return pricing when model and provider match exactly', async () => {
      const pricing = await getModelPricing('gpt-4', 'openai');

      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.03, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.06, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });

    it('should return correct pricing for specific provider', async () => {
      const pricing = await getModelPricing('gpt-4', 'azure');

      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.035, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.07, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });

    it('should return pricing for claude-3 with anthropic provider', async () => {
      const pricing = await getModelPricing('claude-3', 'anthropic');

      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.015, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.075, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });
  });

  describe('with fallback to same model name', () => {
    it('should fallback to first model with same name when provider not specified', async () => {
      const pricing = await getModelPricing('gpt-4');

      // Should return the first gpt-4 match (openai)
      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.03, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.06, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });

    it('should fallback when specified provider does not match', async () => {
      const pricing = await getModelPricing('gpt-4', 'unknown-provider');

      // Should fallback to first gpt-4 match
      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.03, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.06, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });

    it('should fallback when model exists but provider has no pricing', async () => {
      const pricing = await getModelPricing('gemini-pro');

      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.0005, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.0015, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });
  });

  describe('with no pricing available', () => {
    it('should return undefined when model does not exist', async () => {
      const pricing = await getModelPricing('non-existent-model');

      expect(pricing).toBeUndefined();
    });

    it('should return undefined when model exists but has no pricing', async () => {
      const pricing = await getModelPricing('dall-e-3', 'openai');

      expect(pricing).toBeUndefined();
    });

    it('should return undefined when provider specified but no pricing available', async () => {
      const pricing = await getModelPricing('llama-2', 'meta');

      expect(pricing).toBeUndefined();
    });

    it('should return undefined with empty model name', async () => {
      const pricing = await getModelPricing('');

      expect(pricing).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle model with provider parameter as undefined', async () => {
      const pricing = await getModelPricing('claude-3', undefined);

      expect(pricing).toEqual({
        currency: 'USD',
        units: [
          { name: 'textInput', rate: 0.015, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.075, strategy: 'fixed', unit: 'millionTokens' },
        ],
      });
    });

    it('should return undefined when both model and provider do not match', async () => {
      const pricing = await getModelPricing('non-existent', 'unknown');

      expect(pricing).toBeUndefined();
    });

    it('should prefer exact match over fallback when provider is specified', async () => {
      const openaiPricing = await getModelPricing('gpt-4', 'openai');
      const azurePricing = await getModelPricing('gpt-4', 'azure');

      // Should return different pricing for different providers
      expect(openaiPricing).not.toEqual(azurePricing);

      // Check that the textInput rates are different
      const openaiInputUnit = openaiPricing?.units.find((u) => u.name === 'textInput');
      const azureInputUnit = azurePricing?.units.find((u) => u.name === 'textInput');

      // Type guard to check for FixedPricingUnit
      expect(openaiInputUnit?.strategy).toBe('fixed');
      expect(azureInputUnit?.strategy).toBe('fixed');

      if (openaiInputUnit?.strategy === 'fixed' && azureInputUnit?.strategy === 'fixed') {
        expect(openaiInputUnit.rate).toBe(0.03);
        expect(azureInputUnit.rate).toBe(0.035);
      }
    });
  });
});
