'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, HardHat, Layers, TrendingUp, Users } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { formatCompactCurrency, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui';
import { BarsChart, Donut, TrendArea, CHART_COLORS } from '@/components/charts';
import { useWorkspace } from '@/components/shell/workspace';

const titleize = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AnalyticsPage() {
  const { projectId, currentProject } = useWorkspace();
  const query = qs({ projectId });

  const sales = useQuery({ queryKey: ['report', 'sales', projectId], queryFn: () => api<any>(`/reports/sales${query}`) });
  const leads = useQuery({ queryKey: ['report', 'leads', projectId], queryFn: () => api<any>(`/reports/leads${query}`) });
  const inventory = useQuery({ queryKey: ['report', 'inventory', projectId], queryFn: () => api<any>(`/reports/inventory${query}`) });
  const construction = useQuery({ queryKey: ['report', 'construction', projectId], queryFn: () => api<any>(`/reports/construction${query}`) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">{currentProject ? `${currentProject.name} analytics` : 'Organization-wide analytics across sales, CRM, inventory and construction'}.</p>
      </div>

      {/* Sales */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Sales
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Bookings" value={formatNumber(sales.data?.totalBookings ?? 0)} icon={<TrendingUp className="h-5 w-5" />} tone="accent" />
          <StatCard label="Booking value" value={formatCompactCurrency(sales.data?.totalValue ?? 0)} />
          <StatCard label="Discounts given" value={formatCompactCurrency(sales.data?.totalDiscount ?? 0)} tone="warning" />
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
      </section>

      {/* Leads */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4" /> CRM &amp; leads
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total leads" value={formatNumber(leads.data?.total ?? 0)} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Converted" value={formatNumber(leads.data?.converted ?? 0)} tone="success" />
          <StatCard label="Conversion rate" value={`${leads.data?.conversionRate ?? 0}%`} tone="accent" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads by status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart
                data={(leads.data?.byStatus ?? []).map((s: any) => ({ name: titleize(s.status), count: s.count }))}
                xKey="name"
                layout="vertical"
                series={[{ key: 'count', label: 'Leads', color: CHART_COLORS[1] }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Leads by source</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={(leads.data?.bySource ?? []).filter((s: any) => s.count > 0).map((s: any) => ({ name: titleize(s.source), value: s.count }))} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Inventory */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="h-4 w-4" /> Inventory
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total units" value={formatNumber(inventory.data?.total ?? 0)} icon={<Layers className="h-5 w-5" />} />
          <StatCard label="Inventory value" value={formatCompactCurrency(inventory.data?.totalValue ?? 0)} tone="accent" />
          <StatCard label="Available" value={formatNumber(inventory.data?.byStatus?.find((s: any) => s.status === 'AVAILABLE')?.count ?? 0)} tone="success" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Units by status</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={(inventory.data?.byStatus ?? []).filter((s: any) => s.count > 0).map((s: any) => ({ name: titleize(s.status), value: s.count }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Units by type</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart
                data={(inventory.data?.byType ?? []).map((t: any) => ({ name: titleize(t.type), count: t.count }))}
                xKey="name"
                series={[{ key: 'count', label: 'Units', color: CHART_COLORS[3] }]}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Construction */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <HardHat className="h-4 w-4" /> Construction
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Avg. site progress" value={`${Math.round(construction.data?.siteReports?.avgProgress ?? 0)}%`} icon={<HardHat className="h-5 w-5" />} tone="accent" />
          <StatCard label="Site reports" value={formatNumber(construction.data?.siteReports?.count ?? 0)} />
          <StatCard label="Total manpower (reported)" value={formatNumber(construction.data?.siteReports?.totalManpower ?? 0)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tasks by status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart
                data={(construction.data?.tasksByStatus ?? []).map((s: any) => ({ name: titleize(s.status), count: s.count }))}
                xKey="name"
                layout="vertical"
                series={[{ key: 'count', label: 'Tasks', color: CHART_COLORS[4] }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Milestones by status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarsChart
                data={(construction.data?.milestonesByStatus ?? []).map((s: any) => ({ name: titleize(s.status), count: s.count }))}
                xKey="name"
                layout="vertical"
                series={[{ key: 'count', label: 'Milestones', color: CHART_COLORS[2] }]}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" /> Data is live from your organization.
      </p>
    </div>
  );
}
