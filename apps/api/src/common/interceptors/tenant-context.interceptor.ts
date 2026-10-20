import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import { runWithTenant } from '../../prisma/tenant-context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.organizationId) {
      return defer(() => next.handle());
    }
    return defer(() =>
      runWithTenant(
        { orgId: user.organizationId ?? null, userId: user.id ?? null, email: user.email ?? null },
        () => next.handle(),
      ),
    );
  }
}
