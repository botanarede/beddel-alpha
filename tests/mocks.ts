
import { vi } from 'vitest';

// Mocks for Vercel AI SDK
export const mockGenerateText = vi.fn();
export const mockStreamText = vi.fn();

// Setup the mocks
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    generateText: mockGenerateText,
    streamText: mockStreamText,
  };
});

// Helper to reset mocks between tests
export const resetMocks = () => {
  mockGenerateText.mockReset();
  mockStreamText.mockReset();
};

// Helper to create a fake stream response
export const createMockStream = (content: string) => {
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: content });
            controller.close();
        }
    });

    return {
        textStream: stream,
        toTextStreamResponse: () => new Response(content),
    };
};
