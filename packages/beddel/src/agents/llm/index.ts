/**
 * LLM Agent - Public exports (client-safe)
 */

// Schema exports (client-safe)
export { LlmInputSchema, LlmOutputSchema } from './llm.schema';
export type { LlmInput, LlmOutput } from './llm.schema';

// Type exports (client-safe)
export type { LlmHandlerParams, LlmHandlerResult, LlmMetadata } from './llm.types';

// Metadata (client-safe)
export const llmMetadata = {
  id: 'llm',
  name: 'LLM Chat Agent',
  description: 'Direct LLM interaction with conversation history support (non-RAG)',
  category: 'intelligence',
  route: '/agents/llm',
  tags: ['llm', 'chat', 'gemini', 'conversation'],
} as const;
