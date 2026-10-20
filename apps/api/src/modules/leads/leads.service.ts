import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import {
  LeadInput,
  UpdateLeadInput,
  LeadActivityInput,
  FollowUpInput,
  UpdateFollowUpInput,
  ConvertLeadInput,
  PaginationInput,
} from '@re/shared';

export interface LeadListQuery extends PaginationInput {
  status?: string;
  source?: string;
  assignedTo?: string;
  projectId?: string;
  from?: Date;
  to?: Date;
  unassignedOnly?: boolean;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: LeadListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.source) where.source = q.source;
    if (q.projectId) where.projectId = q.projectId;
    if (q.unassignedOnly) where.assignedTo = null;
    else if (q.assignedTo) where.assignedTo = q.assignedTo;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
        { leadNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.lead.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        activities: { orderBy: { occurredAt: 'desc' }, take: 50 },
        followUps: { orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (!lead) throw errors.notFound('Lead');
    return lead;
  }

  async create(input: LeadInput) {
    const leadNumber = await nextCode(this.prisma, 'LEAD');
    const lead = await this.prisma.lead.create({
      data: {
        ...(this.toData(input) as any),
        organizationId: requireOrgId(),
        leadNumber,
        createdBy: actorId(),
        lastActivityAt: new Date(),
      },
    });
    await this.prisma.leadActivity.create({
      data: { organizationId: requireOrgId(), leadId: lead.id, type: 'SYSTEM', content: 'Lead created', createdBy: actorId() },
    });
    return this.get(lead.id);
  }

  async update(id: string, input: UpdateLeadInput) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    const data = this.toData(input) as any;

    if (input.status && input.status !== lead.status) {
      await this.prisma.leadActivity.create({
        data: {
          organizationId: requireOrgId(),
          leadId: id,
          type: 'STATUS_CHANGE',
          content: `${lead.status} → ${input.status}`,
          createdBy: actorId(),
        },
      });
      if (input.status === 'CONVERTED' && !lead.convertedAt) data.convertedAt = new Date();
    }

    return this.prisma.lead.update({ where: { id }, data: { ...data, lastActivityAt: new Date() } });
  }

  async assign(id: string, assignedTo: string | null) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    await this.prisma.leadActivity.create({
      data: { organizationId: requireOrgId(), leadId: id, type: 'SYSTEM', content: 'Lead reassigned', createdBy: actorId() },
    });
    return this.prisma.lead.update({ where: { id }, data: { assignedTo, lastActivityAt: new Date() } });
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  async addActivity(leadId: string, input: LeadActivityInput) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    const activity = await this.prisma.leadActivity.create({
      data: { ...input, organizationId: requireOrgId(), leadId, createdBy: actorId() },
    });
    await this.prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } });
    return activity;
  }

  async addFollowUp(leadId: string, input: FollowUpInput) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    const followUp = await this.prisma.followUp.create({
      data: { ...input, organizationId: requireOrgId(), leadId, createdBy: actorId() },
    });
    await this.prisma.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: input.scheduledAt } });
    return followUp;
  }

  async updateFollowUp(followUpId: string, input: UpdateFollowUpInput) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id: followUpId } });
    if (!followUp) throw errors.notFound('Follow-up');
    const data: any = { ...input };
    if (input.status === 'DONE' && !followUp.completedAt) data.completedAt = new Date();
    return this.prisma.followUp.update({ where: { id: followUpId }, data });
  }

  async convert(leadId: string, input: ConvertLeadInput) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw errors.notFound('Lead');
    if (lead.status === 'CONVERTED' && lead.customerId) throw errors.conflict('Lead has already been converted');

    const customerCode = await nextCode(this.prisma, 'CUSTOMER');
    const orgId = requireOrgId();
    const c = input.customer;

    const customer = await this.prisma.customer.create({
      data: {
        organizationId: orgId,
        customerCode,
        type: c.type,
        firstName: c.firstName,
        lastName: c.lastName ?? null,
        email: c.email || null,
        phone: c.phone,
        city: c.city ?? null,
        address: c.address ?? null,
        pan: c.pan ?? null,
        source: lead.source,
        leadId: lead.id,
        assignedTo: lead.assignedTo,
        createdBy: actorId(),
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED', convertedAt: new Date(), customerId: customer.id, lastActivityAt: new Date() },
    });
    await this.prisma.leadActivity.create({
      data: { organizationId: orgId, leadId, type: 'SYSTEM', content: `Converted to customer ${customerCode}`, createdBy: actorId() },
    });

    return { customerId: customer.id, customerCode };
  }

  private toData(input: Partial<LeadInput> & { status?: string; lostReason?: string | null }) {
    const data: any = {};
    const keys = [
      'name',
      'email',
      'phone',
      'altPhone',
      'city',
      'source',
      'propertyType',
      'budgetMin',
      'budgetMax',
      'projectId',
      'branchId',
      'assignedTo',
      'notes',
      'nextFollowUpAt',
      'status',
      'lostReason',
    ] as const;
    for (const key of keys) if ((input as any)[key] !== undefined) data[key] = (input as any)[key];
    if (data.email === '') data.email = null;
    return data;
  }
}
