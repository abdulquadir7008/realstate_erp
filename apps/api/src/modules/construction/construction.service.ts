import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { ConstructionTaskInput, UpdateTaskInput, SiteReportInput, QualityInspectionInput, PaginationInput } from '@re/shared';

export interface TaskListQuery extends PaginationInput {
  projectId?: string;
  status?: string;
  assigneeId?: string;
  milestoneId?: string;
}

export interface SiteReportListQuery extends PaginationInput {
  projectId?: string;
  from?: Date;
  to?: Date;
}

export interface InspectionListQuery extends PaginationInput {
  projectId?: string;
}

@Injectable()
export class ConstructionService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- tasks

  async listTasks(q: TaskListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.status) where.status = q.status;
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.milestoneId) where.milestoneId = q.milestoneId;
    if (q.search) where.name = { contains: escapeLike(q.search), mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.constructionTask.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.constructionTask.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getTask(id: string) {
    const task = await this.prisma.constructionTask.findFirst({ where: { id } });
    if (!task) throw errors.notFound('Task');
    return task;
  }

  async createTask(input: ConstructionTaskInput) {
    return this.prisma.constructionTask.create({ data: { ...input, organizationId: requireOrgId(), createdBy: actorId() } });
  }

  async updateTask(id: string, input: UpdateTaskInput) {
    await this.getTask(id);
    const data: any = { ...input };
    if (input.status === 'DONE' && !input.progressPercent) data.progressPercent = 100;
    if (input.status === 'DONE') data.completedAt = new Date();
    return this.prisma.constructionTask.update({ where: { id }, data });
  }

  async removeTask(id: string) {
    await this.getTask(id);
    await this.prisma.constructionTask.delete({ where: { id } });
    return { id };
  }

  // ---------------- daily site reports

  async listSiteReports(q: SiteReportListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) where.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.dailySiteReport.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { date: 'desc' } }),
      this.prisma.dailySiteReport.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createSiteReport(input: SiteReportInput) {
    const orgId = requireOrgId();
    const date = new Date(input.date);
    date.setUTCHours(0, 0, 0, 0);
    return this.prisma.dailySiteReport.upsert({
      where: { projectId_date: { projectId: input.projectId, date } },
      create: { ...input, date, organizationId: orgId, reportedBy: actorId() },
      update: { ...input, date, reportedBy: actorId() },
    });
  }

  // ---------------- quality inspections

  async listInspections(q: InspectionListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    const [items, total] = await Promise.all([
      this.prisma.qualityInspection.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { date: 'desc' } }),
      this.prisma.qualityInspection.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createInspection(input: QualityInspectionInput) {
    return this.prisma.qualityInspection.create({
      data: { ...input, organizationId: requireOrgId(), inspectorId: actorId() },
    });
  }
}
