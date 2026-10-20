'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress, Skeleton } from '@/components/ui';

type Tab = 'schedule' | 'payments' | 'invoices';

export default function PortalPaymentsPage() {
  const [tab, setTab] = useState<Tab>('schedule');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments &amp; dues</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your installment schedule, payment history, receipts and invoices.</p>
      </div>

      <div className="flex gap-1 rounded-xl border bg-card p-1">
        {(
          [
            { value: 'schedule', label: 'Schedule' },
            { value: 'payments', label: 'Payments & receipts' },
            { value: 'invoices', label: 'Invoices' },
          ] as { value: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn('rounded-lg px-3.5 py-2 text-sm font-medium transition', tab === t.value ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? <ScheduleTab /> : null}
      {tab === 'payments' ? <PaymentsTab /> : null}
      {tab === 'invoices' ? <InvoicesTab /> : null}
    </div>
  );
}

function ScheduleTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'schedule'],
    queryFn: () => api<any>('/portal/schedule'),
  });
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const { items, summary } = data;
  const rate = summary.total ? Math.round((summary.paid / summary.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total schedule</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.total)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid</p>
            <p className="mt-1 text-xl font-semibold text-success">{formatCurrency(summary.paid)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
            <p className="mt-1 text-xl font-semibold text-warning">{formatCurrency(summary.balance)}</p>
          </div>
          <div className="sm:col-span-3">
            <Progress value={rate} tone={rate >= 60 ? 'success' : 'accent'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <EmptyState icon={<Wallet className="h-5 w-5" />} title="No schedule yet" description="Your payment plan appears here once a booking is confirmed." />
          ) : (
            items.map((d: any) => {
              const remaining = Number(d.totalAmount ?? 0) + Number(d.lateFee ?? 0) - Number(d.paidAmount ?? 0);
              const overdue = d.status !== 'PAID' && new Date(d.dueDate) < new Date();
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {d.title} <span className="text-xs text-muted-foreground">· {d.demandNumber}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Booking {d.booking?.bookingNumber} · due {new Date(d.dueDate).toLocaleDateString()}
                      {overdue ? ' · overdue' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{d.status === 'PAID' ? formatCurrency(Number(d.totalAmount)) : formatCurrency(remaining)}</p>
                      <p className="text-[11px] text-muted-foreground">{d.status === 'PAID' ? 'settled' : 'remaining'}</p>
                    </div>
                    <Badge tone={overdue ? 'danger' : statusTone(d.status)}>{titleCase(d.status)}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'payments'],
    queryFn: () => api<any>('/portal/payments'),
  });
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" /> Payments ({data.payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.payments.length === 0 ? (
            <EmptyState icon={<Wallet className="h-5 w-5" />} title="No payments yet" />
          ) : (
            data.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.paidAt).toLocaleDateString()} · {p.booking?.bookingNumber} · {titleCase(p.method ?? p.mode ?? '—')}
                  </p>
                </div>
                <Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" /> Receipts ({data.receipts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.receipts.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No receipts yet" />
          ) : (
            data.receipts.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.receiptNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.issuedAt).toLocaleDateString()} · {r.booking?.bookingNumber}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(Number(r.amount))}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => api<any>('/portal/invoices'),
  });
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!data?.items || data.items.length === 0) ? (
          <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices yet" description="Tax invoices appear here when generated by the finance team." />
        ) : (
          data.items.map((inv: any) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {inv.invoiceNumber} · {formatCurrency(Number(inv.total))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.demand?.title} · issued {relativeTime(inv.issueDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? <Badge tone="danger">Overdue</Badge> : null}
                <Badge tone={statusTone(inv.status)}>{titleCase(inv.status)}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
