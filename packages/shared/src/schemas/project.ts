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
