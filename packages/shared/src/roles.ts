import { Action, ModuleName, PermissionCode } from './permissions';

export const SAAS_ROLE_CODES = ['SUPER_ADMIN', 'SAAS_SUPPORT', 'BILLING_ADMIN'] as const;
export type SaasRoleCode = (typeof SAAS_ROLE_CODES)[number];

export const SYSTEM_ROLE_CODES = [
  'OWNER',
  'ADMIN',
  'DIRECTOR',
  'SALES_MANAGER',
  'SALES_EXECUTIVE',
  'CRM_EXECUTIVE',
  'ACCOUNTANT',
  'FINANCE_MANAGER',
  'PROJECT_MANAGER',
  'CONSTRUCTION_MANAGER',
  'SITE_ENGINEER',
  'INVENTORY_MANAGER',
  'HR_MANAGER',
  'DOCUMENT_MANAGER',
  'CUSTOMER_SUPPORT',
  'BROKER',
  'CUSTOMER',
] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

type PermSpec = Partial<Record<ModuleName, Action[]>> & { _all?: boolean };

const cr: Action[] = ['create', 'read'];
const cru: Action[] = ['create', 'read', 'update'];
const crua: Action[] = ['create', 'read', 'update', 'delete'];
const full: Action[] = ['create', 'read', 'update', 'delete', 'approve', 'export', 'download', 'assign', 'manage'];
const read: Action[] = ['read'];
const readDl: Action[] = ['read', 'download'];
const readExp: Action[] = ['read', 'export'];

export const ROLE_TEMPLATES: Record<SystemRoleCode, { name: string; description: string; isCustomer?: boolean; permissions: PermissionCode[] }> = {
  OWNER: {
    name: 'Organization Owner',
    description: 'Full access to everything in the organization',
    permissions: ['*'] as unknown as PermissionCode[],
  },
  ADMIN: {
    name: 'Organization Admin',
    description: 'Administrative access to all modules',
    permissions: ['*'] as unknown as PermissionCode[],
  },
  DIRECTOR: {
    name: 'Director',
    description: 'Executive visibility with approval rights',
    permissions: expand({
      dashboard: full,
      project: readExp,
      unit: readExp,
      building: read,
      lead: readExp,
      customer: readExp,
      booking: ['read', 'approve', 'export'],
      payment: ['read', 'approve', 'export'],
      demand: ['read', 'export'],
      receipt: ['read', 'download'],
      expense: ['read', 'approve', 'export'],
      report: full,
      document: readDl,
      ticket: read,
      construction: readExp,
      task: read,
      audit: readExp,
      approval: ['read', 'approve', 'export'],
      budget: ['read', 'approve', 'export'],
    }),
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    description: 'Manages sales team, leads and bookings',
    permissions: expand({
      dashboard: ['read', 'export'],
      project: read,
      building: read,
      unit: readExp,
      lead: full,
      customer: cru,
      booking: ['create', 'read', 'update', 'approve', 'export', 'assign'],
      demand: read,
      receipt: readDl,
      payment: read,
      report: readExp,
      document: readDl,
      task: cru,
      notification: ['read', 'manage'],
    }),
  },
  SALES_EXECUTIVE: {
    name: 'Sales Executive',
    description: 'Day-to-day sales activities',
    permissions: expand({
      dashboard: read,
      project: read,
      unit: read,
      building: read,
      lead: cru,
      customer: cru,
      booking: cr,
      demand: read,
      receipt: readDl,
      task: ['read', 'update'],
      document: readDl,
      notification: ['read', 'manage'],
    }),
  },
  CRM_EXECUTIVE: {
    name: 'CRM Executive',
    description: 'Lead nurturing and customer relationship management',
    permissions: expand({
      dashboard: read,
      lead: full,
      customer: cru,
      unit: read,
      project: read,
      booking: read,
      task: cru,
      document: readDl,
      report: readExp,
      notification: ['read', 'manage'],
    }),
  },
  ACCOUNTANT: {
    name: 'Accountant',
    description: 'Payments, receipts, expenses and financial records',
    permissions: expand({
      dashboard: ['read', 'export'],
      customer: readExp,
      booking: read,
      unit: read,
      project: read,
      payment: full,
      demand: full,
      receipt: full,
      refund: cru,
      expense: full,
      invoice: full,
      account: full,
      report: full,
      document: readDl,
      vendor: read,
      approval: ['read'],
      budget: readExp,
      notification: ['read', 'manage'],
    }),
  },
  FINANCE_MANAGER: {
    name: 'Finance Manager',
    description: 'Approvals and oversight across finance',
    permissions: expand({
      dashboard: ['read', 'export'],
      customer: readExp,
      booking: read,
      unit: read,
      project: read,
      payment: full,
      demand: full,
      receipt: full,
      refund: full,
      expense: full,
      invoice: full,
      account: full,
      report: full,
      document: readDl,
      vendor: readExp,
      audit: readExp,
      approval: ['read', 'approve', 'export', 'manage'],
      budget: full,
      notification: ['read', 'manage'],
    }),
  },
  PROJECT_MANAGER: {
    name: 'Project Manager',
    description: 'Owns project delivery, budgets and construction',
    permissions: expand({
      dashboard: ['read', 'export'],
      project: full,
      building: full,
      floor: full,
      unit: full,
      construction: full,
      task: full,
      site_report: full,
      material: full,
      vendor: full,
      purchase: full,
      document: full,
      report: readExp,
      lead: read,
      customer: read,
      approval: ['create', 'read', 'approve', 'manage'],
      budget: full,
      booking: read,
      notification: ['read', 'manage'],
    }),
  },
  CONSTRUCTION_MANAGER: {
    name: 'Construction Manager',
    description: 'Construction execution and contractors',
    permissions: expand({
      dashboard: read,
      project: read,
      building: ['read', 'update'],
      construction: full,
      task: full,
      site_report: full,
      material: full,
      vendor: full,
      purchase: full,
      document: full,
      report: readExp,
      approval: ['read', 'approve'],
      budget: ['read', 'create', 'update', 'export'],
    }),
  },
  SITE_ENGINEER: {
    name: 'Site Engineer',
    description: 'On-site progress reporting and quality checks',
    permissions: expand({
      dashboard: read,
      project: read,
      building: read,
      construction: ['read', 'update'],
      task: ['read', 'update', 'create'],
      site_report: full,
      material: ['read', 'create', 'update'],
      document: ['create', 'read', 'download'],
      approval: ['read'],
      budget: ['read'],
    }),
  },
  INVENTORY_MANAGER: {
    name: 'Inventory Manager',
    description: 'Property inventory and unit availability',
    permissions: expand({
      dashboard: read,
      project: read,
      building: full,
      floor: full,
      unit: full,
      inventory: full,
      report: readExp,
      document: readDl,
      booking: read,
      budget: ['read'],
    }),
  },
  HR_MANAGER: {
    name: 'HR Manager',
    description: 'Employees, attendance and leaves',
    permissions: expand({
      dashboard: read,
      employee: full,
      user: ['read', 'create', 'update', 'assign'],
      branch: read,
      department: read,
      document: full,
      report: readExp,
    }),
  },
  DOCUMENT_MANAGER: {
    name: 'Document Manager',
    description: 'Central document control',
    permissions: expand({
      dashboard: read,
      document: full,
      project: read,
      customer: read,
      booking: read,
      vendor: read,
    }),
  },
  CUSTOMER_SUPPORT: {
    name: 'Customer Support Executive',
    description: 'Complaints, service requests and handovers',
    permissions: expand({
      dashboard: read,
      ticket: full,
      handover: full,
      customer: read,
      booking: read,
      unit: read,
      project: read,
      document: readDl,
      notification: ['read', 'manage'],
    }),
  },
  BROKER: {
    name: 'Channel Partner / Broker',
    description: 'External partner with limited sales visibility',
    permissions: expand({
      lead: cru,
      unit: read,
      project: read,
      customer: ['read', 'create'],
      booking: ['create', 'read'],
      document: read,
      dashboard: read,
    }),
  },
  CUSTOMER: {
    name: 'Property Customer',
    description: 'Self-service portal access',
    isCustomer: true,
    permissions: expand({
      dashboard: read,
      booking: read,
      demand: read,
      payment: read,
      receipt: ['read', 'download'],
      document: readDl,
      ticket: cr,
      handover: read,
      construction: read,
      notification: ['read', 'manage'],
      project: read,
      unit: read,
    }),
  },
};

function expand(spec: PermSpec): PermissionCode[] {
  if (spec._all) return ['*'] as unknown as PermissionCode[];
  const out: PermissionCode[] = [];
  for (const [module, actions] of Object.entries(spec) as [ModuleName, Action[] | undefined][]) {
    if (!actions) continue;
    for (const a of actions) out.push(`${module}:${a}` as PermissionCode);
  }
  return Array.from(new Set(out));
}

export function roleHasPermission(granted: string[], permission: string): boolean {
  if (granted.includes('*')) return true;
  if (granted.includes(permission)) return true;
  const [module, action] = permission.split(':');
  // "module:manage" implies all actions on the module; "module:*" implies all actions
  if (granted.includes(`${module}:manage`) || granted.includes(`${module}:*`)) return true;
  // "*:action" implies action on every module
  if (granted.includes(`*:${action}`)) return true;
  return false;
}


