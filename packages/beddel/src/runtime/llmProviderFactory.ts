import 'server-only';

/**
 * LLM Provider Factory - Centralized provider creation and configuration
 * 
 * Provides a single point of configuration for LLM providers, enabling:
 * - Centralized API key validation
 * - Easy provider switching (Google, OpenAI, Anthropic, etc.)
 * - Retry/fallback logic between providers
 * - Consistent error handling
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

/**
 * Supported LLM provider types
 */
export type LLMProviderType = 'google' | 'openai' | 'anthropic';

/**
 * Provider configuration
 */
export interface LLMProviderConfig {
  provider: LLMProviderType;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

/**
 * Default models for each provider
 */
const DEFAULT_MODELS: Record<LLMProviderType, string> = {
  google: 'models/gemini-2.5-flash',
  openai: 'gpt-4-turbo',
  anthropic: 'claude-3-5-sonnet-20241022',
};

/**
 * LLM Provider Factory
 * 
 * Centralizes provider creation and configuration across all agents
 */
export class LLMProviderFactory {
  /**
   * Create a language model instance
   */
  static createLanguageModel(config: LLMProviderConfig): LanguageModel {
    this.validateConfig(config);

    switch (config.provider) {
      case 'google':
        return this.createGoogleProvider(config);
      case 'openai':
        throw new Error('OpenAI provider not yet implemented');
      case 'anthropic':
        throw new Error('Anthropic provider not yet implemented');
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Create Google Generative AI provider
   */
  private static createGoogleProvider(config: LLMProviderConfig): LanguageModel {
    const google = createGoogleGenerativeAI({ 
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    
    const model = config.model || DEFAULT_MODELS.google;
    return google(model);
  }

  /**
   * Validate provider configuration
   */
  private static validateConfig(config: LLMProviderConfig): void {
    if (!config.apiKey?.trim()) {
      throw new Error(`Missing API key for provider: ${config.provider}`);
    }

    if (!config.provider) {
      throw new Error('Provider type is required');
    }
  }

  /**
   * Get default model for a provider
   */
  static getDefaultModel(provider: LLMProviderType): string {
    return DEFAULT_MODELS[provider];
  }

  /**
   * Validate API key format (basic check)
   */
  static validateApiKey(apiKey: string, provider: LLMProviderType): boolean {
    if (!apiKey?.trim()) {
      return false;
    }

    // Provider-specific validation can be added here
    switch (provider) {
      case 'google':
        // Google API keys typically start with 'AIza'
        return apiKey.startsWith('AIza') || apiKey.length > 20;
      case 'openai':
        return apiKey.startsWith('sk-');
      case 'anthropic':
        return apiKey.startsWith('sk-ant-');
      default:
        return true;
    }
  }
}

/**
 * Helper function to extract provider config from props
 */
export function extractProviderConfig(
  props: Record<string, string>,
  defaultProvider: LLMProviderType = 'google'
): LLMProviderConfig {
  const apiKey = props.gemini_api_key || props.openai_api_key || props.anthropic_api_key;
  
  if (!apiKey) {
    throw new Error('Missing required prop: API key (gemini_api_key, openai_api_key, or anthropic_api_key)');
  }

  // Determine provider from key name
  let provider: LLMProviderType = defaultProvider;
  if (props.openai_api_key) provider = 'openai';
  if (props.anthropic_api_key) provider = 'anthropic';
  if (props.gemini_api_key) provider = 'google';

  return {
    provider,
    apiKey: apiKey.trim(),
    model: props.model,
    baseURL: props.base_url,
  };
}
