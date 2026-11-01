import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { errors } from '../../../common/api-error';
import { Prisma } from '@prisma/client';

interface SubcontractCostLinkCreateInput {
  workOrderId: string;
  projectId: string;
  costHead: 'LABOUR' | 'MATERIAL' | 'SUBCONTRACTOR' | 'OVERHEAD';
  subcontractorId?: string;
  billedAmount: number;
  retainedAmount: number;
  netAmount: number;
  status: 'PENDING' | 'APPROVED' | 'POSTED';
  description?: string;
}

interface SubcontractCostLinkUpdateInput {
  billedAmount?: number;
  retainedAmount?: number;
  netAmount?: number;
  status?: 'PENDING' | 'APPROVED' | 'POSTED';
  description?: string;
}

interface SubcontractCostLinkFilter {
  workOrderId?: string;
  projectId?: string;
  costHead?: string;
  status?: string;
}

@Injectable()
export class SubcontractCostLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: SubcontractCostLinkCreateInput) {
    // Check if link already exists for this work order and cost head
    const existing = await this.prisma.subcontractCostLink.findFirst({
      where: {
        workOrderId: input.workOrderId,
        costHead: input.costHead,
      },
    });
    if (existing) throw new BadRequestException('Cost link already exists for this work order and cost head');

    const link = await this.prisma.subcontractCostLink.create({
      data: {
        workOrderId: input.workOrderId,
        projectId: input.projectId,
        costHead: input.costHead,
        subcontractorId: input.subcontractorId ?? null,
        billedAmount: input.billedAmount,
        retainedAmount: input.retainedAmount,
        netAmount: input.netAmount,
        status: input.status,
        description: input.description ?? null,
      },
    });

    return link;
  }

  async findAll(filter: SubcontractCostLinkFilter) {
    const where: any = {};
    if (filter.workOrderId) where.workOrderId = filter.workOrderId;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.costHead) where.costHead = filter.costHead;
    if (filter.status) where.status = filter.status;

    return this.prisma.subcontractCostLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { code: true, name: true } },
        workOrder: { select: { code: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const link = await this.prisma.subcontractCostLink.findUnique({
      where: { id },
    });
    if (!link) throw errors.notFound('Subcontract cost link');
    return link;
  }

  async update(id: string, input: SubcontractCostLinkUpdateInput) {
    const link = await this.findOne(id);

    return this.prisma.subcontractCostLink.update({
      where: { id },
      data: {
        billedAmount: input.billedAmount ?? link.billedAmount,
        retainedAmount: input.retainedAmount ?? link.retainedAmount,
        netAmount: input.netAmount ?? link.netAmount,
        status: input.status ?? link.status,
        description: input.description ?? link.description,
      },
    });
  }
}