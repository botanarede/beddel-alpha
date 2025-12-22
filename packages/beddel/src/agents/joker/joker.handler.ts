import 'server-only';

/**
 * Joker Agent Handler - Server-only execution logic
 * Generates jokes using LLM providers (Google Gemini by default)
 */

import { generateText } from 'ai';
import { LLMProviderFactory, extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { JokeHandlerParams, JokeHandlerResult } from './joker.types';

/**
 * Execute joke generation using configured LLM provider
 */
export async function executeJokeHandler(
  params: JokeHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<JokeHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  const model = LLMProviderFactory.createLanguageModel(providerConfig);

  const prompt = params.prompt?.trim() || 'Tell a short and original joke that works for any audience.';
  const temperature = params.temperature ?? 0.8;
  const maxTokens = params.maxTokens;

  const startTime = Date.now();

  context.log(`[Joker] Generating joke with temperature=${temperature}`);

  const { text } = await generateText({
    model,
    prompt,
    temperature,
    ...(maxTokens && { maxOutputTokens: maxTokens }),
  });

  const finalText = text?.trim() || '';
  if (!finalText) {
    throw new Error('Gemini returned empty response');
  }

  return {
    text: finalText,
    metadata: {
      model_used: providerConfig.model || LLMProviderFactory.getDefaultModel(providerConfig.provider),
      provider: providerConfig.provider,
      processing_time: Date.now() - startTime,
      temperature,
      max_tokens: maxTokens ?? null,
      prompt_used: prompt,
    },
  };
}
