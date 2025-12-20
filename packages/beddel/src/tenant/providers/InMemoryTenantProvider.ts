/**
 * In-Memory Tenant Provider
 * Implements ITenantProvider for testing without external dependencies
 */

import {
  ITenantProvider,
  ITenantApp,
  ITenantDatabase,
  ITenantCollection,
  ITenantDocument,
  TenantConfig,
  ProviderType,
  NotFoundError,
  TenantAlreadyExistsError,
} from '../interfaces';

// =============================================================================
// In-Memory Document Implementation
// =============================================================================

class InMemoryDocument implements ITenantDocument {
  constructor(
    private storage: Map<string, Record<string, unknown>>,
    private docId: string
  ) {}

  async get(): Promise<Record<string, unknown> | null> {
    return this.storage.get(this.docId) ?? null;
  }

  async set(data: Record<string, unknown>): Promise<void> {
    this.storage.set(this.docId, { ...data });
  }

  async update(data: Record<string, unknown>): Promise<void> {
    const existing = this.storage.get(this.docId);
    if (!existing) {
      throw new NotFoundError(`Document '${this.docId}' not found`);
    }
    this.storage.set(this.docId, { ...existing, ...data });
  }

  async delete(): Promise<void> {
    this.storage.delete(this.docId);
  }
}


// =============================================================================
// In-Memory Collection Implementation
// =============================================================================

class InMemoryCollection implements ITenantCollection {
  private documents: Map<string, Record<string, unknown>> = new Map();
  private autoIdCounter = 0;

  constructor(private collectionName: string) {}

  doc(id: string): ITenantDocument {
    return new InMemoryDocument(this.documents, id);
  }

  async add(data: Record<string, unknown>): Promise<string> {
    const id = `${this.collectionName}_${++this.autoIdCounter}_${Date.now()}`;
    this.documents.set(id, { ...data });
    return id;
  }

  async get(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const results: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const [id, data] of this.documents) {
      results.push({ id, data: { ...data } });
    }
    return results;
  }
}

// =============================================================================
// In-Memory Database Implementation
// =============================================================================

class InMemoryDatabase implements ITenantDatabase {
  private collections: Map<string, InMemoryCollection> = new Map();

  collection(name: string): ITenantCollection {
    let coll = this.collections.get(name);
    if (!coll) {
      coll = new InMemoryCollection(name);
      this.collections.set(name, coll);
    }
    return coll;
  }
}


// =============================================================================
// In-Memory Tenant App Implementation
// =============================================================================

class InMemoryTenantApp implements ITenantApp {
  private database: InMemoryDatabase;
  private destroyed = false;

  constructor(
    public readonly tenantId: string,
    public readonly config: TenantConfig
  ) {
    this.database = new InMemoryDatabase();
  }

  getDatabase(): ITenantDatabase {
    if (this.destroyed) {
      throw new NotFoundError(`Tenant '${this.tenantId}' has been destroyed`);
    }
    return this.database;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    // Clear internal references to allow garbage collection
    this.database = null as unknown as InMemoryDatabase;
  }
}

// =============================================================================
// In-Memory Tenant Provider Implementation
// =============================================================================

/**
 * In-memory implementation of ITenantProvider
 * Useful for testing without external dependencies
 */
export class InMemoryTenantProvider implements ITenantProvider {
  public readonly type: ProviderType = 'memory';
  private tenants: Map<string, InMemoryTenantApp> = new Map();

  async initialize(config: TenantConfig): Promise<ITenantApp> {
    if (this.tenants.has(config.tenantId)) {
      throw new TenantAlreadyExistsError(config.tenantId);
    }

    const app = new InMemoryTenantApp(config.tenantId, config);
    this.tenants.set(config.tenantId, app);
    return app;
  }

  get(tenantId: string): ITenantApp {
    const app = this.tenants.get(tenantId);
    if (!app) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }
    return app;
  }

  async remove(tenantId: string): Promise<void> {
    const app = this.tenants.get(tenantId);
    if (!app) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }
    await app.destroy();
    this.tenants.delete(tenantId);
  }

  list(): string[] {
    return Array.from(this.tenants.keys());
  }
}
