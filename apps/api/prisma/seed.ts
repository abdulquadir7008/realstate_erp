import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, ROLE_TEMPLATES } from '@re/shared';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const PLANS = [
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'Small builders and individual agents',
    priceMonthly: 1999,
    priceYearly: 19990,
    maxUsers: 3,
    maxProjects: 2,
    storageQuotaMb: 1024,
    maxAiRequests: 20,
    trialDays: 14,
    features: { advancedReports: false, automation: false, apiAccess: false, mobileAccess: true, whatsapp: false },
    isDefault: false,
    sortOrder: 1,
  },
  {
    code: 'PROFESSIONAL',
    name: 'Professional',
    description: 'Growing real estate companies',
    priceMonthly: 4999,
    priceYearly: 49990,
    maxUsers: 15,
    maxProjects: 10,
    storageQuotaMb: 10240,
    maxAiRequests: 200,
    trialDays: 14,
    features: { advancedReports: true, automation: true, apiAccess: true, mobileAccess: true, whatsapp: false },
    isDefault: true,
    sortOrder: 2,
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Large developers with unlimited scale',
    priceMonthly: 14999,
    priceYearly: 149990,
    maxUsers: 100,
    maxProjects: 100,
    storageQuotaMb: 102400,
    maxAiRequests: 2000,
    trialDays: 30,
    features: { advancedReports: true, automation: true, apiAccess: true, mobileAccess: true, whatsapp: true },
    isDefault: false,
    sortOrder: 3,
  },
];

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module, action: p.action, description: p.description },
      create: { code: p.code, module: p.module, action: p.action, description: p.description },
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}

async function seedPlans() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${PLANS.length} plans`);
}

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@properp.local';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@123';

  let org = await prisma.organization.findUnique({ where: { slug: 'platform' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'PropERP Platform',
        slug: 'platform',
        email,
        country: 'India',
        status: 'ACTIVE',
        settings: { currency: 'INR', locale: 'en-IN' },
      },
    });
  }

  const role = await prisma.role.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SUPER_ADMIN' } },
    update: { scope: 'SAAS' },
    create: {
      organizationId: org.id,
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Platform-wide administrator',
      isSystem: true,
      scope: 'SAAS',
    },
  });

  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id },
    });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: await hash(password, 12),
        scope: 'SAAS',
        organizationId: org.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, orgId: org.id },
    });
    console.log(`Created super admin ${email}`);
  } else {
    console.log(`Super admin already exists: ${email}`);
  }
}

async function main() {
  await seedPermissions();
  await seedPlans();
  await seedSuperAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
