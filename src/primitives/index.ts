/**
 * Beddel Protocol - Primitive Handler Registry
 * 
 * This registry maps step types to their handler implementations.
 * Following Expansion Pack Pattern from BMAD-METHOD™ for extensibility.
 * See: https://github.com/bmadcode/bmad-method
 * 
 * Server-only: Handlers may use Node.js APIs and external services.
 */

import type { PrimitiveHandler, StepConfig, ExecutionContext } from '../types';
import { llmPrimitive } from './llm';
import { outputPrimitive } from './output';

// Re-export llm exports for consumer access
export { llmPrimitive, registerCallback, callbackRegistry } from './llm';

/**
 * Placeholder handler for primitives not yet implemented.
 * Returns config and context for debugging purposes.
 */
const placeholderHandler: PrimitiveHandler = async (
    config: StepConfig,
    context: ExecutionContext
): Promise<Record<string, unknown>> => {
    console.warn('[Beddel] Placeholder handler invoked. Implement the actual primitive.');
    return {
        _placeholder: true,
        config,
        input: context.input,
        variableCount: context.variables.size,
    };
};

/**
 * Registry of primitive handlers keyed by step type.
 * 
 * MVP Primitives:
 * - 'llm': Wrapper for streamText/generateText (Task 2.2)
 * - 'output-generator': Deterministic variable mapping (Task 2.3)
 * - 'call-agent': Sub-agent invocation (future)
 */
export const handlerRegistry: Record<string, PrimitiveHandler> = {
    /**
     * LLM Primitive - Dual-mode AI text generation.
     * Supports streaming (streamText) and blocking (generateText) modes.
     */
    'llm': llmPrimitive,

    /**
     * Output Generator Primitive - Deterministic JSON transform.
     * Resolves variable references in templates.
     */
    'output-generator': outputPrimitive,

    /**
     * Call Agent Primitive - Placeholder
     * Enables recursive workflow execution via sub-agents.
     */
    'call-agent': placeholderHandler,
};

/**
 * Register a custom primitive handler in the registry.
 * Allows consumers to extend Beddel with domain-specific primitives.
 * 
 * @param type - Step type identifier (e.g., 'my-custom-primitive')
 * @param handler - PrimitiveHandler function
 * 
 * @example
 * import { registerPrimitive } from 'beddel';
 * 
 * registerPrimitive('http-fetch', async (config, context) => {
 *   const response = await fetch(config.url);
 *   return { data: await response.json() };
 * });
 */
export function registerPrimitive(type: string, handler: PrimitiveHandler): void {
    if (handlerRegistry[type]) {
        console.warn(`[Beddel] Primitive '${type}' already registered, overwriting.`);
    }
    handlerRegistry[type] = handler;
}
