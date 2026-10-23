import { z } from 'zod';
import { paginationSchema } from './common';

export const boqSchema = z.object({
  name: z.string().trim().min(2).max(140),
  code: z.string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(2000).optional().nullable(),
  wbsId: z.string().uuid().optional().nullable(),
  version: z.coerce.number().int().min(1).default(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED']).default('DRAFT'),
  baselineStatus: z.enum(['PROPOSED', 'APPROVED', 'SUPERSEDED']).default('PROPOSED'),
  totalAmount: z.coerce.number().min(0).default(0),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateBoqSchema = boqSchema.partial();

export const boqQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  wbsId: z.string().uuid().optional().nullable(),
});

export const boqLineSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  wbsItemId: z.string().uuid().optional().nullable(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER']).default('MATERIAL'),
  order: z.coerce.number().int().min(0).default(0),
  level: z.coerce.number().int().min(1).max(10).default(1),
  quantity: z.coerce.number().min(0),
  unit: z.string().trim().min(1).max(20),
  uom: z.string().trim().max(20).optional().nullable(),
  rateId: z.string().uuid().optional().nullable(),
  rate: z.coerce.number().min(0).default(0),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateBoqLineSchema = boqLineSchema.partial();

export const boqVersionSchema = z.object({
  version: z.coerce.number().int().min(1),
  name: z.string().trim().min(2).max(140),
  snapshot: z.any(),
  baselineStatus: z.enum(['PROPOSED', 'APPROVED', 'SUPERSEDED']).default('PROPOSED'),
  approvedBy: z.string().uuid().optional().nullable(),
  approvedAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const rateMasterSchema = z.object({
  code: z.string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER']).default('MATERIAL'),
  unit: z.string().trim().min(1).max(20),
  uom: z.string().trim().max(20).optional().nullable(),
  baseRate: z.coerce.number().min(0),
  currency: z.string().length(3).default('INR'),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const updateRateMasterSchema = rateMasterSchema.partial();

export const rateMasterQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  status: z.string().optional(),
});

export const rateVersionSchema = z.object({
  version: z.coerce.number().int().min(1),
  name: z.string().trim().min(2).max(120),
  baseRate: z.coerce.number().min(0),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  approvedBy: z.string().uuid().optional().nullable(),
  approvedAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type BoqInput = z.infer<typeof boqSchema>;
export type UpdateBoqInput = z.infer<typeof updateBoqSchema>;
export type BoqLineInput = z.infer<typeof boqLineSchema>;
export type UpdateBoqLineInput = z.infer<typeof updateBoqLineSchema>;
export type BoqVersionInput = z.infer<typeof boqVersionSchema>;
export type RateMasterInput = z.infer<typeof rateMasterSchema>;
export type UpdateRateMasterInput = z.infer<typeof updateRateMasterSchema>;
export type RateVersionInput = z.infer<typeof rateVersionSchema>;