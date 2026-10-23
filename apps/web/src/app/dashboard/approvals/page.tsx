'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '@/lib/api';
import { formatCurrency, formatNumber, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Segmented, StatCard, Textarea } from '@/components/ui';

type Tab = 'inbox' | 'mine' | 'all';

interface InstanceRow {
  id: string;
  title: string;
  entityType: string;
  entityId: string;
  status: string;
  amount?: string | number | null;
  currency?: string | null;
  createdAt: string;
  currentSequence?: number;
  workflow?: { code: string; name: string };
  steps?: { id: string; sequence: number; name: string; status: string; approverType: string }[];
  history?: { id: string; action: string; createdAt: string; actorId?: string | null; comment?: string | null }[];
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InstanceRow | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, data] = await Promise.all([
        api<any>('/approvals/dashboard'),
        tab === 'inbox'
          ? api<any>(`/approvals/inbox${qs({ limit: 50 })}`)
          : tab === 'mine'
            ? api<any>(`/approvals/my-requests${qs({ limit: 50 })}`)
            : api<any>(`/approvals/instances${qs({ limit: 50 })}`),
      ]);
      setStats(dashboard);
      setRows(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(row: InstanceRow) {
    setComment('');
    setSelected(row);
    try {
      const full = await api<InstanceRow>(`/approvals/instances/${row.id}`);
      setSelected(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approval');
    }
  }

  async function decide(action: 'approve' | 'reject' | 'return' | 'cancel') {
    if (!selected) return;
    if (action !== 'approve' && comment.trim().length < 2) {
      setError('Please enter a comment (at least 2 characters)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/approvals/instances/${selected.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });
      setSelected(null);
      setComment('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  }

  const actionable = selected?.steps?.some((step) => step.status === 'PENDING' && step.sequence === selected.currentSequence);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">Review purchase orders, requisitions, expenses, leave and over-budget commitments.</p>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inbox', label: 'My inbox' },
            { value: 'mine', label: 'My requests' },
            { value: 'all', label: 'All requests' },
          ]}
        />
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending for me" value={formatNumber(stats.pendingForMe ?? 0)} />
          <StatCard label="My pending requests" value={formatNumber(stats.myRequestsPending ?? 0)} />
          <StatCard label="Approved by me" value={formatNumber(stats.approvedByMe ?? 0)} />
          <StatCard label="Rejected by me" value={formatNumber(stats.rejectedByMe ?? 0)} />
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{formatNumber(total)} requests</CardTitle>
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState title="Nothing waiting" description="Approvals that need your decision will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Request</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Raised</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <button className="text-left font-medium hover:underline" onClick={() => open(row)}>
                        {row.title}
                      </button>
                      <div className="text-xs text-muted-foreground">{row.workflow?.name ?? row.entityType}</div>
                    </td>
                    <td className="px-5 py-3">{titleCase(row.entityType)}</td>
                    <td className="px-5 py-3">
                      {row.amount ? formatCurrency(Number(row.amount), row.currency ?? 'INR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{relativeTime(row.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => open(row)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {titleCase(selected.entityType)} · {selected.workflow?.name ?? 'Workflow'} · {relativeTime(selected.createdAt)}
                </p>
              </div>
              <Badge tone={statusTone(selected.status)}>{titleCase(selected.status)}</Badge>
            </div>

            {selected.amount ? (
              <p className="mt-4 text-2xl font-semibold">{formatCurrency(Number(selected.amount), selected.currency ?? 'INR')}</p>
            ) : null}

            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-medium">Approval steps</h3>
              {(selected.steps ?? []).map((step) => (
                <div key={step.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <span className="mr-2 text-muted-foreground">{step.sequence}.</span>
                    {step.name}
                    <span className="ml-2 text-xs text-muted-foreground">({titleCase(step.approverType)})</span>
                  </div>
                  <Badge tone={statusTone(step.status)}>{titleCase(step.status)}</Badge>
                </div>
              ))}
            </div>

            {(selected.history ?? []).length ? (
              <div className="mt-5 space-y-2">
                <h3 className="text-sm font-medium">History</h3>
                {(selected.history ?? []).map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{titleCase(entry.action)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</span>
                    {entry.comment ? <p className="mt-1 text-xs text-muted-foreground">{entry.comment}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {selected.status === 'PENDING' ? (
              <div className="mt-5 space-y-3">
                <Textarea
                  placeholder={actionable ? 'Optional comment' : 'Comment (required to reject or return)'}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  {tab === 'mine' ? (
                    <Button variant="outline" onClick={() => decide('cancel')} loading={busy}>
                      Cancel request
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => decide('return')} loading={busy}>
                    Return
                  </Button>
                  <Button variant="danger" onClick={() => decide('reject')} loading={busy}>
                    Reject
                  </Button>
                  <Button variant="success" onClick={() => decide('approve')} loading={busy}>
                    Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
