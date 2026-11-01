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

  // ============================================================ Demands

  async listDemands(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.dueDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.paymentDemand.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.paymentDemand.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getDemand(id: string) {
    const orgId = requireOrgId();
    const demand = await this.prisma.paymentDemand.findFirst({ where: { id, organizationId: orgId } });
    if (!demand) throw errors.notFound('Demand');
    return demand;
  }

  async waiveDemand(id: string, reason?: string) {
    const orgId = requireOrgId();
    const demand = await this.prisma.paymentDemand.findFirst({ where: { id, organizationId: orgId } });
    if (!demand) throw errors.notFound('Demand');
    return this.prisma.paymentDemand.update({
      where: { id },
      data: { status: 'WAIVED', waivedAt: new Date() },
    });
  }

  // ============================================================ Payments

  async listPayments(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.paidAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { paidAt: 'desc' }, include: { allocations: true, receipts: true } }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getPayment(id: string) {
    const orgId = requireOrgId();
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId: orgId }, include: { allocations: true, receipts: true } });
    if (!payment) throw errors.notFound('Payment');
    return payment;
  }

  async recordPayment(input: RecordPaymentInput) {
    const orgId = requireOrgId();
    // Resolve customerId from booking if not provided
    let customerId = input.customerId;
    if (!customerId && input.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: input.bookingId },
        select: { customerId: true },
      });
      if (!booking) throw errors.notFound('Booking');
      customerId = booking.customerId;
    }
    if (!customerId) throw errors.validation('Customer is required');
    const payment = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        bookingId: input.bookingId ?? null,
        customerId,
        projectId: input.projectId ?? null,
        amount: input.amount,
        mode: input.mode ?? 'BANK_TRANSFER',
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        collectedBy: actorId(),
      },
    });
    // Create receipt
    const receiptNumber = await nextCode(this.prisma, 'RECEIPT');
    await this.prisma.receipt.create({
      data: {
        organizationId: orgId,
        receiptNumber,
        bookingId: input.bookingId ?? null,
        paymentId: payment.id,
        customerId: input.customerId,
        amount: input.amount,
        mode: input.mode ?? 'BANK_TRANSFER',
        reference: input.reference ?? null,
        issuedBy: actorId(),
      },
    });
    return payment;
  }

  async recordPaymentDirect(input: RecordPaymentDirectInput) {
    return this.recordPayment(input as any);
  }

  async removePayment(id: string) {
    const orgId = requireOrgId();
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId: orgId } });
    if (!payment) throw errors.notFound('Payment');
    await this.prisma.payment.delete({ where: { id } });
    return { id };
  }

  // ============================================================ Receipts

  async listReceipts(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.issuedAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.receipt.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { issuedAt: 'desc' } }),
      this.prisma.receipt.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getReceipt(id: string) {
    const orgId = requireOrgId();
    const receipt = await this.prisma.receipt.findFirst({ where: { id, organizationId: orgId } });
    if (!receipt) throw errors.notFound('Receipt');
    return receipt;
  }

  // ============================================================ Refunds

  async listRefunds(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.status) where.status = q.status;
    if (q.bookingId) where.bookingId = q.bookingId;
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.refund.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async requestRefund(input: RequestRefundInput) {
    const orgId = requireOrgId();
    return this.prisma.refund.create({
      data: {
        organizationId: orgId,
        bookingId: input.bookingId,
        paymentId: input.paymentId ?? null,
        amount: input.amount,
        reason: input.reason ?? null,
        requestedBy: actorId(),
      },
    });
  }

  async decideRefund(id: string, input: DecideRefundInput) {
    const orgId = requireOrgId();
    const refund = await this.prisma.refund.findFirst({ where: { id, organizationId: orgId } });
    if (!refund) throw errors.notFound('Refund');
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: input.approved ? 'APPROVED' : 'REJECTED',
        approvedBy: actorId(),
        processedAt: new Date(),
        reference: input.reference ?? null,
      },
    });
  }

  // ============================================================ Invoices

  async listInvoices(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.issueDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createInvoice(input: InvoiceInput) {
    const orgId = requireOrgId();
    const invoiceNumber = await nextCode(this.prisma, 'INVOICE');
    const subtotal = (input.items ?? []).reduce((s: number, it: any) => s + (it.quantity ?? 1) * (it.rate ?? 0), 0);
    const total = subtotal; // simplified
    return this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        type: input.type ?? 'SALES',
        customerId: input.customerId ?? null,
        bookingId: input.bookingId ?? null,
        demandId: input.demandId ?? null,
        vendorId: input.vendorId ?? null,
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        subtotal,
        total,
        notes: input.notes ?? null,
        items: input.items ?? [],
      },
    });
  }

  async getInvoice(id: string) {
    const orgId = requireOrgId();
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId: orgId } });
    if (!invoice) throw errors.notFound('Invoice');
    return invoice;
  }

  async voidInvoice(id: string) {
    const orgId = requireOrgId();
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId: orgId } });
    if (!invoice) throw errors.notFound('Invoice');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'VOID' } });
  }

  async invoicePdf(id: string): Promise<Buffer> {
    const invoice = await this.getInvoice(id);
    return Buffer.from('PDF placeholder');
  }

  // ============================================================ Accounts & Ledger

  async listAccounts(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.type) where.type = q.type;
    const [items, total] = await Promise.all([
      this.prisma.account.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.account.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createAccount(input: AccountInput) {
    const orgId = requireOrgId();
    return this.prisma.account.create({
      data: {
        organizationId: orgId,
        name: input.name,
        type: input.type ?? 'BANK',
        accountNumber: input.accountNumber ?? null,
        bankName: input.bankName ?? null,
        ifsc: input.ifsc ?? null,
        openingBalance: input.openingBalance ?? 0,
      },
    });
  }

  async listLedger(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    if (q.accountId) where.accountId = q.accountId;
    if (q.from || q.to) where.occurredAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { occurredAt: 'desc' }, include: { account: true } }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createLedgerEntry(input: any) {
    const orgId = requireOrgId();
    return this.prisma.ledgerEntry.create({
      data: {
        organizationId: orgId,
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        category: input.category,
        note: input.note ?? null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        createdBy: actorId(),
      },
    });
  }

  // ============================================================ Expenses

  async listExpenses(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId, deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.accountId) where.accountId = q.accountId;
    if (q.from || q.to) where.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.expense.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createExpense(input: ExpenseInput) {
    const orgId = requireOrgId();
    const totalAmount = (input.amount ?? 0) + (input.taxAmount ?? 0);
    return this.prisma.expense.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId ?? null,
        categoryId: input.categoryId ?? null,
        vendorId: input.vendorId ?? null,
        accountId: input.accountId ?? null,
        title: input.title,
        description: input.description ?? null,
        amount: input.amount,
        taxAmount: input.taxAmount ?? 0,
        totalAmount,
        date: input.date ? new Date(input.date) : new Date(),
        mode: input.mode ?? 'BANK_TRANSFER',
        reference: input.reference ?? null,
        createdBy: actorId(),
      },
    });
  }

  async setExpenseStatus(id: string, status: string, remarks?: string) {
    const orgId = requireOrgId();
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId: orgId } });
    if (!expense) throw errors.notFound('Expense');
    return this.prisma.expense.update({
      where: { id },
      data: { status: status as any, approvedBy: status === 'APPROVED' ? actorId() : null },
    });
  }

  async removeExpense(id: string) {
    const orgId = requireOrgId();
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId: orgId } });
    if (!expense) throw errors.notFound('Expense');
    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  // ============================================================ Expense Categories

  async listExpenseCategories(q: ListQuery) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId };
    const [items, total] = await Promise.all([
      this.prisma.expenseCategory.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.expenseCategory.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createExpenseCategory(input: { name: string; code: string; kind: string }) {
    const orgId = requireOrgId();
    return this.prisma.expenseCategory.create({
      data: {
        organizationId: orgId,
        name: input.name,
        code: input.code,
        kind: input.kind ?? 'OPEX',
      },
    });
  }

  async removeExpenseCategory(id: string) {
    const orgId = requireOrgId();
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, organizationId: orgId } });
    if (!cat) throw errors.notFound('Expense Category');
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { id };
  }

  // ============================================================ Reports

  async outstandingReport(q: any) {
    const orgId = requireOrgId();
    const demands = await this.prisma.paymentDemand.findMany({
      where: { organizationId: orgId, status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] } },
    });
    const totalDemanded = demands.reduce((s, d) => s + Number(d.totalAmount), 0);
    const totalPaid = demands.reduce((s, d) => s + Number(d.paidAmount), 0);
    return {
      totalDemanded,
      totalPaid,
      outstanding: totalDemanded - totalPaid,
      demandCount: demands.length,
      byStatus: demands.reduce((acc: any, d) => {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  async collectionsReport(q: any) {
    const orgId = requireOrgId();
    const payments = await this.prisma.payment.findMany({
      where: { organizationId: orgId },
    });
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMode = payments.reduce((acc: any, p) => {
      acc[p.mode] = (acc[p.mode] ?? 0) + Number(p.amount);
      return acc;
    }, {});
    return {
      total,
      count: payments.length,
      byMode,
    };
  }
}