import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { errors } from '../../../common/api-error';
import { Prisma } from '@prisma/client';

interface RABillCreateInput {
  workOrderId: string;
  billNo: string;
  billDate: Date;
  certifiedQty: number;
  certifiedAmount: number;
  retentionAmount: number;
  balanceQty: number;
  balanceAmount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

interface RABillUpdateInput {
  certifiedQty?: number;
  certifiedAmount?: number;
  retentionAmount?: number;
  balanceQty?: number;
  balanceAmount?: number;
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  notes?: string;
}

interface RABillFilter {
  workOrderId?: string;
  status?: string;
  billNo?: string;
}

@Injectable()
export class SubcontractorRABillingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: RABillCreateInput) {
    // Check if bill with same number already exists
    const existing = await this.prisma.subcontractorRABill.findFirst({
      where: { workOrderId: input.workOrderId, billNo: input.billNo },
    });
    if (existing) throw new BadRequestException('RA bill number already exists for this work order');

    const bill = await this.prisma.subcontractorRABill.create({
      data: {
        workOrderId: input.workOrderId,
        billNo: input.billNo,
        billDate: input.billDate,
        certifiedQty: input.certifiedQty,
        certifiedAmount: input.certifiedAmount,
        retentionAmount: input.retentionAmount,
        balanceQty: input.balanceQty,
        balanceAmount: input.balanceAmount,
        status: input.status,
        submittedBy: input.submittedBy ?? null,
        submittedAt: input.submittedAt ?? new Date(),
        approvedBy: input.approvedBy ?? null,
        approvedAt: input.approvedAt ?? null,
        notes: input.notes ?? null,
      },
    });

    return bill;
  }

  async findAll(filter: RABillFilter) {
    const where: any = {};
    if (filter.workOrderId) where.workOrderId = filter.workOrderId;
    if (filter.status) where.status = filter.status;
    if (filter.billNo) where.billNo = filter.billNo;

    return this.prisma.subcontractorRABill.findMany({
      where,
      orderBy: { billDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const bill = await this.prisma.subcontractorRABill.findUnique({
      where: { id },
    });
    if (!bill) throw errors.notFound('RA bill');
    return bill;
  }

  async update(id: string, input: RABillUpdateInput) {
    const bill = await this.findOne(id);

    return this.prisma.subcontractorRABill.update({
      where: { id },
      data: {
        certifiedQty: input.certifiedQty ?? bill.certifiedQty,
        certifiedAmount: input.certifiedAmount ?? bill.certifiedAmount,
        retentionAmount: input.retentionAmount ?? bill.retentionAmount,
        balanceQty: input.balanceQty ?? bill.balanceQty,
        balanceAmount: input.balanceAmount ?? bill.balanceAmount,
        status: input.status ?? bill.status,
        notes: input.notes ?? bill.notes,
      },
    });
  }
}