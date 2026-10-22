import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { addDays } from 'date-fns';
import {
  CreateBookingInput,
  ReserveUnitInput,
  CancelBookingInput,
  ConfirmBookingInput,
  PaginationInput,
} from '@re/shared';

export interface BookingListQuery extends PaginationInput {
  status?: string;
  projectId?: string;
  unitId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: BookingListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.unitId) where.unitId = q.unitId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.from || q.to) where.bookingDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [{ bookingNumber: { contains: s, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { bookingDate: 'desc' },
        include: {
          project: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, unitNumber: true, configuration: true } },
          customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        unit: { select: { id: true, unitNumber: true, configuration: true, basePrice: true } },
        customer: true,
        paymentPlan: { include: { milestones: { orderBy: { sequence: 'asc' } } } },
        history: { orderBy: { createdAt: 'desc' } },
        demands: { orderBy: { sequence: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        receipts: { orderBy: { issuedAt: 'desc' } },
      },
    });
    if (!booking) throw errors.notFound('Booking');
    return booking;
  }

  private async claimUnit(tx: any, unitId: string, status: 'RESERVED' | 'BOOKED', heldUntil: Date | null) {
    const claimed = await tx.unit.updateMany({
      where: { id: unitId, deletedAt: null, status: 'AVAILABLE' },
      data: { status, heldUntil, version: { increment: 1 } },
    });
    if (claimed.count !== 1) throw errors.conflict('Unit is no longer available');
  }

  async reserve(input: ReserveUnitInput) {
    const unit = await this.prisma.unit.findFirst({ where: { id: input.unitId, deletedAt: null } });
    if (!unit) throw errors.notFound('Unit');
    if (unit.status !== 'AVAILABLE') throw errors.conflict(`Unit is not available (current status: ${unit.status})`);
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
    if (!customer) throw errors.notFound('Customer');

    const orgId = requireOrgId();
    const bookingNumber = await nextCode(this.prisma, 'BOOKING');
    const reservedUntil = new Date(Date.now() + input.holdMinutes * 60_000);

    return this.prisma.$transaction(async (tx) => {
      await this.claimUnit(tx, unit.id, 'RESERVED', reservedUntil);
      const booking = await tx.booking.create({
        data: {
          organizationId: orgId,
          bookingNumber,
          projectId: unit.projectId,
          unitId: unit.id,
          customerId: customer.id,
          status: 'RESERVED',
          reservedUntil,
          basePrice: unit.basePrice,
          negotiatedPrice: unit.basePrice,
          totalPrice: unit.basePrice,
          createdBy: actorId(),
        },
      });
      await tx.bookingStatusHistory.create({
        data: { bookingId: booking.id, toStatus: 'RESERVED', changedBy: actorId(), remarks: 'Unit reserved' },
      });
      return booking;
    });
  }

  async create(input: CreateBookingInput) {
    const unit = await this.prisma.unit.findFirst({ where: { id: input.unitId, deletedAt: null } });
    if (!unit) throw errors.notFound('Unit');
    if (unit.status !== 'AVAILABLE') {
      throw errors.conflict(`Unit is not available (current status: ${unit.status})`);
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
    if (!customer) throw errors.notFound('Customer');

    const orgId = requireOrgId();
    const bookingNumber = await nextCode(this.prisma, 'BOOKING');
    const basePrice = input.basePrice ?? Number(unit.basePrice);
    const otherTotal = input.otherCharges.reduce((sum, c) => sum + c.amount, 0);
    const totalPrice = input.negotiatedPrice + otherTotal;
    const status = input.confirm ? 'CONFIRMED' : 'DRAFT';

    const booking = await this.prisma.$transaction(async (tx) => {
      await this.claimUnit(tx, unit.id, input.confirm ? 'BOOKED' : 'RESERVED', null);
      const created = await tx.booking.create({
        data: {
          organizationId: orgId,
          bookingNumber,
          projectId: unit.projectId,
          unitId: unit.id,
          customerId: customer.id,
          leadId: input.leadId ?? null,
          salesExecutiveId: input.salesExecutiveId ?? null,
          brokerId: input.brokerId ?? null,
          paymentPlanId: input.paymentPlanId ?? null,
          status,
          bookingDate: input.bookingDate ?? new Date(),
          basePrice,
          negotiatedPrice: input.negotiatedPrice,
          discountAmount: input.discountAmount ?? 0,
          otherCharges: input.otherCharges as any,
          totalPrice,
          notes: input.notes ?? null,
          createdBy: actorId(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: { bookingId: created.id, toStatus: status, changedBy: actorId(), remarks: 'Booking created' },
      });

      return created;
    });

    if (input.confirm) await this.generateDemands(booking.id);
    return this.get(booking.id);
  }

  async confirm(id: string, input: ConfirmBookingInput) {
    const booking = await this.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') throw errors.conflict('Cancelled bookings cannot be confirmed');

    await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.booking.updateMany({
        where: { id, deletedAt: null, status: { in: ['DRAFT', 'RESERVED', 'PENDING_APPROVAL'] } },
        data: { status: 'CONFIRMED', agreementDate: input.agreementDate ?? booking.agreementDate, notes: input.notes ?? booking.notes },
      });
      if (transitioned.count !== 1) throw errors.conflict('Booking can no longer be confirmed');

      const claimed = await tx.unit.updateMany({
        where: { id: booking.unitId, deletedAt: null, status: { in: ['AVAILABLE', 'ON_HOLD', 'RESERVED'] } },
        data: { status: 'BOOKED', heldUntil: null, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw errors.conflict('Unit can no longer be confirmed');

      await tx.bookingStatusHistory.create({
        data: { bookingId: id, fromStatus: booking.status, toStatus: 'CONFIRMED', changedBy: actorId(), remarks: 'Booking confirmed' },
      });
    });

    await this.generateDemands(id);
    return this.get(id);
  }

  async cancel(id: string, input: CancelBookingInput) {
    const booking = await this.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    if (booking.status === 'CANCELLED') throw errors.conflict('Booking is already cancelled');

    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.updateMany({
        where: { id, deletedAt: null, status: { notIn: ['CANCELLED', 'REFUNDED', 'COMPLETED'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: input.reason },
      });
      if (cancelled.count !== 1) throw errors.conflict('Booking can no longer be cancelled');

      await tx.unit.updateMany({
        where: { id: booking.unitId, status: { in: ['ON_HOLD', 'RESERVED', 'BOOKED', 'AGREEMENT_PENDING'] } },
        data: { status: 'AVAILABLE', heldUntil: null, version: { increment: 1 } },
      });
      await tx.paymentDemand.updateMany({ where: { bookingId: id, status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] } }, data: { status: 'CANCELLED' } });
      await tx.bookingStatusHistory.create({
        data: { bookingId: id, fromStatus: booking.status, toStatus: 'CANCELLED', changedBy: actorId(), remarks: input.reason },
      });
    });
    return this.get(id);
  }

  async approveDiscount(id: string, approved: boolean, remarks?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    if (!approved) throw errors.conflict('Discount rejected');
    await this.prisma.booking.update({
      where: { id },
      data: { discountApprovedBy: actorId() },
    });
    await this.prisma.bookingStatusHistory.create({
      data: { bookingId: id, toStatus: booking.status, changedBy: actorId(), remarks: remarks ?? 'Discount approved' },
    });
    return this.get(id);
  }

  /** Generates payment demands from the booking's payment plan (idempotent per demand). */
  async generateDemands(bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { paymentPlan: { include: { milestones: { orderBy: { sequence: 'asc' } } } } },
    });
    if (!booking) throw errors.notFound('Booking');

    const existing = await this.prisma.paymentDemand.count({ where: { bookingId } });
    if (existing > 0) return { created: 0, existing };

    const totalPrice = Number(booking.totalPrice);
    const orgId = requireOrgId();
    const milestones = booking.paymentPlan?.milestones ?? [];
    let created = 0;

    if (milestones.length === 0) {
      const demandNumber = await nextCode(this.prisma, 'DEMAND');
      await this.prisma.paymentDemand.create({
        data: {
          organizationId: orgId,
          bookingId,
          customerId: booking.customerId,
          projectId: booking.projectId,
          sequence: 0,
          title: 'Full payment',
          demandNumber,
          dueDate: booking.bookingDate,
          amount: totalPrice,
          totalAmount: totalPrice,
        },
      });
      return { created: 1, existing: 0 };
    }

    for (const m of milestones) {
      const amount = m.basis === 'PERCENT' ? (totalPrice * Number(m.value)) / 100 : Number(m.value);
      const taxAmount = (amount * Number(m.taxPercent)) / 100;
      const demandNumber = await nextCode(this.prisma, 'DEMAND');
      await this.prisma.paymentDemand.create({
        data: {
          organizationId: orgId,
          bookingId,
          customerId: booking.customerId,
          projectId: booking.projectId,
          milestoneId: m.id,
          sequence: m.sequence,
          title: m.name,
          demandNumber,
          dueDate: addDays(booking.bookingDate, m.dueOffsetDays),
          amount,
          taxAmount,
          totalAmount: amount + taxAmount,
        },
      });
      created += 1;
    }
    return { created, existing: 0 };
  }

  async setStatus(id: string, status: string, remarks?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    await this.prisma.booking.update({ where: { id }, data: { status: status as any } });
    await this.prisma.bookingStatusHistory.create({
      data: { bookingId: id, fromStatus: booking.status, toStatus: status as any, changedBy: actorId(), remarks },
    });
    return this.get(id);
  }
}
