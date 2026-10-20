import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { WorkflowDefinitionInput, UpdateWorkflowInput, PaginationInput } from '@re/shared';

export interface WorkflowListQuery extends PaginationInput {
  trigger?: string;
  isActive?: boolean;
}

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: WorkflowListQuery) {
    const where: any = {};
    if (q.trigger) where.trigger = q.trigger;
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    if (q.search) where.name = { contains: escapeLike(q.search), mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.workflowDefinition.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const wf = await this.prisma.workflowDefinition.findFirst({ where: { id } });
    if (!wf) throw errors.notFound('Workflow');
    return wf;
  }

  async create(input: WorkflowDefinitionInput) {
    return this.prisma.workflowDefinition.create({
      data: {
        organizationId: requireOrgId(),
        name: input.name,
        code: input.code,
        trigger: input.trigger,
        conditions: input.conditions as any,
        actions: input.actions as any,
        isActive: input.isActive,
        createdBy: actorId(),
      },
    });
  }

  async update(id: string, input: UpdateWorkflowInput) {
    await this.get(id);
    return this.prisma.workflowDefinition.update({ where: { id }, data: input as any });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.workflowDefinition.delete({ where: { id } });
    return { id };
  }

  async listExecutions(workflowId: string, q: PaginationInput) {
    await this.get(workflowId);
    const where = { workflowId };
    const [items, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.workflowExecution.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async run(id: string, context: Record<string, unknown>) {
    const wf = await this.get(id);
    if (!wf.isActive) throw errors.conflict('Workflow is not active');
    const log = wf.actions && Array.isArray(wf.actions) ? (wf.actions as any[]).map((a) => ({ action: a.type, status: 'SIMULATED' })) : [];
    const execution = await this.prisma.workflowExecution.create({
      data: {
        organizationId: requireOrgId(),
        workflowId: id,
        triggerEvent: 'MANUAL',
        context: { ...context, actorId: actorId() },
        status: 'SUCCESS',
        startedAt: new Date(),
        finishedAt: new Date(),
        log,
      },
    });
    await this.prisma.workflowDefinition.update({
      where: { id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
    return execution;
  }
}
