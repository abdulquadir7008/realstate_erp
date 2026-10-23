import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogQuery, AuditPruneInput } from '@re/shared';
import { escapeLike, pageOffset, paginated } from '../../common/utils/pagination';
import { requireOrgId } from '../../common/utils/tenant';

const logger = new Logger('AuditService');

export interface AuditEntryInput {
  organizationId: string;
  userId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  changes?: unknown;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity?: string;
  correlationId?: string | null;
}

export interface AuditStatsQuery {
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit entry asynchronously. Failures never propagate to the caller
   * so auditing cannot break a business transaction.
   */
  record(input: AuditEntryInput): void {
    setImmediate(() => {
      void this.prisma.auditLog
        .create({
          data: {
            organizationId: input.organizationId,
            userId: input.userId ?? null,
            actorEmail: input.actorEmail ?? null,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            description: input.description ?? null,
            changes: (input.changes ?? {}) as any,
            before: (input.before ?? null) as any,
            after: (input.after ?? null) as any,
            correlationId: input.correlationId ?? null,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            severity: input.severity ?? 'INFO',
          },
        })
        .catch((error) => {
          logger.warn(`Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`);
        });
    });
  }

  async list(q: AuditLogQuery) {
    const where: any = { organizationId: requireOrgId() };
    if (q.action) where.action = q.action.toUpperCase();
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;
    if (q.userId) where.userId = q.userId;
    if (q.severity) where.severity = q.severity;
    if (q.correlationId) where.correlationId = q.correlationId;
    if (q.from || q.to) {
      where.createdAt = {
        ...(q.from ? { gte: q.from } : {}),
        ...(q.to ? { lte: q.to } : {}),
      };
    }
    if (q.search) {
      const search = escapeLike(q.search);
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const entry = await this.prisma.auditLog.findFirst({ where: { id, organizationId: requireOrgId() } });
    if (!entry) {
      throw Object.assign(new Error('Audit log not found'), { status: 404, code: 'NOT_FOUND' });
    }
    return entry;
  }

  async stats(_q: AuditStatsQuery = {}) {
    const organizationId = requireOrgId();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const where: any = { organizationId };
    if (_q.from || _q.to) {
      where.createdAt = {
        ...(_q.from ? { gte: _q.from } : {}),
        ...(_q.to ? { lte: _q.to } : {}),
      };
    }
    const [total, last24h, byAction, byEntity, bySeverity, recent] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, createdAt: { gte: dayAgo } } }),
      this.prisma.auditLog.groupBy({ by: ['action'], where, _count: { _all: true } }),
      this.prisma.auditLog.groupBy({ by: ['entityType'], where, _count: { _all: true } }),
      this.prisma.auditLog.groupBy({ by: ['severity'], where, _count: { _all: true } }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const map = (rows: { _count: { _all: number } }[], key: string) =>
      Object.fromEntries(rows.map((row: any) => [row[key], row._count._all]));
    return {
      total,
      last24h,
      retentionDays: env().AUDIT_RETENTION_DAYS,
      byAction: map(byAction, 'action'),
      byEntityType: map(byEntity, 'entityType'),
      bySeverity: map(bySeverity, 'severity'),
      recent,
    };
  }

  async prune(input: AuditPruneInput) {
    const organizationId = requireOrgId();
    const retentionDays = input.retentionDays ?? env().AUDIT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const where = { organizationId, createdAt: { lt: cutoff } };
    const count = await this.prisma.auditLog.count({ where });
    if (input.dryRun) return { retentionDays, cutoff, wouldDelete: count, deleted: 0 };
    const result = await this.prisma.auditLog.deleteMany({ where });
    return { retentionDays, cutoff, wouldDelete: count, deleted: result.count };
  }
}
