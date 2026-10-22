import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantAccessService } from '../../common/access/tenant-access.service';
import { LoginInput, RegisterOrganizationInput, SessionUser, ROLE_TEMPLATES, roleHasPermission } from '@re/shared';
import { errors } from '../../common/api-error';
import { hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { env } from '../../config/configuration';
import { addDays } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly access: TenantAccessService,
  ) {}

  async register(input: RegisterOrganizationInput) {
    const exists = await this.prisma.organization.findFirst({
      where: { OR: [{ email: input.organization.email }, { slug: slugify(input.organization.name) }] },
    });
    if (exists) throw errors.conflict('Organization or slug already exists');

    const slug = await this.ensureSlug(slugify(input.organization.name));
    const org = await this.prisma.organization.create({
      data: {
        name: input.organization.name,
        slug,
        email: input.organization.email,
        phone: input.organization.phone ?? null,
        website: input.organization.website ?? null,
        city: input.organization.city ?? null,
        state: input.organization.state ?? null,
        country: input.organization.country ?? 'India',
        status: env().AUTO_APPROVE_ORGS ? 'ACTIVE' : 'PENDING',
        settings: defaultSettings(),
      },
    });

    const passwordHash = await hash(input.owner.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: input.owner.email,
        firstName: input.owner.firstName,
        lastName: input.owner.lastName ?? null,
        phone: input.owner.phone ?? null,
        passwordHash,
        scope: 'TENANT',
        organizationId: org.id,
        status: 'ACTIVE',
      },
    });

    await this.ensureSystemRoles(org.id);
    const ownerRole = await this.prisma.role.findFirst({
      where: { organizationId: org.id, code: 'OWNER' },
      select: { id: true, code: true, name: true },
    });
    if (ownerRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: ownerRole.id } });
    }

    if (org.status === 'ACTIVE') {
      const subscription = await this.prisma.subscription.findFirst({ where: { organizationId: org.id } });
      if (!subscription) {
        const plan = await this.prisma.plan.findFirst({ where: { isDefault: true, isActive: true } });
        if (plan) {
          await this.prisma.subscription.create({
            data: {
              organizationId: org.id,
              planId: plan.id,
              status: 'TRIALING',
              billingCycle: 'MONTHLY',
              currentPeriodEnd: addDays(new Date(), plan.trialDays),
              trialEndsAt: addDays(new Date(), plan.trialDays),
            },
          });
        }
      }
    }

    return { organizationId: org.id, userId: user.id, status: org.status };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.deletedAt) throw errors.unauthorized('Invalid credentials');
    if (user.status !== 'ACTIVE') throw errors.unauthorized('Account is not active');

    if (input.organizationSlug) {
      const org = await this.prisma.organization.findFirst({ where: { slug: input.organizationSlug } });
      if (!org) throw errors.notFound('Organization');
      if (user.organizationId && user.organizationId !== org.id) throw errors.unauthorized('Access denied');
      user.organizationId = org.id;
    }

    const ok = await compare(input.password, user.passwordHash);
    if (!ok) throw errors.unauthorized('Invalid credentials');

    const orgId = user.organizationId ?? null;
    if (orgId) await this.access.assertAccess(orgId);

    const session = await this.buildSession(user.id, orgId);
    const tokens = await this.issueTokens(session);
    return { tokens, user: session };
  }

  async buildSession(userId: string, orgId: string | null): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw errors.notFound('User');

    let organization: { id: string; name: string; slug: string; status: string } | null = null;
    if (orgId) {
      organization = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, status: true },
      });
      if (!organization) throw errors.notFound('Organization');
    }

    const roleList = user.roles
      .filter((ur) => (orgId ? ur.role.organizationId === orgId || ur.role.scope === 'SAAS' : true))
      .map((ur) => ({ code: ur.role.code, name: ur.role.name, permissions: [] }));

    const granted = new Set<string>();
    for (const ur of user.roles) {
      if (orgId && ur.role.organizationId !== orgId && ur.role.scope === 'TENANT') continue;
      const perms = await this.prisma.rolePermission.findMany({
        where: { roleId: ur.role.id },
        include: { permission: true },
      });
      for (const rp of perms) granted.add(rp.permission.code);
      if (ur.role.code === 'OWNER' || ur.role.code === 'ADMIN' || ur.role.code === 'SUPER_ADMIN') granted.add('*');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      scope: (user.scope as 'SAAS' | 'TENANT') ?? 'TENANT',
      organizationId: organization?.id ?? null,
      organization,
      roles: roleList.map((r) => ({ code: r.code, name: r.name })),
      permissions: Array.from(granted),
      isCustomer: user.roles.some((ur) => ur.role.isCustomer || ur.role.code === 'CUSTOMER'),
      branchId: user.branchId,
      designation: user.designation,
    };
  }

  async issueTokens(session: SessionUser) {
    const payload = { sub: session.id, ...session };
    const accessToken = await this.jwt.signAsync({ ...payload }, { secret: env().JWT_ACCESS_SECRET, expiresIn: env().JWT_ACCESS_TTL as any });
    const refreshToken = randomBytes(32).toString('hex');
    const hashRt = await hash(refreshToken, 12);
    await this.prisma.refreshToken.create({
      data: {
        userId: session.id,
        tokenHash: hashRt,
        expiresAt: addDays(new Date(), 30),
      },
    });
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private async ensureSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
      if (i > 20) slug = `${base}-${randomBytes(4).toString('hex')}`;
    }
    return slug;
  }

  private async ensureSystemRoles(orgId: string) {
    for (const [code, tpl] of Object.entries(ROLE_TEMPLATES)) {
      const exists = await this.prisma.role.findFirst({ where: { organizationId: orgId, code } });
      if (exists) continue;
      const role = await this.prisma.role.create({
        data: { organizationId: orgId, code, name: tpl.name, description: tpl.description, scope: 'TENANT' },
      });
      const perms = tpl.permissions.filter((p) => (p as string) !== '*');
      for (const pCode of perms) {
        const perm = await this.prisma.permission.upsert({
          where: { code: pCode },
          update: {},
          create: { code: pCode, module: pCode.split(':')[0]!, action: pCode.split(':')[1]! },
        });
        await this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultSettings() {
  return {
    currency: 'INR',
    locale: 'en-IN',
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    bookingPrefix: 'BKG',
    leadPrefix: 'LD',
    customerPrefix: 'CUS',
    demandPrefix: 'DM',
    receiptPrefix: 'RCP',
    invoicePrefix: 'INV',
    ticketPrefix: 'TKT',
  };
}
