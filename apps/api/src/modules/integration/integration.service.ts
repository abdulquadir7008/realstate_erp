import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface POCreateInput {
  poNumber: string;
  projectId: string;
  vendorId: string;
  items: POItemInput[];
  totalAmount: number;
  taxAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
}

export interface POItemInput {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface POtoPaymentFlow {
  poId: string;
  poNumber: string;
  projectId: string;
  vendorId: string;
  totalPOAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID';
  paymentSchedule: PaymentScheduleItem[];
  lastPaymentDate?: Date;
  nextPaymentDue?: Date;
}

export interface PaymentScheduleItem {
  sequence: number;
  dueDate: Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  invoiceId?: string;
  paymentId?: string;
}

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Procurement-to-Payment Flow

  async createPOWithFlow(input: POCreateInput) {
    // 1. Create the Purchase Order
    const po = await this.prisma.purchaseOrder.create({
      data: {
        organizationId: requireOrgId(),
        poNumber: input.poNumber,
        projectId: input.projectId,
        vendorId: input.vendorId,
        status: 'DRAFT',
        orderDate: new Date(),
        subtotal: input.totalAmount,
        taxAmount: input.taxAmount,
        total: input.totalAmount + input.taxAmount,
        notes: input.notes,
        createdBy: actorId(),
        items: {
          create: input.items.map(item => ({
            code: item.code,
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: { items: true },
    });

    // 2. Initialize payment schedule based on PO items
    const paymentSchedule = this.generatePaymentSchedule(input.items, new Date());

    // 3. Create initial payment schedule entries
    for (const scheduleItem of paymentSchedule) {
      await this.prisma.paymentSchedule.create({
        data: {
          organizationId: requireOrgId(),
          poId: po.id,
          dueDate: scheduleItem.dueDate,
          amount: scheduleItem.amount,
          status: 'PENDING',
          createdBy: actorId(),
        },
      });
    }

    return {
      po,
      paymentSchedule,
      message: 'PO created with payment flow initialization',
    };
  }

  async getPOPaymentFlow(poId: string): Promise<POtoPaymentFlow> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
    if (!po) throw errors.notFound('Purchase Order');

    // Get all payment schedules for this PO
    const paymentSchedules = await this.prisma.paymentSchedule.findMany({
      where: { poId },
      orderBy: { dueDate: 'asc' },
    });

    // Get all invoices for this PO
    const invoices = await this.prisma.invoice.findMany({
      where: { projectId: po.projectId }, // Would need vendor/po linkage
      orderBy: { issueDate: 'desc' },
    });

    // Get all payments for this PO
    const payments = await this.prisma.payment.findMany({
      where: { projectId: po.projectId }, // Would need po linkage
      orderBy: { paidAt: 'desc' },
    });

    // Calculate totals
    const totalPOAmount = po.items.reduce((sum, item) => sum + item.amount, 0);
    const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = totalPOAmount - totalPaidAmount;

    // Determine status
    let status: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' = 'PENDING';
    if (remainingAmount <= 0) status = 'FULLY_PAID';
    else if (remainingAmount < totalPOAmount) status = 'PARTIALLY_PAID';

    // Build payment schedule items
    const scheduleItems = paymentSchedules.map(ps => ({
      sequence: ps.sequence,
      dueDate: ps.dueDate,
      amount: ps.amount,
      status: ps.status,
      invoiceId: null, // Would link if invoices linked to PO
      paymentId: null, // Would link if payments linked to schedule
    }));

    return {
      poId,
      poNumber: po.poNumber,
      projectId: po.projectId,
      vendorId: po.vendorId,
      totalPOAmount,
      totalPaidAmount,
      remainingAmount,
      status,
      paymentSchedule: scheduleItems,
      lastPaymentDate: payments.length > 0 ? payments[0].paidAt : undefined,
      nextPaymentDue: paymentSchedules.length > 0 ? paymentSchedules[0].dueDate : undefined,
    };
  }

  // ---------------- Helper: Generate Payment Schedule

  private generatePaymentSchedule(items: POItemInput[], poDate: Date): { sequence: number; dueDate: Date; amount: number }[] {
    const schedule: { sequence: number; dueDate: Date; amount: number }[] = [];
    let currentDate = poDate;

    // Simple schedule: 30% on PO creation, 40% at milestone 1, 30% at milestone 2
    const milestones = [
      { percentage: 0.3, delayDays: 30 },
      { percentage: 0.4, delayDays: 60 },
      { percentage: 0.3, delayDays: 90 },
    ];

    let remainingAmount = items.reduce((sum, item) => sum + item.amount, 0);

    for (const milestone of milestones) {
      const milestoneAmount = Math.round(remainingAmount * milestone.percentage);
      remainingAmount -= milestoneAmount;
      currentDate = new Date(poDate);
      currentDate.setDate(currentDate.getDate() + milestone.delayDays);

      schedule.push({
        sequence: schedule.length + 1,
        dueDate: currentDate,
        amount: milestoneAmount,
      });
    }

    // Adjust last amount to match total
    if (schedule.length > 0) {
      const currentTotal = schedule.reduce((sum, s) => sum + s.amount, 0);
      schedule[schedule.length - 1].amount = currentTotal - (schedule.slice(0, -1).reduce((sum, s) => sum + s.amount, 0) ?? 0);
    }

    return schedule;
  }

  // ---------------- Subcontractor Work Order Integration

  async integrateSubcontractorWorkflow(poId: string, woId: string) {
    // Link PO and Work Order for subcontractor tracking
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: woId },
      include: { retention: true, costLink: true },
    });

    if (!po || !wo) throw new BadRequestException('PO or Work Order not found');

    // Update WO status based on PO progress
    // Create cost link if not exists
    const existingCostLink = await this.prisma.subcontractCostLink.findFirst({
      where: { workOrderId: woId, projectId: po.projectId },
    });

    if (!existingCostLink) {
      await this.prisma.subcontractCostLink.create({
        data: {
          workOrderId: woId,
          projectId: po.projectId,
          costHead: 'SUBCONTRACTOR',
          billedAmount: po.totalAmount,
          retainedAmount: wo.retentionRate ? po.totalAmount * (wo.retentionRate / 100) : 0,
          netAmount: po.totalAmount - (wo.retentionRate ? po.totalAmount * (wo.retentionRate / 100) : 0),
          status: 'PENDING',
          description: 'Subcontract cost linked to PO and work order',
        },
      });
    }

    // Update WO with PO reference
    await this.prisma.workOrder.update({
      where: { id: woId },
      data: { notes: `Linked to PO ${po.poNumber} for subcontractor payment tracking` },
    });

    return {
      po,
      wo,
      costLink: existingCostLink || await this.prisma.subcontractCostLink.findFirst({ where: { workOrderId: woId } }),
      message: 'Subcontractor workflow integrated with PO',
    };
  }

  // ---------------- QHSE Compliance Integration

  async checkQHSEComplianceForPO(poId: string): Promise<{
    poId: string;
    complianceScore: number;
    issues: string[];
    recommendations: string[];
  }> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { project: true },
    });
    if (!po) throw new NotFoundException('Purchase Order');

    // Check related project QHSE data
    const qhseSummary = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalIncidents,
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as criticalIncidents,
        COUNT(DISTINCT "reportedBy") as uniqueReporters
      FROM "Incident"
      WHERE "projectId" = ${po.projectId}
    `;

    const [result] = qhseSummary as any[];
    const totalIncidents = result.totalIncidents;
    const criticalIncidents = result.criticalIncidents;
    const uniqueReporters = result.uniqueReporters;

    // Calculate compliance score (simplified)
    let complianceScore = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (criticalIncidents > 0) {
      complianceScore -= criticalIncidents * 10;
      issues.push(`${criticalIncidents} critical incident(s) on project`);
      recommendations.push('Conduct safety audit and review protocols');
    }

    if (totalIncidents > 5) {
      complianceScore -= 5;
      issues.push(`${totalIncidents} total incident(s) - review safety measures`);
      recommendations.push('Enhanced safety training required');
    }

    complianceScore = Math.max(complianceScore, 0);

    return {
      poId,
      complianceScore: Math.round(complianceScore),
      issues,
      recommendations,
    };
  }
}