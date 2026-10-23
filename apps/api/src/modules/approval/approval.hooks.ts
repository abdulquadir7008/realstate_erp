import { Logger } from '@nestjs/common';
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
