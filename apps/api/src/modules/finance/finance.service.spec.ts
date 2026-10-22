jest.mock('../../common/utils/tenant', () => ({
  requireOrgId: () => 'org-1',
  actorId: () => 'user-1',
}));

jest.mock('../../common/utils/sequence', () => ({
  nextCode: jest.fn().mockResolvedValue('RCP-0001'),
}));

import { FinanceService } from './finance.service';

const booking = {
  id: 'booking-1',
  customerId: 'customer-1',
  projectId: 'project-1',
};

const paymentInput = {
  bookingId: 'booking-1',
  amount: 1000,
  mode: 'UPI',
  gateway: 'RAZORPAY',
  gatewayPaymentId: 'pay_123',
};

function setup() {
  const tx = {
    payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
    paymentDemand: {
      findMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    paymentAllocation: { create: jest.fn() },
    receipt: {
      create: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const prisma = {
    booking: { findFirst: jest.fn().mockResolvedValue(booking) },
    payment: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  return { service: new FinanceService(prisma as any), prisma, tx };
}

describe('FinanceService payment idempotency', () => {
  it('returns the existing payment when the gateway payment id was already processed', async () => {
    const { service, prisma, tx } = setup();
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-existing',
      allocations: [{ type: 'PAYMENT', amount: 400 }],
      receipts: [{ id: 'receipt-existing', receiptNumber: 'RCP-0009' }],
    });

    const result = await service.recordPayment(paymentInput as any);

    expect(result).toEqual({
      paymentId: 'payment-existing',
      receiptId: 'receipt-existing',
      receiptNumber: 'RCP-0009',
      allocated: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('replays the existing payment when a concurrent request wins the unique constraint', async () => {
    const { service, prisma, tx } = setup();
    prisma.payment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'payment-existing',
        allocations: [{ type: 'PAYMENT', amount: 1000 }],
        receipts: [{ id: 'receipt-existing', receiptNumber: 'RCP-0009' }],
      });
    tx.payment.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.recordPayment(paymentInput as any);

    expect(result.paymentId).toBe('payment-existing');
    expect(prisma.payment.findFirst).toHaveBeenCalledTimes(2);
    expect(tx.paymentAllocation.create).not.toHaveBeenCalled();
  });
});

describe('FinanceService allocation locking', () => {
  it('locks and caps an allocation at the demand remaining balance', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([
      { id: 'demand-1', paidAmount: 100, totalAmount: 300, status: 'PARTIAL' },
    ]);

    const result = await service.recordPayment({
      ...paymentInput,
      amount: 1000,
      gatewayPaymentId: null,
      gateway: 'MANUAL',
      allocations: [{ demandId: 'demand-1', amount: 500 }],
    } as any);

    const query = (tx.$queryRaw as jest.Mock).mock.calls[0][0].join(' ');
    expect(query).toContain('FOR UPDATE');
    expect(query).toContain('"organizationId"');
    expect(tx.paymentDemand.updateMany).toHaveBeenCalledWith({
      where: { id: 'demand-1' },
      data: { paidAmount: 300, status: 'PAID' },
    });
    expect(tx.paymentAllocation.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        paymentId: 'payment-1',
        demandId: 'demand-1',
        amount: 200,
        type: 'PAYMENT',
      },
    });
    expect(result.allocated).toBe(200);
    expect(tx.receipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 200 }),
    });
  });

  it('never allocates more than the payment amount', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([
      { id: 'demand-1', paidAmount: 0, totalAmount: 1000, status: 'DUE' },
    ]);

    const result = await service.recordPayment({
      ...paymentInput,
      amount: 30,
      gatewayPaymentId: null,
      gateway: 'MANUAL',
      allocations: [{ demandId: 'demand-1', amount: 500 }],
    } as any);

    expect(tx.paymentAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 30 }),
    });
    expect(result.allocated).toBe(30);
  });

  it('skips allocations whose demand is already paid or missing', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([]);

    const result = await service.recordPayment({
      ...paymentInput,
      gatewayPaymentId: null,
      gateway: 'MANUAL',
      allocations: [{ demandId: 'demand-1', amount: 500 }],
    } as any);

    expect(tx.paymentAllocation.create).not.toHaveBeenCalled();
    expect(result.allocated).toBe(0);
  });
});
