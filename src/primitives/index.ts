/**
 * Beddel Protocol - Primitive Handler Registry
 * 
 * This registry maps step types to their handler implementations.
 * Handlers are registered by Task 2.x (llm, output-generator, call-agent).
 * 
 * Server-only: Handlers may use Node.js APIs and external services.
 */

import type { PrimitiveHandler } from '../types';

/**
 * Registry of primitive handlers keyed by step type.
 * 
 * Example:
 *   handlerRegistry['llm'] = llmPrimitive;
 *   handlerRegistry['output-generator'] = outputPrimitive;
 */
export const handlerRegistry: Record<string, PrimitiveHandler> = {};
