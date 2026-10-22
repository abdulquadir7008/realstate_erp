jest.mock('../../common/utils/tenant', () => ({
  requireOrgId: () => 'org-1',
  actorId: () => 'user-1',
}));

jest.mock('../../common/utils/sequence', () => ({
  nextCode: jest.fn().mockResolvedValue('BKG-0001'),
}));

import { BookingsService } from './bookings.service';

const availableUnit = {
  id: 'unit-1',
  projectId: 'project-1',
  basePrice: 1000000,
  status: 'AVAILABLE',
};

function setup() {
  const tx = {
    unit: {
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      create: jest.fn().mockResolvedValue({ id: 'booking-1' }),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    bookingStatusHistory: { create: jest.fn() },
    paymentDemand: { updateMany: jest.fn() },
  };

  const prisma = {
    unit: { findFirst: jest.fn().mockResolvedValue(availableUnit) },
    customer: { findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }) },
    booking: { findFirst: jest.fn() },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  return { service: new BookingsService(prisma as any), prisma, tx };
}

describe('BookingsService unit claim', () => {
  it('reserves a unit with a conditional AVAILABLE update before creating the booking', async () => {
    const { service, tx } = setup();
    tx.unit.updateMany.mockResolvedValue({ count: 1 });

    await service.reserve({ unitId: 'unit-1', customerId: 'customer-1', holdMinutes: 30 } as any);

    expect(tx.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'unit-1', deletedAt: null, status: 'AVAILABLE' },
      data: expect.objectContaining({ status: 'RESERVED' }),
    });
    expect(tx.booking.create).toHaveBeenCalled();
  });

  it('does not create a booking when another request already claimed the unit', async () => {
    const { service, tx } = setup();
    tx.unit.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.reserve({ unitId: 'unit-1', customerId: 'customer-1', holdMinutes: 30 } as any),
    ).rejects.toThrow('Unit is no longer available');

    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('rejects direct booking creation when the conditional claim loses', async () => {
    const { service, tx } = setup();
    tx.unit.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create({
        unitId: 'unit-1',
        customerId: 'customer-1',
        negotiatedPrice: 1000000,
        otherCharges: [],
        confirm: false,
      } as any),
    ).rejects.toThrow('Unit is no longer available');

    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('refuses to confirm a booking that another request already transitioned', async () => {
    const { service, prisma, tx } = setup();
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      unitId: 'unit-1',
      status: 'RESERVED',
      agreementDate: null,
      notes: null,
    });
    tx.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.confirm('booking-1', {} as any)).rejects.toThrow('Booking can no longer be confirmed');
    expect(tx.unit.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to cancel a booking that reached a terminal state', async () => {
    const { service, prisma, tx } = setup();
    prisma.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      unitId: 'unit-1',
      status: 'CONFIRMED',
    });
    tx.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel('booking-1', { reason: 'test' } as any)).rejects.toThrow(
      'Booking can no longer be cancelled',
    );
    expect(tx.unit.updateMany).not.toHaveBeenCalled();
  });
});
