import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../api-error';
import { env } from '../../config/configuration';

export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'CANCELLED';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface SubscriptionState {
  id: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date;
}

export interface AccessDecision {
  allowed: boolean;
  code?: string;
  message?: string;
}

const BLOCKING_ORG_STATUS: Record<OrgStatus, { code: string; message: string } | null> = {
  PENDING: { code: 'ORGANIZATION_PENDING', message: 'Organization is awaiting approval' },
  SUSPENDED: { code: 'ORGANIZATION_SUSPENDED', message: 'Organization is suspended' },
  REJECTED: { code: 'ORGANIZATION_REJECTED', message: 'Organization registration was rejected' },
  CANCELLED: { code: 'ORGANIZATION_CANCELLED', message: 'Organization has been cancelled' },
  ACTIVE: null,
};

/**
 * Central place that decides whether a tenant may use the system.
 *
 * Organization status and subscription state are both enforced here so that
 * login, request-time guards, and background jobs share one rule set.
 */
@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Evaluate an organization status without touching the database. */
  evaluateOrgStatus(status: string | null | undefined): AccessDecision {
    if (!status) return { allowed: true };
    const blocked = BLOCKING_ORG_STATUS[status as OrgStatus];
    if (blocked) return { allowed: false, ...blocked };
    return { allowed: true };
  }

  /**
   * Evaluate a subscription against the current clock.
   *
   * A tenant without any subscription is allowed: billing is optional and
   * self-hosted deployments never create one.
   */
  evaluateSubscription(
    subscription: SubscriptionState | null | undefined,
    now: Date = new Date(),
  ): AccessDecision {
    if (!env().ENFORCE_SUBSCRIPTION) return { allowed: true };
    if (!subscription) return { allowed: true };

    switch (subscription.status) {
      case 'CANCELLED':
        return { allowed: false, code: 'SUBSCRIPTION_CANCELLED', message: 'Subscription has been cancelled' };
      case 'EXPIRED':
        return { allowed: false, code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription has expired' };
      case 'TRIALING': {
        const endsAt = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
        if (endsAt && endsAt.getTime() < now.getTime()) {
          return { allowed: false, code: 'TRIAL_EXPIRED', message: 'Trial period has ended' };
        }
        return { allowed: true };
      }
      case 'PAST_DUE': {
        const deadline = addDays(subscription.currentPeriodEnd, env().SUBSCRIPTION_GRACE_DAYS).getTime();
        if (deadline < now.getTime()) {
          return {
            allowed: false,
            code: 'SUBSCRIPTION_PAST_DUE',
            message: `Payment is overdue. Access is blocked after ${env().SUBSCRIPTION_GRACE_DAYS} grace days`,
          };
        }
        return { allowed: true };
      }
      case 'ACTIVE':
      default:
        return { allowed: true };
    }
  }

  /** Load the organization plus its most relevant subscription. */
  async loadState(organizationId: string): Promise<{
    orgStatus: OrgStatus | null;
    subscription: SubscriptionState | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        status: true,
        subscriptions: {
          where: { status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
        },
      },
    });
    if (!org) return { orgStatus: null, subscription: null };
    const subscription = org.subscriptions[0] ?? null;
    return {
      orgStatus: org.status as OrgStatus,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status as SubscriptionStatus,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    };
  }

  /** Combined decision for an organization, including its subscription. */
  async evaluate(organizationId: string, now: Date = new Date()): Promise<AccessDecision> {
    const { orgStatus, subscription } = await this.loadState(organizationId);
    return this.decide(orgStatus, subscription, now);
  }

  /**
   * Compose the organization and subscription rules from already-loaded state.
   * Used by the request guard, which reads both in a single query.
   */
  decide(
    orgStatus: string | null | undefined,
    subscription: SubscriptionState | null | undefined,
    now: Date = new Date(),
  ): AccessDecision {
    const orgDecision = this.evaluateOrgStatus(orgStatus);
    if (!orgDecision.allowed) return orgDecision;
    return this.evaluateSubscription(subscription, now);
  }

  /** Throws the appropriate API error when access is denied. */
  async assertAccess(organizationId: string, now: Date = new Date()): Promise<void> {
    const decision = await this.evaluate(organizationId, now);
    if (decision.allowed) return;
    throw errors.denied(decision.code ?? 'ACCESS_DENIED', decision.message ?? 'Access denied');
  }
}
