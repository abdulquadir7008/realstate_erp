import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class CacheManagerService implements OnModuleInit, OnModuleDestroy {
  private cache: Map<string, { value: any; expiresAt: number }>;

  private readonly logger = new Logger(CacheManagerService.name);
  private readonly ttl = 300000; // 5 minutes in ms

  onModuleInit() {
    // 5-minute TTL, maximum 100 items in cache
    this.cache = new Map();
    this.logger.log('Cache manager initialized (TTL: 5min, max: 100 keys)');
  }

  onModuleDestroy() {
    this.logger.log('Cache manager destroyed');
  }

  // ---------------- Generic cache methods

  set<T>(key: string, value: T): boolean {
    if (this.cache.size >= 100) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
    return true;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  del(key: string): boolean {
    return this.cache.delete(key);
  }

  flush(): boolean {
    this.cache.clear();
    return true;
  }

  // ---------------- Query cache keys

  static keys = {
    qhse_dashboard(projectId?: string): string {
      return `qhse:dashboard:${projectId || 'global'}`;
    },

    qhse_compliance_report(projectId: string, periodFrom: string, periodTo: string): string {
      return `qhse:report:compliance:${projectId}:${periodFrom}:${periodTo}`;
    },

    hr_employee(employeeId: string): string {
      return `hr:employee:${employeeId}`;
    },

    hr_leave_balance(employeeId: string): string {
      return `hr:leave:balance:${employeeId}`;
    },

    subcontractor_workorder(workOrderId: string): string {
      return `subcontractor:wo:${workOrderId}`;
    },

    finance_cash_flow(projectId?: string): string {
      return `finance:cashflow:${projectId || 'global'}`;
    },

    documents_list(folder?: string, projectId?: string): string {
      return `docs:list:${folder || ''}:${projectId || ''}`;
    },

    field_form(formType: string, projectId: string): string {
      return `fld:form:${formType}:${projectId}`;
    },
  }
}