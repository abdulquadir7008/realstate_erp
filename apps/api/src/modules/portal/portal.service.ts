import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { currentUserId } from '../../prisma/tenant-context';
import type { PortalTicketInput, PortalProfileInput } from './portal.controller';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async currentCustomer() {
    const orgId = requireOrgId();
    const userId = currentUserId();
    if (!userId) throw errors.forbidden('No portal account is linked to this session');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw errors.unauthorized();

    let customer = await this.prisma.customer.findFirst({
      where: { organizationId: orgId, userId, deletedAt: null },
    });

    if (!customer) {
      const or: any[] = [];
      if (user.email) or.push({ email: user.email });
      if (user.phone) or.push({ phone: user.phone });
      if (or.length) {
        customer = await this.prisma.customer.findFirst({
          where: { organizationId: orgId, deletedAt: null, OR: or },
          orderBy: { createdAt: 'desc' },
        });
        if (customer && user.email && customer.email === user.email) {
          await this.prisma.customer.update({ where: { id: customer.id }, data: { userId } });
        }
      }
    }

    if (!customer) {
      throw errors.notFound('Customer profile is not linked to this account');
    }
    return customer;
  }

  async session() {
    const customer = await this.currentCustomer();
    const userId = currentUserId();
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    const org = await this.prisma.organization.findUnique({
      where: { id: requireOrgId() },
      select: { id: true, name: true, slug: true },
    });
    return {
      customer,
      user: user
        ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone }
        : null,
      organization: org ?? null,
    };
  }

  async overview() {
    const customer = await this.currentCustomer();
    const [bookings, demands, payments, receipts, tickets] = await Promise.all([
      this.prisma.booking.findMany({
        where: { customerId: customer.id, deletedAt: null },
        include: {
          unit: { select: { unitNumber: true, configuration: true, type: true, basePrice: true } },
          project: { select: { id: true, name: true, city: true, status: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentDemand.findMany({ where: { customerId: customer.id } }),
      this.prisma.payment.findMany({ where: { customerId: customer.id, status: 'SUCCESS' } }),
      this.prisma.receipt.findMany({ where: { customerId: customer.id }, orderBy: { issuedAt: 'desc' } }),
      this.prisma.supportTicket.findMany({ where: { organizationId: requireOrgId(), customerId: customer.id } }),
    ]);

    const totalValue = bookings.reduce((s, b) => s + Number(b.totalPrice ?? 0), 0);
    const paid = demands.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0);
    const totalDue = demands
      .filter((d) => !['PAID', 'WAIVED', 'CANCELLED'].includes(d.status))
      .reduce((s, d) => s + (Number(d.totalAmount ?? 0) + Number(d.lateFee ?? 0) - Number(d.paidAmount ?? 0)), 0);
    const overdue = demands.filter(
      (d) => d.status === 'OVERDUE' || (d.status !== 'PAID' && new Date(d.dueDate) < new Date()),
    );

    const nextDue = demands
      .filter((d) => !['PAID', 'WAIVED', 'CANCELLED'].includes(d.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    const projectIds = [...new Set(bookings.map((b) => b.projectId))];
    const milestones = projectIds.length
      ? await this.prisma.projectMilestone.findMany({ where: { projectId: { in: projectIds } } })
      : [];
    const progress = milestones.length
      ? Math.round(milestones.reduce((s, m) => s + (m.progressPercent ?? 0), 0) / milestones.length)
      : 0;

    return {
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName ?? ''}`.trim(),
        kycStatus: customer.kycStatus,
      },
      bookings: {
        total: bookings.length,
        active: bookings.filter((b) => !['CANCELLED', 'REFUNDED'].includes(b.status)).length,
        latest: bookings[0] ?? null,
      },
      value: {
        total: totalValue,
        paid,
        outstanding: totalDue,
        collectionRate: totalValue ? Math.round((paid / totalValue) * 100) : 0,
      },
      schedule: {
        totalDemands: demands.length,
        paidDemands: demands.filter((d) => d.status === 'PAID').length,
        overdue: overdue.length,
        nextDue: nextDue
          ? {
              title: nextDue.title,
              amount: Number(nextDue.totalAmount) - Number(nextDue.paidAmount),
              dueDate: nextDue.dueDate,
              status: nextDue.status,
            }
          : null,
      },
      payments: {
        count: payments.length,
        total: payments.reduce((s, p) => s + Number(p.amount), 0),
        receipts: receipts.length,
      },
      tickets: {
        total: tickets.length,
        open: tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      },
      construction: {
        progress,
        milestones: milestones.length,
        completed: milestones.filter((m) => m.status === 'COMPLETED').length,
      },
    };
  }

  async properties() {
    const customer = await this.currentCustomer();
    const bookings = await this.prisma.booking.findMany({
      where: { customerId: customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        unit: {
          include: {
            building: { select: { name: true, code: true } },
            floor: { select: { label: true } },
          },
        },
        project: {
          select: { id: true, name: true, code: true, city: true, address: true, status: true, imageUrl: true },
        },
        demands: { orderBy: { dueDate: 'asc' } },
        _count: { select: { payments: true } },
      },
    });
    return bookings.map((b) => {
      const paid = b.demands.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0);
      return {
        ...b,
        paid,
        outstanding: Number(b.totalPrice ?? 0) - paid,
        progress: Number(b.totalPrice ?? 0) ? Math.round((paid / Number(b.totalPrice ?? 0)) * 100) : 0,
      };
    });
  }

  async booking(id: string) {
    const customer = await this.currentCustomer();
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: customer.id, deletedAt: null },
      include: {
        unit: { include: { building: true, floor: true } },
        project: true,
        paymentPlan: { include: { milestones: { orderBy: { sequence: 'asc' } } } },
        demands: { orderBy: { dueDate: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        receipts: { orderBy: { issuedAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!booking) throw errors.notFound('Booking');
    const paid = booking.demands.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0);
    return { ...booking, paid, outstanding: Number(booking.totalPrice ?? 0) - paid };
  }

  async schedule() {
    const customer = await this.currentCustomer();
    const demands = await this.prisma.paymentDemand.findMany({
      where: { customerId: customer.id },
      orderBy: { dueDate: 'asc' },
      include: {
        booking: { select: { bookingNumber: true, id: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
      },
    });
    const total = demands.reduce((s, d) => s + Number(d.totalAmount ?? 0), 0);
    const paid = demands.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0);
    return { items: demands, summary: { total, paid, balance: total - paid } };
  }

  async payments() {
    const customer = await this.currentCustomer();
    const [payments, receipts] = await Promise.all([
      this.prisma.payment.findMany({
        where: { customerId: customer.id },
        orderBy: { paidAt: 'desc' },
        include: { booking: { select: { bookingNumber: true } }, receipts: { select: { receiptNumber: true } } },
      }),
      this.prisma.receipt.findMany({
        where: { customerId: customer.id },
        orderBy: { issuedAt: 'desc' },
        include: { booking: { select: { bookingNumber: true } } },
      }),
    ]);
    return {
      payments,
      receipts,
      total: payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0),
    };
  }

  async invoices() {
    const customer = await this.currentCustomer();
    const items = await this.prisma.invoice.findMany({
      where: { customerId: customer.id },
      orderBy: { issueDate: 'desc' },
      include: { demand: { select: { demandNumber: true, title: true } } },
    });
    return { items };
  }

  async documents() {
    const customer = await this.currentCustomer();
    const bookings = await this.prisma.booking.findMany({ where: { customerId: customer.id }, select: { id: true } });
    const bookingIds = bookings.map((b) => b.id);
    const items = await this.prisma.document.findMany({
      where: {
        organizationId: requireOrgId(),
        deletedAt: null,
        visibility: 'CUSTOMER',
        OR: [{ customerId: customer.id }, ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        folder: true,
        status: true,
        version: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return { items };
  }

  async construction() {
    const customer = await this.currentCustomer();
    const bookings = await this.prisma.booking.findMany({ where: { customerId: customer.id }, select: { projectId: true } });
    const projectIds = [...new Set(bookings.map((b) => b.projectId))];
    if (!projectIds.length) return { projects: [] };

    const [projects, milestones, reports] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          status: true,
          imageUrl: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.projectMilestone.findMany({ where: { projectId: { in: projectIds } }, orderBy: { order: 'asc' } }),
      this.prisma.dailySiteReport.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    return {
      projects: projects.map((p) => {
        const ms = milestones.filter((m) => m.projectId === p.id);
        const progress = ms.length
          ? Math.round(ms.reduce((s, m) => s + (m.progressPercent ?? 0), 0) / ms.length)
          : 0;
        return { ...p, progress, milestones: ms, siteReports: reports.filter((r) => r.projectId === p.id) };
      }),
    };
  }

  async tickets() {
    const customer = await this.currentCustomer();
    const items = await this.prisma.supportTicket.findMany({
      where: { organizationId: requireOrgId(), customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
    return { items, total: items.length };
  }

  async createTicket(input: PortalTicketInput) {
    const orgId = requireOrgId();
    const customer = await this.currentCustomer();
    const ticketNumber = await nextCode(this.prisma, 'TICKET');
    const slaHours = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 72 }[input.priority] ?? 24;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        customerId: customer.id,
        bookingId: input.bookingId ?? null,
        category: input.category,
        subject: input.subject,
        description: input.description ?? null,
        priority: input.priority,
        status: 'NEW',
        slaDueAt: new Date(Date.now() + slaHours * 3_600_000),
        createdBy: actorId(),
      },
    });
    if (input.description) {
      await this.prisma.ticketMessage.create({
        data: { ticketId: ticket.id, body: input.description, authorRole: 'CUSTOMER', authorId: actorId() },
      });
    }
    return ticket;
  }

  async ticket(id: string) {
    const customer = await this.currentCustomer();
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId: requireOrgId(), customerId: customer.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw errors.notFound('Ticket');
    return ticket;
  }

  async addTicketMessage(id: string, body: string) {
    const ticket = await this.ticket(id);
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: ticket.id, body, authorRole: 'CUSTOMER', authorId: actorId() },
    });
    const nextStatus =
      ticket.status === 'NEW' || ticket.status === 'WAITING_CUSTOMER' ? 'IN_PROGRESS' : ticket.status;
    if (nextStatus !== ticket.status) {
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: nextStatus } });
    }
    return message;
  }

  async notifications() {
    const userId = currentUserId();
    const items = await this.prisma.notification.findMany({
      where: { organizationId: requireOrgId(), userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items, unread: items.filter((n) => !n.readAt).length };
  }

  async updateProfile(input: PortalProfileInput) {
    const customer = await this.currentCustomer();
    const data: Record<string, unknown> = {};
    if (input.firstName) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.phone) data.phone = input.phone;
    if (input.address !== undefined) data.address = input.address;
    if (input.city !== undefined) data.city = input.city;
    if (input.state !== undefined) data.state = input.state;
    if (input.pincode !== undefined) data.pincode = input.pincode;
    return this.prisma.customer.update({ where: { id: customer.id }, data });
  }
}
