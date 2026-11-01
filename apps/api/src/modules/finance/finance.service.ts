import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { PaymentPlanInput, RecordPaymentInput, RecordPaymentDirectInput, RequestRefundInput, DecideRefundInput, ExpenseInput, AccountInput, InvoiceInput, PaginationInput } from '@re/shared';

interface ListQuery extends PaginationInput {
  status?: string;
  projectId?: string;
  customerId?: string;
  bookingId?: string;
  accountId?: string;
  from?: Date;
  to?: Date;
  type?: 'cash_flow' | 'margin' | 'receivable' | 'payable';
}

interface CashFlowProjection {
  date: Date;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  netCashFlow: number;
}

interface MarginForecast {
  revenue: number;
  directCost: number;
  grossProfit: number;
  overhead: number;
  netProfit: number;
  profitMargin: number;
}

interface FinancialSecurity {
  id: string;
  type: 'BG' | 'PBG' | 'Advance' | 'Insurance';
  projectId: string;
  amount: number;
  issueDate: Date;
  expiryDate: Date;
  beneficiary: string;
  issuingBank: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  createdAt: Date;
}

interface CashRequirement {
  projectId: string;
  period: Date;
  plannedExecution: number;
  procurement: number;
  subcontract: number;
  expectedCollection: number;
  totalRequirement: number;
  closingBalance: number;
}

interface BudgetAlert {
  id: string;
  type: 'budget' | 'margin' | 'security' | 'cash_flow';
  severity: 'WARNING' | 'CRITICAL' | 'HARD_STOP';
  title: string;
  message: string;
  relatedId: string;
  relatedType: 'project' | 'security' | 'cash_flow';
  expiryDate: Date;
  isResolved: boolean;
  createdAt: Date;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================ Payment plans

  async listPaymentPlans(q: ListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    const [items, total] = await Promise.all([
      this.prisma.paymentPlan.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { milestones: { orderBy: { sequence: 'asc' } } },
      }),
      this.prisma.paymentPlan.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getPaymentPlan(id: string) {
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id },
      include: { milestones: { orderBy: { sequence: 'asc' } } },
    });
    if (!plan) throw errors.notFound('Payment plan');
    return plan;
  }

  async createPaymentPlan(input: PaymentPlanInput) {
    const orgId = requireOrgId();
    if (input.isDefault) {
      await this.prisma.paymentPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.paymentPlan.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId ?? null,
        name: input.name,
        description: input.description ?? null,
        isDefault: input.isDefault,
        isActive: input.isActive,
        milestones: {
          create: input.milestones.map((m) => ({ ...m, organizationId: orgId })),
        },
      },
      include: { milestones: { orderBy: { sequence: 'asc' } } },
    });
  }

  // ============================================================ Cash Flow Forecast

  async listCashFlowForecast(q: ListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.from && q.to) {
      where.createdAt = { gte: q.from, lte: q.to };
    }
    const [items, total] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', createdAt) as month,
          SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) as netAmount,
          SUM(COALESCE(debit, 0)) as totalDebit,
          SUM(COALESCE(credit, 0)) as totalCredit
        FROM "ProjectCostLedger"
        WHERE projectId = ${q.projectId ?? ''}
        AND postedAt >= ${q.from ?? new Date()}
        AND postedAt <= ${q.to ?? new Date()}
        GROUP BY DATE_TRUNC('month', createdAt)
        ORDER BY month
      `,
    ]);
    return {
      items: items as CashFlowProjection[],
      total,
    };
  }

  async getCashFlowProjection(projectId: string, months: number = 12): Promise<CashFlowProjection[]> {
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    const to = new Date();
    to.setMonth(to.getMonth() + months);

    const projections = await this.listCashFlowForecast({
      projectId,
      from,
      to,
      limit: months * 2,
    });

    // Build monthly projection
    const result: CashFlowProjection[] = [];
    let openingBalance = 0;

    for (let i = 0; i < months; i++) {
      const monthProjections = projections.filter(
        (p) => new Date(p.month).getMonth() === new Date().getMonth() + i
      );
      const monthIncome = monthProjections.reduce((sum, p) => sum + p.netAmount, 0);
      const monthExpense = Math.abs(monthProjections.reduce((sum, p) => sum + p.totalDebit, 0));
      result.push({
        date: new Date(),
        openingBalance: openingBalance,
        income: monthIncome,
        expense: monthExpense,
        closingBalance: openingBalance + monthIncome - monthExpense,
        netCashFlow: monthIncome - monthExpense,
      });
      openingBalance = result[result.length - 1].closingBalance;
    }
    return result;
  }

  // ============================================================ Margin Forecast

  async getMarginForecast(projectId: string): Promise<MarginForecast> {
    const now = new Date();

    const [revenue, directCost, overhead] = await Promise.all([
      // Revenue from invoices
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(totalAmount), 0) as total FROM "Invoice" WHERE projectId = ${projectId} AND status = 'PAID' AND issuedAt <= ${now}`,

      // Direct costs from commitments
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(committedAmount), 0) as total FROM "BudgetCommitment" WHERE projectId = ${projectId} AND status IN ('COMMITTED', 'PARTIALLY_CONSUMED')`,

      // Overhead from project budget
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(amount), 0) as total FROM "ProjectCostLedger" WHERE projectId = ${projectId} AND entityType = 'EXPENSE' AND postedAt <= ${now}`
    ]);

    const revenueNum = revenue[0] ? revenue[0].total : 0;
    const costNum = cost[0] ? cost[0].total : 0;
    const overheadNum = overhead[0] ? overhead[0].total : 0;

    const grossProfit = revenueNum - costNum;
    const netProfit = grossProfit - overheadNum;
    const profitMargin = revenueNum > 0 ? (netProfit / revenueNum) * 100 : 0;

    return {
      revenue: revenueNum,
      directCost: costNum,
      grossProfit: grossProfit,
      overhead: overheadNum,
      netProfit: netProfit,
      profitMargin: profitMargin,
    };
  }

  // ============================================================ Financial Securities

  async listFinancialSecurities(projectId: string): Promise<FinancialSecurity[]> {
    // This would query a financial securities table
    // For now, return structure placeholder
    return [];
  }

  async createFinancialSecurity(security: {
    type: 'BG' | 'PBG' | 'Advance' | 'Insurance';
    projectId: string;
    amount: number;
    issueDate: Date;
    expiryDate: Date;
    beneficiary: string;
    issuingBank: string;
  }) {
    // Placeholder for financial security creation
    // In production, this would create a record in the financial securities table
    return {
      id: crypto.randomUUID(),
      ...security,
      status: 'ACTIVE',
      createdAt: new Date(),
    };
  }

  async listExpiringSecurities(days: number = 90): Promise<FinancialSecurity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    // Query securities expiring within the specified days
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        projectId: string;
        amount: number;
        issueDate: Date;
        expiryDate: Date;
        beneficiary: string;
        issuingBank: string;
        status: string;
      }>
    >`SELECT 
       "id", "type", "projectId", "amount", "issueDate", "expiryDate", "beneficiary", "issuingBank", "status"
     FROM "FinancialSecurity"
     WHERE "expiryDate" <= ${cutoffDate}
     ORDER BY "expiryDate" ASC`
    ;
  }

  // ============================================================ Cash Requirement

  async calculateCashRequirement(projectId: string, period: Date): Promise<CashRequirement> {
    const [plannedExecution, procurement, subcontract, expectedCollection] = await Promise.all([
      // Planned execution quantities valued
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(amount), 0) as total FROM "ProjectCostLedger" WHERE projectId = ${projectId} AND entityType = 'PLANNED' AND postedAt <= ${period}`,

      // Procurement commitments
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(committedAmount), 0) as total FROM "BudgetCommitment" WHERE projectId = ${projectId} AND status IN ('COMMITTED', 'PARTIALLY_CONSUMED')`,

      // Subcontract commitments
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(amount), 0) as total FROM "ProjectCostLedger" WHERE projectId = ${projectId} AND entityType = 'SUBCONTRACTOR' AND postedAt <= ${period}`,

      // Expected collections from invoices
      this.prisma.$queryRaw<
        Array<{ total: number }>
      >`SELECT COALESCE(SUM(totalAmount), 0) as total FROM "Invoice" WHERE projectId = ${projectId} AND status IN ('PAID', 'APPROVED') AND postedAt <= ${period}`
    ]);

    const totalRequirement = (plannedExecution[0]?.total ?? 0) + (procurement[0]?.total ?? 0) + (subcontract[0]?.total ?? 0);
    const closingBalance = expectedCollection[0]?.total ?? 0 - totalRequirement;

    return {
      projectId,
      period,
      plannedExecution: plannedExecution[0]?.total ?? 0,
      procurement: procurement[0]?.total ?? 0,
      subcontract: subcontract[0]?.total ?? 0,
      expectedCollection: expectedCollection[0]?.total ?? 0,
      totalRequirement,
      closingBalance,
    };
  }

  // ============================================================ Budget Alerts

  async listBudgetAlerts(projectId: string): Promise<BudgetAlert[]> {
    // Return alerts for budget overruns, margin breaches, security expiries, cash flow issues
    const alerts: BudgetAlert[] = [];

    // Check budget thresholds
    const budget = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      include: { budgetLines: true },
    });

    if (budget) {
      const totalCommitted = budget.budgetLines.reduce(
        (sum, line) => sum + (line.committedAmount ?? 0),
        0
      );
      const totalActual = budget.budgetLines.reduce(
        (sum, line) => sum + (line.actualAmount ?? 0),
        0
      );

      if (totalCommitted > budget.budgetLines.reduce((sum, line) => sum + line.budgetAmount, 0) * 0.8) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'budget',
          severity: totalCommitted > budget.budgetLines.reduce((sum, line) => sum + line.budgetAmount, 0) * 1.2 ? 'CRITICAL' : 'WARNING',
          title: 'Budget Threshold Breach',
          message: `Project budget projected to exceed threshold. Committed: ${totalCommitted}, Budget: ${budget.budgetLines.reduce((sum, line) => sum + line.budgetAmount, 0)}`,
          relatedId: budget.id,
          relatedType: 'project',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isResolved: false,
          createdAt: new Date(),
        });
      }
    }

    // Check margin alerts
    const margin = await this.getMarginForecast(projectId);
    if (margin.profitMargin < 10) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'margin',
        severity: margin.profitMargin < 5 ? 'CRITICAL' : 'WARNING',
        title: 'Low Profit Margin Alert',
        message: `Project profit margin is ${margin.profitMargin.toFixed(1)}%. Recommended: review costs and pricing.`,
        relatedId: '',
        relatedType: 'project',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isResolved: false,
        createdAt: new Date(),
      });
    }

    // Check security expiries
    const expiringSecurities = await this.listExpiringSecurities(30);
    expiringSecurities.forEach((sec) => {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'security',
        severity: 'WARNING',
        title: 'Security Expiry Alert',
        message: `Security ${sec.type} (${sec.id}) expires on ${sec.expiryDate.toLocaleDateString()}`,
        relatedId: sec.id,
        relatedType: 'security',
        expiryDate: sec.expiryDate,
        isResolved: false,
        createdAt: new Date(),
      });
    });

    return alerts;
  }

  // ============================================================ Expense Recording

  async recordExpense(input: {
    projectId: string;
    accountId: string;
    amount: number;
    description: string;
    date: Date;
    voucherNo: string;
    postedBy: string;
  }) {
    return this.prisma.projectCostLedger.create({
      data: {
        organizationId: requireOrgId(),
        projectId: input.projectId,
        accountId: input.accountId,
        debit: input.amount,
        credit: 0,
        amount: input.amount,
        description: input.description,
        postedAt: input.date,
        postedBy: input.postedBy,
        metadata: JSON.stringify({ voucherNo }),
      },
    });
  }
}
// SERVICEEOF