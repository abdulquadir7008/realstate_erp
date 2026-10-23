import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, BOQStatus, WBSBaselineStatus, BOQLineType, RateStatus } from '@prisma/client';
import { PaginationInput } from '@re/shared';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { errors } from '../../common/api-error';
import * as ExcelJS from 'exceljs';

interface BoqLineTreeNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: any;
  order: number;
  level: number;
  quantity: Prisma.Decimal;
  unit: string;
  uom: string | null;
  rateId: string | null;
  rate: Prisma.Decimal;
  amount: Prisma.Decimal;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  boqId: string;
  wbsItemId: string | null;
  parentId: string | null;
  organizationId: string;
  children: BoqLineTreeNode[];
}

@Injectable()
export class BoqService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, data: Prisma.BOQCreateInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throw errors.notFound('Project');

    if (data.wbs?.connect?.id) {
      const wbs = await this.prisma.wBS.findFirst({
        where: { id: data.wbs.connect.id, projectId, deletedAt: null },
      });
      if (!wbs) throw errors.conflict('WBS does not belong to this project');
    }

    const existing = await this.prisma.bOQ.findUnique({
      where: { projectId_code: { projectId, code: data.code as string } },
    });
    if (existing) throw errors.conflict('BOQ code already exists in this project');

    return this.prisma.bOQ.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        wbsId: data.wbs?.connect?.id ?? null,
        version: data.version ?? 1,
        status: data.status ?? 'DRAFT',
        baselineStatus: data.baselineStatus ?? 'PROPOSED',
        totalAmount: data.totalAmount ?? 0,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        projectId,
        organizationId: project.organizationId,
      },
    });
  }

  async findAll(projectId: string, params: { page: number; limit: number; status?: string; wbsId?: string; sortDir?: string }) {
    const where: Prisma.BOQWhereInput = { projectId, deletedAt: null };
    if (params.status) where.status = params.status as any;
    if (params.wbsId) where.wbsId = params.wbsId;

    const [items, total] = await Promise.all([
      this.prisma.bOQ.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { code: 'asc' },
        include: {
          lines: {
            where: { deletedAt: null, parentId: null },
            orderBy: { order: 'asc' },
            include: { children: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
          },
          versions: { orderBy: { version: 'desc' }, take: 1 },
        },
      }),
      this.prisma.bOQ.count({ where }),
    ]);
    return { items, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
  }

  async findOne(id: string) {
    const boq = await this.prisma.bOQ.findUnique({
      where: { id, deletedAt: null },
      include: {
        lines: {
          where: { deletedAt: null },
          orderBy: [{ level: 'asc' }, { order: 'asc' }],
        },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!boq) throw errors.notFound('BOQ');
    return boq;
  }

  async getTree(id: string) {
    const boq = await this.findOne(id);
    return this.buildTreeFromFlat(boq.lines);
  }

  private buildTreeFromFlat(lines: Prisma.BOQLineGetPayload<{} >[], parentId: string | null = null): BoqLineTreeNode[] {
    return lines
      .filter((line) => line.parentId === parentId)
      .map((line) => ({
        ...line,
        children: this.buildTreeFromFlat(lines, line.id),
      }));
  }

  async update(id: string, data: Prisma.BOQUpdateInput) {
    await this.findOne(id);
    return this.prisma.bOQ.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: any) {
    await this.findOne(id);
    return this.prisma.bOQ.update({ where: { id }, data: { status } });
  }

  async createVersion(boqId: string, data: { name: string; snapshot: any; baselineStatus?: any; notes?: string; approvedBy?: string }) {
    const boq = await this.findOne(boqId);
    const nextVersion = boq.version + 1;

    const version = await this.prisma.bOQVersion.create({
      data: {
        boqId,
        version: nextVersion,
        name: data.name,
        snapshot: data.snapshot,
        baselineStatus: data.baselineStatus ?? 'PROPOSED',
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.baselineStatus === 'APPROVED' ? new Date() : null,
        notes: data.notes ?? null,
        organizationId: boq.organizationId,
      },
    });

    await this.prisma.bOQ.update({
      where: { id: boqId },
      data: { version: nextVersion },
    });

    return version;
  }

  async getVersions(boqId: string) {
    await this.findOne(boqId);
    return this.prisma.bOQVersion.findMany({
      where: { boqId },
      orderBy: { version: 'desc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.bOQ.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async recalculateTotals(boqId: string) {
    const lines = await this.prisma.bOQLine.findMany({
      where: { boqId, deletedAt: null },
      select: { amount: true },
    });
    const total = lines.reduce((sum, line) => sum + Number(line.amount), 0);
    await this.prisma.bOQ.update({
      where: { id: boqId },
      data: { totalAmount: total },
    });
    return total;
  }

  async importFromExcel(projectId: string, fileBuffer: Buffer, wbsId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throw errors.notFound('Project');

    if (wbsId) {
      const wbs = await this.prisma.wBS.findFirst({
        where: { id: wbsId, projectId, deletedAt: null },
        select: { id: true },
      });
      if (!wbs) throw errors.conflict('WBS does not belong to this project');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch {
      throw errors.validation('Invalid or unsupported Excel file');
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw errors.validation('Workbook contains no worksheet');

    const cellText = (row: ExcelJS.Row, column: number): string | null => {
      const value: any = row.getCell(column).value;
      if (value === null || value === undefined) return null;
      let text: string;
      if (typeof value === 'object') {
        if (Array.isArray(value.richText)) {
          text = value.richText.map((part: any) => part.text ?? '').join('');
        } else if (value.result !== undefined && value.result !== null) {
          text = String(value.result);
        } else if (value.text !== undefined && value.text !== null) {
          text = String(value.text);
        } else {
          return null;
        }
      } else {
        text = String(value);
      }
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const validTypes = ['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER'];
    type ImportRow = {
      code: string;
      name: string;
      description: string | null;
      type: any;
      quantity: number;
      unit: string;
      uom: string | null;
      rate: number;
      wbsItemCode: string | null;
      parentCode: string | null;
    };

    const rows: ImportRow[] = [];
    const seenCodes = new Set<string>();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const code = cellText(row, 1);
      const name = cellText(row, 2);
      if (!code || !name) return;
      if (seenCodes.has(code)) throw errors.conflict(`Duplicate BOQ line code in file: ${code}`);
      seenCodes.add(code);

      const rawType = cellText(row, 4)?.toUpperCase();
      const type = rawType && validTypes.includes(rawType) ? rawType : 'MATERIAL';

      rows.push({
        code,
        name,
        description: cellText(row, 3),
        type,
        quantity: Number(cellText(row, 5) ?? 0) || 0,
        unit: cellText(row, 6) ?? '',
        uom: cellText(row, 7),
        rate: Number(cellText(row, 8) ?? 0) || 0,
        wbsItemCode: cellText(row, 9),
        parentCode: cellText(row, 10),
      });
    });

    if (rows.length === 0) throw errors.validation('No data rows found in file');

    const rowByCode = new Map(rows.map((row) => [row.code, row]));
    for (const row of rows) {
      if (row.parentCode && !rowByCode.has(row.parentCode)) {
        throw errors.validation(`Parent line code not found in file: ${row.parentCode}`);
      }
    }

    const depthCache = new Map<string, number>();
    const resolveDepth = (code: string, stack: Set<string>): number => {
      const cached = depthCache.get(code);
      if (cached !== undefined) return cached;
      const row = rowByCode.get(code)!;
      if (!row.parentCode) {
        depthCache.set(code, 1);
        return 1;
      }
      if (stack.has(code)) throw errors.validation(`Circular parent reference at code: ${code}`);
      stack.add(code);
      const depth = resolveDepth(row.parentCode, stack) + 1;
      stack.delete(code);
      if (depth > 10) throw errors.validation(`Maximum BOQ line depth (10) exceeded at code: ${code}`);
      depthCache.set(code, depth);
      return depth;
    };
    rows.forEach((row) => resolveDepth(row.code, new Set<string>()));
    const orderedRows = [...rows].sort((a, b) => depthCache.get(a.code)! - depthCache.get(b.code)!);

    const wbsCodes = [...new Set(rows.map((row) => row.wbsItemCode).filter((code): code is string => !!code))];
    const wbsItemByCode = new Map<string, string>();
    if (wbsCodes.length > 0) {
      const wbsItems = await this.prisma.wBSItem.findMany({
        where: { code: { in: wbsCodes }, deletedAt: null, ...(wbsId ? { wbsId } : {}) },
        select: { id: true, code: true },
      });
      for (const item of wbsItems) {
        if (!wbsItemByCode.has(item.code)) wbsItemByCode.set(item.code, item.id);
      }
    }

    const boq = await this.create(projectId, {
      code: `BOQ_${Date.now()}`,
      name: `Imported BOQ ${new Date().toISOString().split('T')[0]}`,
      wbs: wbsId ? { connect: { id: wbsId } } : undefined,
      status: 'DRAFT',
      baselineStatus: 'PROPOSED',
    } as any);

    const lineIdByCode = new Map<string, string>();
    const siblingCounters = new Map<string, number>();
    for (const row of orderedRows) {
      const parentId = row.parentCode ? lineIdByCode.get(row.parentCode) ?? null : null;
      const level = parentId ? depthCache.get(row.code)! : 1;
      const counterKey = parentId ?? '__root__';
      const order = siblingCounters.get(counterKey) ?? 0;
      siblingCounters.set(counterKey, order + 1);

      const created = await this.prisma.bOQLine.create({
        data: {
          code: row.code,
          name: row.name,
          description: row.description,
          type: row.type,
          parentId,
          order,
          level,
          quantity: row.quantity,
          unit: row.unit,
          uom: row.uom,
          rate: row.rate,
          amount: row.quantity * row.rate,
          wbsItemId: row.wbsItemCode ? wbsItemByCode.get(row.wbsItemCode) ?? null : null,
          boqId: boq.id,
          organizationId: project.organizationId,
        },
      });
      lineIdByCode.set(row.code, created.id);
    }

    const totalAmount = await this.recalculateTotals(boq.id);
    const lines = await this.prisma.bOQLine.findMany({
      where: { boqId: boq.id, deletedAt: null },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });

    return { boq: { ...boq, totalAmount }, lines };
  }
}

@Injectable()
export class BoqLineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boqId: string, data: any) {
    const boq = await this.prisma.bOQ.findUnique({ where: { id: boqId, deletedAt: null } });
    if (!boq) throw errors.notFound('BOQ');

    if (data.parentId) {
      const parent = await this.prisma.bOQLine.findUnique({
        where: { id: data.parentId, boqId, deletedAt: null },
      });
      if (!parent) throw errors.conflict('Parent line does not exist in this BOQ');
      if (parent.level >= 10) throw new BadRequestException('Maximum BOQ line depth (10) reached');
    }

    if (data.wbsItemId) {
      const wbsItem = await this.prisma.wBSItem.findUnique({
        where: { id: data.wbsItemId, deletedAt: null },
      });
      if (!wbsItem) throw errors.conflict('WBS Item does not exist');
    }

    if (data.rateId) {
      const rate = await this.prisma.rateMaster.findUnique({
        where: { id: data.rateId, deletedAt: null },
      });
      if (!rate) throw errors.conflict('Rate Master does not exist');
    }

    const parentId = data.parentId ?? null;
    const order = await this.getNextOrder(boqId, parentId);
    const level = parentId ? (await this.prisma.bOQLine.findUnique({ where: { id: parentId } }))!.level + 1 : 1;

    const rate = data.rateId
      ? await this.prisma.rateMaster.findUnique({ where: { id: data.rateId }, select: { baseRate: true } })
      : null;
    const resolvedRate = data.rate ?? rate?.baseRate ?? 0;
    const amount = data.quantity * resolvedRate;

    const line = await this.prisma.bOQLine.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? 'MATERIAL',
        parentId: data.parentId ?? null,
        order,
        level,
        quantity: data.quantity ?? 0,
        unit: data.unit ?? '',
        uom: data.uom ?? null,
        rateId: data.rateId ?? null,
        rate: resolvedRate,
        amount,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        boqId,
        wbsItemId: data.wbsItemId ?? null,
        organizationId: boq.organizationId,
      },
    });

    await this.recalculateBoqTotal(boqId);
    return line;
  }

  async findAll(boqId: string, params: { parentId?: string | null }) {
    const where: any = { boqId, deletedAt: null };
    if (params.parentId !== undefined) where.parentId = params.parentId;

    return this.prisma.bOQLine.findMany({
      where,
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });
  }

  async findOne(id: string) {
    const line = await this.prisma.bOQLine.findUnique({
      where: { id, deletedAt: null },
      include: { children: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    if (!line) throw errors.notFound('BOQ Line');
    return line;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const line = await this.prisma.bOQLine.update({ where: { id }, data });
    await this.recalculateBoqTotal(line.boqId);
    return line;
  }

  async move(id: string, newParentId: string | null, newOrder: number) {
    const line = await this.findOne(id);
    if (newParentId === line.parentId && newOrder === line.order) return line;

    if (newParentId) {
      const parent = await this.prisma.bOQLine.findUnique({
        where: { id: newParentId, boqId: line.boqId, deletedAt: null },
      });
      if (!parent) throw errors.conflict('New parent does not exist');
      if (parent.level >= 10) throw new BadRequestException('Maximum BOQ line depth (10) reached');
      if (await this.isDescendant(id, newParentId)) throw new BadRequestException('Cannot move line under its own descendant');
    }

    await this.reorderSiblings(line.boqId, line.parentId, line.order, 'increment');
    await this.reorderSiblings(line.boqId, newParentId, newOrder, 'decrement');

    return this.prisma.bOQLine.update({
      where: { id },
      data: { parentId: newParentId, order: newOrder, level: newParentId ? (await this.prisma.bOQLine.findUnique({ where: { id: newParentId } }))!.level + 1 : 1 },
    });
  }

  private async isDescendant(lineId: string, potentialAncestorId: string): Promise<boolean> {
    let current = await this.prisma.bOQLine.findUnique({ where: { id: lineId }, select: { parentId: true } });
    while (current?.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = await this.prisma.bOQLine.findUnique({ where: { id: current.parentId }, select: { parentId: true } });
    }
    return false;
  }

  private async reorderSiblings(boqId: string, parentId: string | null, fromOrder: number, direction: 'increment' | 'decrement') {
    const lines = await this.prisma.bOQLine.findMany({
      where: { boqId, parentId, deletedAt: null, order: { gte: fromOrder } },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });

    for (const line of lines) {
      await this.prisma.bOQLine.update({
        where: { id: line.id },
        data: { order: direction === 'increment' ? line.order + 1 : line.order - 1 },
      });
    }
  }

  private async getNextOrder(boqId: string, parentId: string | null): Promise<number> {
    const last = await this.prisma.bOQLine.findFirst({
      where: { boqId, parentId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  async remove(id: string) {
    const line = await this.findOne(id);
    const children = await this.prisma.bOQLine.count({ where: { parentId: id, deletedAt: null } });
    if (children > 0) throw new BadRequestException('Cannot delete line with children. Move or delete children first.');

    await this.prisma.bOQLine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.recalculateBoqTotal(line.boqId);
  }

  private async recalculateBoqTotal(boqId: string) {
    const lines = await this.prisma.bOQLine.findMany({
      where: { boqId, deletedAt: null },
      select: { amount: true },
    });
    const total = lines.reduce((sum, line) => sum + Number(line.amount), 0);
    await this.prisma.bOQ.update({
      where: { id: boqId },
      data: { totalAmount: total },
    });
    return total;
  }
}

@Injectable()
export class RateMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.rateMaster.findUnique({
      where: { organizationId_code: { organizationId: data.organizationId ?? '', code: data.code } },
    });
    if (existing) throw errors.conflict('Rate code already exists');

    return this.prisma.rateMaster.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? 'MATERIAL',
        unit: data.unit,
        uom: data.uom ?? null,
        baseRate: data.baseRate ?? 0,
        currency: data.currency ?? 'INR',
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo ?? null,
        status: data.status ?? 'DRAFT',
        tags: data.tags ?? [],
        organizationId: data.organizationId,
      },
    });
  }

  async findAll(params: { page: number; limit: number; type?: string; status?: string; organizationId?: string; sortDir?: string }) {
    const where: any = { deletedAt: null };
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.organizationId) where.organizationId = params.organizationId;

    const [items, total] = await Promise.all([
      this.prisma.rateMaster.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { code: params.sortDir === 'asc' ? 'asc' : 'desc' },
      }),
      this.prisma.rateMaster.count({ where }),
    ]);
    return { items, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
  }

  async findOne(id: string) {
    const rate = await this.prisma.rateMaster.findUnique({
      where: { id, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!rate) throw errors.notFound('Rate Master');
    return rate;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.rateMaster.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: any) {
    await this.findOne(id);
    return this.prisma.rateMaster.update({ where: { id }, data: { status } });
  }

  async createVersion(rateMasterId: string, data: any) {
    const rate = await this.findOne(rateMasterId);
    const nextVersion = (await this.prisma.rateVersion.count({ where: { rateMasterId } })) + 1;

    const version = await this.prisma.rateVersion.create({
      data: {
        rateMasterId,
        version: nextVersion,
        name: data.name,
        baseRate: data.baseRate,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo ?? null,
        status: data.status ?? 'DRAFT',
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.status === 'ACTIVE' ? new Date() : null,
        notes: data.notes ?? null,
        organizationId: rate.organizationId,
      },
    });

    return version;
  }

  async getVersions(rateMasterId: string) {
    await this.findOne(rateMasterId);
    return this.prisma.rateVersion.findMany({
      where: { rateMasterId },
      orderBy: { version: 'desc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rateMaster.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getApplicableRate(id: string, date: Date) {
    const rateMaster = await this.findOne(id);

    const version = await this.prisma.rateVersion.findFirst({
      where: {
        rateMasterId: id,
        status: 'ACTIVE',
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      rateMasterId: id,
      code: rateMaster.code,
      name: rateMaster.name,
      date,
      baseRate: version?.baseRate ?? rateMaster.baseRate,
      currency: rateMaster.currency,
      source: version ? 'VERSION' : 'MASTER',
      versionId: version?.id ?? null,
      version: version?.version ?? null,
      effectiveFrom: version?.effectiveFrom ?? rateMaster.effectiveFrom,
      effectiveTo: version?.effectiveTo ?? rateMaster.effectiveTo,
    };
  }
}