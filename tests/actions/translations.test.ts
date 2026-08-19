import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAll } from '../setup/db';
import { createTestCourse } from '../fixtures/factories';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { suggestTranslation, reverseTranslation } from '@/app/lib/actions/examples';
import { createTranslator } from '@/app/lib/i18n';

function mockOpenAIResponse(content: string | null) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

describe('actions/translations', () => {
  beforeEach(async () => {
    await truncateAll();
    mockCreate.mockReset();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('suggestTranslation', () => {
    it('returns translations when OpenAI responds normally', async () => {
      const course = await createTestCourse({
        knownLang: 'English',
        learningLang: 'Spanish',
      });
      mockOpenAIResponse('hello\nhi\ngreetings');

      const result = await suggestTranslation({
        word: 'hola',
        courseId: course.id,
      });

      expect(result.translations).toEqual(['hello', 'hi', 'greetings']);
      expect(result.message).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('throws when course is not found', async () => {
      await expect(
        suggestTranslation({ word: 'hola', courseId: 'nonexistent-id' }),
      ).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('deduplicates case-insensitive translations', async () => {
      const course = await createTestCourse();
      mockOpenAIResponse('Hello\nhello\nHELLO\nworld');

      const result = await suggestTranslation({
        word: 'test',
        courseId: course.id,
      });

      expect(result.translations).toHaveLength(2);
      expect(result.translations?.map((t) => t.toLowerCase())).toContain('hello');
      expect(result.translations?.map((t) => t.toLowerCase())).toContain('world');
    });

    it('returns error message when OpenAI returns empty content', async () => {
      const course = await createTestCourse();
      mockOpenAIResponse(null);

      const result = await suggestTranslation({
        word: 'test',
        courseId: course.id,
      });

      expect(result.message).toBe(createTranslator('en')('errors.openaiNoContent'));
      expect(result.translations).toBeUndefined();
    });

    it('filters out empty lines from response', async () => {
      const course = await createTestCourse();
      mockOpenAIResponse('hello\n\n  \nworld\n');

      const result = await suggestTranslation({
        word: 'test',
        courseId: course.id,
      });

      expect(result.translations).toEqual(['hello', 'world']);
    });
  });

  describe('reverseTranslation', () => {
    it('translates in the reverse direction (knownLang -> learningLang)', async () => {
      const course = await createTestCourse({
        knownLang: 'English',
        learningLang: 'Spanish',
      });
      mockOpenAIResponse('hola\nsaludos');

      const result = await reverseTranslation({
        word: 'hello',
        courseId: course.id,
      });

      expect(result.translations).toEqual(['hola', 'saludos']);
      expect(result.message).toBeUndefined();

      const callArgs = mockCreate.mock.calls[0][0];
      const prompt = callArgs.messages[1].content;
      expect(prompt).toContain('from English to Spanish');
    });

    it('throws when course is not found', async () => {
      await expect(
        reverseTranslation({ word: 'hello', courseId: 'nonexistent-id' }),
      ).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('deduplicates case-insensitive translations', async () => {
      const course = await createTestCourse();
      mockOpenAIResponse('Hola\nhola\nAdiós');

      const result = await reverseTranslation({
        word: 'hello',
        courseId: course.id,
      });

      expect(result.translations).toHaveLength(2);
    });
  });
});
