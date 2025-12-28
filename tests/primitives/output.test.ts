
import { describe, it, expect } from 'vitest';
import { outputPrimitive } from '../../src/primitives/output';
import { ExecutionContext } from '../../src/types';

describe('Output Primitive', () => {
    const context: ExecutionContext = {
        input: {
            user: "Bob",
            request_id: "123"
        },
        variables: new Map([
            ["step1", { text: "Generated content", usage: { total: 10 } }]
        ]),
        currentStepId: "output_step"
    };

    it('should return empty object if no template', async () => {
        const result = await outputPrimitive({ id: "o", type: "output-generator" } as any, context);
        expect(result).toEqual({});
    });

    it('should transform template with variables', async () => {
        const config = {
            id: "o",
            type: "output-generator",
            template: {
                status: "success",
                data: "$step1.text",
                meta: {
                    user: "$input.user",
                    tokens: "$step1.usage.total"
                }
            }
        };

        const result = await outputPrimitive(config as any, context);

        // Assertions need to match the resolved structure
        // The result is typed as Record<string, unknown>
        expect((result as any).status).toBe("success");
        expect((result as any).data).toBe("Generated content");
        expect((result as any).meta.user).toBe("Bob");
        expect((result as any).meta.tokens).toBe(10);
    });

    it('should handle array templates', async () => {
        const config = {
            id: "o",
            type: "output-generator",
            template: ["$input.user", "$step1.text"]
        };

        // Output primitive usually expects an object, but let's see what happens.
        // Looking at source: "return resolved as Record<string, unknown>;"
        // If resolved is array, it returns array.

        const result = await outputPrimitive(config as any, context);
        expect(Array.isArray(result)).toBe(true);
        expect((result as any)[0]).toBe("Bob");
    });
});
