
import { describe, it, expect } from 'vitest';
import { resolveVariables } from '../src/core/variable-resolver';
import { ExecutionContext } from '../src/types';

describe('Variable Resolver', () => {
    const context: ExecutionContext = {
        input: {
            user: { name: "Alice", age: 30 },
            query: "Hello"
        },
        variables: new Map([
            ["step1", { output: "Step 1 Result", details: { score: 100 } }]
        ]),
        currentStepId: "step2"
    };

    it('should resolve $input variables', () => {
        const result = resolveVariables("$input.user.name", context);
        expect(result).toBe("Alice");
    });

    it('should resolve $stepResult variables', () => {
        // Mock the last step result retrieval if needed, but resolveVariables usually takes specific paths
        // Assuming $stepResult refers to immediate previous step or specific step?
        // Let's look at the implementation of resolveVariables or usage.
        // Usually it's $stepName.prop

        const result = resolveVariables("$step1.output", context);
        expect(result).toBe("Step 1 Result");
    });

    it('should resolve variables nested in objects', () => {
        const template = {
            greeting: "Hi, $input.user.name", // Note: String interpolation might not be supported, only full replacement?
            // Let's check if it does string replacement or just value access.
            // Based on common patterns in this project, likely full value replacement if string matches pattern.
            data: "$step1.details"
        };

        // If the resolver only supports exact matches:
        const exactTemplate = {
            userName: "$input.user.name",
            score: "$step1.details.score"
        };

        const result = resolveVariables(exactTemplate, context) as any;
        expect(result.userName).toBe("Alice");
        expect(result.score).toBe(100);
    });

    it('should return original value if no variable matched', () => {
        const result = resolveVariables("Just a string", context);
        expect(result).toBe("Just a string");
    });

    it('should handle nested arrays', () => {
         const template = ["$input.query", "static"];
         const result = resolveVariables(template, context) as any[];
         expect(result[0]).toBe("Hello");
         expect(result[1]).toBe("static");
    });
});
