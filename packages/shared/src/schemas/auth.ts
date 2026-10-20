import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[A-Za-z]/, 'Must contain a letter')
  .regex(/[0-9]/, 'Must contain a number');

export const emailSchema = z.string().trim().toLowerCase().email('Invalid email');

export const registerOrganizationSchema = z.object({
  organization: z.object({
    name: z.string().trim().min(2).max(120),
    legalName: z.string().trim().max(160).optional(),
    email: emailSchema,
    phone: z.string().trim().min(6).max(20).optional(),
    website: z.string().trim().url().optional().or(z.literal('')),
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    country: z.string().trim().max(80).default('India'),
  }),
  owner: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().max(60).optional(),
    email: emailSchema,
    phone: z.string().trim().min(6).max(20).optional(),
    password: passwordSchema,
  }),
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  organizationSlug: z.string().trim().max(80).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  roleCodes: z.array(z.string().min(1)).min(1, 'At least one role is required'),
  designation: z.string().trim().max(80).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  password: passwordSchema,
});

export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  password: passwordSchema,
  roleCodes: z.array(z.string().min(1)).min(1),
  designation: z.string().trim().max(80).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  designation: z.string().trim().max(80).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  roleCodes: z.array(z.string().min(1)).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
