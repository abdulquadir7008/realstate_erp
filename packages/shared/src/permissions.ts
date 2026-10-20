export const ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'export', 'download', 'assign', 'manage'] as const;
export type Action = (typeof ACTIONS)[number];

export const MODULES = [
  'dashboard',
  'organization',
  'user',
  'role',
  'branch',
  'department',
  'employee',
  'project',
  'building',
  'floor',
  'unit',
  'inventory',
  'lead',
  'customer',
  'booking',
  'payment',
  'demand',
  'receipt',
  'refund',
  'expense',
  'invoice',
  'account',
  'document',
  'vendor',
  'purchase',
  'material',
  'construction',
  'task',
  'site_report',
  'ticket',
  'handover',
  'report',
  'workflow',
  'notification',
  'settings',
  'subscription',
  'plan',
  'audit',
] as const;
export type ModuleName = (typeof MODULES)[number];

export const PERMISSIONS: { code: string; module: ModuleName; action: Action; description: string }[] = MODULES.flatMap(
  (module) =>
    ACTIONS.map((action) => ({
      code: `${module}:${action}`,
      module,
      action,
      description: `${action.toUpperCase()} ${module.replace('_', ' ')}`,
    })),
);

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

export type PermissionCode = `${ModuleName}:${Action}`;

export const allPermissions = (modules?: ModuleName[]): PermissionCode[] =>
  (modules ?? [...MODULES]).flatMap((m) => ACTIONS.map((a) => `${m}:${a}` as PermissionCode));
