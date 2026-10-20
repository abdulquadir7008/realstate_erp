import { z } from 'zod';
import { paginationSchema } from './common';

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().optional().nullable().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number'),
  altPhone: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  source: z
    .enum(['WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'IMPORT', 'BROKER', 'PORTAL', 'SOCIAL', 'CAMPAIGN', 'OTHER'])
    .default('WEBSITE'),
  propertyType: z.string().trim().max(40).optional().nullable(),
  budgetMin: z.coerce.number().min(0).optional().nullable(),
  budgetMax: z.coerce.number().min(0).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
});

export const updateLeadSchema = leadSchema.partial().extend({
  status: z
    .enum(['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'UNQUALIFIED'])
    .optional(),
  lostReason: z.string().trim().max(300).optional().nullable(),
});

export const leadQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  unassignedOnly: z.coerce.boolean().optional(),
});

export const leadActivitySchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'SITE_VISIT']),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional().nullable(),
  subject: z.string().trim().max(160).optional().nullable(),
  content: z.string().trim().max(4000).optional().nullable(),
  durationSec: z.coerce.number().int().min(0).optional().nullable(),
  occurredAt: z.coerce.date().optional(),
});

export const followUpSchema = z.object({
  scheduledAt: z.coerce.date(),
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'SITE_VISIT']).default('CALL'),
  notes: z.string().trim().max(1000).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  status: z.enum(['PENDING', 'DONE', 'MISSED', 'CANCELLED']).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  completedAt: z.coerce.date().optional(),
});

export const convertLeadSchema = z.object({
  customer: z.object({
    type: z.enum(['INDIVIDUAL', 'COMPANY', 'NRI']).default('INDIVIDUAL'),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().max(60).optional().nullable(),
    email: z.string().trim().toLowerCase().email().optional().nullable().or(z.literal('')),
    phone: z.string().trim().min(6).max(20),
    city: z.string().trim().max(80).optional().nullable(),
    address: z.string().trim().max(400).optional().nullable(),
    pan: z.string().trim().max(12).optional().nullable(),
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
