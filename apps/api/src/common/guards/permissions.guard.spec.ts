import { SessionUser } from '@re/shared';
import { PermissionsGuard } from './permissions.guard';
import { SAAS_KEY } from '../decorators';
import { ApiException } from '../api-error';

function contextFor(user: Partial<SessionUser>) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

function reflectorFor(metadata: Record<string, unknown>) {
  return {
    getAllAndOverride: (key: string) => metadata[key],
  } as any;
}

describe('PermissionsGuard SaaS restriction', () => {
  it('rejects tenant users even when they hold a wildcard', () => {
    const guard = new PermissionsGuard(reflectorFor({ [SAAS_KEY]: true }));
    const user = { scope: 'TENANT', permissions: ['*'] } as SessionUser;

    expect(() => guard.canActivate(contextFor(user))).toThrow(ApiException);
    expect(() => guard.canActivate(contextFor(user))).toThrow('restricted to the SaaS platform administrators');
  });

  it('allows SaaS-scoped users through the scope check', () => {
    const guard = new PermissionsGuard(reflectorFor({ [SAAS_KEY]: true }));
    const user = { scope: 'SAAS', permissions: ['organization:read'] } as SessionUser;

    expect(guard.canActivate(contextFor(user))).toBe(true);
  });
});
