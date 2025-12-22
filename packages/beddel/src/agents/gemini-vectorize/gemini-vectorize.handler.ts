import 'server-only';

/**
 * Gemini Vectorize Agent Handler - Server-only execution logic
 * Generates text embeddings using Google's text-embedding-004 model
 * 
 * Note: Embeddings currently only support Google provider via Vercel AI SDK
 */

import { embed, embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { VectorizeHandlerParams, VectorizeHandlerResult } from './gemini-vectorize.types';

const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Execute vectorization using embeddings
 */
export async function executeVectorizeHandler(
  params: VectorizeHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<VectorizeHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  
  // Currently only Google supports embeddings via Vercel AI SDK
  if (providerConfig.provider !== 'google') {
    throw new Error(`Embeddings are currently only supported with Google provider, got: ${providerConfig.provider}`);
  }

  const google = createGoogleGenerativeAI({ apiKey: providerConfig.apiKey });
  const action = params.action || 'embedSingle';

  try {
    if (action === 'embedSingle') {
      const text = params.text;
      if (!text) {
        throw new Error('Text input is required for embedSingle');
      }

      context.log(`[Vectorize] Embedding single text (${text.length} chars)...`);

      const { embedding } = await embed({
        model: google.textEmbeddingModel(EMBEDDING_MODEL),
        value: text,
      });

      return { success: true, vector: embedding };

    } else if (action === 'embedBatch') {
      const texts = params.texts;
      if (!texts || !Array.isArray(texts)) {
        throw new Error('Texts array input is required for embedBatch');
      }

      context.log(`[Vectorize] Embedding batch of ${texts.length} texts...`);

      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(EMBEDDING_MODEL),
        values: texts,
      });

      return { success: true, vectors: embeddings };

    } else {
      throw new Error(`Unknown vectorize action: ${action}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    context.log(`[Vectorize] Error: ${message}`);
    return { success: false, error: message };
  }
}
