import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { runWithTenant } from '../../prisma/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.id ?? null;
    const orgId = user?.organizationId ?? null;
    const email = user?.email ?? null;

    if (!userId) {
      return next.handle();
    }

    // Resolve orgId asynchronously, then switch to next.handle()
    return from(this.resolveOrgId(userId, orgId)).pipe(
      switchMap((resolvedOrgId) => {
        if (resolvedOrgId) {
          return runWithTenant({ orgId: resolvedOrgId, userId, email }, () => next.handle());
        }
        console.warn('TenantContextInterceptor: Could not determine organization for user', userId);
        return next.handle();
      })
    );
  }

  private async resolveOrgId(userId: string, orgId: string | null): Promise<string | null> {
    let resolvedOrgId = orgId;

    // If orgId is not from JWT, try to find it from DB
    if (!resolvedOrgId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      resolvedOrgId = dbUser?.organizationId ?? null;
    }

    if (!resolvedOrgId) {
      const userRole = await this.prisma.userRole.findFirst({
        where: { userId },
        select: { orgId: true, role: { select: { organizationId: true } } },
      });
      resolvedOrgId = userRole?.orgId ?? (userRole as any)?.role?.organizationId ?? null;
    }

    if (!resolvedOrgId) {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      resolvedOrgId = firstOrg?.id ?? null;
    }

    return resolvedOrgId;
  }
}