import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface TenderToProjectFlow {
  tenderId: string;
  projectId: string;
  boqId: string;
  tenderCode: string;
  projectCode: string;
  totalBOQAmount: number;
  projectBudget: number;
  remainingBudget: number;
  conversionStatus: 'CONVERTED' | 'PENDING' | 'REJECTED';
  createdAt: Date;
  convertedAt?: Date;
}

export interface BOQCostTracking {
  boqId: string;
  projectId: string;
  totalBOQAmount: number;
  totalCommitted: number;
  totalActual: number;
  remainingAmount: number;
  commitmentStatus: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_BUDGET';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

@Injectable()
export class LifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Tender to Project Conversion

  async convertTenderToProject(input: {
    tenderId: string;
    projectCode: string;
    projectName: string;
    projectDescription: string;
    overrideBudget?: number;
  }) {
    // 1. Get the tender details
    const tender = await this.prisma.tender.findFirst({
      where: { id: input.tenderId },
      include: { boq: { include: { boqLines: true } } },
    });
    if (!tender) throw new BadRequestException('Tender not found');

    // 2. Check if project already exists
    const existingProject = await this.prisma.project.findFirst({
      where: { code: input.projectCode },
    });
    if (existingProject) throw new BadRequestException('Project code already exists');

    // 3. Calculate total BOQ amount
    const totalBOQAmount = tender.boq.boqLines.reduce(
      (sum, line) => sum + line.amount,
      0
    );

    // 4. Create the project
    const project = await this.prisma.project.create({
      data: {
        organizationId: requireOrgId(),
        code: input.projectCode,
        name: input.projectName,
        description: input.projectDescription ?? tender.name,
        status: 'PLANNING',
        totalBudget: input.overrideBudget ?? totalBOQAmount * 1.2, // 20% contingency
        startDate: new Date(),
        createdBy: actorId(),
      },
    });

    // 5. Create BOQ for the project linked to tender's BOQ
    const boq = await this.prisma.boq.create({
      data: {
        organizationId: requireOrgId(),
        projectId: project.id,
        tenderId: input.tenderId,
        code: `BOQ-${input.projectCode}`,
        name: `Bill of Quantities - ${input.projectName}`,
        status: 'DRAFT',
        baselineStatus: 'PROPOSED',
        totalAmount: totalBOQAmount,
        createdBy: actorId(),
        lines: {
          create: tender.boq.boqLines.map((line, index) => ({
            code: line.code,
            name: line.name,
            description: line.description ?? '',
            type: line.type ?? 'MATERIAL',
            order: line.order ?? index,
            level: line.level ?? 1,
            quantity: line.quantity ?? 0,
            unit: line.uom ?? 'NOS',
            rate: line.rate ?? 0,
            amount: line.amount ?? 0,
          })),
        },
      },
      include: { lines: true },
    });

    // 6. Convert tender status to CONVERTED
    await this.prisma.tender.update({
      where: { id: input.tenderId },
      data: { status: 'CONVERTED', convertedAt: new Date() },
    });

    return {
      tenderToProjectFlow: {
        tenderId: tender.id,
        projectId: project.id,
        boqId: boq.id,
        tenderCode: tender.code,
        projectCode: project.code,
        totalBOQAmount,
        projectBudget: project.totalBudget,
        remainingBudget: project.totalBudget - totalBOQAmount,
        conversionStatus: 'CONVERTED',
        createdAt: tender.createdAt,
        convertedAt: new Date(),
      },
      boqCostTracking: {
        boqId: boq.id,
        projectId: project.id,
        totalBOQAmount,
        totalCommitted: 0,
        totalActual: 0,
        remainingAmount: totalBOQAmount,
        commitmentStatus: 'ON_TRACK',
        status: boq.status,
      },
      message: 'Tender successfully converted to project with BOQ',
    };
  }

  // ---------------- BOQ Cost Tracking

  async getBOQCostTracking(boqId: string): Promise<BOQCostTracking> {
    const boq = await this.prisma.boq.findFirst({
      where: { id: boqId },
      include: {
        project: true,
        lines: {
          include: {
            costAllocations: true,
            payments: true,
          },
        },
      },
    });
    if (!boq) throw new NotFoundException('BOQ not found');

    // Calculate totals from line items and their commitments/actuals
    let totalCommitted = 0;
    let totalActual = 0;

    for (const line of boq.lines) {
      // Sum committed costs from WBS items or other cost trackings
      // For now, use line-level tracking
      totalCommitted += line.amount ?? 0;
      totalActual += (line as any).actualAmount ?? 0;
    }

    const remainingAmount = (boq.totalAmount ?? 0) - totalActual;
    let commitmentStatus: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_BUDGET' = 'ON_TRACK';

    if (totalActual > (boq.totalAmount ?? 0)) {
      commitmentStatus = 'OVER_BUDGET';
    } else if (totalActual < (boq.totalAmount ?? 0) * 0.8) {
      commitmentStatus = 'UNDER_BUDGET';
    }

    return {
      boqId,
      projectId: boq.projectId ?? '',
      totalBOQAmount: boq.totalAmount ?? 0,
      totalCommitted,
      totalActual,
      remainingAmount,
      commitmentStatus,
      status: boq.status,
    };
  }

  // ---------------- Project Cost Commitment

  async commitProjectCost(input: {
    projectId: string;
    boqLineId?: string;
    description: string;
    amount: number;
    costHead: 'LABOUR' | 'MATERIAL' | 'SUBCONTRACTOR' | 'OVERHEAD';
    referenceId?: string; // PO ID, Invoice ID, etc.
    referenceType: 'PO' | 'INVOICE' | 'PAYMENT' | 'MANUAL';
  }) {
    // 1. Validate project exists
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // 2. Create budget commitment
    const commitment = await this.prisma.budgetCommitment.create({
      data: {
        organizationId: requireOrgId(),
        projectId: input.projectId,
        description: input.description,
        amount: input.amount,
        costHead: input.costHead,
        referenceType: input.referenceType,
        referenceId: input.referenceId ?? null,
        status: 'PENDING',
        createdBy: actorId(),
      },
    });

    // 2. Update project budget tracking
    // Get current commitments
    const currentCommitments = await this.prisma.budgetCommitment.aggregate({
      where: { projectId: input.projectId, status: 'APPROVED' },
      _sum: { amount: true },
    });

    // 3. Get actual costs (from project cost ledger)
    const actualCosts = await this.prisma.projectCostLedger.aggregate({
      where: { projectId: input.projectId, entityType: 'EXPENSE' },
      _sum: { amount: true },
    });

    const totalApproved = (currentCommitments._sum.amount ?? 0) + (project.totalBudget ?? 0);
    const totalActual = actualCosts._sum.amount ?? 0;
    const remainingBudget = (project.totalBudget ?? 0) - totalActual;

    // Determine status
    let status: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_BUDGET' = 'ON_TRACK';
    if (totalActual > (project.totalBudget ?? 0)) status = 'OVER_BUDGET';
    else if (totalActual < (project.totalBudget ?? 0) * 0.8) status = 'UNDER_BUDGET';

    return {
      commitment,
      projectId: input.projectId,
      totalApprovedBudget: totalApproved,
      totalActualCosts: totalActual,
      remainingBudget,
      budgetStatus: status,
      message: 'Project cost committed and tracked',
    };
  }

  // ---------------- Project Budget Overview

  async getProjectBudgetOverview(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      include: {
        budgetCommitments: {
          where: { status: 'APPROVED' },
        },
        projectCostLedgers: {
          where: { entityType: 'EXPENSE' },
        },
        boqs: {
          include: { lines: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Calculate summaries
    const totalCommitted = project.budgetCommitments.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    const totalActual = project.projectCostLedgers.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    const totalBOQAmount = project.boqs.reduce(
      (sum, b) => sum + (b.totalAmount ?? 0),
      0
    );
    const totalBOQLines = project.boqs.reduce(
      (sum, b) => sum + b.lines.reduce((sl, l) => sl + (l.amount ?? 0), 0),
      0
    );

    const remainingBudget = (project.totalBudget ?? 0) - totalActual;
    const budgetUtilization = project.totalBudget > 0 ? (totalActual / project.totalBudget) * 100 : 0;

    let status: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_BUDGET' = 'ON_TRACK';
    if (totalActual > (project.totalBudget ?? 0)) status = 'OVER_BUDGET';
    else if (totalActual < (project.totalBudget ?? 0) * 0.8) status = 'UNDER_BUDGET';

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      totalBudget: project.totalBudget,
      totalCommitted: totalCommitted,
      totalActual: totalActual,
      remainingBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      boqTotalAmount: totalBOQAmount,
      boqLinesTotal: totalBOQLines,
      budgetStatus: status,
      // Breakdown by cost head
      costBreakdown: this.calculateCostBreakdown(project.projectCostLedgers),
    };
  }

  private calculateCostBreakdown(ledgers: any[]) {
    const breakdown = {
      LABOUR: 0,
      MATERIAL: 0,
      SUBCONTRACTOR: 0,
      OVERHEAD: 0,
    };

    for (const ledger of ledgers) {
      const head = ledger.costHead ?? 'OVERHEAD';
      if (breakdown[head] !== undefined) {
        breakdown[head] += ledger.amount ?? 0;
      }
    }

    return breakdown;
  }
}