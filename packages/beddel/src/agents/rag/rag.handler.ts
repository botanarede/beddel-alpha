import 'server-only';

/**
 * RAG Agent Handler - Server-only execution logic
 * Generates natural language answers based on provided document context using LLM
 *
 * Note: RAG = Retrieval-Augmented Generation
 * This agent ALWAYS requires document context. For direct LLM chat without
 * documents, use the LLM agent instead.
 */

import { generateText } from 'ai';
import { LLMProviderFactory, extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { RagHandlerParams, RagHandlerResult, ConversationMessage } from './rag.types';

/**
 * Build prompt for RAG mode (with documents)
 */
function buildRagPrompt(
  query: string,
  ragContext: string,
  history?: ConversationMessage[]
): string {
  const conversationContext = history?.length
    ? `CONVERSATION HISTORY:\n${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n`
    : '';

  return `You are a helpful and expert assistant for the Beddel Protocol.

${conversationContext}CONTEXT INFORMATION:
${ragContext}

USER QUESTION:
${query}

INSTRUCTIONS:
1. Answer the user's question based on the CONTEXT INFORMATION provided above.
2. Consider the CONVERSATION HISTORY for context continuity if available.
3. If the context does not contain the answer, politely state that you don't have enough information in the documentation to answer.
4. Be concise but comprehensive.

ANSWER:`;
}

/**
 * Execute RAG answer generation
 * Requires document context - for direct LLM chat, use the LLM agent
 */
export async function executeRagHandler(
  params: RagHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<RagHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  const model = LLMProviderFactory.createLanguageModel(providerConfig);

  const { query, history } = params;
  const ragContext = params.context || params.documents;

  if (!query) {
    throw new Error('Missing required RAG input: query');
  }

  if (!ragContext) {
    throw new Error('Missing required RAG input: context or documents. For direct LLM chat without documents, use the LLM agent instead.');
  }

  const prompt = buildRagPrompt(query, ragContext, history);

  try {
    context.log(`[RAG] Generating answer for: "${query.substring(0, 50)}..."`);

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.3,
    });

    return {
      response: text,
      answer: text,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    context.log(`[RAG] Error: ${message}`);
    return {
      response: '',
      answer: '',
      timestamp: new Date().toISOString(),
      error: message,
    };
  }
}
