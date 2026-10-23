import { z } from 'zod';
import { paginationSchema } from './common';

export const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  severity: z.enum(['INFO', 'WARN', 'CRITICAL']).optional(),
  correlationId: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().optional(),
});

export const auditPruneSchema = z.object({
  retentionDays: z.coerce.number().int().min(1).max(36500).optional(),
  dryRun: z.boolean().optional().default(false),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type AuditPruneInput = z.infer<typeof auditPruneSchema>;
