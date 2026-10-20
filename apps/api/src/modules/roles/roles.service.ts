import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { currentOrgId } from '../../prisma/tenant-context';
import { PERMISSIONS, CreateRoleInput, UpdateRoleInput } from '@re/shared';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        isCustomer: true,
        scope: true,
        _count: { select: { permissions: true, users: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isCustomer: r.isCustomer,
      scope: r.scope,
      permissionCount: r._count.permissions,
      userCount: r._count.users,
    }));
  }

  async get(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw errors.notFound('Role');
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      scope: role.scope,
      permissions: role.permissions.map((p) => p.permission.code),
    };
  }

  /** Global permission catalog, grouped by module for UI rendering. */
  permissionCatalog() {
    const grouped: Record<string, { code: string; action: string; description: string }[]> = {};
    for (const p of PERMISSIONS) {
      (grouped[p.module] ??= []).push({ code: p.code, action: p.action, description: p.description });
    }
    return grouped;
  }

  async create(input: CreateRoleInput) {
    const exists = await this.prisma.role.findFirst({ where: { code: input.code } });
    if (exists) throw errors.conflict('A role with this code already exists');

    const role = await this.prisma.role.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        isSystem: false,
        scope: 'TENANT',
      },
    });
    await this.setPermissions(role.id, input.permissions);
    return this.get(role.id);
  }

  async update(id: string, input: UpdateRoleInput) {
    const role = await this.prisma.role.findFirst({ where: { id } });
    if (!role) throw errors.notFound('Role');
    if (role.isSystem) throw errors.forbidden('System roles cannot be modified');

    await this.prisma.role.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
      },
    });
    if (input.permissions) await this.setPermissions(id, input.permissions);
    return this.get(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findFirst({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw errors.notFound('Role');
    if (role.isSystem) throw errors.forbidden('System roles cannot be deleted');
    if (role._count.users > 0) throw errors.conflict('Remove all users from this role before deleting it');
    await this.prisma.role.delete({ where: { id } });
    return { id };
  }

  private async setPermissions(roleId: string, codes: string[]) {
    const perms = await this.prisma.permission.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
    const found = new Set(perms.map((p) => p.code));
    const missing = codes.filter((c) => !found.has(c));
    if (missing.length) throw errors.validation(missing.map((c) => ({ path: c, message: 'Unknown permission' })));

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    for (const p of perms) {
      await this.prisma.rolePermission.create({ data: { roleId, permissionId: p.id } });
    }
  }
}
