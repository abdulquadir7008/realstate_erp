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

    if (orgId || !userId) {
      if (!orgId) {
        return defer(() => next.handle());
      }
      return defer(() => runWithTenant({ orgId, userId, email }, () => next.handle()));
    }

    // Fallback: try to resolve organizationId from DB if missing in token
    return defer(async () => {
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { organizationId: true },
        });
        const resolvedOrgId = dbUser?.organizationId ?? orgId;
        if (!resolvedOrgId) {
          return next.handle();
        }
        return runWithTenant({ orgId: resolvedOrgId, userId, email }, () => next.handle());
      } catch {
        return next.handle();
      }
    });
  }
}
