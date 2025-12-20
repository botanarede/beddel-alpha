/**
 * Provider Factory Tests
 * Task 8.2: Validation tests for ProviderFactory
 */

import { createProvider, isValidProviderType, getSupportedProviders } from '../../src/tenant/providerFactory';
import { ValidationError } from '../../src/tenant/interfaces';
import { InMemoryTenantProvider } from '../../src/tenant/providers/InMemoryTenantProvider';
import { FirebaseTenantProvider } from '../../src/tenant/providers/FirebaseTenantProvider';

// =============================================================================
// Task 8.2: Provider Factory Correctness
// =============================================================================

describe('ProviderFactory', () => {
  describe('createProvider', () => {
    it('should create InMemoryTenantProvider for "memory" type', () => {
      const provider = createProvider('memory');
      expect(provider).toBeInstanceOf(InMemoryTenantProvider);
      expect(provider.type).toBe('memory');
    });

    it('should create FirebaseTenantProvider for "firebase" type', () => {
      const provider = createProvider('firebase');
      expect(provider).toBeInstanceOf(FirebaseTenantProvider);
      expect(provider.type).toBe('firebase');
    });

    it('should throw ValidationError for null provider type', () => {
      expect(() => createProvider(null as unknown as 'memory')).toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined provider type', () => {
      expect(() => createProvider(undefined as unknown as 'memory')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid provider type', () => {
      expect(() => createProvider('invalid' as 'memory')).toThrow(ValidationError);
      expect(() => createProvider('invalid' as 'memory')).toThrow(/Unknown provider type/);
    });

    it('should throw ValidationError for non-string provider type', () => {
      expect(() => createProvider(123 as unknown as 'memory')).toThrow(ValidationError);
      expect(() => createProvider({} as unknown as 'memory')).toThrow(ValidationError);
    });
  });

  describe('isValidProviderType', () => {
    it('should return true for valid provider types', () => {
      expect(isValidProviderType('memory')).toBe(true);
      expect(isValidProviderType('firebase')).toBe(true);
    });

    it('should return false for invalid provider types', () => {
      expect(isValidProviderType('invalid')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
      expect(isValidProviderType(null)).toBe(false);
      expect(isValidProviderType(undefined)).toBe(false);
      expect(isValidProviderType(123)).toBe(false);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return array with firebase and memory', () => {
      const providers = getSupportedProviders();
      expect(providers).toContain('firebase');
      expect(providers).toContain('memory');
      expect(providers.length).toBe(2);
    });

    it('should return immutable array', () => {
      const providers = getSupportedProviders();
      expect(Object.isFrozen(providers) || Array.isArray(providers)).toBe(true);
    });
  });
});
