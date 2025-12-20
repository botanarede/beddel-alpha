/**
 * Tenant Provider Tests
 * Basic unit tests for InMemoryTenantProvider and ProviderFactory
 * MVP validation for multi-tenant agnostic implementation
 */

import { InMemoryTenantProvider } from '../../src/tenant/providers/InMemoryTenantProvider';
import { createProvider, isValidProviderType, getSupportedProviders } from '../../src/tenant/providerFactory';
import {
  TenantConfig,
  ValidationError,
  NotFoundError,
  TenantAlreadyExistsError,
} from '../../src/tenant/interfaces';

// =============================================================================
// Test Helpers
// =============================================================================

const createTestConfig = (tenantId: string): TenantConfig => ({
  tenantId,
  securityProfile: 'tenant-isolated',
  dataRetentionDays: 365,
  lgpdEnabled: true,
  gdprEnabled: true,
  provider: 'memory',
  providerConfig: {},
});

// =============================================================================
// Task 8.1: InMemoryTenantProvider Unit Tests
// =============================================================================

describe('InMemoryTenantProvider', () => {
  let provider: InMemoryTenantProvider;

  beforeEach(() => {
    provider = new InMemoryTenantProvider();
  });

  describe('initialize', () => {
    it('should create a new tenant successfully', async () => {
      const config = createTestConfig('tenant-001');
      const app = await provider.initialize(config);

      expect(app).toBeDefined();
      expect(app.tenantId).toBe('tenant-001');
    });

    it('should throw TenantAlreadyExistsError for duplicate tenant', async () => {
      const config = createTestConfig('tenant-dup');
      await provider.initialize(config);

      await expect(provider.initialize(config)).rejects.toThrow(TenantAlreadyExistsError);
    });
  });

  describe('get', () => {
    it('should return existing tenant app', async () => {
      const config = createTestConfig('tenant-get');
      await provider.initialize(config);

      const app = provider.get('tenant-get');
      expect(app.tenantId).toBe('tenant-get');
    });

    it('should throw NotFoundError for non-existent tenant', () => {
      expect(() => provider.get('non-existent')).toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('should remove existing tenant', async () => {
      const config = createTestConfig('tenant-remove');
      await provider.initialize(config);

      await provider.remove('tenant-remove');

      expect(() => provider.get('tenant-remove')).toThrow(NotFoundError);
    });

    it('should throw NotFoundError when removing non-existent tenant', async () => {
      await expect(provider.remove('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return empty array when no tenants', () => {
      expect(provider.list()).toEqual([]);
    });

    it('should return all tenant IDs', async () => {
      await provider.initialize(createTestConfig('tenant-a'));
      await provider.initialize(createTestConfig('tenant-b'));

      const tenants = provider.list();
      expect(tenants).toContain('tenant-a');
      expect(tenants).toContain('tenant-b');
      expect(tenants.length).toBe(2);
    });
  });

  describe('type', () => {
    it('should return "memory" as provider type', () => {
      expect(provider.type).toBe('memory');
    });
  });
});

// =============================================================================
// Task 8.1: Database Operations (CRUD)
// =============================================================================

describe('InMemoryTenantProvider - Database Operations', () => {
  let provider: InMemoryTenantProvider;

  beforeEach(() => {
    provider = new InMemoryTenantProvider();
  });

  it('should perform basic CRUD operations on documents', async () => {
    const config = createTestConfig('tenant-crud');
    const app = await provider.initialize(config);
    const db = app.getDatabase();
    const collection = db.collection('users');
    const doc = collection.doc('user-1');

    // Create
    await doc.set({ name: 'John', email: 'john@example.com' });

    // Read
    const data = await doc.get();
    expect(data).toEqual({ name: 'John', email: 'john@example.com' });

    // Update
    await doc.update({ email: 'john.doe@example.com' });
    const updated = await doc.get();
    expect(updated).toEqual({ name: 'John', email: 'john.doe@example.com' });

    // Delete
    await doc.delete();
    const deleted = await doc.get();
    expect(deleted).toBeNull();
  });

  it('should add documents with auto-generated IDs', async () => {
    const config = createTestConfig('tenant-add');
    const app = await provider.initialize(config);
    const collection = app.getDatabase().collection('items');

    const id1 = await collection.add({ value: 1 });
    const id2 = await collection.add({ value: 2 });

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('should get all documents in collection', async () => {
    const config = createTestConfig('tenant-getall');
    const app = await provider.initialize(config);
    const collection = app.getDatabase().collection('products');

    await collection.add({ name: 'Product A' });
    await collection.add({ name: 'Product B' });

    const docs = await collection.get();
    expect(docs.length).toBe(2);
    expect(docs.map(d => d.data.name)).toContain('Product A');
    expect(docs.map(d => d.data.name)).toContain('Product B');
  });

  it('should throw NotFoundError when updating non-existent document', async () => {
    const config = createTestConfig('tenant-update-err');
    const app = await provider.initialize(config);
    const doc = app.getDatabase().collection('test').doc('non-existent');

    await expect(doc.update({ foo: 'bar' })).rejects.toThrow(NotFoundError);
  });
});
