import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { BudgetService } from '../budget/budget.service';
import {
  VendorInput,
  UpdateVendorInput,
  MaterialInput,
  UpdateMaterialInput,
  MaterialCategoryInput,
  WarehouseInput,
  UpdateWarehouseInput,
  StockMoveInput,
  RequisitionInput,
  PurchaseOrderInput,
  GrnInput,
  PaginationInput,
} from '@re/shared';

export interface VendorListQuery extends PaginationInput {
  category?: string;
  status?: string;
}

export interface MaterialListQuery extends PaginationInput {
  categoryId?: string;
  warehouseId?: string;
}

export interface PoListQuery extends PaginationInput {
  status?: string;
  vendorId?: string;
  projectId?: string;
}

export interface RequisitionListQuery extends PaginationInput {
  status?: string;
  projectId?: string;
}

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budget: BudgetService,
  ) {}

  // ---------------- vendors

  async listVendors(q: VendorListQuery) {
    const where: any = { deletedAt: null };
    if (q.category) where.category = q.category;
    if (q.status) where.status = q.status;
    if (q.search) where.name = { contains: escapeLike(q.search), mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.vendor.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getVendor(id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, deletedAt: null } });
    if (!vendor) throw errors.notFound('Vendor');
    return vendor;
  }

  async createVendor(input: VendorInput) {
    return this.prisma.vendor.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateVendor(id: string, input: UpdateVendorInput) {
    await this.getVendor(id);
    return this.prisma.vendor.update({ where: { id }, data: input });
  }

  async removeVendor(id: string) {
    await this.getVendor(id);
    await this.prisma.vendor.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
    return { id };
  }

  // ---------------- material categories

  async listMaterialCategories(q: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.materialCategory.findMany({ skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.materialCategory.count({}),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createMaterialCategory(input: MaterialCategoryInput) {
    return this.prisma.materialCategory.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  // ---------------- materials

  async listMaterials(q: MaterialListQuery) {
    const where: any = {};
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.search)
      where.OR = [
        { name: { contains: escapeLike(q.search), mode: 'insensitive' } },
        { code: { contains: escapeLike(q.search), mode: 'insensitive' } },
      ];
    const [items, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          stocks: q.warehouseId ? { where: { warehouseId: q.warehouseId } } : true,
        },
      }),
      this.prisma.material.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createMaterial(input: MaterialInput) {
    return this.prisma.material.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateMaterial(id: string, input: UpdateMaterialInput) {
    await this.ensureMaterial(id);
    return this.prisma.material.update({ where: { id }, data: input });
  }

  async removeMaterial(id: string) {
    await this.ensureMaterial(id);
    await this.prisma.material.update({ where: { id }, data: { isActive: false } });
    return { id };
  }

  private async ensureMaterial(id: string) {
    const found = await this.prisma.material.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw errors.notFound('Material');
  }

  // ---------------- warehouses

  async listWarehouses(q: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.warehouse.findMany({ skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.warehouse.count({}),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createWarehouse(input: WarehouseInput) {
    return this.prisma.warehouse.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateWarehouse(id: string, input: UpdateWarehouseInput) {
    const found = await this.prisma.warehouse.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw errors.notFound('Warehouse');
    return this.prisma.warehouse.update({ where: { id }, data: input });
  }

  // ---------------- stock

  async listStock(q: MaterialListQuery) {
    const where: any = {};
    if (q.warehouseId) where.warehouseId = q.warehouseId;
    if (q.search) where.material = { name: { contains: escapeLike(q.search), mode: 'insensitive' } };
    const [items, total] = await Promise.all([
      this.prisma.materialStock.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          material: { select: { id: true, name: true, code: true, unit: true, reorderLevel: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.materialStock.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createStockMove(input: StockMoveInput) {
    await this.ensureMaterial(input.materialId);
    const inbound = input.type === 'IN' || input.type === 'TRANSFER_IN';
    const delta = inbound ? input.quantity : -input.quantity;
    const orgId = requireOrgId();
    return this.prisma.$transaction(async (tx) => {
      const move = await tx.stockMovement.create({
        data: { ...input, organizationId: orgId, performedBy: actorId() },
      });
      await tx.materialStock.upsert({
        where: { materialId_warehouseId: { materialId: input.materialId, warehouseId: input.warehouseId } },
        create: { organizationId: orgId, materialId: input.materialId, warehouseId: input.warehouseId, quantity: Math.max(delta, 0) },
        update: { quantity: { increment: delta } },
      });
      return move;
    });
  }

  // ---------------- requisitions

  async listRequisitions(q: RequisitionListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    const [items, total] = await Promise.all([
      this.prisma.purchaseRequisition.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.purchaseRequisition.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createRequisition(input: RequisitionInput) {
    const orgId = requireOrgId();
    return this.prisma.purchaseRequisition.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId,
        notes: input.notes ?? null,
        requestedBy: actorId(),
        status: 'PENDING',
        items: { create: input.items },
      },
      include: { items: true },
    });
  }

  async decideRequisition(id: string, approved: boolean) {
    const req = await this.prisma.purchaseRequisition.findFirst({ where: { id } });
    if (!req) throw errors.notFound('Requisition');
    return this.prisma.purchaseRequisition.update({
      where: { id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', approvedBy: actorId(), decidedAt: new Date() },
    });
  }

  // ---------------- purchase orders

  async listPurchaseOrders(q: PoListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.vendorId) where.vendorId = q.vendorId;
    if (q.projectId) where.projectId = q.projectId;
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { id: true, name: true } }, items: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id },
      include: { vendor: true, items: true },
    });
    if (!po) throw errors.notFound('Purchase order');
    return po;
  }

  async createPurchaseOrder(input: PurchaseOrderInput) {
    await this.getVendor(input.vendorId);
    const orgId = requireOrgId();
    const poNumber = await nextCode(this.prisma, 'PO');
    const items = input.items.map((it) => ({ ...it, amount: it.quantity * it.rate }));
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const po = await this.prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        poNumber,
        projectId: input.projectId,
        vendorId: input.vendorId,
        requisitionId: input.requisitionId ?? null,
        orderDate: input.orderDate,
        expectedDate: input.expectedDate ?? null,
        notes: input.notes ?? null,
        subtotal,
        total: subtotal,
        items: { create: items },
      },
      include: { items: true },
    });
    await this.budget.syncPurchaseOrderCommitment({
      id: po.id,
      projectId: po.projectId,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      total: po.total,
      notes: po.notes,
    });
    return po;
  }

  async setPurchaseOrderStatus(id: string, status: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id } });
    if (!po) throw errors.notFound('Purchase order');
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: status as any, approvedBy: actorId() } });
  }

  // ---------------- goods received notes

  async listGrns(q: PaginationInput & { projectId?: string }) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    const [items, total] = await Promise.all([
      this.prisma.goodsReceivedNote.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.goodsReceivedNote.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createGrn(input: GrnInput) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: input.poId }, include: { items: true } });
    if (!po) throw errors.notFound('Purchase order');
    const orgId = requireOrgId();
    const grnNumber = await nextCode(this.prisma, 'GRN');
    const rateByItem = new Map(po.items.map((item) => [item.id, Number(item.rate)]));
    const receivedValue = input.items.reduce(
      (sum, item) => sum + (item.poItemId ? (rateByItem.get(item.poItemId) ?? 0) * item.qtyAccepted : 0),
      0,
    );

    const grn = await this.prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceivedNote.create({
        data: {
          organizationId: orgId,
          poId: input.poId,
          projectId: input.projectId,
          grnNumber,
          receivedBy: actorId(),
          notes: input.notes ?? null,
          items: { create: input.items },
        },
        include: { items: true },
      });

      for (const item of input.items) {
        if (item.poItemId) {
          await tx.purchaseOrderItem.update({ where: { id: item.poItemId }, data: { receivedQty: { increment: item.qtyAccepted } } });
        }
        if (item.materialId && item.warehouseId && item.qtyAccepted > 0) {
          await tx.materialStock.upsert({
            where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: item.warehouseId } },
            create: { organizationId: orgId, materialId: item.materialId, warehouseId: item.warehouseId, quantity: item.qtyAccepted },
            update: { quantity: { increment: item.qtyAccepted } },
          });
          await tx.stockMovement.create({
            data: {
              organizationId: orgId,
              materialId: item.materialId,
              warehouseId: item.warehouseId,
              type: 'IN',
              quantity: item.qtyAccepted,
              referenceType: 'GRN',
              referenceId: grn.id,
              projectId: input.projectId,
              performedBy: actorId(),
            },
          });
        }
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { poId: input.poId } });
      const complete = updatedItems.every((it) => Number(it.receivedQty) >= Number(it.quantity));
      await tx.purchaseOrder.update({ where: { id: input.poId }, data: { status: complete ? 'RECEIVED' : 'PARTIAL' } });

      return grn;
    });

    await this.budget.syncGoodsReceiptLedger({
      id: grn.id,
      poId: input.poId,
      projectId: input.projectId,
      grnNumber,
      amount: receivedValue,
    });
    return grn;
  }
}

