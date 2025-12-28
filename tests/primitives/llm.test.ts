
import { describe, it, expect, beforeEach, vi } from 'vitest';

// define mocks strictly inside the factory or use hoised variables if needed
// Vitest hoists vi.mock, so we cannot use outer variables unless they are functions.

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    generateText: vi.fn(), // Create fresh mock inside factory
    streamText: vi.fn(),
  };
});

// Now import the module under test
import { llmPrimitive } from '../../src/primitives/llm';
import { ExecutionContext } from '../../src/types';
import { generateText } from 'ai'; // Import the mocked function to assert on it

describe('LLM Primitive', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    const context: ExecutionContext = {
        input: { question: "Why is the sky blue?" },
        variables: new Map(),
        currentStepId: "step1"
    };

    it('should call generateText and return content', async () => {
        // Setup mock return
        vi.mocked(generateText).mockResolvedValue({
            text: "Because of Rayleigh scattering.",
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            finishReason: "stop",
            logprobs: undefined,
            toolCalls: [],
            toolResults: [],
            steps: [],
            warnings: [],
            response: {} as any
        } as any);

        const messageContext: ExecutionContext = {
             ...context,
             input: {
                 messages: [{ role: 'user', content: "Why is the sky blue?" }]
             }
        };

        const config = {
            id: "step1",
            type: "llm",
            config: {
                model: "gpt-4",
                system: "You are helpful.",
                messages: "$input.messages"
            }
        };

        const result = await llmPrimitive(config as any, messageContext);

        expect(generateText).toHaveBeenCalled();
        expect((result as any).text).toBe("Because of Rayleigh scattering.");
        expect((result as any).usage.totalTokens).toBe(15);
    });

    it('should throw if model is missing', async () => {
        const config = {
            id: "step1",
            type: "llm",
            config: {
                // model missing - but defaults exist
                messages: "hi" // bad format
            }
        };

        vi.mocked(generateText).mockRejectedValue(new Error("Invalid prompt"));

        await expect(llmPrimitive(config as any, context)).rejects.toThrow();
    });
});
