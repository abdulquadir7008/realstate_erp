import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { currentOrgId, currentUserId } from '../../prisma/tenant-context';
import { requireOrgId } from '../../common/utils/tenant';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { InviteUserInput, CreateUserInput, UpdateUserInput, PaginationInput } from '@re/shared';

export interface UserListQuery extends PaginationInput {
  status?: string;
  roleCode?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: UserListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.roleCode) where.roles = { some: { role: { code: q.roleCode } } };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
          designation: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
          branchId: true,
          departmentId: true,
          roles: { select: { role: { select: { id: true, code: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(
      items.map((u) => ({ ...u, roles: u.roles.map((r) => r.role) })),
      total,
      q.page,
      q.limit,
    );
  }

  async get(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
        designation: true,
        avatarUrl: true,
        mfaEnabled: true,
        lastLoginAt: true,
        branchId: true,
        departmentId: true,
        createdAt: true,
        roles: { select: { role: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!user) throw errors.notFound('User');
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  async create(input: CreateUserInput) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw errors.conflict('A user with this email already exists');

    const user = await this.prisma.user.create({
      data: {
        organizationId: requireOrgId(),
        email,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        passwordHash: await hash(input.password, 12),
        status: 'ACTIVE',
        designation: input.designation ?? null,
        departmentId: input.departmentId ?? null,
        branchId: input.branchId ?? null,
        invitedBy: currentUserId(),
      },
    });
    await this.assignRoles(user.id, input.roleCodes);
    return this.get(user.id);
  }

  async invite(input: InviteUserInput) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw errors.conflict('A user with this email already exists');

    const orgId = requireOrgId();

    const user = await this.prisma.user.create({
      data: {
        organizationId: orgId,
        email,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        passwordHash: await hash(randomBytes(24).toString('hex'), 12),
        status: 'INVITED',
        designation: input.designation ?? null,
        departmentId: input.departmentId ?? null,
        branchId: input.branchId ?? null,
        invitedBy: currentUserId(),
      },
    });
    await this.assignRoles(user.id, input.roleCodes);

    const token = randomBytes(32).toString('hex');
    for (const roleCode of input.roleCodes) {
      await this.prisma.invitation.create({
        data: {
          organizationId: orgId,
          email,
          roleCode,
          token,
          expiresAt: addDays(new Date(), 7),
          invitedBy: currentUserId()!,
        },
      });
    }

    return { userId: user.id, invitationToken: token, expiresInDays: 7 };
  }

  async update(id: string, input: UpdateUserInput) {
    await this.get(id);
    const data: any = {};
    for (const key of ['firstName', 'lastName', 'phone', 'status', 'designation', 'departmentId', 'branchId', 'avatarUrl'] as const) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    await this.prisma.user.update({ where: { id }, data });
    if (input.roleCodes) await this.assignRoles(id, input.roleCodes);
    return this.get(id);
  }

  async remove(id: string) {
    if (id === currentUserId()) throw errors.conflict('You cannot remove your own account');
    await this.get(id);
    await this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED', deletedAt: new Date() } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    return { id };
  }

  private async assignRoles(userId: string, roleCodes: string[]) {
    const orgId = currentOrgId();
    if (!orgId) throw errors.internal('Missing tenant context');

    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true, code: true },
    });
    const found = new Map(roles.map((r) => [r.code, r.id]));
    const missing = roleCodes.filter((c) => !found.has(c));
    if (missing.length) throw errors.notFound(`Roles: ${missing.join(', ')}`);

    await this.prisma.userRole.deleteMany({ where: { userId } });
    for (const code of roleCodes) {
      await this.prisma.userRole.create({
        data: { userId, roleId: found.get(code)!, orgId },
      });
    }
  }
}
