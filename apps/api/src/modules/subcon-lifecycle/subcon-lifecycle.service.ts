import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface SubconWorkflowInput {
  workOrderId: string;
  poId: string;
  retentionRate?: number;
  billedAmount: number;
  retentionAmount: number;
  netAmount: number;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'RELEASED';
  notes?: string;
}

export interface RetentionRelease {
  retentionId: string;
  workOrderId: string;
  releasedAmount: number;
  remainingRetention: number;
  releaseDate: Date;
  releaseReason: string;
  releasedBy: string;
}

export interface SubconPaymentSummary {
  workOrderId: string;
  poId: string;
  totalBilled: number;
  totalRetained: number;
  totalReleased: number;
  totalNet: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'FULLY_PAID';
  retentionStatus: 'HELD' | 'PARTIAL_RELEASED' | 'FULLY_RELEASED';
  nextReleaseDate?: Date;
}

@Injectable()
export class SubconLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Subcontractor Workflow Initialization

  async initializeSubconWorkflow(input: SubconWorkflowInput) {
    // 1. Validate work order exists
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: input.workOrderId },
      include: { retention: true, costLink: true, project: true },
    });
    if (!wo) throw new NotFoundException('Work Order not found');

    // 2. Validate PO exists
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: input.poId },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    // 3. Check if retention already exists for this WO
    const existingRetention = await this.prisma.subcontractorRetention.findFirst({
      where: { workOrderId: input.workOrderId },
    });

    // 4. Create or update retention record
    let retention;
    if (existingRetention) {
      retention = await this.prisma.subcontractorRetention.update({
        where: { id: existingRetention.id },
        data: {
          retentionRate: input.retentionRate ?? wo.retentionRate,
          retentionAmount: input.retentionAmount ?? (wo.retentionRate ? wo.costLink.billedAmount * (wo.retentionRate / 100) : 0),
          status: 'HELD',
        },
      });
    } else {
      retention = await this.prisma.subcontractorRetention.create({
        data: {
          workOrderId: input.workOrderId,
          retentionRate: input.retentionRate ?? wo.retentionRate,
          retentionAmount: input.retentionAmount ?? (wo.retentionRate ? wo.costLink.billedAmount * (wo.retentionRate / 100) : 0),
          status: 'HELD',
        },
      });
    }

    // 5. Ensure cost link exists between WO and PO project
    let costLink = await this.prisma.subcontractCostLink.findFirst({
      where: { workOrderId: input.workOrderId, projectId: wo.projectId },
    });

    if (!costLink) {
      costLink = await this.prisma.subcontractCostLink.create({
        data: {
          workOrderId: input.workOrderId,
          projectId: wo.projectId,
          costHead: 'SUBCONTRACTOR',
          billedAmount: input.billedAmount,
          retainedAmount: input.retentionAmount,
          netAmount: input.netAmount,
          status: 'PENDING',
          description: 'Subcontract cost linked to PO and work order for payment tracking',
        },
      });
    } else {
      // Update existing cost link
      costLink = await this.prisma.subcontractCostLink.update({
        where: { id: costLink.id },
        data: {
          billedAmount: input.billedAmount,
          retainedAmount: input.retentionAmount,
          netAmount: input.netAmount,
        },
      });
    }

    // 6. Update WO notes with PO reference
    await this.prisma.workOrder.update({
      where: { id: input.workOrderId },
      data: { notes: `Linked to PO ${po.poNumber} for subcontractor payment tracking. Retention: ${(input.retentionRate ?? wo.retentionRate)}%` },
    });

    return {
      workOrderId: wo.id,
      poId: po.id,
      retention,
      costLink,
      message: 'Subcontractor workflow initialized with retention and cost linking',
    };
  }

  // ---------------- Get Subcontractor Payment Summary

  async getSubconPaymentSummary(workOrderId: string): Promise<SubconPaymentSummary> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId },
      include: { retention: true, costLink: true },
    });
    if (!wo) throw new NotFoundException('Work Order not found');

    const co = await this.prisma.purchaseOrder.findFirst({
      where: { id: wo.costLink?.poId ?? '' },
    });

    // Calculate totals from RA bills
    const raBills = await this.prisma.subcontractorRABill.findMany({
      where: { workOrderId },
    });

    const totalBilled = raBills.reduce((sum, bill) => sum + bill.certifiedAmount, 0);
    const totalRetained = raBills.reduce((sum, bill) => sum + bill.retentionAmount, 0);

    // Get retention records
    const retentionRecords = await this.prisma.subcontractorRetention.findMany({
      where: { workOrderId },
    });

    let totalReleased = 0;
    let retentionStatus: 'HELD' | 'PARTIAL_RELEASED' | 'FULLY_RELEASED' = 'HELD';

    for (const rec of retentionRecords) {
      if (rec.status === 'RELEASED') {
        totalReleased += rec.retentionAmount;
      }
    }

    if (totalReleased > 0 && totalReleased < totalRetained) {
      retentionStatus = 'PARTIAL_RELEASED';
    } else if (totalReleased >= totalRetained) {
      retentionStatus = 'FULLY_RELEASED';
    }

    const totalNet = totalBilled - totalRetained;

    // Determine payment status
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'FULLY_PAID' = 'PENDING';
    if (totalNet <= 0) paymentStatus = 'FULLY_PAID';
    else if (totalNet < totalBilled) paymentStatus = 'PARTIAL';

    // Find next release date (earliest pending retention)
    const pendingRetention = await this.prisma.subcontractorRetention.findFirst({
      where: { workOrderId, status: 'HELD' },
      orderBy: { retentionAmount: 'asc' },
    });

    return {
      workOrderId,
      poId: co?.id,
      totalBilled,
      totalRetained,
      totalReleased,
      totalNet,
      paymentStatus,
      retentionStatus,
      nextReleaseDate: pendingRetention?.releaseDate,
    };
  }

  // ---------------- Release Retention

  async releaseRetention(input: {
    retentionId: string;
    releasedAmount: number;
    releaseReason: string;
    releasedBy: string;
  }) {
    const retention = await this.prisma.subcontractorRetention.findFirst({
      where: { id: input.retentionId },
    });
    if (!retention) throw new NotFoundException('Retention record not found');

    // Update retention record
    const updatedRetention = await this.prisma.subcontractorRetention.update({
      where: { id: input.retentionId },
      data: {
        status: 'RELEASED',
        releaseDate: new Date(),
        releaseReason: input.releaseReason,
        releasedBy: input.releasedBy,
      },
    });

    // Calculate remaining retention
    const remainingRetention = await this.prisma.subcontractorRetention.findMany({
      where: { workOrderId: retention.workOrderId, status: 'HELD' },
    });

    const totalRemaining = pendingRetention?.reduce((sum, r) => sum + r.retentionAmount, 0) ?? 0;

    return {
      retention: updatedRetention,
      remainingRetention: totalRemaining,
      message: 'Retention released successfully',
    };
  }
}