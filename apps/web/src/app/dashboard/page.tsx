'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Coins,
  HardHat,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { api, qs } from '@/lib/api';
import { formatCompactCurrency, formatCurrency, formatNumber, relativeTime, statusTone } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, StatCard } from '@/components/ui';
import { BarsChart, ChartLegend, Donut, TrendArea, CHART_COLORS } from '@/components/charts';
import { useWorkspace } from '@/components/shell/workspace';

interface DashboardData {
  kpi: {
    projects: number;
    activeProjects: number;
    units: number;
    totalUnitValue: number;
    availableUnits: number;
    reservedUnits: number;
    bookedUnits: number;
    soldUnits: number;
    onHoldUnits: number;
    bookingsTotal: number;
    bookingsThisMonth: number;
    pendingBookings: number;
    bookingsValue: number;
    openLeads: number;
    leadsTotal: number;
    convertedLeads: number;
    leadConversionRate: number;
    customers: number;
    collectionsThisMonth: number;
    collectionsTotal: number;
    outstanding: number;
    overdue: number;
  };
  unitsByStatus: { status: string; count: number }[];
  unitsByType: { type: string; count: number; value: number }[];
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  salesTrend: { month: string; value: number; count: number }[];
  collectionsTrend: { month: string; value: number }[];
  tasksByStatus: { status: string; count: number }[];
  recentBookings: any[];
  recentLeads: any[];
  upcomingTasks: any[];
}

function titleize(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const { projectId, currentProject } = useWorkspace();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', projectId ?? 'all'],
    queryFn: () => api<DashboardData>(`/reports/dashboard${qs({ projectId })}`),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const k = data.kpi;
  const trend = Array.isArray(data?.salesTrend) ? data.salesTrend.map((s, i) => ({ month: s.month, sales: s.value, collections: Array.isArray(data?.collectionsTrend) ? data.collectionsTrend[i]?.value ?? 0 : 0 })) : [];
  const unitsDonut = Array.isArray(data?.unitsByStatus) ? data.unitsByStatus.filter((u) => u.count > 0).map((u) => ({ name: titleize(u.status), value: u.count })) : [];
  const sourceDonut = Array.isArray(data?.leadsBySource) ? data.leadsBySource.filter((s) => s.count > 0).map((s) => ({ name: titleize(s.source), value: s.count })) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentProject ? `Performance for ${currentProject.name}` : 'Live performance across your organization'}.
          </p>
        </div>
        <Link href="/dashboard/ai" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40">
          <Sparkles className="h-4 w-4 text-accent" /> Ask the AI assistant
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collections (MTD)" value={formatCurrency(k.collectionsThisMonth)} icon={<Coins className="h-5 w-5" />} tone="success" hint={`${formatCompactCurrency(k.collectionsTotal)} lifetime`} />
        <StatCard label="Outstanding" value={formatCurrency(k.outstanding)} icon={<Wallet className="h-5 w-5" />} tone="warning" hint={`${formatCurrency(k.overdue)} overdue`} />
        <StatCard label="Booking value" value={formatCompactCurrency(k.bookingsValue)} icon={<CalendarCheck className="h-5 w-5" />} tone="accent" hint={`${formatNumber(k.bookingsTotal)} bookings`} />
        <StatCard label="Open leads" value={formatNumber(k.openLeads)} icon={<TrendingUp className="h-5 w-5" />} tone="default" hint={`${k.leadConversionRate}% conversion`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={formatNumber(k.activeProjects)} icon={<Building2 className="h-5 w-5" />} hint={`${k.projects} total`} />
        <StatCard label="Units sold" value={formatNumber(k.soldUnits)} icon={<Layers className="h-5 w-5" />} hint={`${k.availableUnits} available`} />
        <StatCard label="Pending bookings" value={formatNumber(k.pendingBookings)} icon={<CalendarCheck className="h-5 w-5" />} hint={`${k.bookingsThisMonth} this month`} />
        <StatCard label="Customers" value={formatNumber(k.customers)} icon={<Users className="h-5 w-5" />} hint={`${formatNumber(k.leadsTotal)} leads`} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Revenue &amp; collections</CardTitle>
            <p className="text-sm text-muted-foreground">Last 12 months — booking value vs. cash collected.</p>
          </div>
          <ChartLegend items={[{ name: 'Sales', color: CHART_COLORS[0] }, { name: 'Collections', color: CHART_COLORS[1] }]} />
        </CardHeader>
        <CardContent>
          <TrendArea
            data={trend}
            xKey="month"
            valueFormatter={(v) => formatCompactCurrency(v)}
            series={[
              { key: 'sales', label: 'Sales', color: CHART_COLORS[0] },
              { key: 'collections', label: 'Collections', color: CHART_COLORS[1] },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Inventory status</CardTitle>
          </CardHeader>
          <CardContent>
            {unitsDonut.length ? (
              <>
                <Donut data={unitsDonut} />
                <div className="mt-2 space-y-1.5">
                  {data.unitsByStatus.filter((u) => u.count > 0).map((u, i) => (
                    <div key={u.status} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {titleize(u.status)}
                      </span>
                      <span className="font-medium">{formatNumber(u.count)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<Layers className="h-5 w-5" />} title="No inventory yet" description="Add projects and units to see the breakdown." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceDonut.length ? (
              <>
                <Donut data={sourceDonut} colors={[CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[3], CHART_COLORS[4], CHART_COLORS[5]]} />
                <div className="mt-2 space-y-1.5">
                  {data.leadsBySource.filter((s) => s.count > 0).map((s, i) => (
                    <div key={s.source} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: [CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[3], CHART_COLORS[4], CHART_COLORS[5]][i % 5] }} />
                        {titleize(s.source)}
                      </span>
                      <span className="font-medium">{formatNumber(s.count)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No leads yet" description="Capture leads from the CRM to see source attribution." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {data.unitsByType.length ? (
              <BarsChart
                data={data.unitsByType.map((t) => ({ name: titleize(t.type), count: t.count }))}
                xKey="name"
                layout="vertical"
                series={[{ key: 'count', label: 'Units', color: CHART_COLORS[2] }]}
              />
            ) : (
              <EmptyState icon={<Building2 className="h-5 w-5" />} title="No units yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent bookings</CardTitle>
            <Link href="/dashboard/bookings" className="flex items-center gap-1 text-xs text-accent hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentBookings.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings yet" />
            ) : (
              data.recentBookings.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.bookingNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.customer?.firstName} {b.customer?.lastName} · Unit {b.unit?.unitNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm font-medium sm:block">{formatCompactCurrency(Number(b.totalPrice ?? 0))}</span>
                    <Badge tone={statusTone(b.status)}>{titleize(b.status)}</Badge>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming tasks</CardTitle>
            <Link href="/dashboard/tasks" className="flex items-center gap-1 text-xs text-accent hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingTasks.length === 0 ? (
              <EmptyState icon={<HardHat className="h-5 w-5" />} title="Nothing due soon" />
            ) : (
              data.upcomingTasks.map((t) => (
                <div key={t.id} className="rounded-lg border bg-card/50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <Badge tone={statusTone(t.priority)}>{t.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.project?.name} · due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent leads</CardTitle>
          <Link href="/dashboard/crm" className="flex items-center gap-1 text-xs text-accent hover:underline">
            Open CRM <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {data.recentLeads.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No leads yet" />
          ) : (
            data.recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card/50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {titleize(l.source)} · {relativeTime(l.createdAt)}
                  </p>
                </div>
                <Badge tone={statusTone(l.status)}>{titleize(l.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
    </div>
  );
}
