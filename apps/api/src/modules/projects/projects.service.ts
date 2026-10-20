import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { currentUserId } from '../../prisma/tenant-context';
import { requireOrgId } from '../../common/utils/tenant';
import { ProjectInput, UpdateProjectInput, MilestoneInput, PaginationInput } from '@re/shared';

export interface ProjectListQuery extends PaginationInput {
  status?: string;
  type?: string;
  branchId?: string;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ProjectListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.branchId) where.branchId = q.branchId;
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          city: true,
          state: true,
          totalBudget: true,
          startDate: true,
          endDate: true,
          imageUrl: true,
          createdAt: true,
          _count: { select: { buildings: true, units: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    const items = projects.map((p) => {
      const { _count, ...rest } = p;
      return { ...rest, buildingCount: _count.buildings, unitCount: _count.units };
    });
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        buildings: {
          orderBy: { order: 'asc' },
          select: { id: true, name: true, code: true, type: true, totalFloors: true, order: true },
        },
        milestones: { orderBy: { order: 'asc' } },
        _count: { select: { units: true, bookings: true } },
      },
    });
    if (!project) throw errors.notFound('Project');
    const { _count, ...rest } = project;
    return { ...rest, unitCount: _count.units, bookingCount: _count.bookings };
  }

  async create(input: ProjectInput) {
    const exists = await this.prisma.project.findFirst({ where: { code: input.code } });
    if (exists) throw errors.conflict(`Project code ${input.code} already exists`);

    return this.prisma.project.create({
      data: {
        ...this.toData(input),
        organizationId: requireOrgId(),
        code: input.code,
        name: input.name,
        createdBy: currentUserId(),
      },
    });
  }

  async update(id: string, input: UpdateProjectInput) {
    await this.ensureExists(id);
    if (input.code) {
      const clash = await this.prisma.project.findFirst({ where: { code: input.code, NOT: { id } } });
      if (clash) throw errors.conflict(`Project code ${input.code} already exists`);
    }
    return this.prisma.project.update({ where: { id }, data: this.toData(input) });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const bookings = await this.prisma.booking.count({ where: { projectId: id, deletedAt: null } });
    if (bookings > 0) throw errors.conflict('Project has bookings and cannot be deleted');
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
    return { id };
  }

  // ---------------- milestones

  async addMilestone(projectId: string, input: MilestoneInput) {
    await this.ensureExists(projectId);
    return this.prisma.projectMilestone.create({ data: { ...input, organizationId: requireOrgId(), projectId } });
  }

  async updateMilestone(projectId: string, milestoneId: string, input: Partial<MilestoneInput>) {
    const milestone = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) throw errors.notFound('Milestone');
    const data: any = { ...input };
    if (input.status === 'COMPLETED' && !milestone.completedAt) data.completedAt = new Date();
    return this.prisma.projectMilestone.update({ where: { id: milestoneId }, data });
  }

  async removeMilestone(projectId: string, milestoneId: string) {
    const milestone = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) throw errors.notFound('Milestone');
    await this.prisma.projectMilestone.delete({ where: { id: milestoneId } });
    return { id: milestoneId };
  }

  private async ensureExists(id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!project) throw errors.notFound('Project');
  }

  private toData(input: Partial<ProjectInput>) {
    const data: any = {};
    const keys = [
      'name',
      'description',
      'type',
      'status',
      'address',
      'city',
      'state',
      'latitude',
      'longitude',
      'totalBudget',
      'startDate',
      'endDate',
      'branchId',
      'managerId',
      'imageUrl',
    ] as const;
    for (const key of keys) if ((input as any)[key] !== undefined) data[key] = (input as any)[key];
    return data;
  }
}
