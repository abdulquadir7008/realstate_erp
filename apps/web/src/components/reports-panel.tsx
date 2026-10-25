'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui';

export function ReportsPanel() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<any>('/reports/dashboard')
      .then((d) => setData(d ?? null))
      .catch((e) => setError(e?.message ?? 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading reports...</p>;

  const k = data.kpi ?? data;
  const unitsByStatus = Array.isArray(data.unitsByStatus) ? data.unitsByStatus : [];
  const soldUnits = unitsByStatus.find((u: any) => u?.status === 'SOLD')?.count ?? 0;
  const availableUnits = unitsByStatus.find((u: any) => u?.status === 'AVAILABLE')?.count ?? 0;
  const projects = k?.projects ?? 0;
  const units = k?.units ?? data.units ?? 0;
  const bookingsTotal = k?.bookingsTotal ?? data.bookings?.total ?? 0;
  const bookingsThisMonth = k?.bookingsThisMonth ?? data.bookings?.thisMonth ?? 0;
  const openLeads = k?.openLeads ?? data.openLeads ?? 0;
  const customers = k?.customers ?? data.customers ?? 0;
  const collectionsThisMonth = k?.collectionsThisMonth ?? data.collectionsThisMonth ?? 0;
  const outstanding = k?.outstanding ?? data.outstanding ?? 0;
  const recentBookings = Array.isArray(data.recentBookings) ? data.recentBookings : [];
  const recentLeads = Array.isArray(data.recentLeads) ? data.recentLeads : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Live business KPIs across your organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={formatNumber(projects)} hint={`${units} units`} />
        <StatCard label="Collections (month)" value={formatCurrency(collectionsThisMonth)} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} hint="Dues & partials" />
        <StatCard label="Open Leads" value={formatNumber(openLeads)} hint={`${customers} customers`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings" value={formatNumber(bookingsTotal)} hint={`${bookingsThisMonth} this month`} />
        <StatCard label="Units Sold" value={formatNumber(soldUnits)} />
        <StatCard label="Units Available" value={formatNumber(availableUnits)} />
        <StatCard label="Customers" value={formatNumber(customers)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : null}
            {recentBookings.map((b: any) => (
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
            {recentLeads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : null}
            {recentLeads.map((l: any) => (
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
