'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Banknote, Coins, Receipt, Wallet } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui';
import { BarsChart, Donut, CHART_COLORS } from '@/components/charts';
import { useWorkspace } from '@/components/shell/workspace';

const titleize = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinancePage() {
  const { projectId, currentProject } = useWorkspace();
  const query = qs({ projectId });
  const collections = useQuery({ queryKey: ['finance', 'collections', projectId], queryFn: () => api<any>(`/finance/reports/collections${query}`) });
  const outstanding = useQuery({ queryKey: ['finance', 'outstanding', projectId], queryFn: () => api<any>(`/finance/reports/outstanding${query}`) });

  const byMode = Object.entries(collections.data?.byMode ?? {}).map(([name, value]) => ({ name: titleize(name), value: Number(value) }));
  const byStatus = Object.entries(outstanding.data?.byStatus ?? {}).map(([name, value]) => ({ name: titleize(name), value: Number(value) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentProject ? `${currentProject.name} collections & receivables` : 'Collections, receivables and cash position'}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payments" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40">
            <ArrowUpRight className="h-4 w-4" /> Payments
          </Link>
          <Link href="/dashboard/demands" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40">
            <ArrowUpRight className="h-4 w-4" /> Demands
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collections (total)" value={formatCompactCurrency(collections.data?.total ?? 0)} icon={<Coins className="h-5 w-5" />} tone="success" hint={`${collections.data?.count ?? 0} receipts`} />
        <StatCard label="Outstanding" value={formatCompactCurrency(outstanding.data?.outstanding ?? 0)} icon={<Wallet className="h-5 w-5" />} tone="warning" hint={`${outstanding.data?.demandCount ?? 0} open demands`} />
        <StatCard label="Total demanded" value={formatCompactCurrency(outstanding.data?.totalDemanded ?? 0)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Collected vs demanded" value={formatCompactCurrency(outstanding.data?.totalPaid ?? 0)} icon={<Banknote className="h-5 w-5" />} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collections by mode</CardTitle>
          </CardHeader>
          <CardContent>
            {byMode.length ? <Donut data={byMode} colors={[CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[3], CHART_COLORS[4], CHART_COLORS[5]]} /> : <p className="py-10 text-center text-sm text-muted-foreground">No collections recorded yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outstanding by status</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus.length ? (
              <BarsChart data={byStatus} xKey="name" layout="vertical" valueFormatter={(v) => formatCompactCurrency(v)} series={[{ key: 'value', label: 'Outstanding', color: CHART_COLORS[6] }]} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nothing outstanding — great work.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Demanded" value={formatCurrency(outstanding.data?.totalDemanded ?? 0)} />
        <StatCard label="Paid" value={formatCurrency(outstanding.data?.totalPaid ?? 0)} tone="success" />
        <StatCard label="Balance receivable" value={formatCurrency(outstanding.data?.outstanding ?? 0)} tone="warning" />
      </div>
    </div>
  );
}
