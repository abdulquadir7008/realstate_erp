'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUpRight, Building2, CalendarClock, CheckCircle2, HardHat, Receipt, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress, Skeleton, StatCard } from '@/components/ui';

export default function PortalOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'overview'],
    queryFn: () => api<any>('/portal/overview'),
  });

  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  const { customer, bookings, value, schedule, payments, tickets, construction } = data;
  const latest = bookings.latest;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight">Hello {customer.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's the latest on your home.{' '}
          {customer.kycStatus && customer.kycStatus !== 'VERIFIED' ? (
            <span className="font-medium text-warning">KYC: {titleCase(customer.kycStatus)} — our team will reach out.</span>
          ) : (
            <span className="font-medium text-success">KYC verified.</span>
          )}
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active bookings" value={bookings.active} icon={<Building2 className="h-5 w-5" />} tone="accent" />
        <StatCard label="Total paid" value={formatCurrency(value.paid)} icon={<Wallet className="h-5 w-5" />} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(value.outstanding)} icon={<Receipt className="h-5 w-5" />} tone={value.outstanding > 0 ? 'warning' : 'default'} />
        <StatCard label="Construction progress" value={`${construction.progress}%`} icon={<HardHat className="h-5 w-5" />} tone="accent" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {latest ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Your latest booking</CardTitle>
              <Link href="/portal/properties" className="flex items-center gap-1 text-xs text-accent hover:underline">
                All properties <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {latest.project?.name} · Unit {latest.unit?.unitNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {latest.unit?.configuration} · {latest.unit?.building?.name ?? latest.unit?.type} · Booking {latest.bookingNumber}
                  </p>
                </div>
                <Badge tone={statusTone(latest.status)}>{titleCase(latest.status)}</Badge>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Payment progress</span>
                  <span className="font-semibold">{value.collectionRate}% of {formatCurrency(Number(latest.totalPrice ?? 0))}</span>
                </div>
                <Progress value={value.collectionRate} tone={value.collectionRate >= 60 ? 'success' : 'accent'} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="mt-0.5 text-sm font-semibold text-success">{formatCurrency(value.paid)}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                  <p className="mt-0.5 text-sm font-semibold text-warning">{formatCurrency(value.outstanding)}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Receipts</p>
                  <p className="mt-0.5 text-sm font-semibold">{payments.receipts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent" /> Next payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.nextDue ? (
                <div className={cn('rounded-xl border p-4', schedule.overdue ? 'border-destructive/30 bg-destructive/5' : 'bg-card/60')}>
                  <p className="text-sm font-medium">{schedule.nextDue.title}</p>
                  <p className="mt-1 text-2xl font-semibold">{formatCurrency(schedule.nextDue.amount)}</p>
                  <p className={cn('mt-1 text-xs', schedule.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    Due {new Date(schedule.nextDue.dueDate).toLocaleDateString()} {schedule.overdue ? '· overdue' : ''}
                  </p>
                  <Link href="/portal/payments" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                    View schedule <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" /> All payments are up to date.
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {schedule.paidDemands}/{schedule.totalDemands} installments paid
                </span>
                {schedule.overdue ? <Badge tone="danger">{schedule.overdue} overdue</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-accent" /> Construction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Overall progress</span>
                <span className="font-semibold">{construction.completed}/{construction.milestones} milestones</span>
              </div>
              <Progress value={construction.progress} className="mt-2" />
              <Link href="/portal/construction" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                Site updates <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Support tickets</p>
                <p className="text-xs text-muted-foreground">{tickets.open} open of {tickets.total}</p>
              </div>
              <Link href="/portal/tickets" className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition hover:border-accent/40">
                Open <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
