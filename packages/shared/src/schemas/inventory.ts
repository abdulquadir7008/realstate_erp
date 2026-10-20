import { z } from 'zod';
import { paginationSchema } from './common';

export const buildingSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  code: z.string()
    .trim()
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase()),
  type: z.enum(['TOWER', 'BLOCK', 'VILLA_ROW', 'PLOT_SECTION', 'STANDALONE']).default('TOWER'),
  totalFloors: z.coerce.number().int().min(1).max(200).default(1),
  description: z.string().trim().max(1000).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
});

export const floorSchema = z.object({
  buildingId: z.string().uuid(),
  label: z.string().trim().min(1).max(20),
  floorNumber: z.coerce.number().int().min(-5).max(300).default(0),
  order: z.coerce.number().int().min(0).default(0),
});

export const unitExtraChargeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.coerce.number().min(0),
  taxable: z.boolean().default(false),
});

export const unitSchema = z.object({
  projectId: z.string().uuid(),
  buildingId: z.string().uuid(),
  floorId: z.string().uuid(),
  unitNumber: z.string().trim().min(1).max(30),
  type: z.enum(['APARTMENT', 'VILLA', 'PLOT', 'SHOP', 'OFFICE', 'LAND', 'PARKING', 'OTHER']).default('APARTMENT'),
  configuration: z.string().trim().max(40).optional().nullable(),
  carpetArea: z.coerce.number().min(0).optional().nullable(),
  builtUpArea: z.coerce.number().min(0).optional().nullable(),
  superBuiltUpArea: z.coerce.number().min(0).optional().nullable(),
  basePrice: z.coerce.number().min(0).default(0),
  pricePerSqft: z.coerce.number().min(0).optional().nullable(),
  additionalCharges: z.array(unitExtraChargeSchema).default([]),
  parkingSlots: z.array(z.string().trim().max(20)).default([]),
  facing: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateUnitSchema = unitSchema.omit({ projectId: true, buildingId: true, floorId: true }).partial().extend({
  status: z
    .enum(['AVAILABLE', 'ON_HOLD', 'RESERVED', 'BOOKED', 'AGREEMENT_PENDING', 'SOLD', 'CANCELLED', 'BLOCKED'])
    .optional(),
});

export const bulkGenerateUnitsSchema = z.object({
  buildingId: z.string().uuid(),
  fromFloor: z.coerce.number().int().min(-5).max(300),
  toFloor: z.coerce.number().int().min(-5).max(300),
  unitsPerFloor: z.coerce.number().int().min(1).max(50),
  prefix: z.string().trim().max(10).default(''),
  numbering: z.enum(['FLOOR_FIRST', 'SEQUENTIAL']).default('FLOOR_FIRST'),
  startNumber: z.coerce.number().int().min(1).default(1),
  type: z.enum(['APARTMENT', 'VILLA', 'PLOT', 'SHOP', 'OFFICE', 'LAND', 'PARKING', 'OTHER']).default('APARTMENT'),
  configuration: z.string().trim().max(40).optional().nullable(),
  carpetArea: z.coerce.number().min(0).optional().nullable(),
  builtUpArea: z.coerce.number().min(0).optional().nullable(),
  superBuiltUpArea: z.coerce.number().min(0).optional().nullable(),
  basePrice: z.coerce.number().min(0).default(0),
  typeOverrides: z
    .array(
      z.object({
        floorNumber: z.coerce.number().int(),
        type: z.enum(['APARTMENT', 'VILLA', 'PLOT', 'SHOP', 'OFFICE', 'LAND', 'PARKING', 'OTHER']),
        basePrice: z.coerce.number().min(0).optional(),
      }),
    )
    .default([]),
});

export const unitQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

export const updateUnitStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'ON_HOLD', 'RESERVED', 'BOOKED', 'AGREEMENT_PENDING', 'SOLD', 'CANCELLED', 'BLOCKED']),
  notes: z.string().trim().max(500).optional(),
  holdMinutes: z.coerce.number().int().min(5).max(43200).default(120),
});

export type BuildingInput = z.infer<typeof buildingSchema>;
export type FloorInput = z.infer<typeof floorSchema>;
export type UnitInput = z.infer<typeof unitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type BulkGenerateUnitsInput = z.infer<typeof bulkGenerateUnitsSchema>;
export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusSchema>;
