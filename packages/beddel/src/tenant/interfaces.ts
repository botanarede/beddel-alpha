/**
 * Agnostic Multi-Tenant Interfaces
 * Provider-independent abstractions for multi-tenant operations
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Supported provider types for multi-tenant backend
 */
export type ProviderType = 'firebase' | 'memory';

// =============================================================================
// Provider-Specific Configurations
// =============================================================================

/**
 * Firebase-specific provider configuration
 */
export interface FirebaseProviderConfig {
  projectId: string;
  databaseURL: string;
  storageBucket: string;
}

/**
 * In-memory provider configuration (for testing)
 */
export interface MemoryProviderConfig {
  persistToDisk?: boolean;
}

// =============================================================================
// Agnostic Tenant Configuration
// =============================================================================

/**
 * Provider-agnostic tenant configuration
 */
export interface TenantConfig {
  tenantId: string;
  securityProfile: 'ultra-secure' | 'tenant-isolated';
  dataRetentionDays: number;
  lgpdEnabled: boolean;
  gdprEnabled: boolean;
  provider: ProviderType;
  providerConfig: FirebaseProviderConfig | MemoryProviderConfig;
}

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Abstract provider interface for tenant management
 * Implements Strategy pattern for swappable backends
 */
export interface ITenantProvider {
  /**
   * Initialize a new tenant with the given configuration
   * @throws TenantAlreadyExistsError if tenant already exists
   * @throws ValidationError if configuration is invalid
   */
  initialize(config: TenantConfig): Promise<ITenantApp>;

  /**
   * Get an existing tenant app by ID
   * @throws NotFoundError if tenant does not exist
   */
  get(tenantId: string): ITenantApp;

  /**
   * Remove a tenant and release all associated resources
   * @throws NotFoundError if tenant does not exist
   */
  remove(tenantId: string): Promise<void>;

  /**
   * List all active tenant IDs
   */
  list(): string[];

  /**
   * The type of this provider
   */
  readonly type: ProviderType;
}

/**
 * Abstract tenant app representing an isolated tenant instance
 */
export interface ITenantApp {
  /**
   * Unique identifier for this tenant
   */
  readonly tenantId: string;

  /**
   * Get the database interface for this tenant
   */
  getDatabase(): ITenantDatabase;

  /**
   * Destroy this tenant app and release resources
   */
  destroy(): Promise<void>;
}

/**
 * Abstract database interface for tenant data operations
 */
export interface ITenantDatabase {
  /**
   * Get a collection by name
   */
  collection(name: string): ITenantCollection;
}

/**
 * Abstract collection interface for document operations
 */
export interface ITenantCollection {
  /**
   * Get a document reference by ID
   */
  doc(id: string): ITenantDocument;

  /**
   * Add a new document with auto-generated ID
   * @returns The generated document ID
   */
  add(data: Record<string, unknown>): Promise<string>;

  /**
   * Get all documents in this collection
   */
  get(): Promise<Array<{ id: string; data: Record<string, unknown> }>>;
}

/**
 * Abstract document interface for CRUD operations
 */
export interface ITenantDocument {
  /**
   * Get the document data
   * @returns Document data or null if not found
   */
  get(): Promise<Record<string, unknown> | null>;

  /**
   * Set the document data (creates or overwrites)
   */
  set(data: Record<string, unknown>): Promise<void>;

  /**
   * Update specific fields in the document
   * @throws NotFoundError if document does not exist
   */
  update(data: Record<string, unknown>): Promise<void>;

  /**
   * Delete the document
   */
  delete(): Promise<void>;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Base error for tenant operations
 */
export class TenantError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TenantError';
    Object.setPrototypeOf(this, TenantError.prototype);
  }
}

/**
 * Thrown when configuration validation fails
 */
export class ValidationError extends TenantError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends TenantError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when an operation is not supported by the provider
 */
export class NotSupportedError extends TenantError {
  constructor(message: string) {
    super(message, 'NOT_SUPPORTED');
    this.name = 'NotSupportedError';
    Object.setPrototypeOf(this, NotSupportedError.prototype);
  }
}

/**
 * Thrown when attempting to create a tenant that already exists
 */
export class TenantAlreadyExistsError extends TenantError {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' already exists`, 'TENANT_EXISTS');
    this.name = 'TenantAlreadyExistsError';
    Object.setPrototypeOf(this, TenantAlreadyExistsError.prototype);
  }
}
