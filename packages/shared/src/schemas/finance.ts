import { z } from 'zod';
import { paginationSchema } from './common';

export const paymentPlanMilestoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(['BOOKING', 'AGREEMENT', 'CONSTRUCTION', 'POSSESSION', 'OTHER']).default('CONSTRUCTION'),
  sequence: z.coerce.number().int().min(0).default(0),
  basis: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  value: z.coerce.number().min(0),
  dueOffsetDays: z.coerce.number().int().min(0).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export const paymentPlanSchema = z.object({
  name: z.string().trim().min(2).max(120),
  projectId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  milestones: z.array(paymentPlanMilestoneSchema).min(1, 'At least one milestone required'),
});

export const recordPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.coerce.number().min(0.01),
  mode: z
    .enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER'])
    .default('BANK_TRANSFER'),
  reference: z.string().trim().max(80).optional().nullable(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  gateway: z.enum(['MANUAL', 'RAZORPAY']).default('MANUAL'),
  gatewayPaymentId: z.string().trim().max(120).optional().nullable(),
  /** optional explicit allocation; by default oldest-due demands are auto-allocated */
  allocations: z
    .array(z.object({ demandId: z.string().uuid(), amount: z.coerce.number().min(0.01) }))
    .optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const recordPaymentDirectSchema = recordPaymentSchema.omit({ bookingId: true }).extend({
  customerId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
});

export const requestRefundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.coerce.number().min(0.01),
  reason: z.string().trim().min(3).max(500),
});

export const decideRefundSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reference: z.string().trim().max(80).optional(),
  processed: z.boolean().default(false),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  amount: z.coerce.number().min(0.01),
  taxAmount: z.coerce.number().min(0).default(0),
  date: z.coerce.date(),
  mode: z
    .enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER'])
    .default('BANK_TRANSFER'),
  projectId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  reference: z.string().trim().max(80).optional().nullable(),
});

export const expenseStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'PAID']),
  remarks: z.string().trim().max(500).optional(),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()),
  kind: z.enum(['CAPEX', 'OPEX']).default('OPEX'),
});

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(['CASH', 'BANK', 'WALLET', 'OTHER']).default('BANK'),
  accountNumber: z.string().trim().max(30).optional().nullable(),
  bankName: z.string().trim().max(100).optional().nullable(),
  ifsc: z.string().trim().max(20).optional().nullable(),
  openingBalance: z.coerce.number().min(0).default(0),
});

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  hsn: z.string().trim().max(20).optional().nullable(),
  quantity: z.coerce.number().min(0).default(1),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0).optional(),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export const invoiceSchema = z.object({
  type: z.enum(['SALES', 'PURCHASE']).default('SALES'),
  customerId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  demandId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  reverseCharge: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1),
});

export const commissionSchema = z.object({
  bookingId: z.string().uuid(),
  payeeType: z.enum(['SALES_EXECUTIVE', 'BROKER', 'CHANNEL_PARTNER', 'AGENCY']).default('SALES_EXECUTIVE'),
  payeeId: z.string().uuid(),
  amount: z.coerce.number().min(0),
  basis: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  basisValue: z.coerce.number().min(0),
});

export const financeReportQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.string().optional(),
});

export type PaymentPlanInput = z.infer<typeof paymentPlanSchema>;
export type PaymentPlanMilestoneInput = z.infer<typeof paymentPlanMilestoneSchema>;
export type RecordPaymentDirectInput = z.infer<typeof recordPaymentDirectSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
export type DecideRefundInput = z.infer<typeof decideRefundSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseStatusInput = z.infer<typeof expenseStatusSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CommissionInput = z.infer<typeof commissionSchema>;
