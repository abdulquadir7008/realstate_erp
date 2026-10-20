import { z } from 'zod';
import { paginationSchema } from './common';

export const reserveUnitSchema = z.object({
  unitId: z.string().uuid(),
  customerId: z.string().uuid(),
  holdMinutes: z.coerce.number().int().min(5).max(43200).default(120),
});

export const createBookingSchema = z.object({
  unitId: z.string().uuid(),
  customerId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  salesExecutiveId: z.string().uuid().optional().nullable(),
  brokerId: z.string().uuid().optional().nullable(),
  paymentPlanId: z.string().uuid().optional().nullable(),
  basePrice: z.coerce.number().min(0).optional(),
  negotiatedPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  otherCharges: z
    .array(z.object({ name: z.string().trim().min(1).max(80), amount: z.coerce.number().min(0), taxable: z.boolean().default(false) }))
    .default([]),
  bookingDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  /** when true, booking is confirmed immediately and demands are generated */
  confirm: z.boolean().default(true),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  projectId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  refundPolicy: z.enum(['FULL', 'PARTIAL', 'NONE']).default('PARTIAL'),
  refundAmount: z.coerce.number().min(0).optional(),
});

export const confirmBookingSchema = z.object({
  agreementDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const approveDiscountSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().trim().max(500).optional(),
});

export type ReserveUnitInput = z.infer<typeof reserveUnitSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type ApproveDiscountInput = z.infer<typeof approveDiscountSchema>;
