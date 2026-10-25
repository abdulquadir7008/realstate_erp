import { PrismaService } from '../../prisma/prisma.service';
import { currentOrgId } from '../../prisma/tenant-context';
import { errors } from '../api-error';

export function monthPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Maps a counter scope to the organization settings key holding its prefix. */
const PREFIX_SETTING: Record<string, string> = {
  LEAD: 'leadPrefix',
  CUSTOMER: 'customerPrefix',
  BOOKING: 'bookingPrefix',
  DEMAND: 'demandPrefix',
  RECEIPT: 'receiptPrefix',
  INVOICE: 'invoicePrefix',
  TICKET: 'ticketPrefix',
  PO: 'poPrefix',
  GRN: 'grnPrefix',
  EXPENSE: 'expensePrefix',
};

const DEFAULT_PREFIX: Record<string, string> = {
  LEAD: 'LD',
  CUSTOMER: 'CUS',
  BOOKING: 'BKG',
  DEMAND: 'DM',
  RECEIPT: 'RCP',
  INVOICE: 'INV',
  TICKET: 'TKT',
  PO: 'PO',
  GRN: 'GRN',
  EXPENSE: 'EXP',
};

export function requireTenantId(): string {
  const orgId = currentOrgId();
  if (!orgId) {
    throw errors.internal('Missing tenant context for sequence generation');
  }
  return orgId;
}

/**
 * Atomically increments and returns the next human-friendly code for a
 * tenant-scoped counter (e.g. BKG202610-00001). Uses a raw upsert to stay race-safe.
 */
export async function nextSequence(
  prisma: PrismaService,
  scope: string,
  prefix: string,
  period = 'ALL',
): Promise<string> {
  const orgId = requireTenantId();

  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("id", "organizationId", "scope", "period", "value")
    VALUES (gen_random_uuid(), ${orgId}::uuid, ${scope}, ${period}, 1)
    ON CONFLICT ("organizationId", "scope", "period")
    DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"
  `;

  const value = Number(rows[0]?.value ?? 1);
  const periodPart = period === 'ALL' ? '' : period.replace('-', '');
  return `${prefix}${periodPart}-${String(value).padStart(5, '0')}`;
}

/** Generates the next code for a scope using the tenant's configured prefix. */
export async function nextCode(prisma: PrismaService, scope: string, period = 'ALL'): Promise<string> {
  const orgId = requireTenantId();
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const key = PREFIX_SETTING[scope];
  const prefix = (key && (settings[key] as string)) || DEFAULT_PREFIX[scope] || 'DOC';
  return nextSequence(prisma, scope, prefix, period);
}
