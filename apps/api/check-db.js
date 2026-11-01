const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true, status: true } });
  const users = await prisma.user.findMany({ select: { id: true, email: true, organizationId: true, status: true } });
  console.log('ORGS:', JSON.stringify(orgs, null, 2));
  console.log('USERS:', JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());