import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators';

const payload = {
  sub: 'user-1',
  email: 'owner@example.com',
  firstName: 'Test',
  lastName: 'Owner',
  avatarUrl: null,
  scope: 'TENANT',
  organizationId: 'org-1',
  roles: [],
  permissions: ['*'],
  isCustomer: false,
};

function contextFor(token: string | undefined, isPublic = false) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: token ? `Bearer ${token}` : undefined },
      }),
    }),
  } as any;
}

function reflectorFor(isPublic: boolean) {
  return {
    getAllAndOverride: (key: string) => (key === IS_PUBLIC_KEY ? isPublic : undefined),
  } as any;
}

function setup(orgStatus: string, subscription: any = null) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        deletedAt: null,
        organization: { id: 'org-1', status: orgStatus, subscriptions: subscription ? [subscription] : [] },
      }),
    },
  };
  const jwt = { verifyAsync: jest.fn().mockResolvedValue(payload) };
  const access = {
    decide: jest.fn().mockReturnValue({ allowed: orgStatus === 'ACTIVE' }),
  };
  const guard = new JwtAuthGuard(jwt as any, prisma as any, reflectorFor(false) as any, access as any);
  return { guard, prisma, jwt, access };
}

describe('JwtAuthGuard organization and subscription enforcement', () => {
  it('re-reads the organization status on every request', async () => {
    const { guard, prisma } = setup('ACTIVE');

    await expect(guard.canActivate(contextFor('token'))).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it('blocks the request when the organization is suspended', async () => {
    const { guard } = setup('SUSPENDED');

    await expect(guard.canActivate(contextFor('token'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks the request when the subscription is no longer valid', async () => {
    const { guard, access } = setup('ACTIVE');
    access.decide.mockReturnValue({ allowed: false, code: 'TRIAL_EXPIRED', message: 'Trial period has ended' });

    await expect(guard.canActivate(contextFor('token'))).rejects.toThrow('Trial period has ended');
  });

  it('still rejects disabled users before the organization check', async () => {
    const { guard, prisma, access } = setup('ACTIVE');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'SUSPENDED',
      deletedAt: null,
      organization: { id: 'org-1', status: 'ACTIVE', subscriptions: [] },
    });

    await expect(guard.canActivate(contextFor('token'))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(access.decide).not.toHaveBeenCalled();
  });

  it('lets public routes through even when the tenant is blocked', async () => {
    const { prisma, jwt, access } = setup('SUSPENDED');
    const publicGuard = new JwtAuthGuard(jwt as any, prisma as any, reflectorFor(true) as any, access as any);

    await expect(publicGuard.canActivate(contextFor('token'))).resolves.toBe(true);
    expect(access.decide).toHaveBeenCalled();
  });
});
