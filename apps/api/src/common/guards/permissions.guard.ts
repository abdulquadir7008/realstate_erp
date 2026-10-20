import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionUser, roleHasPermission } from '@re/shared';
import { CUSTOMER_ALLOWED_KEY, PERMISSIONS_KEY, SAAS_KEY } from '../decorators';
import { errors } from '../api-error';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const saasOnly = this.reflector.getAllAndOverride<boolean | undefined>(SAAS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const customerAllowed = this.reflector.getAllAndOverride<boolean | undefined>(CUSTOMER_ALLOWED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user: SessionUser | undefined = request.user;
    if (!user) return true; // public routes

    if (saasOnly && user.scope !== 'SAAS') {
      throw errors.forbidden('This endpoint is restricted to the SaaS platform administrators');
    }

    if (user.isCustomer && !customerAllowed) {
      throw errors.forbidden('Customer accounts cannot access this resource');
    }

    if (!required || required.length === 0) return true;

    const granted = user.permissions;
    const ok = required.every((perm) => roleHasPermission(granted, perm));
    if (!ok) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Missing permission: ${required.filter((p) => !roleHasPermission(granted, p)).join(', ')}`,
      });
    }
    return true;
  }
}
