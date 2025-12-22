import 'server-only';

/**
 * Translator Agent Handler - Server-only execution logic
 * Translates text between languages using LLM providers
 */

import { generateText } from 'ai';
import { LLMProviderFactory, extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { TranslationHandlerParams, TranslationHandlerResult } from './translator.types';

const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr'];

/**
 * Execute translation using configured LLM provider
 */
export async function executeTranslationHandler(
  params: TranslationHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<TranslationHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  const model = LLMProviderFactory.createLanguageModel(providerConfig);
  const modelName = providerConfig.model || LLMProviderFactory.getDefaultModel(providerConfig.provider);

  const text = params.text?.trim();
  const sourceLanguage = params.source_language?.trim().toLowerCase();
  const targetLanguage = params.target_language?.trim().toLowerCase();

  if (!text || !sourceLanguage || !targetLanguage) {
    throw new Error('Missing required translation parameters: text, source_language, target_language');
  }

  // Same language bypass
  if (sourceLanguage === targetLanguage) {
    return {
      translated_text: text,
      metadata: {
        model_used: modelName,
        provider: providerConfig.provider,
        processing_time: 0,
        confidence: 1,
        supported_languages: SUPPORTED_LANGUAGES,
        requested_languages: {
          source: sourceLanguage,
          target: targetLanguage,
        },
        prompt_used: 'Bypass: source and target languages are the same',
      },
    };
  }

  const template = params.promptTemplate?.trim() ||
    `Translate the text below from {{source_language}} to {{target_language}}.
Reply only with the translated text without additional comments.

Text:
{{text}}`;

  const prompt = template
    .replace(/{{text}}/g, text)
    .replace(/{{source_language}}/g, sourceLanguage)
    .replace(/{{target_language}}/g, targetLanguage)
    .trim();

  const startTime = Date.now();

  context.log(`[Translator] Translating from ${sourceLanguage} to ${targetLanguage}`);

  const { text: translatedText } = await generateText({
    model,
    prompt,
    temperature: 0.2,
  });

  const finalText = translatedText?.trim() || '';
  if (!finalText) {
    throw new Error('LLM translation returned empty response');
  }

  return {
    translated_text: finalText,
    metadata: {
      model_used: modelName,
      provider: providerConfig.provider,
      processing_time: Date.now() - startTime,
      confidence: 0.85,
      supported_languages: SUPPORTED_LANGUAGES,
      requested_languages: {
        source: sourceLanguage,
        target: targetLanguage,
      },
      prompt_used: prompt,
    },
  };
}
