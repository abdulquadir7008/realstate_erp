import { z } from 'zod';
import { paginationSchema } from './common';

export const projectSchema = z.object({
  name: z.string().trim().min(2).max(140),
  code: z.string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'VILLA', 'APARTMENT', 'MIXED_USE']).default('RESIDENTIAL'),
  status: z
    .enum(['PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .default('PLANNING'),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  totalBudget: z.coerce.number().min(0).default(0),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
});

export const updateProjectSchema = projectSchema.partial();

export const projectQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  type: z.string().optional(),
  branchId: z.string().uuid().optional(),
});

export const milestoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']).default('PENDING'),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
});

export const updateMilestoneSchema = milestoneSchema.partial();

export type ProjectInput = z.infer<typeof projectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ============================================================ Site & WBS

export const siteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((s) => s.toUpperCase()),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  areaSqft: z.coerce.number().min(0).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
});

export const updateSiteSchema = siteSchema.partial();

export const siteQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

export const wbsSchema = z.object({
  name: z.string().trim().min(2).max(140),
  code: z.string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(2000).optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  version: z.coerce.number().int().min(1).default(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  baselineStatus: z.enum(['PROPOSED', 'APPROVED', 'SUPERSEDED']).default('PROPOSED'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateWbsSchema = wbsSchema.partial();

export const wbsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  siteId: z.string().uuid().optional().nullable(),
});

export const wbsItemSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(['SUMMARY', 'WORK_PACKAGE', 'MILESTONE']).default('WORK_PACKAGE'),
  order: z.coerce.number().int().min(0).default(0),
  level: z.coerce.number().int().min(1).max(10).default(1),
  quantity: z.coerce.number().min(0).optional().nullable(),
  unit: z.string().trim().max(20).optional().nullable(),
  uom: z.string().trim().max(20).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  plannedCost: z.coerce.number().min(0).default(0),
  actualCost: z.coerce.number().min(0).default(0),
  committedCost: z.coerce.number().min(0).default(0),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).default('PENDING'),
});

export const updateWbsItemSchema = wbsItemSchema.partial();

export const wbsVersionSchema = z.object({
  version: z.coerce.number().int().min(1),
  name: z.string().trim().min(2).max(140),
  snapshot: z.any(),
  baselineStatus: z.enum(['PROPOSED', 'APPROVED', 'SUPERSEDED']).default('PROPOSED'),
  approvedBy: z.string().uuid().optional().nullable(),
  approvedAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type SiteInput = z.infer<typeof siteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export type WbsInput = z.infer<typeof wbsSchema>;
export type UpdateWbsInput = z.infer<typeof updateWbsSchema>;
export type WbsItemInput = z.infer<typeof wbsItemSchema>;
export type UpdateWbsItemInput = z.infer<typeof updateWbsItemSchema>;
export type WbsVersionInput = z.infer<typeof wbsVersionSchema>;
