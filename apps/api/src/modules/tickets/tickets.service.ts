import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { TicketInput, UpdateTicketInput, TicketMessageInput, HandoverInput, UpdateHandoverInput, PaginationInput } from '@re/shared';

export interface TicketListQuery extends PaginationInput {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  customerId?: string;
}

export interface HandoverListQuery extends PaginationInput {
  status?: string;
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: TicketListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;
    if (q.priority) where.priority = q.priority;
    if (q.assignedTo) where.assignedTo = q.assignedTo;
    if (q.customerId) where.customerId = q.customerId;
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [{ subject: { contains: s, mode: 'insensitive' } }, { ticketNumber: { contains: s, mode: 'insensitive' } }];
    }
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw errors.notFound('Ticket');
    return ticket;
  }

  async create(input: TicketInput) {
    const orgId = requireOrgId();
    const ticketNumber = await nextCode(this.prisma, 'TICKET');
    const slaDueAt = new Date(Date.now() + this.slaHours(input.priority) * 3_600_000);
    return this.prisma.supportTicket.create({
      data: { ...input, organizationId: orgId, ticketNumber, slaDueAt, createdBy: actorId() },
    });
  }

  private slaHours(priority: string): number {
    return { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 72 }[priority] ?? 24;
  }

  async update(id: string, input: UpdateTicketInput) {
    await this.get(id);
    const data: any = { ...input };
    if (input.status === 'CLOSED' || input.status === 'RESOLVED') data.closedAt = new Date();
    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  async addMessage(id: string, input: TicketMessageInput) {
    await this.get(id);
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: id, body: input.body, authorRole: input.authorRole, attachments: input.attachments, authorId: actorId() },
    });
    await this.prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
    return message;
  }

  // ---------------- handovers

  async listHandovers(q: HandoverListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    const [items, total] = await Promise.all([
      this.prisma.handover.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.handover.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createHandover(input: HandoverInput) {
    const booking = await this.prisma.booking.findFirst({ where: { id: input.bookingId, deletedAt: null } });
    if (!booking) throw errors.notFound('Booking');
    return this.prisma.handover.create({
      data: {
        organizationId: requireOrgId(),
        bookingId: input.bookingId,
        scheduledAt: input.scheduledAt ?? null,
        notes: input.notes ?? null,
        status: 'PENDING',
        checklist: [],
      },
    });
  }

  async updateHandover(id: string, input: UpdateHandoverInput) {
    const handover = await this.prisma.handover.findFirst({ where: { id } });
    if (!handover) throw errors.notFound('Handover');
    const data: any = { ...input };
    if (input.status === 'COMPLETED' && !input.handedOverAt) data.handedOverAt = new Date();
    return this.prisma.handover.update({ where: { id }, data });
  }
}
