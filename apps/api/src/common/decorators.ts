import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '@re/shared';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'requiredPermissions';
export const SAAS_KEY = 'saasOnly';
export const CUSTOMER_ALLOWED_KEY = 'customerAllowed';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const SaasOnly = () => SetMetadata(SAAS_KEY, true);
export const CustomerAllowed = () => SetMetadata(CUSTOMER_ALLOWED_KEY, true);
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export interface AuthenticatedRequest {
  user: SessionUser;
  headers: Record<string, string | undefined>;
  ip: string;
  body: unknown;
  query: unknown;
  method: string;
  originalUrl: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});

export const RequestRaw = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>();
});
