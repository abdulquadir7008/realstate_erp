import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  orgId: string | null;
  userId: string | null;
  email: string | null;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function currentOrgId(): string | null {
  return tenantStorage.getStore()?.orgId ?? null;
}

export function currentUserId(): string | null {
  return tenantStorage.getStore()?.userId ?? null;
}

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  // Use enterWith instead of run to ensure context persists across async operations
  tenantStorage.enterWith(store);
  return fn();
}