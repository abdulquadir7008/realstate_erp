jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { compare } from 'bcryptjs';
import { AuthService } from './auth.service';

const user = {
  id: 'user-1',
  email: 'owner@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  lastName: 'Owner',
  avatarUrl: null,
  status: 'ACTIVE',
  deletedAt: null,
  scope: 'TENANT',
  organizationId: 'org-1',
  branchId: null,
  designation: null,
  roles: [],
};

function setup() {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    organization: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Test Builders', slug: 'test-builders', status: 'ACTIVE' }),
    },
    rolePermission: { findMany: jest.fn().mockResolvedValue([]) },
    refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-1' }) },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const access = {
    assertAccess: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(prisma as any, jwt as any, access as any);
  return { service, prisma, jwt, access };
}

describe('AuthService login access enforcement', () => {
  beforeEach(() => {
    (compare as jest.Mock).mockResolvedValue(true);
  });

  it('checks organization and subscription state before issuing tokens', async () => {
    const { service, access, jwt } = setup();

    const result = await service.login({ email: 'owner@example.com', password: 'secret' } as any);

    expect(access.assertAccess).toHaveBeenCalledWith('org-1');
    expect(jwt.signAsync).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('refuses to issue tokens when the organization is not active', async () => {
    const { service, access, jwt } = setup();
    access.assertAccess.mockRejectedValue(
      Object.assign(new Error('Organization is awaiting approval'), { code: 'ORGANIZATION_PENDING' }),
    );

    await expect(service.login({ email: 'owner@example.com', password: 'secret' } as any)).rejects.toThrow(
      'Organization is awaiting approval',
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('does not run the organization check for users without an organization', async () => {
    const { service, access, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ ...user, organizationId: null });

    await service.login({ email: 'owner@example.com', password: 'secret' } as any);

    expect(access.assertAccess).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials before evaluating organization access', async () => {
    const { service, access } = setup();
    (compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'owner@example.com', password: 'wrong' } as any)).rejects.toThrow(
      'Invalid credentials',
    );
    expect(access.assertAccess).not.toHaveBeenCalled();
  });
});
