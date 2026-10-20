import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId } from '../../common/utils/tenant';
import {
  BuildingInput,
  FloorInput,
  UnitInput,
  UpdateUnitInput,
  UpdateUnitStatusInput,
  BulkGenerateUnitsInput,
  PaginationInput,
} from '@re/shared';

export interface UnitListQuery extends PaginationInput {
  projectId?: string;
  buildingId?: string;
  floorId?: string;
  status?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- buildings

  async listBuildings(projectId?: string) {
    return this.prisma.building.findMany({
      where: { deletedAt: null, ...(projectId ? { projectId } : {}) },
      orderBy: { order: 'asc' },
      include: { _count: { select: { units: true, floors: true } } },
    });
  }

  async createBuilding(input: BuildingInput) {
    await this.ensureProject(input.projectId);
    const clash = await this.prisma.building.findFirst({ where: { projectId: input.projectId, code: input.code } });
    if (clash) throw errors.conflict(`Building code ${input.code} already exists in this project`);
    return this.prisma.building.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateBuilding(id: string, input: Partial<BuildingInput>) {
    await this.ensureBuilding(id);
    return this.prisma.building.update({ where: { id }, data: input });
  }

  async removeBuilding(id: string) {
    await this.ensureBuilding(id);
    const units = await this.prisma.unit.count({ where: { buildingId: id, deletedAt: null } });
    if (units > 0) throw errors.conflict('Building has units and cannot be deleted');
    await this.prisma.building.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  // ---------------- floors

  async listFloors(buildingId?: string, projectId?: string) {
    return this.prisma.floor.findMany({
      where: { ...(buildingId ? { buildingId } : {}), ...(projectId ? { projectId } : {}) },
      orderBy: [{ floorNumber: 'asc' }],
      include: { _count: { select: { units: true } } },
    });
  }

  async createFloor(input: FloorInput) {
    const building = await this.ensureBuilding(input.buildingId);
    const clash = await this.prisma.floor.findFirst({ where: { buildingId: input.buildingId, label: input.label } });
    if (clash) throw errors.conflict(`Floor ${input.label} already exists in this building`);
    return this.prisma.floor.create({ data: { ...input, organizationId: requireOrgId(), projectId: building.projectId } });
  }

  async removeFloor(id: string) {
    const floor = await this.prisma.floor.findFirst({ where: { id } });
    if (!floor) throw errors.notFound('Floor');
    const units = await this.prisma.unit.count({ where: { floorId: id, deletedAt: null } });
    if (units > 0) throw errors.conflict('Floor has units and cannot be deleted');
    await this.prisma.floor.delete({ where: { id } });
    return { id };
  }

  // ---------------- units

  async listUnits(q: UnitListQuery) {
    const where: any = { deletedAt: null };
    if (q.projectId) where.projectId = q.projectId;
    if (q.buildingId) where.buildingId = q.buildingId;
    if (q.floorId) where.floorId = q.floorId;
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.minPrice || q.maxPrice) {
      where.basePrice = {};
      if (q.minPrice) where.basePrice.gte = q.minPrice;
      if (q.maxPrice) where.basePrice.lte = q.maxPrice;
    }
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { unitNumber: { contains: s, mode: 'insensitive' } },
        { configuration: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: [{ buildingId: 'asc' }, { unitNumber: 'asc' }],
        include: {
          building: { select: { id: true, name: true, code: true } },
          floor: { select: { id: true, label: true, floorNumber: true } },
        },
      }),
      this.prisma.unit.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getUnit(id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        floor: { select: { id: true, label: true, floorNumber: true } },
        bookings: { select: { id: true, bookingNumber: true, status: true } },
      },
    });
    if (!unit) throw errors.notFound('Unit');
    return unit;
  }

  async createUnit(input: UnitInput) {
    await this.ensureFloor(input.floorId);
    const building = await this.ensureBuilding(input.buildingId);
    if (building.projectId !== input.projectId) throw errors.validation([{ path: 'projectId', message: 'Building does not belong to project' }]);
    const clash = await this.prisma.unit.findFirst({ where: { buildingId: input.buildingId, unitNumber: input.unitNumber } });
    if (clash) throw errors.conflict(`Unit ${input.unitNumber} already exists in this building`);
    return this.prisma.unit.create({ data: { ...input, organizationId: requireOrgId() } as any });
  }

  async updateUnit(id: string, input: UpdateUnitInput) {
    await this.getUnit(id);
    if (input.unitNumber) {
      const unit = await this.prisma.unit.findUnique({ where: { id }, select: { buildingId: true } });
      const clash = await this.prisma.unit.findFirst({
        where: { buildingId: unit!.buildingId, unitNumber: input.unitNumber, NOT: { id } },
      });
      if (clash) throw errors.conflict(`Unit ${input.unitNumber} already exists in this building`);
    }
    return this.prisma.unit.update({ where: { id }, data: input as any });
  }

  async updateUnitStatus(id: string, input: UpdateUnitStatusInput) {
    const unit = await this.prisma.unit.findFirst({ where: { id, deletedAt: null } });
    if (!unit) throw errors.notFound('Unit');
    if ((unit.status === 'BOOKED' || unit.status === 'SOLD') && input.status === 'AVAILABLE') {
      throw errors.conflict('Cannot release a booked or sold unit directly');
    }
    const data: any = { status: input.status };
    if (input.status === 'ON_HOLD' || input.status === 'RESERVED') {
      data.heldUntil = new Date(Date.now() + input.holdMinutes * 60_000);
    } else if (input.status === 'AVAILABLE') {
      data.heldUntil = null;
    }
    if (input.notes) data.notes = input.notes;
    return this.prisma.unit.update({ where: { id }, data });
  }

  async removeUnit(id: string) {
    await this.getUnit(id);
    const bookings = await this.prisma.booking.count({ where: { unitId: id, deletedAt: null } });
    if (bookings > 0) throw errors.conflict('Unit has bookings and cannot be deleted');
    await this.prisma.unit.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  async bulkGenerate(input: BulkGenerateUnitsInput) {
    const building = await this.ensureBuilding(input.buildingId);

    const floors = await this.prisma.floor.findMany({
      where: { buildingId: input.buildingId, floorNumber: { gte: input.fromFloor, lte: input.toFloor } },
      orderBy: { floorNumber: 'asc' },
    });
    if (floors.length === 0) throw errors.validation([{ path: 'fromFloor', message: 'No matching floors found for this building' }]);

    const toCreate: any[] = [];
    const orgId = requireOrgId();
    let sequential = input.startNumber;
    for (const floor of floors) {
      const override = input.typeOverrides.find((o) => o.floorNumber === floor.floorNumber);
      for (let i = 0; i < input.unitsPerFloor; i++) {
        const numberPart =
          input.numbering === 'FLOOR_FIRST'
            ? `${floor.floorNumber}${String(i + 1).padStart(2, '0')}`
            : String(sequential).padStart(3, '0');
        const unitNumber = `${input.prefix}${numberPart}`;
        toCreate.push({
          organizationId: orgId,
          projectId: building.projectId,
          buildingId: building.id,
          floorId: floor.id,
          unitNumber,
          type: override?.type ?? input.type,
          configuration: input.configuration ?? null,
          carpetArea: input.carpetArea ?? null,
          builtUpArea: input.builtUpArea ?? null,
          superBuiltUpArea: input.superBuiltUpArea ?? null,
          basePrice: override?.basePrice ?? input.basePrice,
          status: 'AVAILABLE',
        });
        sequential += 1;
      }
    }

    const existing = await this.prisma.unit.findMany({
      where: { buildingId: building.id, unitNumber: { in: toCreate.map((u) => u.unitNumber) } },
      select: { unitNumber: true },
    });
    const existingNumbers = new Set(existing.map((u) => u.unitNumber));
    const filtered = toCreate.filter((u) => !existingNumbers.has(u.unitNumber));

    await this.prisma.unit.createMany({ data: filtered });
    return { created: filtered.length, skipped: toCreate.length - filtered.length };
  }

  private async ensureProject(id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!project) throw errors.notFound('Project');
    return project;
  }

  private async ensureBuilding(id: string) {
    const building = await this.prisma.building.findFirst({ where: { id, deletedAt: null }, select: { id: true, projectId: true } });
    if (!building) throw errors.notFound('Building');
    return building;
  }

  private async ensureFloor(id: string) {
    const floor = await this.prisma.floor.findFirst({ where: { id }, select: { id: true, buildingId: true } });
    if (!floor) throw errors.notFound('Floor');
    return floor;
  }
}
