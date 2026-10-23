import { z } from 'zod';
import { paginationSchema, moneySchema } from './common';

export const budgetStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'LOCKED',
  'SUPERSEDED',
  'REJECTED',
  'ARCHIVED',
]);
export const budgetRevisionStatusSchema = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED']);
export const commitmentStatusSchema = z.enum(['PENDING', 'COMMITTED', 'PARTIALLY_CONSUMED', 'CONSUMED', 'RELEASED', 'CANCELLED']);
export const ledgerEntrySourceSchema = z.enum([
  'MANUAL',
  'PURCHASE_ORDER',
  'PURCHASE_REQUISITION',
  'GOODS_RECEIPT',
  'SUBCONTRACTOR_BILL',
  'EXPENSE',
  'JOURNAL',
  'ADJUSTMENT',
  'COMMITMENT',
]);
export const budgetAlertTypeSchema = z.enum(['WARNING', 'CRITICAL', 'HARD_STOP']);

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9._-]+$/)
  .transform((value) => value.toUpperCase());

export const costHeadSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCostHeadSchema = costHeadSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const budgetLineSchema = z.object({
  id: z.string().uuid().optional(),
  costHeadId: z.string().uuid(),
  siteId: z.string().uuid().optional().nullable(),
  wbsId: z.string().uuid().optional().nullable(),
  wbsItemId: z.string().uuid().optional().nullable(),
  boqId: z.string().uuid().optional().nullable(),
  boqLineId: z.string().uuid().optional().nullable(),
  code: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  uom: z.string().trim().max(20).optional().nullable(),
  quantity: z.coerce.number().min(0).max(1_000_000_000).default(0),
  plannedRate: moneySchema.default(0),
  plannedAmount: moneySchema.optional(),
  forecastAmount: moneySchema.optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
});

export const budgetSchema = z.object({
  projectId: z.string().uuid(),
  siteId: z.string().uuid().optional().nullable(),
  code: codeSchema,
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional().nullable(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).default('INR'),
  contingency: moneySchema.default(0),
  lines: z.array(budgetLineSchema).min(1).max(500),
});

export const updateBudgetSchema = z.object({
  siteId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).optional(),
  contingency: moneySchema.optional(),
  lines: z.array(budgetLineSchema).min(1).max(500).optional(),
});

export const budgetRevisionChangeSchema = z.object({
  budgetLineId: z.string().uuid(),
  quantity: z.coerce.number().min(0).max(1_000_000_000).optional(),
  plannedRate: moneySchema.optional(),
  plannedAmount: moneySchema.optional(),
});

export const budgetRevisionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  justification: z.string().trim().max(4000).optional().nullable(),
  changes: z.array(budgetRevisionChangeSchema).min(1).max(500),
});

export const budgetRevisionDecisionSchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const budgetCommitmentSchema = z.object({
  budgetId: z.string().uuid().optional(),
  budgetLineId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid(),
  entityType: z.string().trim().min(2).max(60).transform((v) => v.toUpperCase()),
  entityId: z.string().trim().min(1).max(120),
  referenceNumber: z.string().trim().min(1).max(80),
  vendorId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  committedAmount: moneySchema,
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).default('INR'),
  hardStop: z.boolean().default(false),
});

export const releaseCommitmentSchema = z.object({
  releasedAmount: moneySchema.optional(),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const costLedgerEntrySchema = z.object({
  budgetId: z.string().uuid().optional(),
  budgetLineId: z.string().uuid().optional().nullable(),
  commitmentId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid(),
  costHeadId: z.string().uuid().optional().nullable(),
  entityType: ledgerEntrySourceSchema.default('MANUAL'),
  entityId: z.string().trim().max(120).optional().nullable(),
  referenceNumber: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().min(1).max(500),
  debit: moneySchema.default(0),
  credit: moneySchema.default(0),
  amount: moneySchema.optional(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).default('INR'),
  postedAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const budgetCheckSchema = z.object({
  projectId: z.string().uuid(),
  amount: moneySchema,
  costHeadId: z.string().uuid().optional().nullable(),
  budgetLineId: z.string().uuid().optional().nullable(),
  budgetId: z.string().uuid().optional(),
  entityType: z.string().trim().min(2).max(60).transform((v) => v.toUpperCase()).optional(),
  entityId: z.string().trim().max(120).optional().nullable(),
});

export const resolveBudgetAlertSchema = z.object({
  resolved: z.boolean().default(true),
});

const queryBoolean = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true' || value === '1'));

export const budgetThresholdScopeSchema = z.enum(['PROJECT', 'SITE', 'COST_HEAD', 'BUDGET']);

export const budgetThresholdSchema = z
  .object({
    scopeType: budgetThresholdScopeSchema.default('PROJECT'),
    projectId: z.string().uuid().optional().nullable(),
    budgetId: z.string().uuid().optional().nullable(),
    siteId: z.string().uuid().optional().nullable(),
    costHeadId: z.string().uuid().optional().nullable(),
    warningPercent: z.coerce.number().min(0).max(1000).default(80),
    criticalPercent: z.coerce.number().min(0).max(1000).default(95),
    hardStopPercent: z.coerce.number().min(0).max(1000).default(100),
    hardStopEnabled: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.scopeType === 'PROJECT' && !value.projectId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['projectId'], message: 'projectId is required for PROJECT scope' });
    }
    if (value.scopeType === 'SITE' && !value.siteId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siteId'], message: 'siteId is required for SITE scope' });
    }
    if (value.scopeType === 'COST_HEAD' && !value.costHeadId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['costHeadId'], message: 'costHeadId is required for COST_HEAD scope' });
    }
    if (value.scopeType === 'BUDGET' && !value.budgetId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['budgetId'], message: 'budgetId is required for BUDGET scope' });
    }
    if (value.criticalPercent < value.warningPercent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['criticalPercent'], message: 'criticalPercent must be >= warningPercent' });
    }
    if (value.hardStopPercent < value.criticalPercent) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hardStopPercent'], message: 'hardStopPercent must be >= criticalPercent' });
    }
  });

export const updateBudgetThresholdSchema = z.object({
  scopeType: budgetThresholdScopeSchema.optional(),
  projectId: z.string().uuid().optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  costHeadId: z.string().uuid().optional().nullable(),
  warningPercent: z.coerce.number().min(0).max(1000).optional(),
  criticalPercent: z.coerce.number().min(0).max(1000).optional(),
  hardStopPercent: z.coerce.number().min(0).max(1000).optional(),
  hardStopEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const budgetThresholdQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  scopeType: budgetThresholdScopeSchema.optional(),
  isActive: queryBoolean.optional(),
});

export const budgetQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  status: budgetStatusSchema.optional(),
});

export const budgetLineQuerySchema = paginationSchema.extend({
  budgetId: z.string().uuid().optional(),
  costHeadId: z.string().uuid().optional(),
});

export const commitmentQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  status: commitmentStatusSchema.optional(),
  entityType: z.string().trim().max(60).optional(),
});

export const ledgerQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  budgetLineId: z.string().uuid().optional(),
  entityType: ledgerEntrySourceSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const alertQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  isRead: queryBoolean.optional(),
  isResolved: queryBoolean.optional(),
});

export type CostHeadInput = z.infer<typeof costHeadSchema>;
export type UpdateCostHeadInput = z.infer<typeof updateCostHeadSchema>;
export type BudgetLineInput = z.infer<typeof budgetLineSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetRevisionInput = z.infer<typeof budgetRevisionSchema>;
export type BudgetCommitmentInput = z.infer<typeof budgetCommitmentSchema>;
export type CostLedgerEntryInput = z.infer<typeof costLedgerEntrySchema>;
export type BudgetCheckInput = z.infer<typeof budgetCheckSchema>;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type CommitmentQuery = z.infer<typeof commitmentQuerySchema>;
export type LedgerQuery = z.infer<typeof ledgerQuerySchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;
export type BudgetLineQuery = z.infer<typeof budgetLineQuerySchema>;
export type BudgetThresholdInput = z.infer<typeof budgetThresholdSchema>;
export type UpdateBudgetThresholdInput = z.infer<typeof updateBudgetThresholdSchema>;
export type BudgetThresholdQuery = z.infer<typeof budgetThresholdQuerySchema>;





