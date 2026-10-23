import { z } from 'zod';
import { paginationSchema } from './common';

export const approverTypeSchema = z.enum(['USER', 'ROLE', 'PERMISSION']);
export const approvalGroupModeSchema = z.enum(['ALL', 'ANY']);
export const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED']);
export const approvalThresholdScopeSchema = z.enum(['ORGANIZATION', 'PROJECT', 'SITE', 'COST_HEAD']);
export const escalationActionSchema = z.enum(['NOTIFY', 'REASSIGN']);

const entityTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .transform((value) => value.toUpperCase());

export const approvalStepSchema = z
  .object({
    sequence: z.coerce.number().int().min(1).max(50),
    name: z.string().trim().min(2).max(140),
    approverType: approverTypeSchema,
    approverRole: z.string().trim().min(1).max(60).optional().nullable(),
    approverUserId: z.string().uuid().optional().nullable(),
    approverPermission: z.string().trim().min(1).max(80).optional().nullable(),
    groupMode: approvalGroupModeSchema.default('ALL'),
    requiredApprovals: z.coerce.number().int().min(1).max(50).default(1),
    slaHours: z.coerce.number().int().min(1).max(8760).optional().nullable(),
    isOptional: z.boolean().default(false),
  })
  .superRefine((step, ctx) => {
    if (step.approverType === 'USER' && !step.approverUserId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approverUserId'], message: 'approverUserId is required for USER approvers' });
    }
    if (step.approverType === 'ROLE' && !step.approverRole) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approverRole'], message: 'approverRole is required for ROLE approvers' });
    }
    if (step.approverType === 'PERMISSION' && !step.approverPermission) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approverPermission'], message: 'approverPermission is required for PERMISSION approvers' });
    }
  });

export const approvalWorkflowSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(140),
  entityType: entityTypeSchema,
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
  steps: z.array(approvalStepSchema).min(1).max(50),
});

const approvalWorkflowBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(140),
  entityType: entityTypeSchema,
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean(),
  steps: z.array(approvalStepSchema).min(1).max(50),
});

export const updateApprovalWorkflowSchema = approvalWorkflowBaseSchema.partial();

const approvalThresholdBaseSchema = z.object({
  entityType: entityTypeSchema,
  scopeType: approvalThresholdScopeSchema.default('ORGANIZATION'),
  scopeId: z.string().uuid().optional().nullable(),
  workflowId: z.string().uuid(),
  minAmount: z.coerce.number().min(0).default(0),
  maxAmount: z.coerce.number().min(0).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

export const approvalThresholdSchema = approvalThresholdBaseSchema.superRefine((threshold, ctx) => {
  if (threshold.maxAmount !== null && threshold.maxAmount !== undefined && threshold.maxAmount < threshold.minAmount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxAmount'], message: 'maxAmount must be greater than or equal to minAmount' });
  }
  if (threshold.scopeType !== 'ORGANIZATION' && !threshold.scopeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'scopeId is required for non-organization scopes' });
  }
});

export const updateApprovalThresholdSchema = approvalThresholdBaseSchema.partial();

export const startApprovalSchema = z.object({
  workflowId: z.string().uuid().optional(),
  entityType: entityTypeSchema,
  entityId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().trim().length(3).default('INR'),
  metadata: z.record(z.unknown()).default({}),
});

export const approvalDecisionSchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const approvalRejectionSchema = z.object({
  comment: z.string().trim().min(2).max(2000),
});

export const approvalDelegationBaseSchema = z.object({
  delegateId: z.string().uuid(),
  entityType: entityTypeSchema.optional().nullable(),
  workflowId: z.string().uuid().optional().nullable(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
  reason: z.string().trim().max(1000).optional().nullable(),
});

export const approvalDelegationSchema = approvalDelegationBaseSchema.superRefine((delegation, ctx) => {
  if (delegation.validTo && delegation.validFrom && delegation.validTo < delegation.validFrom) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: 'validTo must be after validFrom' });
  }
});

export const updateApprovalDelegationSchema = approvalDelegationBaseSchema.partial();

const approvalEscalationRuleBaseSchema = z.object({
  workflowId: z.string().uuid(),
  stepSequence: z.coerce.number().int().min(1).max(50).optional().nullable(),
  afterHours: z.coerce.number().int().min(1).max(8760),
  action: escalationActionSchema.default('NOTIFY'),
  escalateToUserId: z.string().uuid().optional().nullable(),
  escalateToRole: z.string().trim().min(1).max(60).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const approvalEscalationRuleSchema = approvalEscalationRuleBaseSchema.superRefine((rule, ctx) => {
  if (rule.action === 'REASSIGN' && !rule.escalateToUserId && !rule.escalateToRole) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['escalateToUserId'], message: 'An escalation target user or role is required for REASSIGN' });
  }
});

export const updateApprovalEscalationRuleSchema = approvalEscalationRuleBaseSchema.partial();

export const approvalInstanceQuerySchema = paginationSchema.extend({
  status: approvalStatusSchema.optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(100).optional(),
  projectId: z.string().uuid().optional(),
  requestedBy: z.string().uuid().optional(),
});

export type ApproverType = z.infer<typeof approverTypeSchema>;
export type ApprovalGroupMode = z.infer<typeof approvalGroupModeSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalStepInput = z.infer<typeof approvalStepSchema>;
export type ApprovalWorkflowInput = z.infer<typeof approvalWorkflowSchema>;
export type UpdateApprovalWorkflowInput = z.infer<typeof updateApprovalWorkflowSchema>;
export type ApprovalThresholdInput = z.infer<typeof approvalThresholdSchema>;
export type UpdateApprovalThresholdInput = z.infer<typeof updateApprovalThresholdSchema>;
export type StartApprovalInput = z.infer<typeof startApprovalSchema>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type ApprovalRejectionInput = z.infer<typeof approvalRejectionSchema>;
export type ApprovalDelegationInput = z.infer<typeof approvalDelegationSchema>;
export type UpdateApprovalDelegationInput = z.infer<typeof updateApprovalDelegationSchema>;
export type ApprovalEscalationRuleInput = z.infer<typeof approvalEscalationRuleSchema>;
export type UpdateApprovalEscalationRuleInput = z.infer<typeof updateApprovalEscalationRuleSchema>;
export type ApprovalInstanceQuery = z.infer<typeof approvalInstanceQuerySchema>;
