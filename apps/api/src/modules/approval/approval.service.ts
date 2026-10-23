import { Injectable } from '@nestjs/common';
import { SessionUser } from '@re/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import {
  ApprovalWorkflowInput,
  UpdateApprovalWorkflowInput,
  ApprovalThresholdInput,
  UpdateApprovalThresholdInput,
  StartApprovalInput,
  ApprovalDecisionInput,
  ApprovalRejectionInput,
  ApprovalDelegationInput,
  UpdateApprovalDelegationInput,
  ApprovalEscalationRuleInput,
  UpdateApprovalEscalationRuleInput,
  PaginationInput,
} from '@re/shared';
import { ApprovalActor, nextPendingSequence, sortThresholds, stepMatchesActor, thresholdApplies } from './approval.engine';
import { applyApprovalOutcome } from './approval.hooks';

interface WorkflowListQuery extends PaginationInput {
  entityType?: string;
  isActive?: boolean;
}

interface InstanceListQuery extends PaginationInput {
  status?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  requestedBy?: string;
}

interface DecisionRecord {
  step: any;
  delegatedFrom: string | null;
}

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- workflows

  async listWorkflows(q: WorkflowListQuery) {
    const where: any = { deletedAt: null };
    if (q.entityType) where.entityType = q.entityType.toUpperCase();
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    if (q.search) {
      where.OR = [
        { name: { contains: escapeLike(q.search), mode: 'insensitive' } },
        { code: { contains: escapeLike(q.search), mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.approvalWorkflow.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { steps: true, instances: true } } },
      }),
      this.prisma.approvalWorkflow.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getWorkflow(id: string) {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id, deletedAt: null },
      include: {
        steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] },
        escalationRules: { where: { isActive: true } },
      },
    });
    if (!workflow) throw errors.notFound('Approval workflow');
    return workflow;
  }

  async createWorkflow(input: ApprovalWorkflowInput) {
    await this.assertWorkflowCodeAvailable(input.code);
    return this.prisma.approvalWorkflow.create({
      data: {
        organizationId: requireOrgId(),
        code: input.code,
        name: input.name,
        entityType: input.entityType,
        description: input.description ?? null,
        isActive: input.isActive,
        createdBy: actorId(),
        steps: { create: input.steps.map((step) => ({ ...step, organizationId: requireOrgId() })) },
      },
      include: { steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] } },
    });
  }

  async updateWorkflow(id: string, input: UpdateApprovalWorkflowInput) {
    const existing = await this.getWorkflow(id);
    if (input.code && input.code !== existing.code) {
      await this.assertWorkflowCodeAvailable(input.code, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const { steps, ...rest } = input;
      if (steps) {
        await tx.approvalStep.deleteMany({ where: { workflowId: id } });
        await tx.approvalStep.createMany({
          data: steps.map((step) => ({ ...step, organizationId: existing.organizationId, workflowId: id })),
        });
      }
      return tx.approvalWorkflow.update({
        where: { id },
        data: { ...rest, ...(steps ? { version: { increment: 1 } } : {}) },
        include: { steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] } },
      });
    });
  }

  async removeWorkflow(id: string) {
    await this.getWorkflow(id);
    const pending = await this.prisma.approvalInstance.count({ where: { workflowId: id, status: 'PENDING' } });
    if (pending > 0) throw errors.conflict('Cannot delete a workflow with pending approvals');
    await this.prisma.approvalWorkflow.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { id };
  }

  private async assertWorkflowCodeAvailable(code: string, excludeId?: string) {
    const existing = await this.prisma.approvalWorkflow.findFirst({ where: { code } });
    if (existing && existing.id !== excludeId) throw errors.conflict('An approval workflow with this code already exists');
  }

  // ---------------- thresholds

  async listThresholds(q: PaginationInput & { entityType?: string; isActive?: boolean }) {
    const where: any = {};
    if (q.entityType) where.entityType = q.entityType.toUpperCase();
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    const [items, total] = await Promise.all([
      this.prisma.approvalThreshold.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: { workflow: { select: { id: true, code: true, name: true, isActive: true } } },
      }),
      this.prisma.approvalThreshold.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createThreshold(input: ApprovalThresholdInput) {
    const workflow = await this.getWorkflow(input.workflowId);
    if (workflow.entityType !== input.entityType) throw errors.conflict('Threshold entity type must match the workflow entity type');
    return this.prisma.approvalThreshold.create({
      data: {
        organizationId: requireOrgId(),
        entityType: input.entityType,
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? null,
        workflowId: input.workflowId,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount ?? null,
        priority: input.priority,
        isActive: input.isActive,
      },
    });
  }

  async updateThreshold(id: string, input: UpdateApprovalThresholdInput) {
    const threshold = await this.prisma.approvalThreshold.findFirst({ where: { id } });
    if (!threshold) throw errors.notFound('Approval threshold');
    if (input.workflowId || input.entityType) {
      const workflow = await this.getWorkflow(input.workflowId ?? threshold.workflowId);
      const entityType = input.entityType ?? threshold.entityType;
      if (workflow.entityType !== entityType) throw errors.conflict('Threshold entity type must match the workflow entity type');
    }
    return this.prisma.approvalThreshold.update({ where: { id }, data: input as any });
  }

  async removeThreshold(id: string) {
    const threshold = await this.prisma.approvalThreshold.findFirst({ where: { id } });
    if (!threshold) throw errors.notFound('Approval threshold');
    await this.prisma.approvalThreshold.delete({ where: { id } });
    return { id };
  }

  // ---------------- delegations

  async listDelegations(q: PaginationInput & { activeOnly?: boolean }) {
    const where: any = {};
    if (q.activeOnly) {
      const now = new Date();
      where.isActive = true;
      where.validFrom = { lte: now };
      where.OR = [{ validTo: null }, { validTo: { gte: now } }];
    }
    const [items, total] = await Promise.all([
      this.prisma.approvalDelegation.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalDelegation.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createDelegation(input: ApprovalDelegationInput, user: SessionUser) {
    if (input.delegateId === user.id) throw errors.validation('You cannot delegate approval authority to yourself');
    const delegate = await this.prisma.user.findFirst({ where: { id: input.delegateId, deletedAt: null } });
    if (!delegate) throw errors.notFound('Delegate user');
    if (input.workflowId) await this.getWorkflow(input.workflowId);
    return this.prisma.approvalDelegation.create({
      data: {
        organizationId: requireOrgId(),
        delegatorId: user.id,
        delegateId: input.delegateId,
        entityType: input.entityType ?? null,
        workflowId: input.workflowId ?? null,
        validFrom: input.validFrom ?? new Date(),
        validTo: input.validTo ?? null,
        isActive: input.isActive,
        reason: input.reason ?? null,
        createdBy: user.id,
      },
    });
  }

  async updateDelegation(id: string, input: UpdateApprovalDelegationInput) {
    const delegation = await this.prisma.approvalDelegation.findFirst({ where: { id } });
    if (!delegation) throw errors.notFound('Approval delegation');
    if (input.workflowId) await this.getWorkflow(input.workflowId);
    if (input.delegateId) {
      const delegate = await this.prisma.user.findFirst({ where: { id: input.delegateId, deletedAt: null } });
      if (!delegate) throw errors.notFound('Delegate user');
    }
    return this.prisma.approvalDelegation.update({ where: { id }, data: input as any });
  }

  async removeDelegation(id: string) {
    const delegation = await this.prisma.approvalDelegation.findFirst({ where: { id } });
    if (!delegation) throw errors.notFound('Approval delegation');
    await this.prisma.approvalDelegation.update({ where: { id }, data: { isActive: false } });
    return { id };
  }

  // ---------------- escalation rules

  async listEscalationRules(q: PaginationInput & { workflowId?: string; isActive?: boolean }) {
    const where: any = {};
    if (q.workflowId) where.workflowId = q.workflowId;
    if (typeof q.isActive === 'boolean') where.isActive = q.isActive;
    const [items, total] = await Promise.all([
      this.prisma.approvalEscalationRule.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalEscalationRule.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createEscalationRule(input: ApprovalEscalationRuleInput) {
    await this.getWorkflow(input.workflowId);
    if (input.escalateToUserId) {
      const user = await this.prisma.user.findFirst({ where: { id: input.escalateToUserId, deletedAt: null } });
      if (!user) throw errors.notFound('Escalation user');
    }
    return this.prisma.approvalEscalationRule.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateEscalationRule(id: string, input: UpdateApprovalEscalationRuleInput) {
    const rule = await this.prisma.approvalEscalationRule.findFirst({ where: { id } });
    if (!rule) throw errors.notFound('Escalation rule');
    if (input.workflowId) await this.getWorkflow(input.workflowId);
    return this.prisma.approvalEscalationRule.update({ where: { id }, data: input as any });
  }

  async removeEscalationRule(id: string) {
    const rule = await this.prisma.approvalEscalationRule.findFirst({ where: { id } });
    if (!rule) throw errors.notFound('Escalation rule');
    await this.prisma.approvalEscalationRule.delete({ where: { id } });
    return { id };
  }

  // ---------------- instances

  async start(input: StartApprovalInput, user: SessionUser) {
    const orgId = requireOrgId();
    const pending = await this.prisma.approvalInstance.findFirst({
      where: { entityType: input.entityType, entityId: input.entityId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) throw errors.conflict('An approval request is already pending for this record', { instanceId: pending.id });

    const workflow = input.workflowId
      ? await this.getWorkflow(input.workflowId)
      : await this.resolveWorkflow(input);

    if (!workflow) throw errors.conflict('No active approval workflow is configured for this record and amount');
    if (workflow.entityType !== input.entityType) throw errors.conflict('Workflow entity type does not match the request');
    if (!workflow.isActive) throw errors.conflict('The approval workflow is not active');
    if (workflow.steps.length === 0) throw errors.conflict('The approval workflow has no steps configured');

    const firstSequence = Math.min(...workflow.steps.map((step) => step.sequence));

    const created = await this.prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.create({
        data: {
          organizationId: orgId,
          workflowId: workflow.id,
          entityType: input.entityType,
          entityId: input.entityId,
          title: input.title,
          description: input.description ?? null,
          projectId: input.projectId ?? null,
          siteId: input.siteId ?? null,
          amount: input.amount ?? null,
          currency: input.currency,
          currentSequence: firstSequence,
          requestedBy: user.id,
          metadata: input.metadata as any,
          steps: {
            create: workflow.steps.map((step) => ({
              organizationId: orgId,
              templateStepId: step.id,
              sequence: step.sequence,
              name: step.name,
              approverType: step.approverType,
              approverRole: step.approverRole,
              approverUserId: step.approverUserId,
              approverPermission: step.approverPermission,
              groupMode: step.groupMode,
              requiredApprovals: step.requiredApprovals,
              isOptional: step.isOptional,
            })),
          },
        },
      });

      await tx.approvalHistory.create({
        data: {
          organizationId: orgId,
          instanceId: instance.id,
          sequence: firstSequence,
          action: 'SUBMITTED',
          actorId: user.id,
          toStatus: 'PENDING',
          metadata: {
            workflowCode: workflow.code,
            entityType: input.entityType,
            amount: input.amount ?? null,
            currency: input.currency,
          },
        },
      });

      await this.advanceSequence(tx, instance.id, firstSequence);
      return instance;
    });

    return this.getInstance(created.id);
  }

  private async resolveWorkflow(input: StartApprovalInput) {
    const thresholds = await this.prisma.approvalThreshold.findMany({
      where: { entityType: input.entityType, isActive: true },
      include: { workflow: { include: { steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] } } } },
    });

    if (thresholds.length > 0) {
      const context = {
        projectId: input.projectId ?? null,
        siteId: input.siteId ?? null,
        costHeadId: (input.metadata as any)?.costHeadId ?? null,
      };
      const amount = input.amount ?? 0;
      const matching = sortThresholds(
        thresholds.filter(
          (threshold: any) =>
            threshold.workflow.isActive &&
            !threshold.workflow.deletedAt &&
            thresholdApplies(threshold, amount, context),
        ),
      );
      return matching.length > 0 ? matching[0].workflow : null;
    }

    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { entityType: input.entityType, isActive: true, deletedAt: null },
      include: { steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'asc' },
    });
    return workflow;
  }

  async listInstances(q: InstanceListQuery) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.entityType) where.entityType = q.entityType.toUpperCase();
    if (q.entityId) where.entityId = q.entityId;
    if (q.projectId) where.projectId = q.projectId;
    if (q.requestedBy) where.requestedBy = q.requestedBy;
    const [items, total] = await Promise.all([
      this.prisma.approvalInstance.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow: { select: { id: true, code: true, name: true } },
          steps: {
            where: { status: 'PENDING' },
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, sequence: true, name: true, approverType: true, status: true },
          },
        },
      }),
      this.prisma.approvalInstance.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async getInstance(id: string) {
    const instance = await this.prisma.approvalInstance.findFirst({
      where: { id },
      include: {
        workflow: { select: { id: true, code: true, name: true, entityType: true } },
        steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] },
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!instance) throw errors.notFound('Approval request');
    return instance;
  }

  async inbox(user: SessionUser, q: InstanceListQuery) {
    const actor = this.toActor(user);
    const rows = await this.prisma.approvalInstance.findMany({
      where: { status: 'PENDING', ...(q.projectId ? { projectId: q.projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { id: true, code: true, name: true, entityType: true } },
        steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] },
      },
      take: 500,
    });

    const actionable: typeof rows = [];
    for (const instance of rows) {
      const target = await this.findActionableStep(instance, actor);
      if (target) actionable.push(instance);
    }

    const start = pageOffset(q.page, q.limit);
    return paginated(actionable.slice(start, start + q.limit), actionable.length, q.page, q.limit);
  }

  async myRequests(user: SessionUser, q: InstanceListQuery) {
    return this.listInstances({ ...q, requestedBy: user.id });
  }

  async dashboard(user: SessionUser) {
    const [inbox, myRequestsPending, approvedByMe, rejectedByMe, recentDecisions] = await Promise.all([
      this.inbox(user, { page: 1, limit: 1 } as InstanceListQuery),
      this.prisma.approvalInstance.count({ where: { requestedBy: user.id, status: 'PENDING' } }),
      this.prisma.approvalHistory.count({ where: { actorId: user.id, action: 'APPROVED' } }),
      this.prisma.approvalHistory.count({ where: { actorId: user.id, action: 'REJECTED' } }),
      this.prisma.approvalHistory.findMany({
        where: { actorId: user.id, action: { in: ['APPROVED', 'REJECTED', 'RETURNED'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          instance: { select: { id: true, title: true, entityType: true, entityId: true, status: true } },
        },
      }),
    ]);
    return {
      pendingForMe: inbox.total,
      myRequestsPending,
      approvedByMe,
      rejectedByMe,
      recentDecisions,
    };
  }

  async approve(id: string, input: ApprovalDecisionInput, user: SessionUser) {
    const actor = this.toActor(user);
    const instance = await this.loadPendingInstance(id);
    const target = await this.findActionableStep(instance, actor);
    if (!target) throw errors.forbidden('You are not an approver for the current approval step');

    const completed = await this.prisma.$transaction(async (tx) => {
      await tx.approvalInstanceStep.update({
        where: { id: target.step.id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedBy: user.id,
          delegatedFrom: target.delegatedFrom,
        },
      });

      const advanced = await this.advanceSequence(tx, instance.id, instance.currentSequence);
      await tx.approvalHistory.create({
        data: {
          organizationId: instance.organizationId,
          instanceId: instance.id,
          instanceStepId: target.step.id,
          sequence: target.step.sequence,
          action: 'APPROVED',
          actorId: user.id,
          delegateId: target.delegatedFrom,
          comment: input.comment ?? null,
          fromStatus: 'PENDING',
          toStatus: advanced.completed ? 'APPROVED' : 'PENDING',
          metadata: { currentSequence: advanced.currentSequence },
        },
      });
      return advanced.completed;
    });

    if (completed) {
      await applyApprovalOutcome(this.prisma, instance, true, user.id);
    }
    return this.getInstance(id);
  }

  async reject(id: string, input: ApprovalRejectionInput, user: SessionUser) {
    const actor = this.toActor(user);
    const instance = await this.loadPendingInstance(id);
    const target = await this.findActionableStep(instance, actor);
    if (!target) throw errors.forbidden('You are not an approver for the current approval step');

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalInstanceStep.update({
        where: { id: target.step.id },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedBy: user.id,
          delegatedFrom: target.delegatedFrom,
        },
      });
      await tx.approvalInstanceStep.updateMany({
        where: { instanceId: instance.id, sequence: instance.currentSequence, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      });
      await tx.approvalInstance.update({
        where: { id: instance.id },
        data: { status: 'REJECTED', completedAt: new Date() },
      });
      await tx.approvalHistory.create({
        data: {
          organizationId: instance.organizationId,
          instanceId: instance.id,
          instanceStepId: target.step.id,
          sequence: target.step.sequence,
          action: 'REJECTED',
          actorId: user.id,
          delegateId: target.delegatedFrom,
          comment: input.comment,
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
        },
      });
    });

    await applyApprovalOutcome(this.prisma, instance, false, user.id);
    return this.getInstance(id);
  }

  async returnToPrevious(id: string, input: ApprovalRejectionInput, user: SessionUser) {
    const actor = this.toActor(user);
    const instance = await this.loadPendingInstance(id);
    const target = await this.findActionableStep(instance, actor);
    if (!target) throw errors.forbidden('You are not an approver for the current approval step');

    const sequences = [...new Set(instance.steps.map((step: any) => step.sequence))].sort((a, b) => a - b);
    const index = sequences.indexOf(instance.currentSequence);
    if (index <= 0) throw errors.conflict('Approval is already at the first step and cannot be returned further');
    const previous = sequences[index - 1];

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalInstanceStep.updateMany({
        where: { instanceId: instance.id, sequence: { gte: previous } },
        data: { status: 'PENDING', decidedAt: null, decidedBy: null, delegatedFrom: null },
      });
      await tx.approvalInstance.update({
        where: { id: instance.id },
        data: { status: 'PENDING', currentSequence: previous, completedAt: null },
      });
      await tx.approvalHistory.create({
        data: {
          organizationId: instance.organizationId,
          instanceId: instance.id,
          instanceStepId: target.step.id,
          sequence: instance.currentSequence,
          action: 'RETURNED',
          actorId: user.id,
          delegateId: target.delegatedFrom,
          comment: input.comment,
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          metadata: { returnedToSequence: previous },
        },
      });
    });

    return this.getInstance(id);
  }

  async cancel(id: string, input: ApprovalDecisionInput, user: SessionUser) {
    const instance = await this.loadPendingInstance(id);
    const canManage = user.permissions.includes('approval:manage');
    if (instance.requestedBy !== user.id && !canManage) {
      throw errors.forbidden('Only the requester or an approval administrator can cancel this request');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalInstanceStep.updateMany({
        where: { instanceId: instance.id, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      });
      await tx.approvalInstance.update({
        where: { id: instance.id },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
      await tx.approvalHistory.create({
        data: {
          organizationId: instance.organizationId,
          instanceId: instance.id,
          sequence: instance.currentSequence,
          action: 'CANCELLED',
          actorId: user.id,
          comment: input.comment ?? null,
          fromStatus: 'PENDING',
          toStatus: 'CANCELLED',
        },
      });
    });

    return this.getInstance(id);
  }

  async runEscalations(user: SessionUser) {
    const now = Date.now();
    const rules = await this.prisma.approvalEscalationRule.findMany({ where: { isActive: true } });
    const escalations: any[] = [];

    for (const rule of rules) {
      const instances = await this.prisma.approvalInstance.findMany({
        where: {
          workflowId: rule.workflowId,
          status: 'PENDING',
          ...(rule.stepSequence ? { currentSequence: rule.stepSequence } : {}),
        },
        include: { steps: { where: { status: 'PENDING' } } },
        take: 500,
      });

      for (const instance of instances) {
        const currentSteps = instance.steps.filter((step) => step.sequence === instance.currentSequence);
        if (currentSteps.length === 0) continue;
        const since = Math.min(...currentSteps.map((step) => step.createdAt.getTime()));
        if (now < since + rule.afterHours * 60 * 60 * 1000) continue;

        const already = await this.prisma.approvalHistory.findFirst({
          where: {
            instanceId: instance.id,
            action: 'ESCALATED',
            sequence: instance.currentSequence,
            metadata: { path: ['ruleId'], equals: rule.id },
          },
        });
        if (already) continue;

        let targetId = rule.escalateToUserId;
        if (!targetId && rule.escalateToRole) {
          const membership = await this.prisma.userRole.findFirst({
            where: { role: { code: rule.escalateToRole } },
            orderBy: { assignedAt: 'asc' },
          });
          targetId = membership?.userId ?? null;
        }
        if (rule.action === 'REASSIGN' && !targetId) continue;

        await this.prisma.$transaction(async (tx) => {
          const data =
            rule.action === 'REASSIGN'
              ? {
                  approverType: 'USER' as const,
                  approverUserId: targetId,
                  escalatedAt: new Date(),
                  escalationCount: { increment: 1 },
                }
              : { escalatedAt: new Date(), escalationCount: { increment: 1 } };
          await tx.approvalInstanceStep.updateMany({
            where: { instanceId: instance.id, sequence: instance.currentSequence, status: 'PENDING' },
            data,
          });
          await tx.approvalHistory.create({
            data: {
              organizationId: instance.organizationId,
              instanceId: instance.id,
              sequence: instance.currentSequence,
              action: 'ESCALATED',
              actorId: user.id,
              metadata: {
                ruleId: rule.id,
                afterHours: rule.afterHours,
                action: rule.action,
                reassignedTo: targetId ?? null,
              },
            },
          });
        });

        escalations.push({ instanceId: instance.id, action: rule.action, reassignedTo: targetId ?? null });
      }
    }

    return { processed: escalations.length, escalations };
  }

  async history(instanceId: string) {
    await this.getInstance(instanceId);
    return this.prisma.approvalHistory.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---------------- internals

  private toActor(user: SessionUser): ApprovalActor {
    return {
      id: user.id,
      roleCodes: user.roles.map((role) => role.code),
      permissions: user.permissions,
    };
  }

  private async loadPendingInstance(id: string) {
    const instance = await this.prisma.approvalInstance.findFirst({
      where: { id },
      include: { steps: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!instance) throw errors.notFound('Approval request');
    if (instance.status !== 'PENDING') throw errors.conflict(`This approval request is ${instance.status.toLowerCase()}`);
    return instance;
  }

  private async findActionableStep(instance: any, actor: ApprovalActor): Promise<DecisionRecord | null> {
    const steps = instance.steps.filter(
      (step: any) => step.sequence === instance.currentSequence && step.status === 'PENDING',
    );
    for (const step of steps) {
      if (stepMatchesActor(step, actor)) return { step, delegatedFrom: null };
    }

    const delegations = await this.activeDelegations(actor.id, instance);
    const actorCache = new Map<string, ApprovalActor | null>();
    for (const delegation of delegations) {
      let delegator = actorCache.get(delegation.delegatorId);
      if (delegator === undefined) {
        delegator = await this.loadDelegatorActor(delegation.delegatorId);
        actorCache.set(delegation.delegatorId, delegator);
      }
      if (!delegator) continue;
      for (const step of steps) {
        if (stepMatchesActor(step, delegator)) return { step, delegatedFrom: delegation.delegatorId };
      }
    }
    return null;
  }

  private async activeDelegations(actorIdValue: string, instance: any) {
    const now = new Date();
    return this.prisma.approvalDelegation.findMany({
      where: {
        delegateId: actorIdValue,
        isActive: true,
        validFrom: { lte: now },
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
          { OR: [{ entityType: null }, { entityType: instance.entityType }] },
          { OR: [{ workflowId: null }, { workflowId: instance.workflowId }] },
        ],
      },
    });
  }

  private async loadDelegatorActor(delegatorId: string): Promise<ApprovalActor | null> {
    const memberships = await this.prisma.userRole.findMany({
      where: { userId: delegatorId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (memberships.length === 0) return null;
    return {
      id: delegatorId,
      roleCodes: memberships.map((membership) => membership.role.code),
      permissions: memberships.flatMap((membership) =>
        membership.role.permissions.map((rolePermission) => rolePermission.permission.code),
      ),
    };
  }

  private async advanceSequence(tx: any, instanceId: string, fromSequence: number) {
    let current = fromSequence;
    for (let guard = 0; guard < 100; guard += 1) {
      await tx.approvalInstanceStep.updateMany({
        where: { instanceId, sequence: current, status: 'PENDING', isOptional: true },
        data: { status: 'SKIPPED' },
      });
      const steps = await tx.approvalInstanceStep.findMany({ where: { instanceId } });
      const hasPending = steps.some((step: any) => step.sequence === current && step.status === 'PENDING');
      if (hasPending) {
        await tx.approvalInstance.update({ where: { id: instanceId }, data: { currentSequence: current } });
        return { completed: false, currentSequence: current };
      }
      const next = nextPendingSequence(steps, current);
      if (next === null) {
        await tx.approvalInstance.update({
          where: { id: instanceId },
          data: { status: 'APPROVED', completedAt: new Date() },
        });
        return { completed: true, currentSequence: current };
      }
      current = next;
    }
    throw errors.internal('Approval sequence did not converge');
  }
}
