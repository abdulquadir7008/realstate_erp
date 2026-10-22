import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationInput } from '@re/shared';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { errors } from '../../common/api-error';
import { addDays } from 'date-fns';

export type OrgStatusValue = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'CANCELLED';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrgs(p: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip: pageOffset(p.page, p.limit),
        take: p.limit,
        orderBy: { createdAt: p.sortDir ?? 'desc' },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: { select: { id: true, code: true, name: true } } },
          },
        },
      }),
      this.prisma.organization.count(),
    ]);
    return paginated(items, total, p.page, p.limit);
  }

  async getOrg(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
      },
    });
    if (!org) throw errors.notFound('Organization');
    return org;
  }

  /**
   * Approve, suspend, reject or cancel a tenant organization.
   *
   * Approving an organization that has no subscription starts the default plan
   * trial, mirroring what self-service registration does.
   */
  async setOrgStatus(id: string, status: OrgStatusValue, actorId?: string | null, reason?: string | null) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });
    if (!org) throw errors.notFound('Organization');
    if (org.status === status) return this.getOrg(id);

    const now = new Date();
    await this.prisma.organization.update({
      where: { id },
      data: {
        status,
        statusReason: reason ?? null,
        approvedAt: status === 'ACTIVE' ? now : undefined,
        approvedBy: status === 'ACTIVE' && actorId ? actorId : undefined,
      },
    });

    if (status === 'ACTIVE') await this.ensureTrialSubscription(id);

    return this.getOrg(id);
  }

  private async ensureTrialSubscription(organizationId: string) {
    const existing = await this.prisma.subscription.findFirst({ where: { organizationId } });
    if (existing) return existing;
    const plan = await this.prisma.plan.findFirst({ where: { isDefault: true, isActive: true } });
    if (!plan) return null;
    return this.prisma.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: 'TRIALING',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: addDays(new Date(), plan.trialDays),
        trialEndsAt: addDays(new Date(), plan.trialDays),
      },
    });
  }
}

@Injectable()
export class SaasAdminService extends TenantService {}
