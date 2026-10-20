'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarCheck, Coins, TrendingUp } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { formatCompactCurrency, formatNumber, statusTone } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, StatCard } from '@/components/ui';
import { BarsChart, TrendArea, CHART_COLORS } from '@/components/charts';
import { useWorkspace } from '@/components/shell/workspace';

const titleize = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function SalesPage() {
  const { projectId, currentProject } = useWorkspace();
  const query = qs({ projectId });
  const sales = useQuery({ queryKey: ['report', 'sales', projectId], queryFn: () => api<any>(`/reports/sales${query}`) });
  const dash = useQuery({ queryKey: ['dashboard', projectId ?? 'all'], queryFn: () => api<any>(`/reports/dashboard${query}`) });

  const k = dash.data?.kpi;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentProject ? `${currentProject.name} bookings & revenue` : 'Bookings and revenue performance'}.</p>
        </div>
        <Link href="/dashboard/bookings" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40">
          <ArrowUpRight className="h-4 w-4" /> Manage bookings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Booking value" value={formatCompactCurrency(sales.data?.totalValue ?? 0)} icon={<TrendingUp className="h-5 w-5" />} tone="accent" />
        <StatCard label="Bookings" value={formatNumber(sales.data?.totalBookings ?? 0)} icon={<CalendarCheck className="h-5 w-5" />} hint={`${k?.bookingsThisMonth ?? 0} this month`} />
        <StatCard label="Pending" value={formatNumber(k?.pendingBookings ?? 0)} tone="warning" hint="Awaiting confirmation" />
        <StatCard label="Discounts" value={formatCompactCurrency(sales.data?.totalDiscount ?? 0)} icon={<Coins className="h-5 w-5" />} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking value by month</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={(sales.data?.byMonth ?? []).map((m: any) => ({ month: m.month, value: m.value }))}
              xKey="month"
              valueFormatter={(v) => formatCompactCurrency(v)}
              series={[{ key: 'value', label: 'Booking value', color: CHART_COLORS[0] }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarsChart
              data={(sales.data?.byStatus ?? []).map((s: any) => ({ name: titleize(s.status), count: s.count }))}
              xKey="name"
              layout="vertical"
              series={[{ key: 'count', label: 'Bookings', color: CHART_COLORS[2] }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent bookings</CardTitle>
          <Link href="/dashboard/bookings" className="flex items-center gap-1 text-xs text-accent hover:underline">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {(dash.data?.recentBookings ?? []).length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings yet" />
          ) : (
            dash.data.recentBookings.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
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
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
