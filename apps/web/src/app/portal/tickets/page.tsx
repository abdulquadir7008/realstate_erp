'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareWarning, Plus, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import { relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, EmptyState, Input, Label, Select, Skeleton, Textarea } from '@/components/ui';

const CATEGORIES = ['COMPLAINT', 'SERVICE', 'MAINTENANCE', 'HANDOVER', 'WARRANTY', 'FEEDBACK', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function PortalTicketsPage() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'tickets'],
    queryFn: () => api<any>('/portal/tickets'),
  });

  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Raise a request and track responses from the team.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New ticket
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !data?.items?.length ? (
            <EmptyState icon={<MessageSquareWarning className="h-5 w-5" />} title="No tickets yet" description="Need help? Raise a ticket and our team will get back to you." />
          ) : (
            data.items.map((t: any) => (
              <button key={t.id} onClick={() => setOpenId(t.id)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3 text-left transition hover:border-accent/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.ticketNumber} · {titleCase(t.category)} · {relativeTime(t.createdAt)} · {t._count?.messages ?? 0} message(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'default'}>{titleCase(t.priority)}</Badge>
                  <Badge tone={statusTone(t.status)}>{titleCase(t.status)}</Badge>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {creating ? (
          <NewTicketModal
            onClose={() => setCreating(false)}
            onDone={() => {
              setCreating(false);
              qc.invalidateQueries({ queryKey: ['portal', 'tickets'] });
            }}
          />
        ) : null}
        {openId ? <TicketDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['portal', 'tickets'] })} /> : null}
      </AnimatePresence>
    </div>
  );
}

function NewTicketModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('SERVICE');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api<any>('/portal/tickets', { method: 'POST', body: JSON.stringify({ subject, description, category, priority }) }),
    onSuccess: onDone,
    onError: (e) => setError((e as Error).message),
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">New support ticket</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Water seepage in master bedroom" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1.5" placeholder="Describe the issue…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {titleCase(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {titleCase(p)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={subject.trim().length < 3}>
              Submit ticket
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [body, setBody] = useState('');
  const { data: t, isLoading } = useQuery({
    queryKey: ['portal', 'ticket', id],
    queryFn: () => api<any>(`/portal/tickets/${id}`),
    enabled: Boolean(id),
  });

  const send = useMutation({
    mutationFn: () => api<any>(`/portal/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setBody('');
      onChanged();
    },
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
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{t?.subject ?? 'Ticket'}</h2>
            <p className="text-sm text-muted-foreground">{t ? `${t.ticketNumber} · ${titleCase(t.category)}` : ''}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          {isLoading || !t ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(t.status)}>{titleCase(t.status)}</Badge>
                <Badge tone={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'default'}>{titleCase(t.priority)}</Badge>
                {t.slaDueAt ? <span className="text-xs text-muted-foreground">SLA by {new Date(t.slaDueAt).toLocaleString()}</span> : null}
              </div>

              <div className="space-y-3">
                {t.messages?.map((m: any) => (
                  <div key={m.id} className={m.authorRole === 'CUSTOMER' ? 'flex justify-end' : ''}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.authorRole === 'CUSTOMER' ? 'bg-primary text-primary-foreground' : 'border bg-card/60'}`}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{titleCase(m.authorRole ?? 'team')}</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className="mt-1.5 text-[11px] opacity-60">{relativeTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Write a reply…" className="min-h-[52px] resize-none" />
            <Button className="h-11" onClick={() => send.mutate()} loading={send.isPending} disabled={!body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
