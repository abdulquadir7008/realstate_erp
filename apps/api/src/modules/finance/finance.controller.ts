import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  paymentPlanSchema,
  recordPaymentSchema,
  recordPaymentDirectSchema,
  requestRefundSchema,
  decideRefundSchema,
  expenseSchema,
  expenseStatusSchema,
  expenseCategorySchema,
  accountSchema,
  invoiceSchema,
  financeReportQuerySchema,
  PaymentPlanInput,
  RecordPaymentInput,
  RecordPaymentDirectInput,
  RequestRefundInput,
  DecideRefundInput,
  ExpenseInput,
  AccountInput,
  InvoiceInput,
} from '@re/shared';

const listQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  projectId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const ledgerEntrySchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.coerce.number().min(0.01),
  category: z.string().trim().min(2).max(40),
  note: z.string().trim().max(300).optional(),
  occurredAt: z.coerce.date().optional(),
});

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ---- payment plans

  @Get('payment-plans')
  @RequirePermissions('payment:read')
  listPlans(@Query() q: unknown) {
    return this.service.listPaymentPlans(parseQuery(listQuerySchema, q));
  }

  @Post('payment-plans')
  @RequirePermissions('payment:manage')
  createPlan(@Body(new ZodValidationPipe(paymentPlanSchema)) body: PaymentPlanInput) {
    return this.service.createPaymentPlan(body);
  }

  @Get('payment-plans/:id')
  @RequirePermissions('payment:read')
  getPlan(@Param('id') id: string) {
    return this.service.getPaymentPlan(id);
  }

  @Delete('payment-plans/:id')
  @RequirePermissions('payment:manage')
  removePlan(@Param('id') id: string) {
    return this.service.removePaymentPlan(id);
  }

  // ---- demands

  @Get('demands')
  @RequirePermissions('demand:read')
  listDemands(@Query() q: unknown) {
    return this.service.listDemands(parseQuery(listQuerySchema, q));
  }

  @Get('demands/:id')
  @RequirePermissions('demand:read')
  getDemand(@Param('id') id: string) {
    return this.service.getDemand(id);
  }

  @Post('demands/:id/waive')
  @RequirePermissions('demand:approve')
  waiveDemand(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.waiveDemand(id, body?.reason);
  }

  // ---- payments

  @Get('payments')
  @RequirePermissions('payment:read')
  listPayments(@Query() q: unknown) {
    return this.service.listPayments(parseQuery(listQuerySchema, q));
  }

  @Post('payments')
  @RequirePermissions('payment:create')
  record(@Body(new ZodValidationPipe(recordPaymentSchema)) body: RecordPaymentInput) {
    return this.service.recordPayment(body);
  }

  @Post('payments/direct')
  @RequirePermissions('payment:create')
  recordDirect(@Body(new ZodValidationPipe(recordPaymentDirectSchema)) body: RecordPaymentDirectInput) {
    return this.service.recordPaymentDirect(body);
  }

  @Get('payments/:id')
  @RequirePermissions('payment:read')
  getPayment(@Param('id') id: string) {
    return this.service.getPayment(id);
  }

  @Delete('payments/:id')
  @RequirePermissions('payment:delete')
  removePayment(@Param('id') id: string) {
    return this.service.removePayment(id);
  }

  // ---- receipts

  @Get('receipts')
  @RequirePermissions('receipt:read')
  listReceipts(@Query() q: unknown) {
    return this.service.listReceipts(parseQuery(listQuerySchema, q));
  }

  @Get('receipts/:id')
  @RequirePermissions('receipt:read')
  getReceipt(@Param('id') id: string) {
    return this.service.getReceipt(id);
  }

  // ---- refunds

  @Get('refunds')
  @RequirePermissions('refund:read')
  listRefunds(@Query() q: unknown) {
    return this.service.listRefunds(parseQuery(listQuerySchema, q));
  }

  @Post('refunds')
  @RequirePermissions('refund:create')
  requestRefund(@Body(new ZodValidationPipe(requestRefundSchema)) body: RequestRefundInput) {
    return this.service.requestRefund(body);
  }

  @Post('refunds/:id/decide')
  @RequirePermissions('refund:approve')
  decideRefund(@Param('id') id: string, @Body(new ZodValidationPipe(decideRefundSchema)) body: DecideRefundInput) {
    return this.service.decideRefund(id, body);
  }

  // ---- invoices

  @Get('invoices')
  @RequirePermissions('invoice:read')
  listInvoices(@Query() q: unknown) {
    return this.service.listInvoices(parseQuery(listQuerySchema, q));
  }

  @Post('invoices')
  @RequirePermissions('invoice:create')
  createInvoice(@Body(new ZodValidationPipe(invoiceSchema)) body: InvoiceInput) {
    return this.service.createInvoice(body);
  }

  @Get('invoices/:id')
  @RequirePermissions('invoice:read')
  getInvoice(@Param('id') id: string) {
    return this.service.getInvoice(id);
  }

  @Get('invoices/:id/pdf')
  @RequirePermissions('invoice:read')
  async invoicePdf(@Param('id') id: string, @Res() res: any) {
    const buffer = await this.service.invoicePdf(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=invoice-${id}.pdf` });
    res.send(buffer);
  }

  @Delete('invoices/:id')
  @RequirePermissions('invoice:update')
  voidInvoice(@Param('id') id: string) {
    return this.service.voidInvoice(id);
  }

  // ---- accounts & ledger

  @Get('accounts')
  @RequirePermissions('account:read')
  listAccounts(@Query() q: unknown) {
    return this.service.listAccounts(parseQuery(listQuerySchema, q));
  }

  @Post('accounts')
  @RequirePermissions('account:create')
  createAccount(@Body(new ZodValidationPipe(accountSchema)) body: AccountInput) {
    return this.service.createAccount(body);
  }

  @Get('ledger')
  @RequirePermissions('account:read')
  listLedger(@Query() q: unknown) {
    return this.service.listLedger(parseQuery(listQuerySchema, q));
  }

  @Post('ledger')
  @RequirePermissions('account:create')
  createLedgerEntry(@Body(new ZodValidationPipe(ledgerEntrySchema)) body: z.infer<typeof ledgerEntrySchema>) {
    return this.service.createLedgerEntry(body);
  }

  // ---- expenses

  @Get('expenses')
  @RequirePermissions('expense:read')
  listExpenses(@Query() q: unknown) {
    return this.service.listExpenses(parseQuery(listQuerySchema, q));
  }

  @Post('expenses')
  @RequirePermissions('expense:create')
  createExpense(@Body(new ZodValidationPipe(expenseSchema)) body: ExpenseInput) {
    return this.service.createExpense(body);
  }

  @Patch('expenses/:id/status')
  @RequirePermissions('expense:approve')
  setExpenseStatus(@Param('id') id: string, @Body(new ZodValidationPipe(expenseStatusSchema)) body: { status: string; remarks?: string }) {
    return this.service.setExpenseStatus(id, body.status, body.remarks);
  }

  @Get('expense-categories')
  @RequirePermissions('expense:read')
  listExpenseCategories(@Query() q: unknown) {
    return this.service.listExpenseCategories(parseQuery(listQuerySchema, q));
  }

  @Post('expense-categories')
  @RequirePermissions('expense:manage')
  createExpenseCategory(@Body(new ZodValidationPipe(expenseCategorySchema)) body: { name: string; code: string; kind: string }) {
    return this.service.createExpenseCategory(body);
  }

  // ---- reports

  @Get('reports/outstanding')
  @RequirePermissions('report:read')
  outstanding(@Query() q: unknown) {
    return this.service.outstandingReport(parseQuery(financeReportQuerySchema, q));
  }

  @Get('reports/collections')
  @RequirePermissions('report:read')
  collections(@Query() q: unknown) {
    return this.service.collectionsReport(parseQuery(financeReportQuerySchema, q));
  }
}
