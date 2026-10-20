'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui';

interface DashboardData {
  projects: number;
  units: number;
  unitsByStatus: { status: string; count: number }[];
  bookings: { total: number; thisMonth: number };
  openLeads: number;
  customers: number;
  collectionsThisMonth: number;
  outstanding: number;
  recentBookings: any[];
  recentLeads: any[];
}

export function ReportsPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardData>('/reports/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading reports…</p>;

  const soldUnits = data.unitsByStatus.find((u) => u.status === 'SOLD')?.count ?? 0;
  const availableUnits = data.unitsByStatus.find((u) => u.status === 'AVAILABLE')?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Live business KPIs across your organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={formatNumber(data.projects)} hint={`${data.units} units`} />
        <StatCard label="Collections (month)" value={formatCurrency(data.collectionsThisMonth)} />
        <StatCard label="Outstanding" value={formatCurrency(data.outstanding)} hint="Dues & partials" />
        <StatCard label="Open Leads" value={formatNumber(data.openLeads)} hint={`${data.customers} customers`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings" value={formatNumber(data.bookings.total)} hint={`${data.bookings.thisMonth} this month`} />
        <StatCard label="Units Sold" value={formatNumber(soldUnits)} />
        <StatCard label="Units Available" value={formatNumber(availableUnits)} />
        <StatCard label="Customers" value={formatNumber(data.customers)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentBookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : null}
            {data.recentBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{b.bookingNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.customer?.firstName} {b.customer?.lastName} · Unit {b.unit?.unitNumber}
                  </p>
                </div>
                <Badge tone={b.status === 'CONFIRMED' ? 'success' : 'info'}>{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentLeads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : null}
            {data.recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.source}</p>
                </div>
                <Badge>{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
