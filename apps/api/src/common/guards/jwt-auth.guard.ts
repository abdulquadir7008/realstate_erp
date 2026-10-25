import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SessionUser } from '@re/shared';
import { env } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators';
import { SubscriptionStatus, TenantAccessService } from '../access/tenant-access.service';

type AccessPayload = SessionUser & { sub: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly access: TenantAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Missing access token' });
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret: env().JWT_ACCESS_SECRET });
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Access token is invalid or expired' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        organization: {
          select: {
            id: true,
            status: true,
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
            },
          },
        },
      },
    });
    if (!user || user.deletedAt || user.status === 'SUSPENDED') {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'USER_DISABLED', message: 'Account is disabled' });
    }

    if (user.organization) {
      const sub = user.organization.subscriptions[0] ?? null;
      const decision = this.access.decide(
        user.organization.status,
        sub
          ? {
              id: sub.id,
              status: sub.status as SubscriptionStatus,
              trialEndsAt: sub.trialEndsAt,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
      );
      if (!decision.allowed) {
        if (isPublic) return true;
        throw new ForbiddenException({
          code: decision.code ?? 'ACCESS_DENIED',
          message: decision.message ?? 'Access denied',
        });
      }
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      scope: payload.scope,
      organizationId: (user as any).organizationId ?? payload.organizationId ?? null,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      isCustomer: Boolean(payload.isCustomer),
      branchId: payload.branchId,
      designation: payload.designation,
    } satisfies SessionUser;

    return true;
  }
}
