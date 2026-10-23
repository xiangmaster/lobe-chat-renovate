import { MessageContentPart } from '@lobechat/types';
import { describe, expect, it } from 'vitest';

import { deserializeParts, serializePartsForStorage } from './multimodalContent';

describe('multimodalContent', () => {
  describe('serializePartsForStorage', () => {
    it('should serialize text content parts to JSON string', () => {
      const parts: MessageContentPart[] = [{ type: 'text', text: 'Hello world' }];
      const result = serializePartsForStorage(parts);

      expect(result).toBe(JSON.stringify(parts));
      expect(typeof result).toBe('string');
    });

    it('should serialize image content parts to JSON string', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
      ];
      const result = serializePartsForStorage(parts);

      expect(result).toBe(JSON.stringify(parts));
    });

    it('should serialize mixed content parts to JSON string', () => {
      const parts: MessageContentPart[] = [
        { type: 'text', text: 'Check this image:' },
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
        { type: 'text', text: 'What do you think?' },
      ];
      const result = serializePartsForStorage(parts);

      expect(result).toBe(JSON.stringify(parts));
      expect(JSON.parse(result)).toEqual(parts);
    });

    it('should serialize empty array', () => {
      const parts: any[] = [];
      const result = serializePartsForStorage(parts);

      expect(result).toBe('[]');
    });

    it('should handle parts with special characters', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'text',
          text: 'Special chars: "quotes", \'apostrophe\', \n newline, \t tab',
        },
      ];
      const result = serializePartsForStorage(parts);

      expect(result).toBeTruthy();
      expect(JSON.parse(result)).toEqual(parts);
    });

    it('should handle parts with Unicode characters', () => {
      const parts: MessageContentPart[] = [{ type: 'text', text: '你好世界 🌍 مرحبا' }];
      const result = serializePartsForStorage(parts);

      expect(JSON.parse(result)).toEqual(parts);
    });

    it('should serialize parts with additional metadata', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'text',
          text: 'Hello',
        } as any,
      ];
      const result = serializePartsForStorage(parts);

      expect(JSON.parse(result)).toEqual(parts);
    });
  });

  describe('deserializeParts', () => {
    it('should deserialize valid JSON string to content parts', () => {
      const parts = [{ type: 'text', text: 'Hello world' }];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });

    it('should deserialize image content parts', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
      ];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });

    it('should deserialize mixed content parts', () => {
      const parts: MessageContentPart[] = [
        { type: 'text', text: 'Check this image:' },
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
      ];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = 'not a valid json string';
      const result = deserializeParts(invalidJson);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = deserializeParts('');

      expect(result).toBeNull();
    });

    it('should return null for valid JSON but not an array', () => {
      const notAnArray = JSON.stringify({ type: 'text', text: 'Hello' });
      const result = deserializeParts(notAnArray);

      expect(result).toBeNull();
    });

    it('should return null for empty array', () => {
      const emptyArray = JSON.stringify([]);
      const result = deserializeParts(emptyArray);

      expect(result).toBeNull();
    });

    it('should return null for array without type property', () => {
      const invalidParts = JSON.stringify([{ text: 'Hello' }]);
      const result = deserializeParts(invalidParts);

      expect(result).toBeNull();
    });

    it('should return null for plain text content', () => {
      const plainText = 'Just plain text, not JSON';
      const result = deserializeParts(plainText);

      expect(result).toBeNull();
    });

    it('should handle parts with special characters', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'text',
          text: 'Special chars: "quotes", \'apostrophe\', \n newline',
        },
      ];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });

    it('should handle parts with Unicode characters', () => {
      const parts: MessageContentPart[] = [{ type: 'text', text: '你好世界 🌍 مرحبا' }];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"type": "text", "text": "unclosed';
      const result = deserializeParts(malformedJson);

      expect(result).toBeNull();
    });

    it('should handle JSON with null values', () => {
      const jsonWithNull = JSON.stringify([{ type: 'text', text: null }]);
      const result = deserializeParts(jsonWithNull);

      expect(result).toEqual([{ type: 'text', text: null }]);
    });

    it('should handle JSON with nested objects', () => {
      const parts: MessageContentPart[] = [
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
      ];
      const serialized = JSON.stringify(parts);
      const result = deserializeParts(serialized);

      expect(result).toEqual(parts);
    });
  });

  describe('round-trip serialization', () => {
    it('should maintain data integrity through serialize and deserialize cycle', () => {
      const originalParts: MessageContentPart[] = [
        { type: 'text', text: 'Hello world' },
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
        },
      ];

      const serialized = serializePartsForStorage(originalParts);
      const deserialized = deserializeParts(serialized);

      expect(deserialized).toEqual(originalParts);
    });

    it('should handle complex nested structures', () => {
      const originalParts: any[] = [
        {
          type: 'text',
          text: 'Complex content',
          metadata: {
            id: '123',
            nested: {
              level: 2,
              data: ['a', 'b', 'c'],
            },
          },
        },
      ];

      const serialized = serializePartsForStorage(originalParts);
      const deserialized = deserializeParts(serialized);

      expect(deserialized).toEqual(originalParts);
    });

    it('should preserve all data types', () => {
      const originalParts: any[] = [
        {
          type: 'text',
          text: 'Mixed types',
          number: 42,
          boolean: true,
          nullValue: null,
          array: [1, 2, 3],
          object: { key: 'value' },
        },
      ];

      const serialized = serializePartsForStorage(originalParts);
      const deserialized = deserializeParts(serialized);

      expect(deserialized).toEqual(originalParts);
    });
  });
});
