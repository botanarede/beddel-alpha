import 'server-only';

/**
 * LLM Agent Handler - Server-only execution logic
 * Direct LLM interaction with conversation history support (non-RAG)
 */

import { generateText } from 'ai';
import { LLMProviderFactory, extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { LlmHandlerParams, LlmHandlerResult } from './llm.types';
import type { ConversationMessage } from '../rag/rag.types';

/**
 * Build prompt for direct LLM chat (no document context)
 */
function buildChatPrompt(
  query: string,
  history?: ConversationMessage[],
  systemPrompt?: string
): string {
  const system = systemPrompt || 'You are a helpful, friendly assistant.';

  const conversationContext = history?.length
    ? `CONVERSATION HISTORY:\n${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n`
    : '';

  return `${system}

${conversationContext}USER MESSAGE:
${query}

INSTRUCTIONS:
1. Respond naturally to the user's message.
2. Consider the conversation history for context continuity if available.
3. Be concise but helpful.

RESPONSE:`;
}

/**
 * Execute direct LLM chat
 */
export async function executeLlmHandler(
  params: LlmHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<LlmHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  const model = LLMProviderFactory.createLanguageModel(providerConfig);

  const { query, history, temperature = 0.7, systemPrompt } = params;

  if (!query) {
    throw new Error('Missing required LLM input: query');
  }

  const prompt = buildChatPrompt(query, history, systemPrompt);

  try {
    context.log(`[LLM] Generating response for: "${query.substring(0, 50)}..."`);

    const { text } = await generateText({
      model,
      prompt,
      temperature,
    });

    return {
      response: text,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    context.log(`[LLM] Error: ${message}`);
    return {
      response: '',
      timestamp: new Date().toISOString(),
      error: message,
    };
  }
}
