import { z } from 'zod';
import { paginationSchema } from './common';

export const customerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'COMPANY', 'NRI']).default('INDIVIDUAL'),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional().nullable(),
  companyName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().min(6).max(20),
  altPhone: z.string().trim().max(20).optional().nullable(),
  pan: z.string().trim().max(12).optional().nullable(),
  gstin: z.string().trim().max(15).optional().nullable(),
  dob: z.coerce.date().optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).default('India'),
  pincode: z.string().trim().max(12).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  password: z.string().trim().min(8).max(120).optional(),
  source: z
    .enum(['WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'IMPORT', 'BROKER', 'PORTAL', 'SOCIAL', 'CAMPAIGN', 'OTHER'])
    .default('OTHER'),
});

export const updateCustomerSchema = customerSchema.partial().extend({
  kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).optional(),
});

export const customerQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  kycStatus: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
