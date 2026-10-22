import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Compressor, StrCompressor } from './compass';

// Mock brotli-wasm module to avoid WASM loading issues in tests
vi.mock('brotli-wasm', () => ({
  default: Promise.resolve({
    compress: (input: Uint8Array) => {
      // Simple mock: just return the input as-is for testing purposes
      // In real implementation, this would use brotli compression
      return input;
    },
    decompress: (input: Uint8Array) => {
      // Simple mock: just return the input as-is for testing purposes
      return input;
    },
  }),
}));

describe('StrCompressor', () => {
  let compressor: StrCompressor;

  beforeEach(async () => {
    compressor = new StrCompressor();
    await compressor.init();
  });

  describe('initialization', () => {
    it('should initialize the compressor instance', async () => {
      const newCompressor = new StrCompressor();
      await expect(newCompressor.init()).resolves.not.toThrow();
    });
  });

  describe('compress and decompress', () => {
    it('should compress and decompress a simple string', () => {
      const input = 'Hello, World!';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(compressed).toBeTruthy();
      expect(compressed).not.toBe(input);
      expect(decompressed).toBe(input);
    });

    it('should compress and decompress an empty string', () => {
      const input = '';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should compress and decompress special characters', () => {
      const input = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should compress and decompress unicode characters', () => {
      const input = '你好世界 🌍 こんにちは世界 مرحبا بالعالم';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should compress and decompress long text', () => {
      const input = 'Lorem ipsum dolor sit amet, '.repeat(100);
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(compressed).toBeTruthy();
      expect(decompressed).toBe(input);
    });

    it('should compress and decompress JSON strings', () => {
      const input = JSON.stringify({
        name: 'Test User',
        age: 30,
        emails: ['test@example.com', 'user@test.com'],
        metadata: { role: 'admin', active: true },
      });
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
      expect(JSON.parse(decompressed)).toEqual(JSON.parse(input));
    });

    it('should compress repetitive text correctly', () => {
      const repetitiveText = 'aaaaaaaaaa'.repeat(100);

      const compressed = compressor.compress(repetitiveText);
      const decompressed = compressor.decompress(compressed);

      // Verify data integrity
      expect(decompressed).toBe(repetitiveText);
    });

    it('should produce URL-safe base64 output', () => {
      const input = 'Test string with various characters: +=?/\\';
      const compressed = compressor.compress(input);

      // Should not contain + or / (replaced with _0_ and _)
      expect(compressed).not.toMatch(/[+/]/);
      // Should not contain = at the end (padding removed)
      expect(compressed).not.toMatch(/=+$/);
    });
  });

  describe('compressAsync and decompressAsync', () => {
    it('should compress and decompress asynchronously', async () => {
      const input = 'Async compression test';
      const compressed = await compressor.compressAsync(input);
      const decompressed = await compressor.decompressAsync(compressed);

      expect(compressed).toBeTruthy();
      expect(decompressed).toBe(input);
    });

    it('should handle empty string asynchronously', async () => {
      const input = '';
      const compressed = await compressor.compressAsync(input);
      const decompressed = await compressor.decompressAsync(compressed);

      expect(decompressed).toBe(input);
    });

    it('should handle large text asynchronously', async () => {
      const input = 'Large text content: '.repeat(500);
      const compressed = await compressor.compressAsync(input);
      const decompressed = await compressor.decompressAsync(compressed);

      expect(compressed).toBeTruthy();
      expect(decompressed).toBe(input);
    });

    it('should handle unicode characters asynchronously', async () => {
      const input = '测试异步压缩 🚀 テスト';
      const compressed = await compressor.compressAsync(input);
      const decompressed = await compressor.decompressAsync(compressed);

      expect(decompressed).toBe(input);
    });
  });

  describe('sync vs async consistency', () => {
    it('should produce same result for sync and async compression', async () => {
      const input = 'Consistency test string';
      const syncCompressed = compressor.compress(input);
      const asyncCompressed = await compressor.compressAsync(input);

      // Both methods should produce the same compressed output
      expect(syncCompressed).toBe(asyncCompressed);
    });

    it('should allow sync decompression of async compressed data', async () => {
      const input = 'Cross-method compatibility test';
      const asyncCompressed = await compressor.compressAsync(input);
      const syncDecompressed = compressor.decompress(asyncCompressed);

      expect(syncDecompressed).toBe(input);
    });

    it('should allow async decompression of sync compressed data', async () => {
      const input = 'Cross-method compatibility test 2';
      const syncCompressed = compressor.compress(input);
      const asyncDecompressed = await compressor.decompressAsync(syncCompressed);

      expect(asyncDecompressed).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('should handle strings with newlines', () => {
      const input = 'Line 1\nLine 2\nLine 3\n';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should handle strings with tabs', () => {
      const input = 'Column1\tColumn2\tColumn3';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should handle strings with null bytes', () => {
      const input = 'Before\x00After';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should handle very long single line', () => {
      const input = 'x'.repeat(10000);
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
      expect(compressed).toBeTruthy();
    });

    it('should handle HTML content', () => {
      const input = '<div class="test"><p>Hello <strong>World</strong>!</p></div>';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });

    it('should handle markdown content', () => {
      const input = '# Title\n\n## Subtitle\n\n- Item 1\n- Item 2\n\n**Bold** and *italic*';
      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });
  });

  describe('singleton instance', () => {
    it('should export a pre-initialized Compressor instance', () => {
      expect(Compressor).toBeInstanceOf(StrCompressor);
    });

    it('should be able to use the singleton directly', async () => {
      // Initialize the singleton if not already initialized
      await Compressor.init();

      const input = 'Testing singleton instance';
      const compressed = Compressor.compress(input);
      const decompressed = Compressor.decompress(compressed);

      expect(decompressed).toBe(input);
    });
  });

  describe('error handling', () => {
    it('should handle decompression of invalid data gracefully', () => {
      // This tests what happens when we try to decompress invalid base64
      expect(() => {
        compressor.decompress('not-valid-compressed-data-!!!');
      }).toThrow();
    });

    it('should handle decompression of malformed base64', () => {
      expect(() => {
        compressor.decompress('invalid_base64_!!!');
      }).toThrow();
    });
  });

  describe('data integrity', () => {
    it('should preserve data integrity for repetitive content', () => {
      const input = JSON.stringify({
        items: Array(100).fill({ name: 'Item', value: 'Value', active: true }),
      });
      const compressed = compressor.compress(input);

      expect(compressed).toBeTruthy();

      // Verify data integrity
      const decompressed = compressor.decompress(compressed);
      expect(decompressed).toBe(input);
    });

    it('should handle random data correctly', () => {
      // Random-like data
      const input = Array.from({ length: 100 }, () =>
        Math.random().toString(36).substring(2),
      ).join('');

      const compressed = compressor.compress(input);
      const decompressed = compressor.decompress(compressed);

      // Should decompress correctly
      expect(decompressed).toBe(input);
    });
  });
});
