import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { errors } from '../../../common/api-error';
import { Prisma } from '@prisma/client';

interface WorkOrderCreateInput {
  code: string;
  name: string;
  description: string;
  projectId: string;
  wbsId?: string;
  boqId?: string;
  supplierId?: string;
  rateMasterId?: string;
  plannedQty: number;
  unit: string;
  uom?: string;
  rate: number;
  amount: number;
  startDate?: Date;
  endDate?: Date;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  retentionRate?: number;
  retentionAmount?: number;
}

interface WorkOrderUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  plannedQty?: number;
  rate?: number;
  amount?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  retentionRate?: number;
  retentionAmount?: number;
}

interface WorkOrderFilter {
  status?: string;
  projectId?: string;
  supplierId?: string;
  wbsId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SubcontractorWorkOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: WorkOrderCreateInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throw errors.notFound('Project');

    // Check if work order code already exists in this project
    const existing = await this.prisma.subcontractorWorkOrder.findFirst({
      where: { projectId: input.projectId, code: input.code },
    });
    if (existing) throw new BadRequestException('Work order code already exists in this project');

    const workOrder = await this.prisma.subcontractorWorkOrder.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        wbsId: input.wbsId ?? null,
        boqId: input.boqId ?? null,
        supplierId: input.supplierId ?? null,
        rateMasterId: input.rateMasterId ?? null,
        plannedQty: input.plannedQty,
        unit: input.unit,
        uom: input.uom ?? '',
        rate: input.rate,
        amount: input.amount,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status ?? 'DRAFT',
        retentionRate: input.retentionRate ?? 0,
        retentionAmount: input.retentionAmount ?? 0,
        organizationId: project.organizationId,
      },
    });

    return workOrder;
  }

  async findAll(projectId: string, params: WorkOrderFilter) {
    const where: any = { projectId, status: { ne: 'CLOSED' } };
    if (params.status) where.status = params.status;
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.wbsId) where.wbsId = params.wbsId;

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.subcontractorWorkOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { code: true, name: true } },
          supplier: { select: { code: true, name: true } },
          boq: { select: { code: true, name: true } },
        },
      }),
      this.prisma.subcontractorWorkOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.subcontractorWorkOrder.findUnique({
      where: { id },
      include: {
        project: { select: { code: true, name: true } },
        supplier: { select: { code: true, name: true } },
        boq: { select: { code: true, name: true } },
        rateMaster: true,
      },
    });
    if (!workOrder) throw errors.notFound('Work order');
    return workOrder;
  }

  async update(id: string, input: WorkOrderUpdateInput) {
    const workOrder = await this.findOne(id);

    return this.prisma.subcontractorWorkOrder.update({
      where: { id },
      data: {
        code: input.code ?? workOrder.code,
        name: input.name ?? workOrder.name,
        description: input.description ?? workOrder.description,
        plannedQty: input.plannedQty ?? workOrder.plannedQty,
        rate: input.rate ?? workOrder.rate,
        amount: input.amount ?? workOrder.amount,
        status: input.status ?? workOrder.status,
        retentionRate: input.retentionRate ?? workOrder.retentionRate,
        retentionAmount: input.retentionAmount ?? workOrder.retentionAmount,
      },
    });
  }

  async remove(id: string) {
    const workOrder = await this.findOne(id);

    // Check if work order has children (sub-items, bills, etc.)
    const children = await this.prisma.subcontractorWorkOrder.count({
      where: { parentId: id },
    });
    if (children > 0) throw new BadRequestException('Cannot delete work order with child work orders');

    return this.prisma.subcontractorWorkOrder.update({
      where: { id },
      data: { status: 'CLOSED', deletedAt: new Date() },
    });
  }

  async getRetentionSummary(workOrderId: string) {
    const workOrder = await this.findOne(workOrderId);

    const retained = await this.prisma.subcontractorRetention.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });

    const totalRetained = retained.reduce((sum: number, r) => sum + r.retentionAmount, 0);
    const totalReleased = retained
      .filter((r: { status: string }) => r.status === 'RELEASED')
      .reduce((sum: number, r) => sum + r.retentionAmount, 0);

    return {
      workOrderId,
      totalRetained,
      totalReleased,
      remainingRetention: totalRetained - totalReleased,
      retentionRate: workOrder.retentionRate,
      retentionDetails: retained,
    };
  }
}