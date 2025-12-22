/**
 * LLM Agent Types - Shared between client and server
 * Direct LLM interaction without document context (non-RAG)
 */

import type { ConversationMessage } from '../rag/rag.types';

/**
 * Parameters for direct LLM chat
 */
export interface LlmHandlerParams {
  query: string;
  history?: ConversationMessage[];
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Result from LLM chat
 */
export interface LlmHandlerResult {
  response: string;
  timestamp: string;
  error?: string;
}

/**
 * LLM agent metadata
 */
export interface LlmMetadata {
  id: 'llm';
  name: string;
  description: string;
  category: 'intelligence';
  route: '/agents/llm';
  tags: string[];
}
