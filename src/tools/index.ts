/**
 * Beddel Protocol - Tool Registry
 * 
 * This registry contains tool implementations that LLM primitives can access.
 * Each tool has: description, Zod parameters schema, and execute function.
 * 
 * Following Expansion Pack Pattern from BMAD-METHOD™ for extensibility.
 * See: https://github.com/bmadcode/bmad-method
 */

import { z } from 'zod';

/**
 * Interface for tool implementations in the registry.
 * Tools are invoked by the LLM via function calling.
 */
export interface ToolImplementation {
    /** Human-readable description of what the tool does */
    description: string;
    /** Zod schema defining the tool's input parameters */
    parameters: z.ZodSchema;
    /** Async function that executes the tool and returns results */
    execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Registry of available tools keyed by tool name.
 * 
 * YAML workflows reference tools by name:
 * ```yaml
 * tools:
 *   - name: "calculator"
 *     description: "Optional override" # Can override default description
 * ```
 */
export const toolRegistry: Record<string, ToolImplementation> = {
    /**
     * Calculator tool - evaluates mathematical expressions.
     * 
     * @example
     * Input: { expression: "2 + 2 * 3" }
     * Output: { result: 8 }
     */
    calculator: {
        description: 'Evaluate a mathematical expression',
        parameters: z.object({
            expression: z.string().describe('The math expression to evaluate'),
        }),
        execute: async ({ expression }) => {
            // Simple eval for MVP - use math.js in production for safety
            // We use Function constructor to avoid direct eval()
            const result = Function(`"use strict"; return (${expression})`)();
            return { result };
        },
    },

    /**
     * getCurrentTime tool - returns current date and time in ISO format.
     * 
     * @example
     * Input: {}
     * Output: { time: "2024-12-23T15:30:00.000Z" }
     */
    getCurrentTime: {
        description: 'Get the current date and time in ISO format',
        parameters: z.object({}),
        execute: async () => {
            return { time: new Date().toISOString() };
        },
    },
};

/**
 * Register a custom tool in the registry.
 * Allows consumers to extend Beddel with domain-specific tools.
 * 
 * @param name - Unique identifier for the tool
 * @param implementation - Tool implementation object
 * 
 * @example
 * registerTool('weatherLookup', {
 *   description: 'Get weather for a city',
 *   parameters: z.object({ city: z.string() }),
 *   execute: async ({ city }) => fetchWeather(city),
 * });
 */
export function registerTool(name: string, implementation: ToolImplementation): void {
    if (toolRegistry[name]) {
        console.warn(`[Beddel] Tool '${name}' already registered, overwriting.`);
    }
    toolRegistry[name] = implementation;
}
