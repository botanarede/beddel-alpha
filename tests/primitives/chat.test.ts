
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Define mocks
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    streamText: vi.fn(),
    convertToModelMessages: vi.fn((msgs) => msgs), // Identity mock
    convertToCoreMessages: vi.fn((msgs) => msgs),
  };
});

import { chatPrimitive } from '../../src/primitives/chat';
import { ExecutionContext } from '../../src/types';
import { streamText } from 'ai';

describe('Chat Primitive', () => {
    beforeEach(() => {
        vi.mocked(streamText).mockReset();
    });

    const context: ExecutionContext = {
        input: { messages: [{ role: "user", content: "Hi" }] },
        variables: new Map(),
        currentStepId: "chat1"
    };

    it('should return a streaming response', async () => {
        // Mock streamText response
        // Note: chatPrimitive calls result.toUIMessageStreamResponse() (which replaces deprecated toDataStreamResponse in some contexts or is alias)
        // But checking source, it calls toUIMessageStreamResponse().
        const mockStreamResponse = {
            toUIMessageStreamResponse: vi.fn(() => new Response("Stream data")),
        };
        vi.mocked(streamText).mockReturnValue(mockStreamResponse as any);

        const config = {
            id: "chat1",
            type: "chat",
            config: {
                model: "gpt-4",
                messages: "$input.messages"
            }
        };

        const result = await chatPrimitive(config as any, context);

        expect(streamText).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Response);
        expect(mockStreamResponse.toUIMessageStreamResponse).toHaveBeenCalled();
    });
});
