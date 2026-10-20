import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  legalName: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(12).optional().nullable(),
  gstin: z.string().trim().max(20).optional().nullable(),
  pan: z.string().trim().max(12).optional().nullable(),
});

export const organizationSettingsSchema = z.object({
  currency: z.string().trim().length(3).default('INR'),
  locale: z.string().trim().max(12).default('en-IN'),
  gstPercent: z.coerce.number().min(0).max(100).default(18),
  cgstPercent: z.coerce.number().min(0).max(100).default(9),
  sgstPercent: z.coerce.number().min(0).max(100).default(9),
  igstPercent: z.coerce.number().min(0).max(100).default(18),
  lateFeePercent: z.coerce.number().min(0).max(100).default(0),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12).default(4),
  bookingPrefix: z.string().trim().max(6).default('BKG'),
  leadPrefix: z.string().trim().max(6).default('LD'),
  customerPrefix: z.string().trim().max(6).default('CUS'),
  demandPrefix: z.string().trim().max(6).default('DM'),
  receiptPrefix: z.string().trim().max(6).default('RCP'),
  invoicePrefix: z.string().trim().max(6).default('INV'),
  ticketPrefix: z.string().trim().max(6).default('TKT'),
  poPrefix: z.string().trim().max(6).default('PO'),
  grnPrefix: z.string().trim().max(6).default('GRN'),
  emailNotifications: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  aiEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional().nullable(),
  isHeadquarters: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()),
  headId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const financialYearSchema = z.object({
  name: z.string().trim().min(4).max(20),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
});

export const taxRateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()),
  percent: z.coerce.number().min(0).max(100),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Use UPPER_SNAKE_CASE')
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(250).optional().nullable(),
  permissions: z.array(z.string().min(3)).min(1, 'At least one permission'),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(250).optional().nullable(),
  permissions: z.array(z.string().min(3)).min(1).optional(),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type FinancialYearInput = z.infer<typeof financialYearSchema>;
export type TaxRateInput = z.infer<typeof taxRateSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const planSchema = z.object({
  code: z.string().trim().min(2).max(30).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  currency: z.string().length(3).default('INR'),
  maxUsers: z.coerce.number().int().min(1),
  maxProjects: z.coerce.number().int().min(1),
  storageQuotaMb: z.coerce.number().int().min(1),
  maxAiRequests: z.coerce.number().int().min(0),
  trialDays: z.coerce.number().int().min(0).max(365),
  features: z
    .object({
      advancedReports: z.boolean().default(false),
      automation: z.boolean().default(false),
      apiAccess: z.boolean().default(false),
      mobileAccess: z.boolean().default(true),
      whatsapp: z.boolean().default(false),
    })
    .default({}),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
