/**
 * Beddel Protocol - Provider Registry
 * 
 * This registry maps provider names to their implementations.
 * Following Expansion Pack Pattern from BMAD-METHOD™ for extensibility.
 * See: https://github.com/bmadcode/bmad-method
 * 
 * Server-only: Providers may use Node.js APIs and external services.
 */

import type { LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

/**
 * Configuration passed to provider's createModel method.
 */
export interface ProviderConfig {
    model: string;
    [key: string]: unknown;
}

/**
 * Provider implementation interface.
 * Each provider must implement createModel to return an AI SDK LanguageModel.
 */
export interface ProviderImplementation {
    createModel: (config: ProviderConfig) => LanguageModel;
}

/**
 * Registry of provider implementations keyed by provider name.
 * 
 * Built-in Providers:
 * - 'google': Google Gemini via @ai-sdk/google
 * - 'bedrock': Amazon Bedrock via @ai-sdk/amazon-bedrock
 */
export const providerRegistry: Record<string, ProviderImplementation> = {};

/**
 * Register a custom provider implementation in the registry.
 * Allows consumers to extend Beddel with additional LLM providers.
 * 
 * @param name - Provider identifier (e.g., 'openai', 'anthropic')
 * @param implementation - ProviderImplementation with createModel method
 * 
 * @example
 * import { registerProvider } from 'beddel';
 * 
 * registerProvider('openai', {
 *   createModel: (config) => {
 *     const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *     return openai(config.model || 'gpt-4');
 *   },
 * });
 */
export function registerProvider(
    name: string,
    implementation: ProviderImplementation
): void {
    if (providerRegistry[name]) {
        console.warn(`[Beddel] Provider '${name}' already registered, overwriting.`);
    }
    providerRegistry[name] = implementation;
}

/**
 * Create a LanguageModel instance from a registered provider.
 * 
 * @param provider - Provider name (must be registered in providerRegistry)
 * @param config - Configuration including model name and provider-specific options
 * @returns LanguageModel instance from the AI SDK
 * @throws Error if provider is not found, listing available providers
 * 
 * @example
 * const model = createModel('google', { model: 'gemini-1.5-flash' });
 */
export function createModel(provider: string, config: ProviderConfig): LanguageModel {
    const impl = providerRegistry[provider];
    if (!impl) {
        const available = Object.keys(providerRegistry).join(', ') || 'none';
        throw new Error(`Unknown provider: '${provider}'. Available: ${available}`);
    }
    return impl.createModel(config);
}

// =============================================================================
// Built-in Providers
// =============================================================================

/**
 * Google Gemini Provider (Built-in)
 * 
 * Uses @ai-sdk/google with GEMINI_API_KEY environment variable.
 * Default model: gemini-1.5-flash
 * 
 * Requirements: 1.2, 4.1
 */
registerProvider('google', {
    createModel: (config: ProviderConfig): LanguageModel => {
        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
        });
        return google(config.model || 'gemini-1.5-flash');
    },
});

/**
 * Amazon Bedrock Provider (Built-in)
 * 
 * Uses @ai-sdk/amazon-bedrock with AWS_BEARER_TOKEN_BEDROCK environment variable.
 * Region is configured via AWS_REGION env var or defaults to 'us-east-1'.
 * Default model: anthropic.claude-3-haiku-20240307-v1:0
 * 
 * Requirements: 1.3, 4.2
 */
registerProvider('bedrock', {
    createModel: (config: ProviderConfig): LanguageModel => {
        const bedrock = createAmazonBedrock({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        return bedrock(config.model || 'anthropic.claude-3-haiku-20240307-v1:0');
    },
});
