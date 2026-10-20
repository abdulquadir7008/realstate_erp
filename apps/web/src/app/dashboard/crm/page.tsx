'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, CalendarClock, KanbanSquare, Mail, Phone, Plus, Sparkles, Target, User, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { cn, formatCompactCurrency, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, EmptyState, Segmented, Skeleton, StatCard } from '@/components/ui';
import { useWorkspace } from '@/components/shell/workspace';

interface Lead {
  id: string;
  leadNumber: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source: string;
  status: string;
  score?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
  createdAt: string;
  lastActivityAt?: string | null;
}

const COLUMNS = [
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'SITE_VISIT', label: 'Site visit' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'LOST', label: 'Lost' },
] as const;

const COLUMN_TONE: Record<string, string> = {
  NEW: 'bg-info',
  CONTACTED: 'bg-accent',
  QUALIFIED: 'bg-[hsl(280_60%_62%)]',
  SITE_VISIT: 'bg-warning',
  NEGOTIATION: 'bg-[hsl(190_80%_45%)]',
  CONVERTED: 'bg-success',
  LOST: 'bg-destructive',
};

export default function CrmPage() {
  const { projectId, currentProject } = useWorkspace();
  const qc = useQueryClient();
  const [view, setView] = useState<'board' | 'insights'>('board');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', 'kanban', projectId ?? 'all'],
    queryFn: () => api<{ items: Lead[]; total: number }>(`/leads?limit=200${qs({ projectId })}`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', 'kanban'] }),
  });

  const leads = data?.items ?? [];
  const byStatus = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const c of COLUMNS) map.set(c.key, []);
    for (const l of leads) map.get(l.status)?.push(l);
    return map;
  }, [leads]);

  const open = leads.filter((l) => !['CONVERTED', 'LOST', 'UNQUALIFIED'].includes(l.status)).length;
  const hot = leads.filter((l) => (l.score ?? 0) >= 70 && !['CONVERTED', 'LOST'].includes(l.status)).length;
  const overdue = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() < Date.now() && !['CONVERTED', 'LOST'].includes(l.status)).length;
  const converted = leads.filter((l) => l.status === 'CONVERTED').length;
  const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;

  function onDrop(targetStatus: string) {
    setDragOver(null);
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || lead.status === targetStatus) return;
    updateStatus.mutate({ id: lead.id, status: targetStatus });
  }

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentProject ? `${currentProject.name} leads · drag cards to update status` : 'Drag-and-drop lead pipeline · click a card for details'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board' },
              { value: 'insights', label: 'AI insights' },
            ]}
          />
          <Link href="/dashboard/leads" className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40">
            <Plus className="h-4 w-4" /> Lead master
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open pipeline" value={open} icon={<KanbanSquare className="h-5 w-5" />} tone="accent" />
        <StatCard label="Hot leads (score ≥ 70)" value={hot} icon={<Sparkles className="h-5 w-5" />} tone="warning" />
        <StatCard label="Overdue follow-ups" value={overdue} icon={<CalendarClock className="h-5 w-5" />} tone="danger" />
        <StatCard label="Conversion rate" value={`${conversionRate}%`} icon={<Target className="h-5 w-5" />} tone="success" />
      </div>

      {view === 'insights' ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Open the <Link href="/dashboard/ai" className="font-medium text-accent hover:underline">AI Command Center → Lead intelligence</Link> tab for AI-scored conversion
          probabilities, priorities and suggested messages for every open lead.
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-thin">
          {isLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-72 shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex min-w-max gap-3">
              {COLUMNS.map((col) => {
                const items = byStatus.get(col.key) ?? [];
                return (
                  <div
                    key={col.key}
                    className={cn(
                      'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition',
                      dragOver === col.key && 'border-accent/60 bg-accent/5 ring-2 ring-accent/30',
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(col.key);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => onDrop(col.key)}
                  >
                    <div className="flex items-center justify-between gap-2 border-b bg-card/60 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', COLUMN_TONE[col.key] ?? 'bg-muted-foreground')} />
                        <p className="text-sm font-semibold">{col.label}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{items.length}</span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 24rem)', minHeight: 200 }}>
                      {items.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop leads here</p>
                      ) : (
                        items.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            dragging={dragId === lead.id}
                            onClick={() => setSelectedId(lead.id)}
                            onDragStart={() => setDragId(lead.id)}
                            onDragEnd={() => setDragId(null)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selected ? <LeadDrawer lead={selected} onClose={() => setSelectedId(null)} onStatus={(s) => updateStatus.mutate({ id: selected.id, status: s })} updating={updateStatus.isPending} /> : null}
      </AnimatePresence>
    </div>
  );
}

function LeadCard({ lead, dragging, onClick, onDragStart, onDragEnd }: { lead: Lead; dragging: boolean; onClick: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const overdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now();
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 shadow-sm transition hover:border-accent/40 hover:shadow active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight">{lead.name}</p>
        {(lead.score ?? 0) > 0 ? (
          <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', (lead.score ?? 0) >= 70 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground')}>
            {lead.score}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{lead.leadNumber} · {titleCase(lead.source)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.budgetMax ? <Badge tone="outline">{formatCompactCurrency(lead.budgetMax)}</Badge> : null}
        {overdue ? <Badge tone="danger">Follow-up overdue</Badge> : null}
        {lead.nextFollowUpAt && !overdue ? (
          <span className="text-[11px] text-muted-foreground">next {relativeTime(lead.nextFollowUpAt)}</span>
        ) : null}
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose, onStatus, updating }: { lead: Lead; onClose: () => void; onStatus: (status: string) => void; updating: boolean }) {
  const { data: full, isLoading } = useQuery({
    queryKey: ['lead', lead.id],
    queryFn: () => api<any>(`/leads/${lead.id}`),
    enabled: Boolean(lead.id),
  });

  const nextStatus = COLUMNS.filter((c) => c.key !== lead.status && !['CONVERTED', 'LOST'].includes(c.key));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{lead.name}</h2>
              <Badge tone={statusTone(lead.status)}>{titleCase(lead.status)}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{lead.leadNumber} · {titleCase(lead.source)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          {isLoading || !full ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {full.phone ? (
                  <a href={`tel:${full.phone}`} className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2.5 transition hover:border-accent/40">
                    <Phone className="h-4 w-4 text-accent" /> {full.phone}
                  </a>
                ) : null}
                {full.email ? (
                  <a href={`mailto:${full.email}`} className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2.5 transition hover:border-accent/40">
                    <Mail className="h-4 w-4 text-accent" /> <span className="truncate">{full.email}</span>
                  </a>
                ) : null}
                {full.budgetMin || full.budgetMax ? (
                  <div className="col-span-2 rounded-lg border bg-card/60 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-medium">
                      {full.budgetMin ? formatCompactCurrency(full.budgetMin) : '—'} – {full.budgetMax ? formatCompactCurrency(full.budgetMax) : '—'}
                    </p>
                  </div>
                ) : null}
                {full.nextFollowUpAt ? (
                  <div className="col-span-2 flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2.5">
                    <CalendarClock className="h-4 w-4 text-warning" />
                    <span className={cn('text-sm', new Date(full.nextFollowUpAt).getTime() < Date.now() ? 'font-medium text-destructive' : '')}>
                      Follow-up {relativeTime(full.nextFollowUpAt)}
                    </span>
                  </div>
                ) : null}
              </div>

              {full.notes ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-foreground/90">{full.notes}</div>
              ) : null}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move to</p>
                <div className="flex flex-wrap gap-1.5">
                  {nextStatus.map((c) => (
                    <Button key={c.key} size="sm" variant="subtle" disabled={updating} onClick={() => onStatus(c.key)}>
                      {c.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Activity timeline
                </p>
                <div className="space-y-2">
                  {(full.activities ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity logged yet.</p>
                  ) : (
                    full.activities.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="rounded-lg border bg-card/50 px-3 py-2">
                        <p className="text-xs font-medium">{titleCase(a.type)}</p>
                        <p className="mt-0.5 text-sm text-foreground/80">{a.content}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(a.occurredAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Link href="/dashboard/ai" className="flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10">
                <Sparkles className="h-4 w-4" /> Open AI lead intelligence
              </Link>
            </>
          )}
        </div>
      </motion.aside>
    </>
  );
}
