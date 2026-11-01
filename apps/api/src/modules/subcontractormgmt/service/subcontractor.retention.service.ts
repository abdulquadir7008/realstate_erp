import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { errors } from '../../../common/api-error';
import { Prisma } from '@prisma/client';

interface RetentionCreateInput {
  workOrderId: string;
  retentionRate: number;
  retentionAmount: number;
  status: 'HELD' | 'RELEASED' | 'PARTIAL';
  releaseDate?: Date;
  releaseReason?: string;
  releasedBy?: string;
}

interface RetentionUpdateInput {
  status?: 'HELD' | 'RELEASED' | 'PARTIAL';
  releaseDate?: Date;
  releaseReason?: string;
  releasedBy?: string;
}

interface RetentionFilter {
  workOrderId?: string;
  status?: string;
}

@Injectable()
export class SubcontractorRetentionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: RetentionCreateInput) {
    // Check if retention already exists for this work order
    const existing = await this.prisma.subcontractorRetention.findFirst({
      where: { workOrderId: input.workOrderId },
    });
    if (existing) throw new BadRequestException('Retention already exists for this work order');

    const retention = await this.prisma.subcontractorRetention.create({
      data: {
        workOrderId: input.workOrderId,
        retentionRate: input.retentionRate,
        retentionAmount: input.retentionAmount,
        status: input.status,
        releaseDate: input.releaseDate ?? null,
        releaseReason: input.releaseReason ?? null,
        releasedBy: input.releasedBy ?? null,
      },
    });

    return retention;
  }

  async findAll(filter: RetentionFilter) {
    const where: any = {};
    if (filter.workOrderId) where.workOrderId = filter.workOrderId;
    if (filter.status) where.status = filter.status;

    return this.prisma.subcontractorRetention.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const retention = await this.prisma.subcontractorRetention.findUnique({
      where: { id },
    });
    if (!retention) throw errors.notFound('Retention record');
    return retention;
  }

  async update(id: string, input: RetentionUpdateInput) {
    const retention = await this.findOne(id);

    return this.prisma.subcontractorRetention.update({
      where: { id },
      data: {
        status: input.status ?? retention.status,
        releaseDate: input.releaseDate ?? retention.releaseDate,
        releaseReason: input.releaseReason ?? retention.releaseReason,
        releasedBy: input.releasedBy ?? retention.releasedBy,
      },
    });
  }

  async getRetentionSummary(workOrderId: string) {
    const retained = await this.prisma.subcontractorRetention.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });

    const totalRetained = retained.reduce(
      (sum: number, r) => sum + r.retentionAmount, 0
    );
    const totalReleased = retained
      .filter((r: { status: string }) => r.status === 'RELEASED')
      .reduce((sum: number, r) => sum + r.retentionAmount, 0);

    return {
      workOrderId,
      totalRetained,
      totalReleased,
      remainingRetention: totalRetained - totalReleased,
      retentionRate: retained.length > 0 ? retained[0].retentionRate : 0,
      retentionDetails: retained,
    };
  }
}