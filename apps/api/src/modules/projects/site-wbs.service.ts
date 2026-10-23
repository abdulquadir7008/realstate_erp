import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationInput } from '@re/shared';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { errors } from '../../common/api-error';
import { Prisma, WBSStatus, WBSBaselineStatus, WBSItemType } from '@prisma/client';
import { SiteInput, UpdateSiteInput, WbsInput, UpdateWbsInput, WbsItemInput, UpdateWbsItemInput, WbsVersionInput } from '@re/shared';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, data: SiteInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throw errors.notFound('Project');

    const existing = await this.prisma.site.findUnique({
      where: { projectId_code: { projectId, code: data.code } },
    });
    if (existing) throw errors.conflict('Site code already exists in this project');

    return this.prisma.site.create({
      data: {
        code: data.code,
        name: data.name,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        areaSqft: data.areaSqft ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        status: data.status ?? 'PLANNING',
        projectId,
        organizationId: project.organizationId,
      },
    });
  }

  async findAll(projectId: string, params: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.site.findMany({
        where: { projectId, deletedAt: null },
        skip: pageOffset(params.page, params.limit),
        take: params.limit,
        orderBy: { createdAt: params.sortDir ?? 'desc' },
      }),
      this.prisma.site.count({ where: { projectId, deletedAt: null } }),
    ]);
    return paginated(items, total, params.page, params.limit);
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id, deletedAt: null },
      include: { wbs: { where: { deletedAt: null }, orderBy: { code: 'asc' } } },
    });
    if (!site) throw errors.notFound('Site');
    return site;
  }

  async update(id: string, data: UpdateSiteInput) {
    await this.findOne(id);
    return this.prisma.site.update({ where: { id }, data: data as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.site.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

interface WBSItemTreeNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: WBSItemType;
  order: number;
  level: number;
  quantity: Prisma.Decimal | null;
  unit: string | null;
  uom: string | null;
  startDate: Date | null;
  endDate: Date | null;
  plannedCost: Prisma.Decimal;
  actualCost: Prisma.Decimal;
  committedCost: Prisma.Decimal;
  progressPercent: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  wbsId: string;
  parentId: string | null;
  organizationId: string;
  children: WBSItemTreeNode[];
}

@Injectable()
export class WbsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, data: WbsInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throw errors.notFound('Project');

    const existing = await this.prisma.wBS.findUnique({
      where: { projectId_code: { projectId, code: data.code } },
    });
    if (existing) throw errors.conflict('WBS code already exists in this project');

    if (data.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: data.siteId, projectId, deletedAt: null },
      });
      if (!site) throw errors.conflict('Site does not belong to this project');
    }

    return this.prisma.wBS.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        siteId: data.siteId ?? null,
        version: data.version ?? 1,
        status: data.status ?? 'DRAFT',
        baselineStatus: data.baselineStatus ?? 'PROPOSED',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        projectId,
        organizationId: project.organizationId,
      },
    });
  }

  async findAll(projectId: string, params: PaginationInput & { siteId?: string; status?: string }) {
    const where: Prisma.WBSWhereInput = { projectId, deletedAt: null };
    if (params.siteId) where.siteId = params.siteId;
    if (params.status) where.status = params.status as WBSStatus;

    const [items, total] = await Promise.all([
      this.prisma.wBS.findMany({
        where,
        skip: pageOffset(params.page, params.limit),
        take: params.limit,
        orderBy: { code: 'asc' },
        include: {
          items: {
            where: { deletedAt: null, parentId: null },
            orderBy: { order: 'asc' },
            include: { children: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
          },
          versions: { orderBy: { version: 'desc' }, take: 1 },
        },
      }),
      this.prisma.wBS.count({ where }),
    ]);
    return paginated(items, total, params.page, params.limit);
  }

  async findOne(id: string) {
    const wbs = await this.prisma.wBS.findUnique({
      where: { id, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ level: 'asc' }, { order: 'asc' }],
        },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!wbs) throw errors.notFound('WBS');
    return wbs;
  }

  async getTree(id: string): Promise<WBSItemTreeNode[]> {
    const wbs = await this.findOne(id);
    // Fetch all items for this WBS to build tree in memory
    const allItems = await this.prisma.wBSItem.findMany({
      where: { wbsId: id, deletedAt: null },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });
    return this.buildTreeFromFlat(allItems);
  }

  private buildTreeFromFlat(items: Prisma.WBSItemGetPayload<{} >[], parentId: string | null = null): WBSItemTreeNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTreeFromFlat(items, item.id),
      }));
  }

  async update(id: string, data: UpdateWbsInput) {
    await this.findOne(id);
    return this.prisma.wBS.update({ where: { id }, data: data as any });
  }

  async updateStatus(id: string, status: WBSStatus) {
    await this.findOne(id);
    return this.prisma.wBS.update({ where: { id }, data: { status } });
  }

  async createVersion(wbsId: string, data: WbsVersionInput) {
    const wbs = await this.findOne(wbsId);
    const nextVersion = wbs.version + 1;

    const version = await this.prisma.wBSVersion.create({
      data: {
        wbsId,
        version: nextVersion,
        name: data.name,
        snapshot: data.snapshot,
        baselineStatus: data.baselineStatus ?? 'PROPOSED',
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.baselineStatus === 'APPROVED' ? new Date() : null,
        notes: data.notes ?? null,
        organizationId: wbs.organizationId,
      },
    });

    await this.prisma.wBS.update({
      where: { id: wbsId },
      data: { version: nextVersion },
    });

    return version;
  }

  async getVersions(wbsId: string) {
    await this.findOne(wbsId);
    return this.prisma.wBSVersion.findMany({
      where: { wbsId },
      orderBy: { version: 'desc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.wBS.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

@Injectable()
export class WbsItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(wbsId: string, data: WbsItemInput) {
    const wbs = await this.prisma.wBS.findUnique({ where: { id: wbsId, deletedAt: null } });
    if (!wbs) throw errors.notFound('WBS');

    if (data.parentId) {
      const parent = await this.prisma.wBSItem.findUnique({
        where: { id: data.parentId, wbsId, deletedAt: null },
      });
      if (!parent) throw errors.conflict('Parent item does not exist in this WBS');
      if (parent.level >= 10) throw new BadRequestException('Maximum WBS depth (10) reached');
    }

    const parentId = data.parentId ?? null;
    const order = await this.getNextOrder(wbsId, parentId);
    const level = parentId ? (await this.prisma.wBSItem.findUnique({ where: { id: parentId } }))!.level + 1 : 1;

    return this.prisma.wBSItem.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? 'WORK_PACKAGE',
        parentId: data.parentId ?? null,
        order,
        level,
        quantity: data.quantity ?? null,
        unit: data.unit ?? null,
        uom: data.uom ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        plannedCost: data.plannedCost ?? 0,
        actualCost: data.actualCost ?? 0,
        committedCost: data.committedCost ?? 0,
        progressPercent: data.progressPercent ?? 0,
        status: data.status ?? 'PENDING',
        wbsId,
        organizationId: wbs.organizationId,
      },
    });
  }

  async findAll(wbsId: string, params: { parentId?: string | null }) {
    const where: Prisma.WBSItemWhereInput = { wbsId, deletedAt: null };
    if (params.parentId !== undefined) where.parentId = params.parentId;

    return this.prisma.wBSItem.findMany({
      where,
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.wBSItem.findUnique({
      where: { id, deletedAt: null },
      include: { children: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    if (!item) throw errors.notFound('WBS Item');
    return item;
  }

  async update(id: string, data: UpdateWbsItemInput) {
    await this.findOne(id);
    return this.prisma.wBSItem.update({ where: { id }, data: data as any });
  }

  async move(id: string, newParentId: string | null, newOrder: number) {
    const item = await this.findOne(id);
    if (newParentId === item.parentId && newOrder === item.order) return item;

    let newParentLevel = 0;
    if (newParentId) {
      const parent = await this.prisma.wBSItem.findUnique({
        where: { id: newParentId, wbsId: item.wbsId, deletedAt: null },
      });
      if (!parent) throw errors.conflict('New parent does not exist');
      if (parent.level >= 10) throw new BadRequestException('Maximum WBS depth (10) reached');
      if (await this.isDescendant(id, newParentId)) throw new BadRequestException('Cannot move item under its own descendant');
      newParentLevel = parent.level;
    }

    await this.reorderSiblings(item.wbsId, item.parentId, item.order, 'increment');
    await this.reorderSiblings(item.wbsId, newParentId, newOrder, 'decrement');

    return this.prisma.wBSItem.update({
      where: { id },
      data: { parentId: newParentId, order: newOrder, level: newParentId ? newParentLevel + 1 : 1 },
    });
  }

  private async isDescendant(itemId: string, potentialAncestorId: string): Promise<boolean> {
    let current = await this.prisma.wBSItem.findUnique({ where: { id: itemId }, select: { parentId: true } });
    while (current?.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = await this.prisma.wBSItem.findUnique({ where: { id: current.parentId }, select: { parentId: true } });
    }
    return false;
  }

  private async reorderSiblings(wbsId: string, parentId: string | null, fromOrder: number, direction: 'increment' | 'decrement') {
    const items = await this.prisma.wBSItem.findMany({
      where: { wbsId, parentId, deletedAt: null, order: { gte: fromOrder } },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });

    for (const item of items) {
      await this.prisma.wBSItem.update({
        where: { id: item.id },
        data: { order: direction === 'increment' ? item.order + 1 : item.order - 1 },
      });
    }
  }

  private async getNextOrder(wbsId: string, parentId: string | null): Promise<number> {
    const last = await this.prisma.wBSItem.findFirst({
      where: { wbsId, parentId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  async remove(id: string) {
    await this.findOne(id);
    const children = await this.prisma.wBSItem.count({ where: { parentId: id, deletedAt: null } });
    if (children > 0) throw new BadRequestException('Cannot delete item with children. Move or delete children first.');

    return this.prisma.wBSItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}