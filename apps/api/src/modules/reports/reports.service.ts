import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReportQuery {
  projectId?: string;
  from?: Date;
  to?: Date;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count: number) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(q: ReportQuery = {}) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const projectFilter = q.projectId ? { projectId: q.projectId } : {};

    const [
      projects,
      activeProjects,
      units,
      unitsByStatusRaw,
      unitsByType,
      unitValueAgg,
      bookingsTotal,
      bookingsThisMonth,
      bookingsAgg,
      pendingBookings,
      openLeads,
      leadsTotal,
      convertedLeads,
      leadsByStatus,
      leadsBySource,
      customers,
      collected,
      collectionsTotalAgg,
      outstandingAgg,
      overdueAgg,
      recentBookings,
      recentLeads,
      tasksByStatus,
      upcomingTasks,
      bookingTrendRaw,
      paymentTrendRaw,
    ] = await Promise.all([
      this.prisma.project.count({ where: { deletedAt: null, status: { not: 'CANCELLED' } } }),
      this.prisma.project.count({ where: { deletedAt: null, status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      this.prisma.unit.count({ where: { deletedAt: null, ...projectFilter } }),
      this.prisma.unit.groupBy({ by: ['status'], where: { deletedAt: null, ...projectFilter }, _count: { _all: true } }),
      this.prisma.unit.groupBy({ by: ['type'], where: { deletedAt: null, ...projectFilter }, _count: { _all: true }, _sum: { basePrice: true } }),
      this.prisma.unit.aggregate({ where: { deletedAt: null, ...projectFilter }, _sum: { basePrice: true } }),
      this.prisma.booking.count({ where: { deletedAt: null, status: { not: 'CANCELLED' }, ...projectFilter } }),
      this.prisma.booking.count({ where: { deletedAt: null, bookingDate: { gte: monthStart }, ...projectFilter } }),
      this.prisma.booking.aggregate({ where: { deletedAt: null, status: { not: 'CANCELLED' }, ...projectFilter }, _sum: { totalPrice: true } }),
      this.prisma.booking.count({ where: { deletedAt: null, status: { in: ['RESERVED', 'PENDING_APPROVAL', 'AGREEMENT_PENDING'] }, ...projectFilter } }),
      this.prisma.lead.count({ where: { deletedAt: null, status: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] }, ...projectFilter } }),
      this.prisma.lead.count({ where: { deletedAt: null, ...projectFilter } }),
      this.prisma.lead.count({ where: { deletedAt: null, status: 'CONVERTED', ...projectFilter } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { deletedAt: null, ...projectFilter }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['source'], where: { deletedAt: null, ...projectFilter }, _count: { _all: true } }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({ where: { paidAt: { gte: monthStart }, status: 'SUCCESS', ...projectFilter }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESS', ...projectFilter }, _sum: { amount: true } }),
      this.prisma.paymentDemand.aggregate({ where: { status: { in: ['DUE', 'PARTIAL', 'OVERDUE'] }, ...projectFilter }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.paymentDemand.aggregate({ where: { status: 'OVERDUE', ...projectFilter }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.booking.findMany({
        where: { deletedAt: null, ...projectFilter },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { customer: { select: { firstName: true, lastName: true } }, unit: { select: { unitNumber: true } } },
      }),
      this.prisma.lead.findMany({
        where: { deletedAt: null, ...projectFilter },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, name: true, status: true, source: true, score: true, nextFollowUpAt: true, createdAt: true },
      }),
      this.prisma.constructionTask.groupBy({ by: ['status'], where: projectFilter, _count: { _all: true } }),
      this.prisma.constructionTask.findMany({
        where: { status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { lte: in14Days }, ...projectFilter },
        orderBy: { dueDate: 'asc' },
        take: 8,
        include: { project: { select: { name: true } } },
      }),
      this.prisma.booking.findMany({
        where: { deletedAt: null, bookingDate: { gte: twelveMonthsAgo }, status: { not: 'CANCELLED' }, ...projectFilter },
        select: { bookingDate: true, totalPrice: true },
      }),
      this.prisma.payment.findMany({
        where: { paidAt: { gte: twelveMonthsAgo }, status: 'SUCCESS', ...projectFilter },
        select: { paidAt: true, amount: true },
      }),
    ]);

    const outstanding = Number(outstandingAgg._sum.totalAmount ?? 0) - Number(outstandingAgg._sum.paidAmount ?? 0);
    const overdue = Number(overdueAgg._sum.totalAmount ?? 0) - Number(overdueAgg._sum.paidAmount ?? 0);
    const statusCount = (list: { status: string; count: number }[], s: string) => list.find((x) => x.status === s)?.count ?? 0;

    const months = lastMonths(12);
    const salesMap = new Map<string, { value: number; count: number }>();
    for (const b of bookingTrendRaw) {
      const k = monthKey(b.bookingDate);
      const e = salesMap.get(k) ?? { value: 0, count: 0 };
      e.value += Number(b.totalPrice);
      e.count += 1;
      salesMap.set(k, e);
    }
    const collectionsMap = new Map<string, number>();
    for (const p of paymentTrendRaw) {
      const k = monthKey(p.paidAt);
      collectionsMap.set(k, (collectionsMap.get(k) ?? 0) + Number(p.amount));
    }

    const salesTrend = months.map((m) => ({ month: m.label, key: m.key, ...(salesMap.get(m.key) ?? { value: 0, count: 0 }) }));
    const collectionsTrend = months.map((m) => ({ month: m.label, key: m.key, value: collectionsMap.get(m.key) ?? 0 }));

    const unitsByStatus = unitsByStatusRaw.map((u) => ({ status: u.status, count: u._count._all }));

    return {
      kpi: {
        projects,
        activeProjects,
        units,
        totalUnitValue: Number(unitValueAgg._sum.basePrice ?? 0),
        availableUnits: statusCount(unitsByStatus, 'AVAILABLE'),
        reservedUnits: statusCount(unitsByStatus, 'RESERVED'),
        bookedUnits: statusCount(unitsByStatus, 'BOOKED'),
        soldUnits: statusCount(unitsByStatus, 'SOLD'),
        onHoldUnits: statusCount(unitsByStatus, 'ON_HOLD'),
        bookingsTotal,
        bookingsThisMonth,
        pendingBookings,
        bookingsValue: Number(bookingsAgg._sum.totalPrice ?? 0),
        openLeads,
        leadsTotal,
        convertedLeads,
        leadConversionRate: leadsTotal ? Math.round((convertedLeads / leadsTotal) * 10000) / 100 : 0,
        customers,
        collectionsThisMonth: Number(collected._sum.amount ?? 0),
        collectionsTotal: Number(collectionsTotalAgg._sum.amount ?? 0),
        outstanding,
        overdue,
      },
      unitsByStatus,
      unitsByType: unitsByType.map((t) => ({ type: t.type, count: t._count._all, value: Number(t._sum.basePrice ?? 0) })),
      leadsByStatus: leadsByStatus.map((s) => ({ status: s.status, count: s._count._all })),
      leadsBySource: leadsBySource.map((s) => ({ source: s.source, count: s._count._all })),
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count._all })),
      salesTrend,
      collectionsTrend,
      recentBookings,
      recentLeads,
      upcomingTasks,
      // legacy flat fields (kept for compatibility)
      projects,
      units,
      bookings: { total: bookingsTotal, thisMonth: bookingsThisMonth },
      openLeads,
      customers,
      collectionsThisMonth: Number(collected._sum.amount ?? 0),
      outstanding,
    };
  }

  async sales(q: ReportQuery) {
    const where: any = { deletedAt: null };
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) where.bookingDate = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };

    const [byStatus, agg, byMonthRaw] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { totalPrice: true } }),
      this.prisma.booking.aggregate({ where, _count: { _all: true }, _sum: { totalPrice: true, discountAmount: true } }),
      this.prisma.booking.findMany({ where, select: { bookingDate: true, totalPrice: true }, orderBy: { bookingDate: 'asc' } }),
    ]);

    const byMonthMap = new Map<string, { count: number; value: number }>();
    for (const b of byMonthRaw) {
      const key = monthKey(b.bookingDate);
      const entry = byMonthMap.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(b.totalPrice);
      byMonthMap.set(key, entry);
    }

    return {
      totalBookings: agg._count._all,
      totalValue: Number(agg._sum.totalPrice ?? 0),
      totalDiscount: Number(agg._sum.discountAmount ?? 0),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all, value: Number(s._sum.totalPrice ?? 0) })),
      byMonth: [...byMonthMap.entries()].map(([month, v]) => ({ month, ...v })),
    };
  }

  async leads(q: ReportQuery) {
    const where: any = { deletedAt: null };
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };

    const [byStatus, bySource, total, converted] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['source'], where, _count: { _all: true } }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
    ]);

    return {
      total,
      converted,
      conversionRate: total ? Math.round((converted / total) * 10000) / 100 : 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      bySource: bySource.map((s) => ({ source: s.source, count: s._count._all })),
    };
  }

  async inventory(q: ReportQuery) {
    const where: any = { deletedAt: null };
    if (q.projectId) where.projectId = q.projectId;

    const [byStatus, byType, total, agg] = await Promise.all([
      this.prisma.unit.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.unit.groupBy({ by: ['type'], where, _count: { _all: true }, _sum: { basePrice: true } }),
      this.prisma.unit.count({ where }),
      this.prisma.unit.aggregate({ where, _sum: { basePrice: true } }),
    ]);

    return {
      total,
      totalValue: Number(agg._sum.basePrice ?? 0),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byType: byType.map((t) => ({ type: t.type, count: t._count._all, value: Number(t._sum.basePrice ?? 0) })),
    };
  }

  async construction(q: ReportQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    const reportWhere: any = {};
    if (q.projectId) reportWhere.projectId = q.projectId;
    if (q.from || q.to) reportWhere.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };

    const [tasksByStatus, tasksByPriority, milestonesByStatus, siteReports, inspections] = await Promise.all([
      this.prisma.constructionTask.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.constructionTask.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      this.prisma.projectMilestone.groupBy({ by: ['status'], where: q.projectId ? { projectId: q.projectId } : {}, _count: { _all: true } }),
      this.prisma.dailySiteReport.aggregate({ where: reportWhere, _count: { _all: true }, _avg: { progressPercent: true }, _sum: { manpowerCount: true } }),
      this.prisma.qualityInspection.groupBy({ by: ['result'], where: reportWhere.projectId ? { projectId: reportWhere.projectId } : {}, _count: { _all: true } }),
    ]);

    return {
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count._all })),
      tasksByPriority: tasksByPriority.map((t) => ({ priority: t.priority, count: t._count._all })),
      milestonesByStatus: milestonesByStatus.map((m) => ({ status: m.status, count: m._count._all })),
      siteReports: { count: siteReports._count._all, avgProgress: siteReports._avg.progressPercent ?? 0, totalManpower: siteReports._sum.manpowerCount ?? 0 },
      inspectionsByResult: inspections.map((i) => ({ result: i.result, count: i._count._all })),
    };
  }
}
