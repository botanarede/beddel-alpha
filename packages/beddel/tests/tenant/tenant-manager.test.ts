/**
 * TenantManager Tests
 * Task 8.3, 8.4, 8.5: Tenant lifecycle, operations, and error handling
 */

import { TenantManager } from '../../src/tenant/TenantManager';
import { InMemoryTenantProvider } from '../../src/tenant/providers/InMemoryTenantProvider';
import {
  TenantConfig,
  ValidationError,
  NotFoundError,
  TenantAlreadyExistsError,
} from '../../src/tenant/interfaces';

// =============================================================================
// Test Helpers
// =============================================================================

const createTestConfig = (tenantId: string, overrides?: Partial<TenantConfig>): TenantConfig => ({
  tenantId,
  securityProfile: 'tenant-isolated',
  dataRetentionDays: 365,
  lgpdEnabled: true,
  gdprEnabled: true,
  provider: 'memory',
  providerConfig: {},
  ...overrides,
});

// =============================================================================
// Task 8.3: Tenant Lifecycle Round-Trip
// =============================================================================

describe('TenantManager - Lifecycle', () => {
  beforeEach(() => {
    TenantManager.resetInstance();
  });

  it('should initialize tenant and return success result', async () => {
    const manager = TenantManager.getInstance();
    const config = createTestConfig('lifecycle-001');

    const result = await manager.initializeTenant(config);

    expect(result.success).toBe(true);
    expect(result.tenantId).toBe('lifecycle-001');
    expect(result.securityScore).toBeGreaterThan(0);
    expect(result.auditHash).toBeDefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should get tenant app after initialization', async () => {
    const manager = TenantManager.getInstance();
    await manager.initializeTenant(createTestConfig('lifecycle-002'));

    const app = manager.getTenantApp('lifecycle-002');
    expect(app.tenantId).toBe('lifecycle-002');
  });

  it('should remove tenant successfully', async () => {
    const manager = TenantManager.getInstance();
    await manager.initializeTenant(createTestConfig('lifecycle-003'));

    await manager.removeTenant('lifecycle-003');

    expect(() => manager.getTenantApp('lifecycle-003')).toThrow(NotFoundError);
  });

  it('should list active tenants', async () => {
    const manager = TenantManager.getInstance();
    await manager.initializeTenant(createTestConfig('list-a'));
    await manager.initializeTenant(createTestConfig('list-b'));

    const tenants = manager.getActiveTenants();
    expect(tenants).toContain('list-a');
    expect(tenants).toContain('list-b');
  });
});

// =============================================================================
// Task 8.4: Database Operations via TenantManager
// =============================================================================

describe('TenantManager - Operations', () => {
  beforeEach(() => {
    TenantManager.resetInstance();
  });

  it('should execute operation in tenant context with audit', async () => {
    const manager = TenantManager.getInstance();
    await manager.initializeTenant(createTestConfig('ops-001'));

    const result = await manager.executeInTenant(
      'ops-001',
      'test_operation',
      { input: 'test' },
      async () => ({ output: 'success' })
    );

    expect(result).toEqual({ output: 'success' });
  });

  it('should get tenant stats', async () => {
    const manager = TenantManager.getInstance();
    await manager.initializeTenant(createTestConfig('stats-001'));

    const stats = await manager.getTenantStats();
    expect(stats.has('stats-001')).toBe(true);
    expect(stats.get('stats-001')?.success).toBe(true);
  });

  it('should store and retrieve tenant config', async () => {
    const manager = TenantManager.getInstance();
    const config = createTestConfig('config-001', { dataRetentionDays: 730 });
    await manager.initializeTenant(config);

    const storedConfig = manager.getTenantConfig('config-001');
    expect(storedConfig?.dataRetentionDays).toBe(730);
  });
});

// =============================================================================
// Task 8.5: Error Handling
// =============================================================================

describe('TenantManager - Error Handling', () => {
  beforeEach(() => {
    TenantManager.resetInstance();
  });

  describe('Invalid Config Errors', () => {
    it('should throw ValidationError for short tenant ID', async () => {
      const manager = TenantManager.getInstance();
      const config = createTestConfig('ab'); // Too short

      await expect(manager.initializeTenant(config)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing provider', async () => {
      const manager = TenantManager.getInstance();
      const config = createTestConfig('valid-id');
      delete (config as Partial<TenantConfig>).provider;

      await expect(manager.initializeTenant(config)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for low data retention', async () => {
      const manager = TenantManager.getInstance();
      const config = createTestConfig('valid-id', { dataRetentionDays: 30 });

      await expect(manager.initializeTenant(config)).rejects.toThrow(ValidationError);
      await expect(manager.initializeTenant(config)).rejects.toThrow(/90 days/);
    });
  });

  describe('Tenant Already Exists', () => {
    it('should throw TenantAlreadyExistsError for duplicate tenant', async () => {
      const manager = TenantManager.getInstance();
      const config = createTestConfig('dup-tenant');

      await manager.initializeTenant(config);
      await expect(manager.initializeTenant(config)).rejects.toThrow(TenantAlreadyExistsError);
    });
  });

  describe('Not Found Errors', () => {
    it('should throw NotFoundError when getting non-existent tenant', () => {
      const manager = TenantManager.getInstance();
      manager.setProvider(new InMemoryTenantProvider());

      expect(() => manager.getTenantApp('non-existent')).toThrow(NotFoundError);
    });

    it('should throw ValidationError when no provider configured', () => {
      const manager = TenantManager.getInstance();

      expect(() => manager.getProvider()).toThrow(ValidationError);
    });
  });

  describe('Operation Errors', () => {
    it('should propagate errors from executeInTenant callback', async () => {
      const manager = TenantManager.getInstance();
      await manager.initializeTenant(createTestConfig('err-tenant'));

      await expect(
        manager.executeInTenant('err-tenant', 'failing_op', {}, async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');
    });
  });
});

// =============================================================================
// Compliance Integration
// =============================================================================

describe('TenantManager - Compliance', () => {
  beforeEach(() => {
    TenantManager.resetInstance();
  });

  it('should verify LGPD compliance when enabled', async () => {
    const manager = TenantManager.getInstance();
    const config = createTestConfig('lgpd-tenant', { lgpdEnabled: true, gdprEnabled: false });

    const result = await manager.initializeTenant(config);
    expect(result.complianceStatus.lgpd).toBe(true);
  });

  it('should verify GDPR compliance when enabled', async () => {
    const manager = TenantManager.getInstance();
    const config = createTestConfig('gdpr-tenant', { lgpdEnabled: false, gdprEnabled: true });

    const result = await manager.initializeTenant(config);
    expect(result.complianceStatus.gdpr).toBe(true);
  });

  it('should calculate higher security score for ultra-secure profile', async () => {
    const manager = TenantManager.getInstance();
    
    const isolatedConfig = createTestConfig('isolated', { securityProfile: 'tenant-isolated' });
    const ultraConfig = createTestConfig('ultra', { securityProfile: 'ultra-secure' });

    const isolatedResult = await manager.initializeTenant(isolatedConfig);
    const ultraResult = await manager.initializeTenant(ultraConfig);

    expect(ultraResult.securityScore).toBeGreaterThan(isolatedResult.securityScore);
  });
});
