/**
 * Provider Factory
 * Factory function for creating tenant providers based on configuration
 */

import {
  ProviderType,
  ITenantProvider,
  ValidationError,
} from './interfaces';
import { InMemoryTenantProvider } from './providers/InMemoryTenantProvider';
import { FirebaseTenantProvider } from './providers/FirebaseTenantProvider';

/**
 * Supported provider types for validation
 */
const SUPPORTED_PROVIDERS: readonly ProviderType[] = ['firebase', 'memory'] as const;

/**
 * Check if a value is a valid ProviderType
 */
export function isValidProviderType(type: unknown): type is ProviderType {
  return typeof type === 'string' && SUPPORTED_PROVIDERS.includes(type as ProviderType);
}

/**
 * Create a tenant provider instance based on the specified type
 * 
 * @param type - The provider type to create ('firebase' | 'memory')
 * @returns An instance of ITenantProvider for the specified type
 * @throws ValidationError if the provider type is invalid or unknown
 * 
 * @example
 * ```typescript
 * // Create an in-memory provider for testing
 * const memoryProvider = createProvider('memory');
 * 
 * // Create a Firebase provider for production
 * const firebaseProvider = createProvider('firebase');
 * ```
 */
export function createProvider(type: ProviderType): ITenantProvider {
  // Validate that type is provided
  if (type === undefined || type === null) {
    throw new ValidationError('Provider type is required');
  }

  // Validate that type is a string
  if (typeof type !== 'string') {
    throw new ValidationError(`Provider type must be a string, got ${typeof type}`);
  }

  // Validate that type is a supported provider
  if (!isValidProviderType(type)) {
    throw new ValidationError(
      `Unknown provider type: '${type}'. Supported types: ${SUPPORTED_PROVIDERS.join(', ')}`
    );
  }

  // Create and return the appropriate provider
  switch (type) {
    case 'firebase':
      return new FirebaseTenantProvider();
    case 'memory':
      return new InMemoryTenantProvider();
    default:
      // This should never be reached due to the validation above,
      // but TypeScript needs it for exhaustiveness checking
      throw new ValidationError(`Unknown provider type: ${type}`);
  }
}

/**
 * Get the list of supported provider types
 * @returns Array of supported provider type strings
 */
export function getSupportedProviders(): readonly ProviderType[] {
  return SUPPORTED_PROVIDERS;
}
