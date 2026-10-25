import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import { runWithTenant } from '../../prisma/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    let orgId = user?.organizationId ?? null;
    const userId = user?.id ?? null;
    const email = user?.email ?? null;

    if (userId) {
      return defer(async () => {
        try {
          if (!orgId) {
            const dbUser = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { organizationId: true },
            });
            orgId = dbUser?.organizationId ?? null;
            if (!orgId) {
              const userRole = await this.prisma.userRole.findFirst({
                where: { userId },
                select: { orgId: true, role: { select: { organizationId: true } } },
              });
              orgId = userRole?.orgId ?? (userRole as any)?.role?.organizationId ?? null;
            }
            if (!orgId) {
              const firstOrg = await this.prisma.organization.findFirst({
                select: { id: true },
              });
              orgId = firstOrg?.id ?? null;
            }
          }
          if (orgId) {
            return runWithTenant({ orgId, userId, email }, () => next.handle());
          }
          return next.handle();
        } catch {
          return next.handle();
        }
      });
    }

    return defer(() => next.handle());
  }
}
