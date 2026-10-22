import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import {
  PaymentPlanInput,
  RecordPaymentInput,
  RecordPaymentDirectInput,
  RequestRefundInput,
  DecideRefundInput,
  ExpenseInput,
  AccountInput,
  InvoiceInput,
  PaginationInput,
} from '@re/shared';

interface ListQuery extends PaginationInput {
  status?: string;
  projectId?: string;
  customerId?: string;
  bookingId?: string;
  accountId?: string;
  from?: Date;
  to?: Date;
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

  async removePaymentPlan(id: string) {
    await this.getPaymentPlan(id);
    const bookings = await this.prisma.booking.count({ where: { paymentPlanId: id, deletedAt: null } });
    if (bookings > 0) throw errors.conflict('Payment plan is in use by bookings');
    await this.prisma.paymentPlan.delete({ where: { id } });
    return { id };
  }

  // ============================================================ Demands

  async listDemands(q: ListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.dueDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [{ demandNumber: { contains: s, mode: 'insensitive' } }, { title: { contains: s, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentDemand.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.paymentDemand.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getDemand(id: string) {
    const demand = await this.prisma.paymentDemand.findFirst({
      where: { id },
      include: {
        allocations: { include: { payment: true } },
        invoices: true,
      },
    });
    if (!demand) throw errors.notFound('Demand');
    return demand;
  }

  async waiveDemand(id: string, reason?: string) {
    const demand = await this.prisma.paymentDemand.findFirst({ where: { id } });
    if (!demand) throw errors.notFound('Demand');
    return this.prisma.paymentDemand.update({
      where: { id },
      data: { status: 'WAIVED', waivedAt: new Date() },
    });
  }

  // ============================================================ Payments

  async listPayments(q: ListQuery) {
    const where: any = {};
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.paidAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [{ reference: { contains: s, mode: 'insensitive' } }, { gatewayPaymentId: { contains: s, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { paidAt: 'desc' } }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getPayment(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: { allocations: { include: { demand: true } }, receipts: true },
    });
    if (!payment) throw errors.notFound('Payment');
    return payment;
  }

  async removePayment(id: string) {
    await this.getPayment(id);
    await this.prisma.payment.delete({ where: { id } });
    return { id };
  }

  async recordPayment(input: RecordPaymentInput) {
    const booking = await this.prisma.booking.findFirst({ where: { id: input.bookingId, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    return this.postPayment({
      customerId: booking.customerId,
      bookingId: booking.id,
      projectId: booking.projectId,
      amount: input.amount,
      mode: input.mode,
      reference: input.reference ?? null,
      paidAt: input.paidAt,
      notes: input.notes ?? null,
      gateway: input.gateway,
      gatewayPaymentId: input.gatewayPaymentId ?? null,
      allocations: input.allocations,
    });
  }

  async recordPaymentDirect(input: RecordPaymentDirectInput) {
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
    if (!customer) throw errors.notFound('Customer');
    return this.postPayment({
      customerId: customer.id,
      bookingId: null,
      projectId: input.projectId ?? null,
      amount: input.amount,
      mode: input.mode,
      reference: input.reference ?? null,
      paidAt: input.paidAt,
      notes: input.notes ?? null,
      gateway: input.gateway,
      gatewayPaymentId: input.gatewayPaymentId ?? null,
      allocations: input.allocations,
    });
  }

  private async postPayment(args: {
    customerId: string;
    bookingId: string | null;
    projectId: string | null;
    amount: number;
    mode: string;
    reference: string | null;
    paidAt?: Date;
    notes: string | null;
    gateway: string;
    gatewayPaymentId: string | null;
    allocations?: { demandId: string; amount: number }[];
  }) {
    const orgId = requireOrgId();
    const paidAt = args.paidAt ?? new Date();
    const gatewayPaymentId = args.gatewayPaymentId?.trim() || null;

    if (gatewayPaymentId) {
      const existing = await this.findExistingGatewayPayment(orgId, args.gateway, gatewayPaymentId);
      if (existing) return existing;
    }

    const receiptNumber = await nextCode(this.prisma, 'RECEIPT');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            bookingId: args.bookingId,
            customerId: args.customerId,
            projectId: args.projectId,
            amount: args.amount,
            mode: args.mode as any,
            status: 'SUCCESS',
            gateway: args.gateway as any,
            gatewayPaymentId,
            reference: args.reference,
            paidAt,
            notes: args.notes,
            collectedBy: actorId(),
          },
        });

        // determine allocations
        let allocations = args.allocations?.map((a) => ({ demandId: a.demandId, amount: a.amount }));
        if (!allocations || allocations.length === 0) {
          allocations = await this.autoAllocate(tx, args.customerId, args.bookingId, args.amount);
        }

        let allocatedTotal = 0;
        let unallocated = args.amount;
        for (const alloc of allocations) {
          if (unallocated <= 0) break;

          // Lock the demand row so concurrent payments serialize their balance updates.
          const locked = await tx.$queryRaw<
            { id: string; paidAmount: unknown; totalAmount: unknown; status: string }[]
          >`
            SELECT "id", "paidAmount", "totalAmount", "status"
            FROM "PaymentDemand"
            WHERE "id" = ${alloc.demandId}::uuid
              AND "organizationId" = ${orgId}::uuid
              AND "status" IN ('DUE', 'PARTIAL', 'OVERDUE')
              AND "paidAmount" < "totalAmount"
            FOR UPDATE
          `;
          const demand = locked[0];
          if (!demand) continue;

          const remaining = Number(demand.totalAmount) - Number(demand.paidAmount);
          const applied = Math.min(alloc.amount, remaining, unallocated);
          if (applied <= 0) continue;

          const newPaid = Number(demand.paidAmount) + applied;
          const status = newPaid >= Number(demand.totalAmount) ? 'PAID' : 'PARTIAL';
          const updated = await tx.paymentDemand.updateMany({
            where: { id: demand.id },
            data: { paidAmount: newPaid, status },
          });
          if (updated.count !== 1) {
            throw errors.conflict('Demand balance changed while applying the payment');
          }

          await tx.paymentAllocation.create({
            data: { organizationId: orgId, paymentId: payment.id, demandId: demand.id, amount: applied, type: 'PAYMENT' },
          });

          allocatedTotal += applied;
          unallocated -= applied;
        }

        const receipt = await tx.receipt.create({
          data: {
            organizationId: orgId,
            receiptNumber,
            bookingId: args.bookingId,
            customerId: args.customerId,
            amount: allocatedTotal || args.amount,
            mode: args.mode as any,
            reference: args.reference,
            issuedAt: paidAt,
            issuedBy: actorId(),
            notes: args.notes,
          },
        });
        await tx.receipt.update({ where: { id: receipt.id }, data: { paymentId: payment.id } });

        return { paymentId: payment.id, receiptId: receipt.id, receiptNumber, allocated: allocatedTotal };
      });
    } catch (e) {
      if (gatewayPaymentId && this.isUniqueConstraintError(e)) {
        const existing = await this.findExistingGatewayPayment(orgId, args.gateway, gatewayPaymentId);
        if (existing) return existing;
      }
      throw e;
    }
  }

  private async findExistingGatewayPayment(orgId: string, gateway: string, gatewayPaymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { organizationId: orgId, gateway: gateway as any, gatewayPaymentId },
      include: { allocations: true, receipts: true },
    });
    if (!payment) return null;

    const receipt = payment.receipts[0];
    const allocated = payment.allocations
      .filter((a) => a.type === 'PAYMENT')
      .reduce((sum, a) => sum + Number(a.amount), 0);
    return {
      paymentId: payment.id,
      receiptId: receipt?.id ?? null,
      receiptNumber: receipt?.receiptNumber ?? null,
      allocated,
    };
  }

  private isUniqueConstraintError(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
  }

  private async autoAllocate(tx: any, customerId: string, bookingId: string | null, amount: number) {
    const demands = await tx.paymentDemand.findMany({
      where: {
        customerId,
        ...(bookingId ? { bookingId } : {}),
        status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
    });
    const allocations: { demandId: string; amount: number }[] = [];
    let remaining = amount;
    for (const d of demands) {
      if (remaining <= 0) break;
      const due = Number(d.totalAmount) - Number(d.paidAmount);
      if (due <= 0) continue;
      const applied = Math.min(due, remaining);
      allocations.push({ demandId: d.id, amount: applied });
      remaining -= applied;
    }
    return allocations;
  }

  // ============================================================ Receipts

  async listReceipts(q: ListQuery) {
    const where: any = {};
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
    const receipt = await this.prisma.receipt.findFirst({ where: { id }, include: { booking: true } });
    if (!receipt) throw errors.notFound('Receipt');
    return receipt;
  }

  // ============================================================ Refunds

  async listRefunds(q: ListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.bookingId) where.bookingId = q.bookingId;
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.refund.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async requestRefund(input: RequestRefundInput) {
    const booking = await this.prisma.booking.findFirst({ where: { id: input.bookingId, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    return this.prisma.refund.create({
      data: {
        organizationId: requireOrgId(),
        bookingId: input.bookingId,
        amount: input.amount,
        reason: input.reason,
        status: 'REQUESTED',
        requestedBy: actorId(),
      },
    });
  }

  async decideRefund(id: string, input: DecideRefundInput) {
    const refund = await this.prisma.refund.findFirst({ where: { id } });
    if (!refund) throw errors.notFound('Refund');
    if (input.decision === 'REJECTED') {
      return this.prisma.refund.update({ where: { id }, data: { status: 'REJECTED', approvedBy: actorId(), reference: input.reference } });
    }
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: input.processed ? 'COMPLETED' : 'APPROVED',
        approvedBy: actorId(),
        processedAt: input.processed ? new Date() : null,
        reference: input.reference,
      },
    });
  }

  // ============================================================ Invoices

  async listInvoices(q: ListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.from || q.to) where.issueDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { issueDate: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id } });
    if (!invoice) throw errors.notFound('Invoice');
    return invoice;
  }

  async createInvoice(input: InvoiceInput) {
    const orgId = requireOrgId();
    const invoiceNumber = await nextCode(this.prisma, 'INVOICE');

    const items = input.items.map((it) => ({
      ...it,
      amount: it.amount ?? it.quantity * it.rate,
    }));
    const subtotal = items.reduce((s, it) => s + (it.amount ?? 0), 0);
    const taxTotal = items.reduce((s, it) => s + ((it.amount ?? 0) * (it.taxPercent ?? 0)) / 100, 0);
    const intraState = !input.reverseCharge;
    const cgst = intraState ? taxTotal / 2 : 0;
    const sgst = intraState ? taxTotal / 2 : 0;
    const igst = intraState ? 0 : taxTotal;
    const total = subtotal + taxTotal;

    return this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        type: input.type,
        status: 'ISSUED',
        customerId: input.customerId ?? null,
        bookingId: input.bookingId ?? null,
        demandId: input.demandId ?? null,
        vendorId: input.vendorId ?? null,
        issueDate: input.issueDate,
        dueDate: input.dueDate ?? null,
        subtotal,
        cgst,
        sgst,
        igst,
        total,
        reverseCharge: input.reverseCharge,
        notes: input.notes ?? null,
        items: items as any,
      },
    });
  }

  async voidInvoice(id: string) {
    await this.getInvoice(id);
    return this.prisma.invoice.update({ where: { id }, data: { status: 'VOID' } });
  }

  async invoicePdf(id: string): Promise<Buffer> {
    const invoice = await this.getInvoice(id);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text('INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`);
      doc.text(`Type: ${invoice.type}`);
      doc.text(`Status: ${invoice.status}`);
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
      if (invoice.dueDate) doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      doc.moveDown();
      doc.text(`Subtotal: ${invoice.subtotal}`);
      doc.text(`Tax: ${Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst)}`);
      doc.text(`Total: ${invoice.total}`);
      if (invoice.notes) {
        doc.moveDown();
        doc.text(`Notes: ${invoice.notes}`);
      }
      doc.end();
    });
  }

  // ============================================================ Accounts & ledger

  async listAccounts(q: ListQuery) {
    const where: any = {};
    const [items, total] = await Promise.all([
      this.prisma.account.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'asc' } }),
      this.prisma.account.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createAccount(input: AccountInput) {
    return this.prisma.account.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async listLedger(q: ListQuery) {
    const where: any = {};
    if (q.accountId) where.accountId = q.accountId;
    if (q.from || q.to) where.occurredAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { occurredAt: 'desc' } }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createLedgerEntry(input: { accountId: string; type: string; amount: number; category: string; note?: string; occurredAt?: Date }) {
    const account = await this.prisma.account.findFirst({ where: { id: input.accountId } });
    if (!account) throw errors.notFound('Account');
    return this.prisma.ledgerEntry.create({
      data: {
        organizationId: requireOrgId(),
        accountId: input.accountId,
        type: input.type as any,
        amount: input.amount,
        category: input.category,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        createdBy: actorId(),
      },
    });
  }

  // ============================================================ Expenses

  async listExpenses(q: ListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) where.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { reference: { contains: s, mode: 'insensitive' } }];
    }
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { date: 'desc' } }),
      this.prisma.expense.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createExpense(input: ExpenseInput) {
    const totalAmount = input.amount + input.taxAmount;
    return this.prisma.expense.create({
      data: {
        organizationId: requireOrgId(),
        projectId: input.projectId ?? null,
        categoryId: input.categoryId ?? null,
        vendorId: input.vendorId ?? null,
        accountId: input.accountId ?? null,
        title: input.title,
        description: input.description ?? null,
        amount: input.amount,
        taxAmount: input.taxAmount,
        totalAmount,
        date: input.date,
        mode: input.mode,
        reference: input.reference ?? null,
        status: 'DRAFT',
        createdBy: actorId(),
      },
    });
  }

  async setExpenseStatus(id: string, status: string, remarks?: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!expense) throw errors.notFound('Expense');
    const data: any = { status };
    if (status === 'APPROVED') data.approvedBy = actorId();
    if (status === 'PAID') data.paidAt = new Date();
    const updated = await this.prisma.expense.update({ where: { id }, data });

    if (status === 'PAID' && expense.accountId) {
      await this.createLedgerEntry({
        accountId: expense.accountId,
        type: 'DEBIT',
        amount: Number(expense.totalAmount),
        category: 'EXPENSE',
        note: `Expense: ${expense.title}`,
        occurredAt: new Date(),
      });
    }
    return updated;
  }

  async listExpenseCategories(q: ListQuery) {
    const [items, total] = await Promise.all([
      this.prisma.expenseCategory.findMany({ skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.expenseCategory.count(),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createExpenseCategory(input: { name: string; code: string; kind: string }) {
    return this.prisma.expenseCategory.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  // ============================================================ Reports

  async outstandingReport(q: ListQuery) {
    const where: any = { status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] } };
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;

    const demands = await this.prisma.paymentDemand.findMany({ where });
    let totalDemanded = 0;
    let totalPaid = 0;
    const byStatus: Record<string, number> = {};
    for (const d of demands) {
      totalDemanded += Number(d.totalAmount);
      totalPaid += Number(d.paidAmount);
      byStatus[d.status] = (byStatus[d.status] ?? 0) + (Number(d.totalAmount) - Number(d.paidAmount));
    }
    return {
      demandCount: demands.length,
      totalDemanded,
      totalPaid,
      outstanding: totalDemanded - totalPaid,
      byStatus,
    };
  }

  async collectionsReport(q: ListQuery) {
    const where: any = { status: 'SUCCESS' };
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) where.paidAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const payments = await this.prisma.payment.findMany({ where, orderBy: { paidAt: 'asc' } });
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMode: Record<string, number> = {};
    for (const p of payments) byMode[p.mode] = (byMode[p.mode] ?? 0) + Number(p.amount);
    return { count: payments.length, total, byMode };
  }
}
