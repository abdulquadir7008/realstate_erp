import { z } from 'zod';

export const idSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const moneySchema = z.coerce
  .number()
  .min(0, 'Must be positive')
  .max(999_999_999_999, 'Amount too large');

export const optionalId = idSchema.optional().nullable();

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      code: 'VALIDATION_ERROR',
      details: result.error.flatten(),
    });
  }
  return result.data as z.infer<T>;
}
