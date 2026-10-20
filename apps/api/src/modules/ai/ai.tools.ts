import { PrismaService } from '../../prisma/prisma.service';

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  run: (prisma: PrismaService, args: any) => Promise<unknown>;
}

const num = (v: any) => Number(v ?? 0);

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const AI_TOOLS: AiTool[] = [
  {
    name: 'get_business_overview',
    description:
      'Get a high-level overview of the organization: project/unit counts, bookings, collections, outstanding dues, open leads and customers. Use this for broad "how are we doing" questions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async run(prisma) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [projects, units, bookings, openLeads, customers, collected, outstandingAgg] = await Promise.all([
        prisma.project.count({ where: { deletedAt: null, status: { not: 'CANCELLED' } } }),
        prisma.unit.count({ where: { deletedAt: null } }),
        prisma.booking.count({ where: { deletedAt: null, status: { not: 'CANCELLED' } } }),
        prisma.lead.count({ where: { deletedAt: null, status: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] } } }),
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
        prisma.paymentDemand.aggregate({ where: { status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] } }, _sum: { totalAmount: true, paidAmount: true } }),
      ]);
      return {
        projects,
        units,
        bookings,
        openLeads,
        customers,
        collectionsThisMonth: num(collected._sum.amount),
        outstanding: num(outstandingAgg._sum.totalAmount) - num(outstandingAgg._sum.paidAmount),
      };
    },
  },
  {
    name: 'get_sales_and_collections_trend',
    description: 'Get monthly booking value (sales) and cash collections for the last N months (default 6). Use for trend and growth questions.',
    parameters: { type: 'object', properties: { months: { type: 'integer', minimum: 1, maximum: 24 } }, additionalProperties: false },
    async run(prisma, args) {
      const months = Math.min(Math.max(Number(args?.months) || 6, 1), 24);
      const since = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);
      const [bookings, payments] = await Promise.all([
        prisma.booking.findMany({ where: { deletedAt: null, status: { not: 'CANCELLED' }, bookingDate: { gte: since } }, select: { bookingDate: true, totalPrice: true } }),
        prisma.payment.findMany({ where: { status: 'SUCCESS', paidAt: { gte: since } }, select: { paidAt: true, amount: true } }),
      ]);
      const sales = new Map<string, number>();
      const collections = new Map<string, number>();
      for (const b of bookings) sales.set(monthKey(b.bookingDate), (sales.get(monthKey(b.bookingDate)) ?? 0) + num(b.totalPrice));
      for (const p of payments) collections.set(monthKey(p.paidAt), (collections.get(monthKey(p.paidAt)) ?? 0) + num(p.amount));
      const keys = [...new Set([...sales.keys(), ...collections.keys()])].sort();
      return keys.map((k) => ({ month: k, sales: sales.get(k) ?? 0, collections: collections.get(k) ?? 0 }));
    },
  },
  {
    name: 'get_outstanding_summary',
    description: 'Get the total outstanding receivables and a breakdown by status, plus the largest debtors. Use for dues and receivables questions.',
    parameters: { type: 'object', properties: { topCustomers: { type: 'integer', minimum: 1, maximum: 25 } }, additionalProperties: false },
    async run(prisma, args) {
      const topCustomers = Math.min(Math.max(Number(args?.topCustomers) || 5, 1), 25);
      const demands = await prisma.paymentDemand.findMany({
        where: { status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] } },
        select: { totalAmount: true, paidAmount: true, status: true, customerId: true, dueDate: true },
      });
      const byStatus: Record<string, number> = {};
      const byCustomer = new Map<string, number>();
      let total = 0;
      const today = new Date();
      for (const d of demands) {
        const due = num(d.totalAmount) - num(d.paidAmount);
        total += due;
        byStatus[d.status] = (byStatus[d.status] ?? 0) + due;
        byCustomer.set(d.customerId, (byCustomer.get(d.customerId) ?? 0) + due);
      }
      const topIds = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, topCustomers);
      const customers = await prisma.customer.findMany({ where: { id: { in: topIds.map((t) => t[0]) } }, select: { id: true, firstName: true, lastName: true } });
      const nameOf = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName ?? ''}`.trim()]));
      return {
        totalOutstanding: total,
        byStatus,
        topCustomers: topIds.map(([id, amount]) => ({ customer: nameOf.get(id) ?? id, amount })),
        today: today.toISOString().slice(0, 10),
      };
    },
  },
  {
    name: 'list_overdue_demands',
    description: 'List overdue payment demands with customer name, amount due and due date. Use for follow-up and collection action questions.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } }, additionalProperties: false },
    async run(prisma, args) {
      const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 50);
      const demands = await prisma.paymentDemand.findMany({
        where: { status: 'OVERDUE' },
        orderBy: { dueDate: 'asc' },
        take: limit,
        select: { demandNumber: true, title: true, dueDate: true, totalAmount: true, paidAmount: true, customerId: true },
      });
      const customers = await prisma.customer.findMany({ where: { id: { in: demands.map((d) => d.customerId) } }, select: { id: true, firstName: true, lastName: true, phone: true } });
      const cMap = new Map(customers.map((c) => [c.id, c]));
      return demands.map((d) => ({
        demandNumber: d.demandNumber,
        title: d.title,
        dueDate: d.dueDate,
        dueAmount: num(d.totalAmount) - num(d.paidAmount),
        customer: cMap.get(d.customerId) ? `${cMap.get(d.customerId)!.firstName} ${cMap.get(d.customerId)!.lastName ?? ''}`.trim() : d.customerId,
        phone: cMap.get(d.customerId)?.phone,
      }));
    },
  },
  {
    name: 'get_leads_summary',
    description: 'Get lead counts by status and source, plus total and converted counts and conversion rate. Use for CRM and pipeline questions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async run(prisma) {
      const [byStatus, bySource, total, converted] = await Promise.all([
        prisma.lead.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.lead.groupBy({ by: ['source'], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.lead.count({ where: { deletedAt: null } }),
        prisma.lead.count({ where: { deletedAt: null, status: 'CONVERTED' } }),
      ]);
      return {
        total,
        converted,
        conversionRate: total ? Math.round((converted / total) * 10000) / 100 : 0,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
        bySource: bySource.map((s) => ({ source: s.source, count: s._count._all })),
      };
    },
  },
  {
    name: 'get_inventory_summary',
    description: 'Get property inventory: unit counts by status and by type, plus total inventory value. Use for availability and stock questions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async run(prisma) {
      const [byStatus, byType, agg] = await Promise.all([
        prisma.unit.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.unit.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true }, _sum: { basePrice: true } }),
        prisma.unit.aggregate({ where: { deletedAt: null }, _sum: { basePrice: true } }),
      ]);
      return {
        totalValue: num(agg._sum.basePrice),
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
        byType: byType.map((t) => ({ type: t.type, count: t._count._all, value: num(t._sum.basePrice) })),
      };
    },
  },
  {
    name: 'get_construction_summary',
    description: 'Get construction task counts by status and priority and a list of tasks due within the next 14 days. Use for project execution questions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async run(prisma) {
      const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const [byStatus, byPriority, upcoming] = await Promise.all([
        prisma.constructionTask.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.constructionTask.groupBy({ by: ['priority'], _count: { _all: true } }),
        prisma.constructionTask.findMany({
          where: { status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { lte: in14 } },
          orderBy: { dueDate: 'asc' },
          take: 10,
          select: { name: true, status: true, priority: true, dueDate: true, progressPercent: true, project: { select: { name: true } } },
        }),
      ]);
      return {
        byStatus: byStatus.map((t) => ({ status: t.status, count: t._count._all })),
        byPriority: byPriority.map((t) => ({ priority: t.priority, count: t._count._all })),
        upcoming: upcoming.map((t) => ({ name: t.name, status: t.status, priority: t.priority, dueDate: t.dueDate, progress: t.progressPercent, project: t.project?.name })),
      };
    },
  },
  {
    name: 'list_projects',
    description: 'List projects with their status and location. Use when the user refers to projects by name.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } }, additionalProperties: false },
    async run(prisma, args) {
      const limit = Math.min(Math.max(Number(args?.limit) || 20, 1), 50);
      const projects = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, name: true, status: true, city: true, code: true } });
      return projects;
    },
  },
  {
    name: 'search_customers',
    description: 'Search customers by name, email or phone. Use to look up a specific customer and their contact details.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 25 } }, required: ['query'], additionalProperties: false },
    async run(prisma, args) {
      const q = String(args?.query ?? '').trim();
      const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 25);
      if (!q) return [];
      return prisma.customer.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        },
        take: limit,
        select: { id: true, customerCode: true, firstName: true, lastName: true, email: true, phone: true, city: true, kycStatus: true, status: true },
      });
    },
  },
];

export function toolSchemaFor(name: string) {
  return AI_TOOLS.find((t) => t.name === name);
}

export function openAiTools() {
  return AI_TOOLS.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
