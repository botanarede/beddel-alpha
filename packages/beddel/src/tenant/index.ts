/**
 * Agnostic Multi-Tenant Module
 * Provider-independent tenant management for Beddel
 *
 * This module provides a complete abstraction layer for multi-tenant operations,
 * allowing swappable backends (Firebase, Supabase, PostgreSQL, etc.) without
 * modifying business logic.
 *
 * @example
 * ```typescript
 * import {
 *   TenantManager,
 *   createProvider,
 *   InMemoryTenantProvider,
 *   FirebaseTenantProvider,
 * } from 'beddel/tenant';
 *
 * // Use in-memory provider for testing
 * const manager = TenantManager.getInstance();
 * const result = await manager.initializeTenant({
 *   tenantId: 'tenant-123',
 *   securityProfile: 'tenant-isolated',
 *   dataRetentionDays: 365,
 *   lgpdEnabled: true,
 *   gdprEnabled: true,
 *   provider: 'memory',
 *   providerConfig: {}
 * });
 * ```
 *
 * @module tenant
 */

// =============================================================================
// Core Manager
// =============================================================================

export { TenantManager } from './TenantManager';
export type { TenantIsolationResult } from './TenantManager';

// =============================================================================
// Interfaces and Types
// =============================================================================

export type {
  // Provider types
  ProviderType,

  // Configuration types
  TenantConfig,
  FirebaseProviderConfig,
  MemoryProviderConfig,

  // Core interfaces
  ITenantProvider,
  ITenantApp,
  ITenantDatabase,
  ITenantCollection,
  ITenantDocument,
} from './interfaces';

// Error types (classes, not just types)
export {
  TenantError,
  ValidationError,
  NotFoundError,
  NotSupportedError,
  TenantAlreadyExistsError,
} from './interfaces';

// =============================================================================
// Provider Factory
// =============================================================================

export {
  createProvider,
  isValidProviderType,
  getSupportedProviders,
} from './providerFactory';

// =============================================================================
// Provider Implementations
// =============================================================================

export { InMemoryTenantProvider } from './providers/InMemoryTenantProvider';
export { FirebaseTenantProvider } from './providers/FirebaseTenantProvider';
