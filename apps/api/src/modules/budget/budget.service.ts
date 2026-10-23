import { Injectable } from '@nestjs/common';
import { Prisma, BudgetStatus, BudgetRevisionStatus, CommitmentStatus, BudgetAlertType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import {
  CostHeadInput,
  UpdateCostHeadInput,
  BudgetInput,
  UpdateBudgetInput,
  BudgetRevisionInput,
  BudgetCommitmentInput,
  CostLedgerEntryInput,
  BudgetCheckInput,
  BudgetThresholdInput,
  UpdateBudgetThresholdInput,
  BudgetThresholdQuery,
  BudgetQuery,
  BudgetLineQuery,
  CommitmentQuery,
  LedgerQuery,
  AlertQuery,
  PaginationInput,
} from '@re/shared';
import {
  applyRevisionChanges,
  availableBudget,
  computeLineAmount,
  evaluateBudgetCheck,
  normalizeFigures,
  resolveAlertLevel,
  rollupByCostHead,
  toNumber,
  utilizationPercent,
  varianceAmount,
  BudgetSnapshotLine,
  BudgetAlertLevels,
  DEFAULT_ALERT_LEVELS,
} from './budget.engine';

const OPEN_COMMITMENT_STATUSES: CommitmentStatus[] = ['PENDING', 'COMMITTED', 'PARTIALLY_CONSUMED'];

interface CostHeadListQuery extends PaginationInput {
  projectId?: string;
  parentId?: string;
  isActive?: boolean;
}

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- cost heads

  async listCostHeads(q: CostHeadListQuery) {
    const where: any = {};
    if (q.projectId) where.OR = [{ projectId: q.projectId }, { projectId: null }];
    if (q.parentId) where.parentId = q.parentId;
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    if (q.search) {
      const search = escapeLike(q.search);
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.costHead.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: [{ code: 'asc' }],
        include: { _count: { select: { budgets: true } } },
      }),
      this.prisma.costHead.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getCostHead(id: string) {
    const costHead = await this.prisma.costHead.findFirst({ where: { id } });
    if (!costHead) throw errors.notFound('Cost head');
    return costHead;
  }

  async createCostHead(input: CostHeadInput) {
    const orgId = requireOrgId();
    await this.assertCostHeadCodeAvailable(input.code);
    if (input.parentId) {
      const parent = await this.getCostHead(input.parentId);
      if (parent.organizationId !== orgId) throw errors.validation('Parent cost head belongs to another organization');
    }
    if (input.projectId) await this.assertProject(input.projectId);
    return this.prisma.costHead.create({
      data: {
        organizationId: orgId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        projectId: input.projectId ?? null,
        isActive: input.isActive,
      },
    });
  }

  async updateCostHead(id: string, input: UpdateCostHeadInput) {
    const existing = await this.getCostHead(id);
    if (input.code && input.code !== existing.code) {
      await this.assertCostHeadCodeAvailable(input.code, id);
    }
    if (input.parentId) {
      if (input.parentId === id) throw errors.validation('A cost head cannot be its own parent');
      await this.assertNoCostHeadCycle(id, input.parentId);
    }
    if (input.projectId) await this.assertProject(input.projectId);
    return this.prisma.costHead.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description === undefined ? undefined : input.description ?? null,
        parentId: input.parentId === undefined ? undefined : input.parentId ?? null,
        projectId: input.projectId === undefined ? undefined : input.projectId ?? null,
        isActive: input.isActive,
      },
    });
  }

  async removeCostHead(id: string) {
    await this.getCostHead(id);
    const used = await this.prisma.projectBudgetLine.count({ where: { costHeadId: id } });
    if (used > 0) {
      return this.prisma.costHead.update({ where: { id }, data: { isActive: false } });
    }
    await this.prisma.costHead.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------- budgets

  async listBudgets(q: BudgetQuery) {
    const where: any = { deletedAt: null };
    if (q.projectId) where.projectId = q.projectId;
    if (q.siteId) where.siteId = q.siteId;
    if (q.status) where.status = q.status;
    if (q.search) {
      const search = escapeLike(q.search);
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.projectBudget.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { lines: true, revisions: true, commitments: true } },
        },
      }),
      this.prisma.projectBudget.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getBudget(id: string) {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, code: true, name: true } },
        lines: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { costHead: { select: { id: true, code: true, name: true } } },
        },
        revisions: { orderBy: { revisionNumber: 'desc' } },
      },
    });
    if (!budget) throw errors.notFound('Budget');
    return budget;
  }

  async createBudget(input: BudgetInput) {
    const orgId = requireOrgId();
    await this.assertProject(input.projectId);
    const duplicate = await this.prisma.projectBudget.findFirst({
      where: { projectId: input.projectId, code: input.code },
    });
    if (duplicate) throw errors.conflict(`Budget code ${input.code} already exists for this project`);

    await this.assertCostHeads(input.lines.map((line) => line.costHeadId));
    const lines = this.prepareLines(input.lines);
    const totals = this.summarizeLines(lines);

    return this.prisma.$transaction(async (tx) => {
      const budget = await tx.projectBudget.create({
        data: {
          organizationId: orgId,
          projectId: input.projectId,
          siteId: input.siteId ?? null,
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          currency: input.currency,
          contingency: new Prisma.Decimal(input.contingency),
          totalPlanned: new Prisma.Decimal(totals.planned),
          totalForecast: new Prisma.Decimal(totals.planned),
          createdBy: actorId(),
        },
      });
      await tx.projectBudgetLine.createMany({
        data: lines.map((line) => ({
          organizationId: orgId,
          budgetId: budget.id,
          costHeadId: line.costHeadId,
          siteId: line.siteId ?? input.siteId ?? null,
          wbsId: line.wbsId ?? null,
          wbsItemId: line.wbsItemId ?? null,
          boqId: line.boqId ?? null,
          boqLineId: line.boqLineId ?? null,
          code: line.code ?? null,
          description: line.description ?? null,
          uom: line.uom ?? null,
          quantity: new Prisma.Decimal(line.quantity),
          plannedRate: new Prisma.Decimal(line.plannedRate),
          plannedAmount: new Prisma.Decimal(line.plannedAmount),
          forecastAmount: new Prisma.Decimal(line.forecastAmount),
          sortOrder: line.sortOrder,
        })),
      });
      return tx.projectBudget.findUnique({
        where: { id: budget.id },
        include: {
          lines: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: { costHead: { select: { id: true, code: true, name: true } } },
          },
        },
      });
    });
  }

  async updateBudget(id: string, input: UpdateBudgetInput) {
    const existing = await this.getBudget(id);
    if (existing.status !== 'DRAFT') throw errors.conflict('Only draft budgets can be edited');

    if (input.lines) await this.assertCostHeads(input.lines.map((line) => line.costHeadId));
    const lines = input.lines ? this.prepareLines(input.lines) : null;
    const totals = lines ? this.summarizeLines(lines) : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.projectBudget.update({
        where: { id },
        data: {
          name: input.name,
          siteId: input.siteId === undefined ? undefined : input.siteId ?? null,
          description: input.description === undefined ? undefined : input.description ?? null,
          currency: input.currency,
          contingency: input.contingency === undefined ? undefined : new Prisma.Decimal(input.contingency),
          totalPlanned: totals ? new Prisma.Decimal(totals.planned) : undefined,
          totalForecast: totals ? new Prisma.Decimal(totals.planned) : undefined,
        },
      });
      if (lines) {
        await tx.projectBudgetLine.deleteMany({ where: { budgetId: id } });
        await tx.projectBudgetLine.createMany({
          data: lines.map((line) => ({
            organizationId: existing.organizationId,
            budgetId: id,
            costHeadId: line.costHeadId,
            siteId: line.siteId ?? existing.siteId ?? null,
            wbsId: line.wbsId ?? null,
            wbsItemId: line.wbsItemId ?? null,
            boqId: line.boqId ?? null,
            boqLineId: line.boqLineId ?? null,
            code: line.code ?? null,
            description: line.description ?? null,
            uom: line.uom ?? null,
            quantity: new Prisma.Decimal(line.quantity),
            plannedRate: new Prisma.Decimal(line.plannedRate),
            plannedAmount: new Prisma.Decimal(line.plannedAmount),
            forecastAmount: new Prisma.Decimal(line.forecastAmount),
            sortOrder: line.sortOrder,
          })),
        });
      }
      return tx.projectBudget.findUnique({
        where: { id },
        include: {
          lines: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: { costHead: { select: { id: true, code: true, name: true } } },
          },
          revisions: { orderBy: { revisionNumber: 'desc' } },
        },
      });
    });
  }

  async deleteBudget(id: string) {
    const budget = await this.getBudget(id);
    if (budget.status !== 'DRAFT') throw errors.conflict('Only draft budgets can be deleted');
    await this.prisma.projectBudget.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  async submitBudget(id: string) {
    const budget = await this.getBudget(id);
    if (budget.status !== 'DRAFT') throw errors.conflict('Only draft budgets can be submitted');
    if (budget.lines.length === 0) throw errors.validation('A budget must contain at least one line');
    return this.prisma.projectBudget.update({
      where: { id },
      data: { status: BudgetStatus.PENDING_APPROVAL },
    });
  }

  async activateBudget(id: string) {
    const budget = await this.getBudget(id);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(budget.status)) {
      throw errors.conflict('Only draft or pending budgets can be activated');
    }
    if (budget.lines.length === 0) throw errors.validation('A budget must contain at least one line');
    return this.prisma.projectBudget.update({
      where: { id },
      data: {
        status: BudgetStatus.ACTIVE,
        approvedBy: actorId(),
        approvedAt: new Date(),
        baselineDate: budget.baselineDate ?? new Date(),
      },
    });
  }

  async lockBudget(id: string) {
    const budget = await this.getBudget(id);
    if (budget.status !== 'ACTIVE') throw errors.conflict('Only active budgets can be locked');
    return this.prisma.projectBudget.update({
      where: { id },
      data: { status: BudgetStatus.LOCKED, lockedAt: new Date(), lockedBy: actorId() },
    });
  }

  async unlockBudget(id: string) {
    const budget = await this.getBudget(id);
    if (budget.status !== 'LOCKED') throw errors.conflict('Only locked budgets can be unlocked');
    return this.prisma.projectBudget.update({
      where: { id },
      data: { status: BudgetStatus.ACTIVE, lockedAt: null, lockedBy: null },
    });
  }

  async archiveBudget(id: string) {
    const budget = await this.getBudget(id);
    if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
      throw errors.conflict('The budget cannot be archived in its current state');
    }
    return this.prisma.projectBudget.update({ where: { id }, data: { status: BudgetStatus.ARCHIVED } });
  }

  async listBudgetLines(q: BudgetLineQuery) {
    const where: any = {};
    if (q.budgetId) where.budgetId = q.budgetId;
    if (q.costHeadId) where.costHeadId = q.costHeadId;
    if (q.search) {
      const search = escapeLike(q.search);
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.projectBudgetLine.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: [{ budgetId: 'asc' }, { sortOrder: 'asc' }],
        include: {
          costHead: { select: { id: true, code: true, name: true } },
          budget: { select: { id: true, code: true, name: true, projectId: true, status: true } },
        },
      }),
      this.prisma.projectBudgetLine.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getBudgetSummary(id: string) {    const budget = await this.getBudget(id);
    const rollup = rollupByCostHead(budget.lines);
    const figures = normalizeFigures({
      planned: toNumber(budget.totalPlanned),
      committed: toNumber(budget.totalCommitted),
      actual: toNumber(budget.totalActual),
      forecast: toNumber(budget.totalForecast),
      contingency: toNumber(budget.contingency),
    });
    return {
      budget: {
        id: budget.id,
        code: budget.code,
        name: budget.name,
        projectId: budget.projectId,
        status: budget.status,
        currency: budget.currency,
        baselineDate: budget.baselineDate,
        lockedAt: budget.lockedAt,
      },
      totals: {
        ...figures,
        available: availableBudget(figures),
        variance: varianceAmount(figures),
        variancePercent: figures.planned > 0 ? Number(((varianceAmount(figures) / figures.planned) * 100).toFixed(2)) : 0,
        costToComplete: Number((figures.forecast - figures.actual).toFixed(2)),
        utilization: utilizationPercent(figures),
      },
      byCostHead: rollup,
      lines: budget.lines,
    };
  }

  // ---------------- revisions

  async listRevisions(budgetId: string) {
    await this.getBudget(budgetId);
    return this.prisma.budgetRevision.findMany({
      where: { budgetId },
      orderBy: { revisionNumber: 'desc' },
    });
  }

  async createRevision(budgetId: string, input: BudgetRevisionInput) {
    const budget = await this.getBudget(budgetId);
    if (budget.status === 'LOCKED') throw errors.conflict('The budget baseline is locked; unlock it before requesting revisions');
    if (['ARCHIVED', 'SUPERSEDED'].includes(budget.status)) {
      throw errors.conflict('Revisions are not allowed for this budget');
    }

    const snapshotLines: BudgetSnapshotLine[] = budget.lines.map((line) => ({
      id: line.id,
      costHeadId: line.costHeadId,
      quantity: toNumber(line.quantity),
      plannedRate: toNumber(line.plannedRate),
      plannedAmount: toNumber(line.plannedAmount),
      committedAmount: toNumber(line.committedAmount),
      actualAmount: toNumber(line.actualAmount),
      forecastAmount: toNumber(line.forecastAmount),
    }));

    let applied: ReturnType<typeof applyRevisionChanges>;
    try {
      applied = applyRevisionChanges(snapshotLines, input.changes);
    } catch (error) {
      throw errors.validation((error as Error).message);
    }

    const latest = await this.prisma.budgetRevision.findFirst({
      where: { budgetId },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const revisionNumber = (latest?.revisionNumber ?? 0) + 1;

    const changesJson = applied.changes.map((change) => ({
      budgetLineId: change.budgetLineId,
      costHeadId: change.before.costHeadId,
      before: {
        quantity: change.before.quantity,
        plannedRate: change.before.plannedRate,
        plannedAmount: change.before.plannedAmount,
      },
      after: change.after,
      delta: change.delta,
    }));

    return this.prisma.budgetRevision.create({
      data: {
        organizationId: budget.organizationId,
        budgetId,
        revisionNumber,
        status: BudgetRevisionStatus.DRAFT,
        reason: input.reason,
        justification: input.justification ?? null,
        totalPlannedBefore: new Prisma.Decimal(applied.totalBefore),
        totalPlannedAfter: new Prisma.Decimal(applied.totalAfter),
        deltaAmount: new Prisma.Decimal(applied.deltaAmount),
        requestedBy: actorId() ?? budget.organizationId,
        snapshot: {
          capturedAt: new Date().toISOString(),
          totalPlanned: toNumber(budget.totalPlanned),
          totalCommitted: toNumber(budget.totalCommitted),
          totalActual: toNumber(budget.totalActual),
          lines: snapshotLines,
        } as any,
        changes: changesJson as any,
      },
    });
  }

  async getRevision(id: string) {
    const revision = await this.prisma.budgetRevision.findFirst({ where: { id } });
    if (!revision) throw errors.notFound('Budget revision');
    return revision;
  }

  async submitRevision(id: string) {
    const revision = await this.getRevision(id);
    if (revision.status !== 'DRAFT') throw errors.conflict('Only draft revisions can be submitted');
    return this.prisma.budgetRevision.update({
      where: { id },
      data: { status: BudgetRevisionStatus.PENDING_APPROVAL },
    });
  }

  async approveRevision(id: string) {
    const revision = await this.getRevision(id);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(revision.status)) {
      throw errors.conflict('Only draft or pending revisions can be approved');
    }
    const budget = await this.getBudget(revision.budgetId);
    if (budget.status === 'LOCKED') throw errors.conflict('The budget baseline is locked');

    const changes = (revision.changes as unknown as Array<{
      budgetLineId: string;
      after: { quantity: number; plannedRate: number; plannedAmount: number };
    }>) ?? [];

    return this.prisma.$transaction(async (tx) => {
      for (const change of changes) {
        const line = budget.lines.find((entry) => entry.id === change.budgetLineId);
        if (!line) continue;
        const committed = toNumber(line.committedAmount);
        const actual = toNumber(line.actualAmount);
        await tx.projectBudgetLine.update({
          where: { id: change.budgetLineId },
          data: {
            quantity: new Prisma.Decimal(change.after.quantity),
            plannedRate: new Prisma.Decimal(change.after.plannedRate),
            plannedAmount: new Prisma.Decimal(change.after.plannedAmount),
            variance: new Prisma.Decimal(Number((change.after.plannedAmount - committed - actual).toFixed(2))),
          },
        });
      }
      await tx.budgetRevision.update({
        where: { id },
        data: {
          status: BudgetRevisionStatus.APPROVED,
          approvedBy: actorId(),
          approvedAt: new Date(),
        },
      });
      await this.recalcBudget(tx, revision.budgetId);
      return tx.projectBudget.findUnique({ where: { id: revision.budgetId } });
    });
  }

  async rejectRevision(id: string, reason?: string | null) {
    const revision = await this.getRevision(id);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(revision.status)) {
      throw errors.conflict('Only draft or pending revisions can be rejected');
    }
    return this.prisma.budgetRevision.update({
      where: { id },
      data: {
        status: BudgetRevisionStatus.REJECTED,
        rejectedBy: actorId(),
        rejectedAt: new Date(),
        rejectionReason: reason ?? null,
      },
    });
  }

  async cancelRevision(id: string) {
    const revision = await this.getRevision(id);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(revision.status)) {
      throw errors.conflict('Only draft or pending revisions can be cancelled');
    }
    return this.prisma.budgetRevision.update({
      where: { id },
      data: { status: BudgetRevisionStatus.CANCELLED },
    });
  }

  // ---------------- commitments

  async listCommitments(q: CommitmentQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.budgetId) where.budgetId = q.budgetId;
    if (q.status) where.status = q.status;
    if (q.entityType) where.entityType = q.entityType.toUpperCase();
    if (q.search) {
      const search = escapeLike(q.search);
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.budgetCommitment.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          budget: { select: { id: true, code: true, name: true } },
          budgetLine: { select: { id: true, code: true, description: true } },
        },
      }),
      this.prisma.budgetCommitment.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createCommitment(
    input: BudgetCommitmentInput,
    options?: { enforceConfiguredHardStop?: boolean },
  ) {
    const orgId = requireOrgId();
    const amount = toNumber(input.committedAmount);
    if (amount <= 0) throw errors.validation('Committed amount must be greater than zero');

    const budget = input.budgetId
      ? await this.getBudget(input.budgetId)
      : await this.findOperationalBudget(input.projectId);
    if (!budget) throw errors.conflict('No active budget exists for this project');
    if (budget.projectId !== input.projectId) throw errors.validation('The budget does not belong to the supplied project');

    let budgetLine: { id: string; costHeadId: string; siteId: string | null } | null = null;
    if (input.budgetLineId) {
      const line = budget.lines.find((entry) => entry.id === input.budgetLineId);
      if (!line) throw errors.validation('The budget line does not belong to this budget');
      budgetLine = line;
    }

    const threshold = await this.resolveThreshold({
      projectId: budget.projectId,
      budgetId: budget.id,
      siteId: budgetLine?.siteId ?? budget.siteId ?? null,
      costHeadId: budgetLine?.costHeadId ?? null,
    });
    const hardStop = input.hardStop || (options?.enforceConfiguredHardStop !== false && threshold.hardStopEnabled);

    const check = evaluateBudgetCheck({
      planned: toNumber(budget.totalPlanned),
      committed: toNumber(budget.totalCommitted),
      actual: toNumber(budget.totalActual),
      contingency: toNumber(budget.contingency),
      proposedAmount: amount,
      hardStop,
      levels: threshold.levels,
    });
    if (!check.allowed) {
      throw errors.conflict('Budget hard-stop limit exceeded', { check });
    }

    const commitment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.budgetCommitment.create({
        data: {
          organizationId: orgId,
          budgetId: budget.id,
          budgetLineId: budgetLine?.id ?? null,
          projectId: input.projectId,
          entityType: input.entityType,
          entityId: input.entityId,
          referenceNumber: input.referenceNumber,
          vendorId: input.vendorId ?? null,
          description: input.description ?? null,
          status: CommitmentStatus.COMMITTED,
          committedAmount: new Prisma.Decimal(amount),
          currency: input.currency,
          committedBy: actorId(),
          committedAt: new Date(),
        },
      });
      if (budgetLine) {
        await this.adjustLineCommitment(tx, budgetLine.id, amount);
      }
      if (check.alertLevel) {
        await this.raiseAlert(tx, {
          organizationId: orgId,
          budgetId: budget.id,
          budgetLineId: budgetLine?.id ?? null,
          type: check.alertLevel,
          threshold: check.projectedUtilization,
          message: `Commitment ${input.referenceNumber} pushes budget utilisation to ${check.projectedUtilization}%`,
          details: check,
        });
      }
      await this.recalcBudget(tx, budget.id);
      return created;
    });

    return { commitment, check };
  }

  async releaseCommitment(id: string, releasedAmount?: number, reason?: string | null) {
    const commitment = await this.prisma.budgetCommitment.findFirst({ where: { id } });
    if (!commitment) throw errors.notFound('Budget commitment');
    if (['RELEASED', 'CANCELLED'].includes(commitment.status)) {
      throw errors.conflict('The commitment is already closed');
    }

    const committed = toNumber(commitment.committedAmount);
    const consumed = toNumber(commitment.consumedAmount);
    const releasedSoFar = toNumber(commitment.releasedAmount);
    const remaining = Number((committed - consumed - releasedSoFar).toFixed(2));
    const releaseAmount = releasedAmount === undefined ? remaining : toNumber(releasedAmount);
    if (releaseAmount <= 0) throw errors.validation('Release amount must be greater than zero');
    if (releaseAmount > remaining + 0.005) {
      throw errors.validation(`Release amount exceeds the open commitment of ${remaining}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const released = Number((releasedSoFar + releaseAmount).toFixed(2));
      const status: CommitmentStatus = released + consumed >= committed - 0.005 ? 'RELEASED' : 'PARTIALLY_CONSUMED';
      const updated = await tx.budgetCommitment.update({
        where: { id },
        data: {
          releasedAmount: new Prisma.Decimal(released),
          status,
          description: reason ? `${commitment.description ?? ''}\nRelease: ${reason}`.trim() : commitment.description,
        },
      });
      if (commitment.budgetLineId) {
        await this.adjustLineCommitment(tx, commitment.budgetLineId, -releaseAmount);
      }
      await this.recalcBudget(tx, commitment.budgetId);
      return updated;
    });
  }

  async cancelCommitment(id: string) {
    const commitment = await this.prisma.budgetCommitment.findFirst({ where: { id } });
    if (!commitment) throw errors.notFound('Budget commitment');
    if (['RELEASED', 'CANCELLED'].includes(commitment.status)) {
      throw errors.conflict('The commitment is already closed');
    }
    const open = Number(
      (toNumber(commitment.committedAmount) - toNumber(commitment.consumedAmount) - toNumber(commitment.releasedAmount)).toFixed(2),
    );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.budgetCommitment.update({
        where: { id },
        data: { status: CommitmentStatus.CANCELLED, releasedAmount: new Prisma.Decimal(toNumber(commitment.releasedAmount) + Math.max(open, 0)) },
      });
      if (commitment.budgetLineId && open > 0) {
        await this.adjustLineCommitment(tx, commitment.budgetLineId, -open);
      }
      await this.recalcBudget(tx, commitment.budgetId);
      return updated;
    });
  }

  // ---------------- cost ledger

  async listLedger(q: LedgerQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.budgetId) where.budgetId = q.budgetId;
    if (q.budgetLineId) where.budgetLineId = q.budgetLineId;
    if (q.entityType) where.entityType = q.entityType;
    if (q.from || q.to) {
      where.postedAt = {};
      if (q.from) where.postedAt.gte = q.from;
      if (q.to) where.postedAt.lte = q.to;
    }
    if (q.search) {
      const search = escapeLike(q.search);
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total, aggregate] = await Promise.all([
      this.prisma.projectCostLedger.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { postedAt: 'desc' },
        include: { budget: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.projectCostLedger.count({ where }),
      this.prisma.projectCostLedger.aggregate({
        where,
        _sum: { debit: true, credit: true, amount: true },
      }),
    ]);
    return {
      ...paginated(items, total, q.page, q.limit),
      totals: {
        debit: toNumber(aggregate._sum.debit),
        credit: toNumber(aggregate._sum.credit),
        amount: toNumber(aggregate._sum.amount),
      },
    };
  }

  async postLedgerEntry(input: CostLedgerEntryInput) {
    const orgId = requireOrgId();
    const debit = toNumber(input.debit);
    const credit = toNumber(input.credit);
    const amount = input.amount !== undefined ? toNumber(input.amount) : Number((debit - credit).toFixed(2));
    if (amount === 0 && debit === 0 && credit === 0) throw errors.validation('A ledger entry must have an amount');

    const budget = input.budgetId
      ? await this.getBudget(input.budgetId)
      : await this.findOperationalBudget(input.projectId);
    if (!budget) throw errors.conflict('No active budget exists for this project');

    let budgetLine: { id: string } | null = null;
    if (input.budgetLineId) {
      const line = budget.lines.find((entry) => entry.id === input.budgetLineId);
      if (!line) throw errors.validation('The budget line does not belong to this budget');
      budgetLine = line;
    }

    let commitment: { id: string; budgetId: string; budgetLineId: string | null; committedAmount: unknown; consumedAmount: unknown } | null = null;
    if (input.commitmentId) {
      commitment = await this.prisma.budgetCommitment.findFirst({ where: { id: input.commitmentId } });
      if (!commitment) throw errors.notFound('Budget commitment');
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.projectCostLedger.create({
        data: {
          organizationId: orgId,
          budgetId: budget.id,
          budgetLineId: budgetLine?.id ?? commitment?.budgetLineId ?? null,
          commitmentId: commitment?.id ?? null,
          projectId: input.projectId,
          costHeadId: input.costHeadId ?? null,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          referenceNumber: input.referenceNumber ?? null,
          description: input.description,
          debit: new Prisma.Decimal(debit),
          credit: new Prisma.Decimal(credit),
          amount: new Prisma.Decimal(amount),
          currency: input.currency,
          postedAt: input.postedAt ?? new Date(),
          postedBy: actorId(),
          metadata: (input.metadata ?? {}) as any,
        },
      });

      const lineId = budgetLine?.id ?? commitment?.budgetLineId ?? null;
      if (lineId) {
        await tx.projectBudgetLine.update({
          where: { id: lineId },
          data: { actualAmount: { increment: amount } },
        });
      }

      if (commitment) {
        const committed = toNumber(commitment.committedAmount);
        const released = toNumber((commitment as any).releasedAmount);
        const consumed = Number((toNumber(commitment.consumedAmount) + amount).toFixed(2));
        const status: CommitmentStatus =
          consumed >= committed - released - 0.005 ? 'CONSUMED' : consumed > 0 ? 'PARTIALLY_CONSUMED' : 'COMMITTED';
        await tx.budgetCommitment.update({
          where: { id: commitment.id },
          data: { consumedAmount: new Prisma.Decimal(consumed), status },
        });
        if (commitment.budgetLineId) {
          await this.adjustLineCommitment(tx, commitment.budgetLineId, -amount);
        }
      }

      await this.syncLineVariance(tx, lineId);
      await this.recalcBudget(tx, budget.id);
      return entry;
    });
  }


  // ---------------- thresholds

  async listThresholds(q: BudgetThresholdQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.scopeType) where.scopeType = q.scopeType;
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    const [items, total] = await Promise.all([
      this.prisma.budgetThreshold.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: [{ scopeType: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.budgetThreshold.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createThreshold(input: BudgetThresholdInput) {
    const orgId = requireOrgId();
    if (input.projectId) await this.assertProject(input.projectId);
    if (input.budgetId) await this.getBudget(input.budgetId);
    if (input.costHeadId) await this.getCostHead(input.costHeadId);
    if (input.siteId) {
      const site = await this.prisma.site.findFirst({ where: { id: input.siteId } });
      if (!site) throw errors.notFound('Site');
    }
    return this.prisma.budgetThreshold.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId ?? null,
        budgetId: input.budgetId ?? null,
        siteId: input.siteId ?? null,
        costHeadId: input.costHeadId ?? null,
        scopeType: input.scopeType,
        warningPercent: new Prisma.Decimal(input.warningPercent),
        criticalPercent: new Prisma.Decimal(input.criticalPercent),
        hardStopPercent: new Prisma.Decimal(input.hardStopPercent),
        hardStopEnabled: input.hardStopEnabled,
        isActive: input.isActive,
        createdBy: actorId(),
      },
    });
  }

  async updateThreshold(id: string, input: UpdateBudgetThresholdInput) {
    const existing = await this.prisma.budgetThreshold.findFirst({ where: { id } });
    if (!existing) throw errors.notFound('Budget threshold');
    if (input.projectId) await this.assertProject(input.projectId);
    if (input.budgetId) await this.getBudget(input.budgetId);
    if (input.costHeadId) await this.getCostHead(input.costHeadId);
    if (input.siteId) {
      const site = await this.prisma.site.findFirst({ where: { id: input.siteId } });
      if (!site) throw errors.notFound('Site');
    }
    const warning = input.warningPercent ?? toNumber(existing.warningPercent);
    const critical = input.criticalPercent ?? toNumber(existing.criticalPercent);
    const hardStop = input.hardStopPercent ?? toNumber(existing.hardStopPercent);
    if (critical < warning) throw errors.validation('criticalPercent must be >= warningPercent');
    if (hardStop < critical) throw errors.validation('hardStopPercent must be >= criticalPercent');
    return this.prisma.budgetThreshold.update({
      where: { id },
      data: {
        projectId: input.projectId === undefined ? undefined : input.projectId ?? null,
        budgetId: input.budgetId === undefined ? undefined : input.budgetId ?? null,
        siteId: input.siteId === undefined ? undefined : input.siteId ?? null,
        costHeadId: input.costHeadId === undefined ? undefined : input.costHeadId ?? null,
        scopeType: input.scopeType,
        warningPercent: input.warningPercent === undefined ? undefined : new Prisma.Decimal(input.warningPercent),
        criticalPercent: input.criticalPercent === undefined ? undefined : new Prisma.Decimal(input.criticalPercent),
        hardStopPercent: input.hardStopPercent === undefined ? undefined : new Prisma.Decimal(input.hardStopPercent),
        hardStopEnabled: input.hardStopEnabled,
        isActive: input.isActive,
      },
    });
  }

  async removeThreshold(id: string) {
    const existing = await this.prisma.budgetThreshold.findFirst({ where: { id } });
    if (!existing) throw errors.notFound('Budget threshold');
    await this.prisma.budgetThreshold.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async resolveThreshold(input: {
    projectId?: string | null;
    budgetId?: string | null;
    siteId?: string | null;
    costHeadId?: string | null;
  }): Promise<{ levels: BudgetAlertLevels; hardStopEnabled: boolean; thresholdId: string | null; scopeType: string | null }> {
    const or: any[] = [];
    if (input.costHeadId) or.push({ scopeType: 'COST_HEAD', costHeadId: input.costHeadId });
    if (input.budgetId) or.push({ scopeType: 'BUDGET', budgetId: input.budgetId });
    if (input.siteId) or.push({ scopeType: 'SITE', siteId: input.siteId });
    if (input.projectId) or.push({ scopeType: 'PROJECT', projectId: input.projectId });
    if (or.length === 0) {
      return { levels: DEFAULT_ALERT_LEVELS, hardStopEnabled: false, thresholdId: null, scopeType: null };
    }
    const candidates = await this.prisma.budgetThreshold.findMany({
      where: { isActive: true, OR: or },
      orderBy: { createdAt: 'desc' },
    });
    const order = ['COST_HEAD', 'BUDGET', 'SITE', 'PROJECT'];
    const chosen = order
      .map((scope) => candidates.find((candidate) => candidate.scopeType === scope))
      .find((candidate) => Boolean(candidate));
    if (!chosen) {
      return { levels: DEFAULT_ALERT_LEVELS, hardStopEnabled: false, thresholdId: null, scopeType: null };
    }
    return {
      levels: {
        warning: toNumber(chosen.warningPercent),
        critical: toNumber(chosen.criticalPercent),
        hardStop: toNumber(chosen.hardStopPercent),
      },
      hardStopEnabled: chosen.hardStopEnabled,
      thresholdId: chosen.id,
      scopeType: chosen.scopeType,
    };
  }
  // ---------------- checks & alerts

  async checkAvailability(input: BudgetCheckInput) {
    const budget = input.budgetId
      ? await this.getBudget(input.budgetId)
      : await this.findOperationalBudget(input.projectId);
    if (!budget) {
      return {
        hasBudget: false,
        allowed: true,
        hardStop: false,
        message: 'No active budget configured for this project',
      };
    }

    if (input.budgetLineId) {
      const line = budget.lines.find((entry) => entry.id === input.budgetLineId);
      if (!line) throw errors.validation('The budget line does not belong to this budget');
      const threshold = await this.resolveThreshold({
        projectId: budget.projectId,
        budgetId: budget.id,
        siteId: line.siteId ?? budget.siteId ?? null,
        costHeadId: line.costHeadId,
      });
      const check = evaluateBudgetCheck({
        planned: toNumber(line.plannedAmount),
        committed: toNumber(line.committedAmount),
        actual: toNumber(line.actualAmount),
        proposedAmount: input.amount,
        hardStop: threshold.hardStopEnabled,
        levels: threshold.levels,
      });
      return {
        hasBudget: true,
        budgetId: budget.id,
        budgetLineId: line.id,
        thresholdId: threshold.thresholdId,
        thresholdScope: threshold.scopeType,
        ...check,
      };
    }

    const threshold = await this.resolveThreshold({
      projectId: budget.projectId,
      budgetId: budget.id,
      siteId: budget.siteId ?? null,
      costHeadId: input.costHeadId ?? null,
    });
    const check = evaluateBudgetCheck({
      planned: toNumber(budget.totalPlanned),
      committed: toNumber(budget.totalCommitted),
      actual: toNumber(budget.totalActual),
      contingency: toNumber(budget.contingency),
      proposedAmount: input.amount,
      hardStop: threshold.hardStopEnabled,
      levels: threshold.levels,
    });
    return {
      hasBudget: true,
      budgetId: budget.id,
      thresholdId: threshold.thresholdId,
      thresholdScope: threshold.scopeType,
      ...check,
    };
  }

  async listAlerts(q: AlertQuery) {
    const where: any = {};
    if (q.budgetId) where.budgetId = q.budgetId;
    if (q.projectId) where.budget = { projectId: q.projectId };
    if (typeof q.isRead === 'boolean') where.isRead = q.isRead;
    if (typeof q.isResolved === 'boolean') where.isResolved = q.isResolved;
    const [items, total] = await Promise.all([
      this.prisma.budgetAlert.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { budget: { select: { id: true, code: true, name: true, projectId: true } } },
      }),
      this.prisma.budgetAlert.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async markAlertRead(id: string, isRead = true) {
    const alert = await this.prisma.budgetAlert.findFirst({ where: { id } });
    if (!alert) throw errors.notFound('Budget alert');
    return this.prisma.budgetAlert.update({ where: { id }, data: { isRead } });
  }

  async resolveAlert(id: string, resolved = true) {
    const alert = await this.prisma.budgetAlert.findFirst({ where: { id } });
    if (!alert) throw errors.notFound('Budget alert');
    return this.prisma.budgetAlert.update({
      where: { id },
      data: {
        isResolved: resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? actorId() : null,
      },
    });
  }

  // ---------------- dashboard

  async getDashboard(projectId?: string) {
    const where: any = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    const budgets = await this.prisma.projectBudget.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        projectId: true,
        status: true,
        currency: true,
        totalPlanned: true,
        totalCommitted: true,
        totalActual: true,
        totalForecast: true,
        contingency: true,
      },
    });

    const totals = budgets.reduce(
      (acc, budget) => {
        acc.planned += toNumber(budget.totalPlanned);
        acc.committed += toNumber(budget.totalCommitted);
        acc.actual += toNumber(budget.totalActual);
        acc.forecast += toNumber(budget.totalForecast);
        acc.contingency += toNumber(budget.contingency);
        return acc;
      },
      { planned: 0, committed: 0, actual: 0, forecast: 0, contingency: 0 },
    );

    const normalized = normalizeFigures(totals);
    const alertWhere: any = { isResolved: false };
    if (projectId) alertWhere.budget = { projectId };

    const [openAlerts, byType, recentLedger, openCommitments] = await Promise.all([
      this.prisma.budgetAlert.count({ where: alertWhere }),
      this.prisma.budgetAlert.groupBy({ by: ['type'], where: alertWhere, _count: { _all: true } }),
      this.prisma.projectCostLedger.findMany({
        where: projectId ? { projectId } : {},
        orderBy: { postedAt: 'desc' },
        take: 10,
        include: { budget: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.budgetCommitment.aggregate({
        where: { status: { in: OPEN_COMMITMENT_STATUSES }, ...(projectId ? { projectId } : {}) },
        _count: { _all: true },
        _sum: { committedAmount: true, consumedAmount: true, releasedAmount: true },
      }),
    ]);

    const projectIds = [...new Set(budgets.map((budget) => budget.projectId))];
    const projects = projectIds.length
      ? await this.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, code: true, name: true },
        })
      : [];

    return {
      totals: {
        ...normalized,
        available: availableBudget(normalized),
        variance: varianceAmount(normalized),
        variancePercent: normalized.planned > 0 ? Number(((varianceAmount(normalized) / normalized.planned) * 100).toFixed(2)) : 0,
        costToComplete: Number((normalized.forecast - normalized.actual).toFixed(2)),
        utilization: utilizationPercent(normalized),
      },
      budgetCount: budgets.length,
      byStatus: budgets.reduce<Record<string, number>>((acc, budget) => {
        acc[budget.status] = (acc[budget.status] ?? 0) + 1;
        return acc;
      }, {}),
      alerts: {
        open: openAlerts,
        byType: byType.map((entry) => ({ type: entry.type, count: entry._count._all })),
      },
      commitments: {
        open: openCommitments._count._all,
        committed: toNumber(openCommitments._sum.committedAmount),
        consumed: toNumber(openCommitments._sum.consumedAmount),
        released: toNumber(openCommitments._sum.releasedAmount),
      },
      projects,
      budgets,
      recentLedger,
    };
  }

  // ---------------- integrations

  async syncPurchaseOrderCommitment(input: {
    id: string;
    projectId: string;
    poNumber: string;
    vendorId?: string | null;
    total: unknown;
    notes?: string | null;
  }) {
    const budget = await this.findOperationalBudget(input.projectId);
    if (!budget) return null;
    const existing = await this.prisma.budgetCommitment.findFirst({
      where: { budgetId: budget.id, entityType: 'PURCHASE_ORDER', entityId: input.id },
    });
    if (existing) return existing;
    const amount = toNumber(input.total);
    if (amount <= 0) return null;
    try {
      const result = await this.createCommitment({
        projectId: input.projectId,
        budgetId: budget.id,
        budgetLineId: null,
        entityType: 'PURCHASE_ORDER',
        entityId: input.id,
        referenceNumber: input.poNumber,
        vendorId: input.vendorId ?? null,
        description: input.notes ?? `Purchase order ${input.poNumber}`,
        committedAmount: amount,
        currency: budget.currency,
        hardStop: false,
      }, { enforceConfiguredHardStop: false });
      return result.commitment;
    } catch {
      return null;
    }
  }

  async syncGoodsReceiptLedger(input: {
    id: string;
    poId: string;
    projectId: string;
    grnNumber: string;
    amount: number;
  }) {
    if (!input.amount || input.amount <= 0) return null;
    const budget = await this.findOperationalBudget(input.projectId);
    if (!budget) return null;
    const commitment = await this.prisma.budgetCommitment.findFirst({
      where: { budgetId: budget.id, entityType: 'PURCHASE_ORDER', entityId: input.poId },
    });
    try {
      return await this.postLedgerEntry({
        projectId: input.projectId,
        budgetId: budget.id,
        budgetLineId: commitment?.budgetLineId ?? null,
        commitmentId: commitment?.id ?? null,
        entityType: 'GOODS_RECEIPT',
        entityId: input.id,
        referenceNumber: input.grnNumber,
        description: `Goods received against ${input.grnNumber}`,
        debit: input.amount,
        credit: 0,
        amount: input.amount,
        currency: budget.currency,
      });
    } catch {
      return null;
    }
  }

  // ---------------- internals

  private prepareLines(lines: BudgetInput['lines']) {
    return lines.map((line) => {
      const plannedAmount =
        line.plannedAmount !== undefined ? Number(toNumber(line.plannedAmount).toFixed(2)) : computeLineAmount(line.quantity, line.plannedRate);
      return {
        ...line,
        plannedAmount,
        forecastAmount:
          line.forecastAmount !== undefined ? Number(toNumber(line.forecastAmount).toFixed(2)) : plannedAmount,
      };
    });
  }

  private summarizeLines(lines: ReturnType<BudgetService['prepareLines']>) {
    const planned = lines.reduce((sum, line) => sum + line.plannedAmount, 0);
    return { planned: Number(planned.toFixed(2)) };
  }

  private async recalcBudget(tx: Prisma.TransactionClient, budgetId: string) {
    const [budget, commitments, ledger] = await Promise.all([
      tx.projectBudget.findUnique({ where: { id: budgetId }, include: { lines: true } }),
      tx.budgetCommitment.findMany({
        where: { budgetId, status: { in: OPEN_COMMITMENT_STATUSES } },
        select: { committedAmount: true, consumedAmount: true, releasedAmount: true },
      }),
      tx.projectCostLedger.aggregate({ where: { budgetId }, _sum: { amount: true } }),
    ]);
    if (!budget) return;

    const committed = commitments.reduce(
      (sum, commitment) =>
        sum +
        Math.max(
          toNumber(commitment.committedAmount) - toNumber(commitment.consumedAmount) - toNumber(commitment.releasedAmount),
          0,
        ),
      0,
    );
    const planned = budget.lines.reduce((sum, line) => sum + toNumber(line.plannedAmount), 0);
    const actual = toNumber(ledger._sum.amount);
    const forecast = budget.lines.reduce(
      (sum, line) => sum + Math.max(toNumber(line.forecastAmount), toNumber(line.plannedAmount)),
      0,
    );

    await tx.projectBudget.update({
      where: { id: budgetId },
      data: {
        totalPlanned: new Prisma.Decimal(Number(planned.toFixed(2))),
        totalCommitted: new Prisma.Decimal(Number(committed.toFixed(2))),
        totalActual: new Prisma.Decimal(Number(actual.toFixed(2))),
        totalForecast: new Prisma.Decimal(Number(Math.max(forecast, planned).toFixed(2))),
      },
    });

    for (const line of budget.lines) {
      await this.syncLineVariance(tx, line.id);
    }
  }

  private async syncLineVariance(tx: Prisma.TransactionClient, lineId: string | null) {
    if (!lineId) return;
    const line = await tx.projectBudgetLine.findUnique({ where: { id: lineId } });
    if (!line) return;
    const planned = toNumber(line.plannedAmount);
    const committed = toNumber(line.committedAmount);
    const actual = toNumber(line.actualAmount);
    await tx.projectBudgetLine.update({
      where: { id: lineId },
      data: { variance: new Prisma.Decimal(Number((planned - committed - actual).toFixed(2))) },
    });
  }

  private async adjustLineCommitment(tx: Prisma.TransactionClient, lineId: string, delta: number) {
    const line = await tx.projectBudgetLine.findUnique({ where: { id: lineId } });
    if (!line) return;
    const next = Math.max(toNumber(line.committedAmount) + delta, 0);
    await tx.projectBudgetLine.update({
      where: { id: lineId },
      data: { committedAmount: new Prisma.Decimal(Number(next.toFixed(2))) },
    });
  }

  private async raiseAlert(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      budgetId: string;
      budgetLineId: string | null;
      type: BudgetAlertType;
      threshold: number;
      message: string;
      details: unknown;
    },
  ) {
    await tx.budgetAlert.create({
      data: {
        organizationId: input.organizationId,
        budgetId: input.budgetId,
        budgetLineId: input.budgetLineId,
        type: input.type,
        threshold: new Prisma.Decimal(input.threshold),
        message: input.message,
        details: input.details as any,
      },
    });
  }

  private async findOperationalBudget(projectId: string) {
    return this.prisma.projectBudget.findFirst({
      where: { projectId, status: { in: ['ACTIVE', 'LOCKED'] }, deletedAt: null },
      include: {
        lines: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { costHead: { select: { id: true, code: true, name: true } } },
        },
        revisions: { orderBy: { revisionNumber: 'desc' } },
      },
    });
  }

  private async assertProject(projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw errors.notFound('Project');
    return project;
  }

  private async assertCostHeadCodeAvailable(code: string, excludeId?: string) {
    const existing = await this.prisma.costHead.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw errors.conflict(`Cost head code ${code} already exists`);
  }

  private async assertCostHeads(ids: string[]) {
    const unique = [...new Set(ids)];
    const count = await this.prisma.costHead.count({ where: { id: { in: unique } } });
    if (count !== unique.length) throw errors.validation('One or more cost heads do not exist');
    const inactive = await this.prisma.costHead.count({ where: { id: { in: unique }, isActive: false } });
    if (inactive > 0) throw errors.validation('One or more cost heads are inactive');
  }

  private async assertNoCostHeadCycle(id: string, parentId: string) {
    let cursor: string | null = parentId;
    let depth = 0;
    while (cursor && depth < 20) {
      if (cursor === id) throw errors.validation('The cost head hierarchy would create a cycle');
      const parent: { parentId: string | null } | null = await this.prisma.costHead.findFirst({
        where: { id: cursor },
        select: { parentId: true },
      });
      if (!parent) break;
      cursor = parent.parentId;
      depth += 1;
    }
  }
}








