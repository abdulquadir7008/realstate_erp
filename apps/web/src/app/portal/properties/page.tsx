'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronRight, MapPin, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress, Skeleton } from '@/components/ui';

export default function PortalPropertiesPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['portal', 'properties'],
    queryFn: () => api<any[]>('/portal/properties'),
  });

  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>;
  if (!items?.length) {
    return <EmptyState icon={<Building2 className="h-5 w-5" />} title="No properties yet" description="Your booked units will appear here as soon as a booking is confirmed." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My property</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} booking{items.length > 1 ? 's' : ''} · tap a card for the full schedule</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((b: any) => (
          <button key={b.id} onClick={() => setOpenId(b.id)} className="text-left">
            <Card className="h-full transition hover:border-accent/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{b.project?.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {b.project?.city ?? '—'} · Unit {b.unit?.unitNumber} ({b.unit?.configuration})
                    </p>
                  </div>
                  <Badge tone={statusTone(b.status)}>{titleCase(b.status)}</Badge>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Payment progress</span>
                    <span className="font-semibold">{b.progress}%</span>
                  </div>
                  <Progress value={b.progress} tone={b.progress >= 60 ? 'success' : 'accent'} className="mt-1.5" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-sm font-semibold">{formatCurrency(Number(b.totalPrice ?? 0))}</p>
                    <p className="text-[11px] text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-sm font-semibold text-success">{formatCurrency(b.paid)}</p>
                    <p className="text-[11px] text-muted-foreground">Paid</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-sm font-semibold text-warning">{formatCurrency(b.outstanding)}</p>
                    <p className="text-[11px] text-muted-foreground">Balance</p>
                  </div>
                </div>
                <p className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-accent">
                  Details <ChevronRight className="h-3.5 w-3.5" />
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <AnimatePresence>{openId ? <BookingDrawer id={openId} onClose={() => setOpenId(null)} /> : null}</AnimatePresence>
    </div>
  );
}

function BookingDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: b, isLoading } = useQuery({
    queryKey: ['portal', 'booking', id],
    queryFn: () => api<any>(`/portal/bookings/${id}`),
    enabled: Boolean(id),
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">{b?.project?.name ?? 'Booking'}</h2>
            <p className="text-sm text-muted-foreground">
              {b ? `Unit ${b.unit?.unitNumber} · ${b.bookingNumber}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">
          {isLoading || !b ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge tone={statusTone(b.status)}>{titleCase(b.status)}</Badge>
                <span className="text-sm text-muted-foreground">Booked {relativeTime(b.bookingDate ?? b.createdAt)}</span>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment schedule</p>
                <div className="space-y-2">
                  {b.demands?.map((d: any) => {
                    const remaining = Number(d.totalAmount ?? 0) + Number(d.lateFee ?? 0) - Number(d.paidAmount ?? 0);
                    const overdue = d.status !== 'PAID' && new Date(d.dueDate) < new Date();
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.demandNumber} · due {new Date(d.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={d.status === 'PAID' ? 'text-sm font-semibold text-success' : overdue ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold'}>
                            {d.status === 'PAID' ? 'Paid' : formatCurrency(remaining)}
                          </p>
                          <Badge tone={statusTone(d.status)}>{titleCase(d.status)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {b.payments?.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments made</p>
                  <div className="space-y-2">
                    {b.payments.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()} · {titleCase(p.method ?? p.mode ?? '—')}</span>
                        <span className="font-semibold">{formatCurrency(Number(p.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {b.receipts?.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipts</p>
                  <div className="space-y-2">
                    {b.receipts.slice(0, 8).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2.5 text-sm">
                        <span>
                          {r.receiptNumber} · {new Date(r.issuedAt).toLocaleDateString()}
                        </span>
                        <span className="font-semibold">{formatCurrency(Number(r.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </motion.aside>
    </>
  );
}
