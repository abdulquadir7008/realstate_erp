const SENSITIVE_KEYS = /password|passwordHash|token|refreshToken|accessToken|secret|apiKey|authorization/i;

const ENTITY_TYPES: Record<string, string> = {
  'auth': 'User',
  'users': 'User',
  'roles': 'Role',
  'organization': 'Organization',
  'branches': 'Branch',
  'projects': 'Project',
  'inventory': 'Inventory',
  'customers': 'Customer',
  'leads': 'Lead',
  'bookings': 'Booking',
  'finance': 'Finance',
  'hr': 'Employee',
  'procurement': 'Procurement',
  'boq': 'Boq',
  'construction': 'Construction',
  'tickets': 'Ticket',
  'documents': 'Document',
  'workflows': 'Workflow',
  'notifications': 'Notification',
  'reports': 'Report',
  'ai': 'Ai',
  'portal': 'Portal',
  'approvals': 'ApprovalInstance',
  'approvals-workflows': 'ApprovalWorkflow',
  'approvals-thresholds': 'ApprovalThreshold',
  'approvals-delegations': 'ApprovalDelegation',
  'approvals-escalation-rules': 'ApprovalEscalationRule',
  'approval-workflows': 'ApprovalWorkflow',
  'approval-thresholds': 'ApprovalThreshold',
  'cost-heads': 'CostHead',
  'budgets': 'ProjectBudget',
  'budget-revisions': 'BudgetRevision',
  'budget-commitments': 'BudgetCommitment',
  'budget-ledger': 'ProjectCostLedger',
  'budget-alerts': 'BudgetAlert',
  'budget-thresholds': 'BudgetThreshold',
  'purchase-orders': 'PurchaseOrder',
  'purchase-requisitions': 'PurchaseRequisition',
  'requisitions': 'PurchaseRequisition',
  'grn': 'GoodsReceipt',
  'goods-receipts': 'GoodsReceipt',
  'vendors': 'Vendor',
  'materials': 'Material',
  'material-categories': 'MaterialCategory',
  'warehouses': 'Warehouse',
  'expenses': 'Expense',
  'payments': 'Payment',
  'demands': 'Demand',
  'invoices': 'Invoice',
  'accounts': 'Account',
  'units': 'Unit',
  'buildings': 'Building',
  'floors': 'Floor',
  'tasks': 'Task',
  'site-reports': 'SiteReport',
  'employees': 'Employee',
  'leaves': 'LeaveRequest',
  'attendance': 'Attendance',
};

const ACTION_SUFFIXES = new Set([
  'approve',
  'reject',
  'return',
  'cancel',
  'submit',
  'activate',
  'lock',
  'unlock',
  'archive',
  'read',
  'read-all',
  'resolve',
  'release',
  'start',
  'run',
  'prune',
  'publish',
  'assign',
  'convert',
  'confirm',
]);

export function sanitizeAuditPayload(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (depth > 6) return '[truncated]';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAuditPayload(item, depth + 1));
  if (typeof value === 'object') {
    const toJSON = (value as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === 'function') {
      try {
        return sanitizeAuditPayload((toJSON as () => unknown).call(value), depth + 1);
      } catch {
        return String(value);
      }
    }
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = '[redacted]';
        continue;
      }
      if (typeof raw === 'function') continue;
      out[key] = sanitizeAuditPayload(raw, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}...[truncated]`;
  return value;
}

export function inferAuditAction(method: string, path: string): string {
  const upper = method.toUpperCase();
  if (upper === 'DELETE') return 'DELETE';
  if (upper === 'PATCH' || upper === 'PUT') return 'UPDATE';
  if (upper !== 'POST') return upper || 'UNKNOWN';

  const segments = path.split('?')[0]!.split('/').filter(Boolean);
  const last = (segments[segments.length - 1] ?? '').toLowerCase();
  const previous = (segments[segments.length - 2] ?? '').toLowerCase();
  const candidate = ACTION_SUFFIXES.has(last) ? last : ACTION_SUFFIXES.has(previous) ? previous : 'create';
  if (candidate === 'create') return 'CREATE';
  return candidate.toUpperCase().replace(/-/g, '_');
}

export function inferEntityType(path: string, override?: string | null): string {
  if (override) return override;
  const segments = path.split('?')[0]!.split('/').filter(Boolean);
  const apiIndex = segments.findIndex((segment) => segment === 'api');
  const start = apiIndex >= 0 ? apiIndex + 2 : 0;
  const resource = (segments[start] ?? 'Unknown').toLowerCase();
  if (segments[start + 1] && ENTITY_TYPES[`${resource}-${segments[start + 1]}`.toLowerCase()]) {
    return ENTITY_TYPES[`${resource}-${segments[start + 1]}`.toLowerCase()]!;
  }
  if (ENTITY_TYPES[resource]) return ENTITY_TYPES[resource];
  return resource
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function extractEntityId(params: Record<string, unknown> | undefined, data: unknown): string | null {
  if (params && typeof params.id === 'string' && params.id) return params.id;
  if (data && typeof data === 'object') {
    const envelope = data as Record<string, unknown>;
    if (envelope.data && typeof envelope.data === 'object') {
      return extractEntityId(params, envelope.data);
    }
    const record = data as Record<string, unknown>;
    for (const key of ['id', 'budgetId', 'commitmentId', 'revisionId', 'instanceId']) {
      if (typeof record[key] === 'string' && record[key]) return record[key] as string;
    }
    for (const key of ['budget', 'commitment', 'revision', 'instance']) {
      const nested = record[key];
      if (nested && typeof nested === 'object' && typeof (nested as Record<string, unknown>).id === 'string') {
        return (nested as Record<string, unknown>).id as string;
      }
    }
  }
  return null;
}

export function inferAuditSeverity(action: string): string {
  if (action === 'DELETE' || action === 'REJECT' || action === 'CANCEL') return 'WARN';
  return 'INFO';
}
