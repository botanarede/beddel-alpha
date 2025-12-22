import 'server-only';

/**
 * Image Agent Handler - Server-only execution logic
 * Generates images using LLM providers (Google Gemini Imagen by default)
 */

import { experimental_generateImage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { extractProviderConfig } from '../../runtime/llmProviderFactory';
import type { ExecutionContext } from '../../types/executionContext';
import type { ImageHandlerParams, ImageHandlerResult } from './image.types';

const GEMINI_IMAGE_MODEL = 'imagen-4.0-fast-generate-001';

/**
 * Execute image generation using configured provider
 */
export async function executeImageHandler(
  params: ImageHandlerParams,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<ImageHandlerResult> {
  const providerConfig = extractProviderConfig(props, 'google');
  
  // Currently only Google supports image generation via Vercel AI SDK
  if (providerConfig.provider !== 'google') {
    throw new Error(`Image generation is currently only supported with Google provider, got: ${providerConfig.provider}`);
  }

  const description = params.description?.trim();
  const style = params.style?.trim();
  const resolution = params.resolution?.trim();

  if (!description) {
    throw new Error('Missing required image input: description');
  }
  if (!style) {
    throw new Error('Missing required image input: style');
  }
  if (!resolution || !/^\d+x\d+$/.test(resolution)) {
    throw new Error('Missing required image input: resolution (format: WIDTHxHEIGHT)');
  }

  const promptTemplate = params.promptTemplate?.trim() ||
    'Create a detailed image in {{style}} style focusing on: {{description}}';

  const prompt = promptTemplate
    .replace(/{{description}}/g, description)
    .replace(/{{style}}/g, style)
    .trim();

  const google = createGoogleGenerativeAI({ apiKey: providerConfig.apiKey });
  const model = google.image(GEMINI_IMAGE_MODEL);
  const startTime = Date.now();

  context.log(`[Image] Generating image with style=${style}, resolution=${resolution}`);

  const result = await experimental_generateImage({
    model,
    prompt,
    size: resolution as `${number}x${number}`,
  });

  const image = result.image;
  if (!image?.base64 || !image.mediaType) {
    throw new Error('Gemini Flash image helper returned an invalid file');
  }

  const normalizedBase64 = image.base64.replace(/\s+/g, '');
  const imageUrl = `data:${image.mediaType};base64,${normalizedBase64}`;

  return {
    image_url: imageUrl,
    image_base64: normalizedBase64,
    media_type: image.mediaType,
    prompt_used: prompt,
    metadata: {
      model_used: GEMINI_IMAGE_MODEL,
      provider: providerConfig.provider,
      processing_time: Date.now() - startTime,
      style,
      resolution,
    },
  };
}
