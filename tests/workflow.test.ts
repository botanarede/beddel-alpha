
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks - define inside factory or use functions
vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        generateText: vi.fn(),
        streamText: vi.fn(),
        convertToModelMessages: (m) => m,
        convertToCoreMessages: (m) => m,
        stepCountIs: () => undefined
    };
});

import { WorkflowExecutor } from '../src/core/workflow';
import { ParsedYaml } from '../src/types';
import { generateText, streamText } from 'ai';

describe('Workflow Executor', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
        vi.mocked(streamText).mockReset();
    });

    it('should execute a sequential workflow', async () => {
        // Define a workflow: Step 1 (LLM) -> Step 2 (Output)
        const yaml: ParsedYaml = {
            metadata: { name: "Test", version: "1" },
            workflow: [
                {
                    id: "step1",
                    type: "llm",
                    result: "llmOutput", // Store result in variable
                    config: {
                        model: "gpt-4",
                        messages: "$input.messages"
                    }
                },
                {
                    id: "step2",
                    type: "output-generator",
                    result: "finalOutput", // Store result in variable
                    config: {
                        template: {
                            text: "$stepResult.llmOutput.text"
                        }
                    }
                }
            ]
        };

        // Mock LLM response
        vi.mocked(generateText).mockResolvedValue({
            text: "Hello world",
            usage: {} as any,
            finishReason: "stop",
            logprobs: undefined,
            toolCalls: [],
            toolResults: [],
            steps: [],
            warnings: [],
            response: {} as any
        });

        const executor = new WorkflowExecutor(yaml);
        const result = await executor.execute({
            messages: [{ role: "user", content: "Hi" }]
        });

        // Verify Step 1 executed
        expect(generateText).toHaveBeenCalled();

        // Verify Step 2 executed and result accumulated
        // WorkflowExecutor returns all variables
        expect((result as any).llmOutput).toBeDefined();
        expect((result as any).finalOutput).toEqual({ text: "Hello world" });
    });

    it('should stop and return Response on streaming step', async () => {
        // Workflow: Step 1 (Chat - Streaming) -> Step 2 (Should not run)
        const yaml: ParsedYaml = {
            metadata: { name: "Test Stream", version: "1" },
            workflow: [
                {
                    id: "step1",
                    type: "chat",
                    config: {
                        model: "gpt-4",
                        messages: "$input.messages"
                    }
                },
                {
                    id: "step2",
                    type: "llm", // Should not be reached
                    config: {}
                }
            ]
        };

        const mockStreamResponse = {
            toUIMessageStreamResponse: () => new Response("stream"),
        };
        vi.mocked(streamText).mockReturnValue(mockStreamResponse as any);

        const executor = new WorkflowExecutor(yaml);
        const result = await executor.execute({
             messages: [{ role: "user", content: "Hi" }]
        });

        expect(streamText).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Response);

        // Ensure generateText (Step 2) was NOT called
        expect(generateText).not.toHaveBeenCalled();
    });
});
