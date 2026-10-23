import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const logger = new Logger('ApprovalHooks');

export interface HookableInstance {
  entityType: string;
  entityId: string;
  requestedBy: string;
  amount?: unknown;
}

/**
 * Applies the outcome of an approval instance to the linked domain entity.
 * The approval engine is the source of truth; this hook keeps the domain status in sync.
 * Unknown entity types are intentionally ignored so new modules can adopt approvals incrementally.
 */
export async function applyApprovalOutcome(
  prisma: PrismaService,
  instance: HookableInstance,
  approved: boolean,
  decidedBy?: string | null,
): Promise<void> {
  try {
    switch (instance.entityType) {
      case 'PURCHASE_ORDER':
        await prisma.purchaseOrder.updateMany({
          where: { id: instance.entityId },
          data: { status: approved ? 'ISSUED' : 'CANCELLED', approvedBy: decidedBy ?? null },
        });
        break;
      case 'PURCHASE_REQUISITION':
      case 'REQUISITION':
        await prisma.purchaseRequisition.updateMany({
          where: { id: instance.entityId },
          data: { status: approved ? 'APPROVED' : 'REJECTED', approvedBy: decidedBy ?? null, decidedAt: new Date() },
        });
        break;
      case 'EXPENSE':
        await prisma.expense.updateMany({
          where: { id: instance.entityId },
          data: { status: approved ? 'APPROVED' : 'REJECTED', approvedBy: decidedBy ?? null },
        });
        break;
      case 'LEAVE':
      case 'LEAVE_REQUEST':
        await prisma.leaveRequest.updateMany({
          where: { id: instance.entityId },
          data: { status: approved ? 'APPROVED' : 'REJECTED', approverId: decidedBy ?? null, decidedAt: new Date() },
        });
        break;
      case 'BUDGET_COMMITMENT':
        await applyBudgetCommitmentOutcome(prisma, instance.entityId, approved, decidedBy);
        break;
      default:
        break;
    }
  } catch (error) {
    logger.warn(
      `Failed to apply approval outcome for ${instance.entityType}:${instance.entityId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

const num = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Promotes an over-budget commitment that was parked for approval. Totals exclude
 * PENDING commitments, so approving one must also raise the line and budget committed
 * figures and re-sync the line variance.
 */
async function applyBudgetCommitmentOutcome(
  prisma: PrismaService,
  commitmentId: string,
  approved: boolean,
  decidedBy?: string | null,
): Promise<void> {
  const commitment = await prisma.budgetCommitment.findFirst({ where: { id: commitmentId } });
  if (!commitment || commitment.status !== 'PENDING') return;

  if (!approved) {
    await prisma.budgetCommitment.updateMany({
      where: { id: commitmentId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    return;
  }

  const amount = num(commitment.committedAmount);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.budgetCommitment.updateMany({
      where: { id: commitmentId, status: 'PENDING' },
      data: { status: 'COMMITTED', committedAt: new Date(), committedBy: decidedBy ?? null },
    });
    if (claimed.count === 0) return;

    if (commitment.budgetLineId) {
      const line = await tx.projectBudgetLine.findUnique({ where: { id: commitment.budgetLineId } });
      if (line) {
        const planned = num(line.plannedAmount);
        const committed = num(line.committedAmount) + amount;
        const actual = num(line.actualAmount);
        await tx.projectBudgetLine.update({
          where: { id: line.id },
          data: {
            committedAmount: new Prisma.Decimal(Number(committed.toFixed(2))),
            variance: new Prisma.Decimal(Number((planned - committed - actual).toFixed(2))),
          },
        });
      }
    }

    const [budget, openCommitments, ledger] = await Promise.all([
      tx.projectBudget.findUnique({ where: { id: commitment.budgetId }, include: { lines: true } }),
      tx.budgetCommitment.findMany({
        where: { budgetId: commitment.budgetId, status: { in: ['COMMITTED', 'PARTIALLY_CONSUMED'] } },
        select: { committedAmount: true, consumedAmount: true, releasedAmount: true },
      }),
      tx.projectCostLedger.aggregate({ where: { budgetId: commitment.budgetId }, _sum: { amount: true } }),
    ]);
    if (!budget) return;

    const totalCommitted = openCommitments.reduce(
      (sum, row) => sum + Math.max(num(row.committedAmount) - num(row.consumedAmount) - num(row.releasedAmount), 0),
      0,
    );
    const totalPlanned = budget.lines.reduce((sum, line) => sum + num(line.plannedAmount), 0);
    const totalForecast = budget.lines.reduce(
      (sum, line) => sum + Math.max(num(line.forecastAmount), num(line.plannedAmount)),
      0,
    );

    await tx.projectBudget.update({
      where: { id: budget.id },
      data: {
        totalPlanned: new Prisma.Decimal(Number(totalPlanned.toFixed(2))),
        totalCommitted: new Prisma.Decimal(Number(totalCommitted.toFixed(2))),
        totalActual: new Prisma.Decimal(Number(num(ledger._sum.amount).toFixed(2))),
        totalForecast: new Prisma.Decimal(Number(Math.max(totalForecast, totalPlanned).toFixed(2))),
      },
    });
  });
}
