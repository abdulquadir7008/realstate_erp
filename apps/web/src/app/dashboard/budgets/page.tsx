'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, can, getUser, qs } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress, StatCard, Textarea } from '@/components/ui';

interface BudgetRow {
  id: string;
  code: string;
  name: string;
  status: string;
  currency: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  totalPlanned: string | number;
  totalCommitted: string | number;
  totalActual: string | number;
  totalForecast: string | number;
  contingency: string | number;
  _count?: { lines: number; revisions: number; commitments: number };
}

interface BudgetDetail {
  summary: any;
  drilldown: any;
  revisions: any[];
  commitments: any[];
  alerts: any[];
}

export default function BudgetsPage() {
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => setUser(getUser()), []);
  const canApprove = can(user, 'budget:approve');
  const canUpdate = can(user, 'budget:update');

  const [dashboard, setDashboard] = useState<any>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BudgetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revisionComment, setRevisionComment] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, budgetData, alertData] = await Promise.all([
        api<any>('/budgets/dashboard'),
        api<any>(`/budgets${qs({ limit: 100 })}`),
        api<any>(`/budget-alerts${qs({ limit: 10, isResolved: 'false' })}`),
      ]);
      setDashboard(dashboardData);
      setBudgets(budgetData?.items ?? []);
      setAlerts(alertData?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(async (budgetId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const [summary, drilldown, revisions, commitments, budgetAlerts] = await Promise.all([
        api<any>(`/budgets/${budgetId}/summary`),
        api<any>(`/budgets/${budgetId}/drilldown`),
        api<any>(`/budgets/${budgetId}/revisions`),
        api<any>(`/budget-commitments${qs({ budgetId, limit: 100 })}`),
        api<any>(`/budget-alerts${qs({ budgetId, limit: 100 })}`),
      ]);
      setSelected({
        summary,
        drilldown,
        revisions: Array.isArray(revisions) ? revisions : (revisions?.items ?? []),
        commitments: commitments?.items ?? [],
        alerts: budgetAlerts?.items ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function openBudget(row: BudgetRow) {
    await loadDetail(row.id);
  }

  async function refreshSelected() {
    const budgetId = selected?.summary?.budget?.id;
    if (budgetId) await loadDetail(budgetId);
    await load();
  }

  async function budgetAction(action: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/budgets/${selected.summary.budget.id}/${action}`, { method: 'POST' });
      await refreshSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function revisionAction(id: string, action: 'submit' | 'approve' | 'reject' | 'cancel') {
    setBusy(true);
    setError(null);
    try {
      await api(`/budget-revisions/${id}/${action}`, {
        method: 'POST',
        body: action === 'reject' ? JSON.stringify({ comment: revisionComment[id] ?? '' }) : undefined,
      });
      await refreshSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revision action failed');
    } finally {
      setBusy(false);
    }
  }

  async function resolveAlert(id: string) {
    setBusy(true);
    try {
      await api(`/budget-alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolved: true }) });
      await refreshSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve alert');
    } finally {
      setBusy(false);
    }
  }

  const totals = dashboard?.totals;
  const currency = 'INR';

  if (selected) {
    const summary = selected.summary;
    const budget = summary.budget;
    const drilldown = selected.drilldown;
    const groups = drilldown?.byWbs ?? [];
    const showRevisions = selected.revisions.filter((revision: any) => revision.status !== 'CANCELLED');

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button className="text-sm text-muted-foreground hover:underline" onClick={() => setSelected(null)}>
              ← All budgets
            </button>
            <h1 className="text-2xl font-semibold">
              {budget.code} · {budget.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {summary.budget.project?.name ?? 'Project'} · {titleCase(budget.status)} ·{' '}
              {budget.baselineDate ? `Baseline ${new Date(budget.baselineDate).toLocaleDateString()}` : 'No baseline yet'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(budget.status)}>{titleCase(budget.status)}</Badge>
            {canUpdate && ['DRAFT', 'REJECTED'].includes(budget.status) ? (
              <Button size="sm" onClick={() => budgetAction('submit')} loading={busy}>
                Submit for approval
              </Button>
            ) : null}
            {canApprove && budget.status === 'PENDING_APPROVAL' ? (
              <Button size="sm" variant="success" onClick={() => budgetAction('activate')} loading={busy}>
                Activate
              </Button>
            ) : null}
            {canApprove && budget.status === 'ACTIVE' ? (
              <Button size="sm" variant="outline" onClick={() => budgetAction('lock')} loading={busy}>
                Lock budget
              </Button>
            ) : null}
            {canApprove && budget.status === 'LOCKED' ? (
              <Button size="sm" variant="outline" onClick={() => budgetAction('unlock')} loading={busy}>
                Unlock
              </Button>
            ) : null}
          </div>
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}

        {detailLoading ? (
          <p className="text-sm text-muted-foreground">Loading budget…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Planned" value={formatCurrency(summary.totals.planned, currency)} hint={`Contingency ${formatCurrency(summary.totals.contingency, currency)}`} />
              <StatCard label="Committed" value={formatCurrency(summary.totals.committed, currency)} tone="warning" />
              <StatCard label="Actual" value={formatCurrency(summary.totals.actual, currency)} tone="accent" />
              <StatCard
                label="Available"
                value={formatCurrency(summary.totals.available, currency)}
                tone={summary.totals.available < 0 ? 'danger' : 'success'}
                hint={`Variance ${formatCurrency(summary.totals.variance, currency)}`}
              />
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Utilisation</CardTitle>
                <span className="text-sm text-muted-foreground">{formatPercent(summary.totals.utilization)}</span>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(summary.totals.utilization, 100)}
                  tone={summary.totals.utilization >= 100 ? 'danger' : summary.totals.utilization >= 80 ? 'warning' : 'success'}
                />
                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Cost to complete</p>
                    <p className="font-medium">{formatCurrency(summary.totals.costToComplete, currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Forecast</p>
                    <p className="font-medium">{formatCurrency(summary.totals.forecast, currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance %</p>
                    <p className="font-medium">{formatPercent(summary.totals.variancePercent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost head breakdown</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Cost head</th>
                      <th className="px-5 py-3 font-medium">Planned</th>
                      <th className="px-5 py-3 font-medium">Committed</th>
                      <th className="px-5 py-3 font-medium">Actual</th>
                      <th className="px-5 py-3 font-medium">Variance</th>
                      <th className="px-5 py-3 font-medium">Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.byCostHead ?? []).map((row: any) => (
                      <tr key={row.costHeadId} className="border-b last:border-0">
                        <td className="px-5 py-3">{row.costHeadId}</td>
                        <td className="px-5 py-3">{formatCurrency(row.planned, currency)}</td>
                        <td className="px-5 py-3">{formatCurrency(row.committed, currency)}</td>
                        <td className="px-5 py-3">{formatCurrency(row.actual, currency)}</td>
                        <td className="px-5 py-3">{formatCurrency(row.variance, currency)}</td>
                        <td className="px-5 py-3">{formatPercent(row.utilization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WBS / BOQ drill-down</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No budget lines linked to WBS or BOQ.</p>
                ) : (
                  groups.map((group: any, index: number) => (
                    <details key={`${group.wbsId ?? 'na'}-${group.wbsItemId ?? index}`} className="rounded-lg border" open={index === 0}>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                        <span className="font-medium">
                          {group.wbs ? `${group.wbs.code} · ${group.wbs.name}` : 'Unassigned WBS'}
                          {group.wbsItem ? ` → ${group.wbsItem.code ?? ''} ${group.wbsItem.name ?? ''}` : ''}
                        </span>
                        <span className="text-muted-foreground">
                          Planned {formatCurrency(group.totals.planned, currency)} · Committed {formatCurrency(group.totals.committed, currency)}
                        </span>
                      </summary>
                      <div className="overflow-x-auto border-t">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="px-4 py-2 font-medium">Line</th>
                              <th className="px-4 py-2 font-medium">BOQ line</th>
                              <th className="px-4 py-2 font-medium">Planned</th>
                              <th className="px-4 py-2 font-medium">Committed</th>
                              <th className="px-4 py-2 font-medium">Actual</th>
                              <th className="px-4 py-2 font-medium">Available</th>
                              <th className="px-4 py-2 font-medium">Commitments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.lines.map((line: any) => (
                              <tr key={line.id} className="border-t">
                                <td className="px-4 py-2">
                                  <div className="font-medium">{line.code ?? line.description ?? 'Budget line'}</div>
                                  <div className="text-xs text-muted-foreground">{line.costHead?.name ?? line.costHeadId}</div>
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                  {line.boqLine ? `${line.boqLine.code} · ${line.boqLine.name}` : '—'}
                                </td>
                                <td className="px-4 py-2">{formatCurrency(line.planned, currency)}</td>
                                <td className="px-4 py-2">{formatCurrency(line.committed, currency)}</td>
                                <td className="px-4 py-2">{formatCurrency(line.actual, currency)}</td>
                                <td className="px-4 py-2">{formatCurrency(line.available, currency)}</td>
                                <td className="px-4 py-2">{formatNumber(line.commitments?.length ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Commitments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selected.commitments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commitments yet.</p>
                  ) : (
                    selected.commitments.slice(0, 12).map((commitment: any) => (
                      <div key={commitment.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">{commitment.referenceNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {titleCase(commitment.entityType)} · {relativeTime(commitment.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>{formatCurrency(Number(commitment.committedAmount), commitment.currency ?? currency)}</div>
                          <Badge tone={statusTone(commitment.status)}>{titleCase(commitment.status)}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selected.alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alerts for this budget.</p>
                  ) : (
                    selected.alerts.slice(0, 12).map((alert: any) => (
                      <div key={alert.id} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge tone={alert.type === 'HARD_STOP' ? 'danger' : alert.type === 'CRITICAL' ? 'warning' : 'info'}>
                                {titleCase(alert.type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{relativeTime(alert.createdAt)}</span>
                            </div>
                            <p className="mt-1">{alert.message}</p>
                          </div>
                          {!alert.isResolved && canUpdate ? (
                            <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)} loading={busy}>
                              Resolve
                            </Button>
                          ) : (
                            <Badge tone={alert.isResolved ? 'success' : 'default'}>{alert.isResolved ? 'Resolved' : 'Open'}</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {showRevisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No revisions raised.</p>
                ) : (
                  showRevisions.map((revision: any) => (
                    <div key={revision.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-medium">Revision #{revision.revisionNumber}</span>
                          <span className="ml-2 text-muted-foreground">{revision.reason}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={statusTone(revision.status)}>{titleCase(revision.status)}</Badge>
                          {canUpdate && revision.status === 'DRAFT' ? (
                            <Button size="sm" variant="outline" onClick={() => revisionAction(revision.id, 'submit')} loading={busy}>
                              Submit
                            </Button>
                          ) : null}
                          {canApprove && revision.status === 'PENDING_APPROVAL' ? (
                            <>
                              <Button size="sm" variant="success" onClick={() => revisionAction(revision.id, 'approve')} loading={busy}>
                                Approve
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => revisionAction(revision.id, 'reject')} loading={busy}>
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {revision.status === 'PENDING_APPROVAL' ? (
                        <Textarea
                          className="mt-2"
                          rows={2}
                          placeholder="Rejection comment (required to reject)"
                          value={revisionComment[revision.id] ?? ''}
                          onChange={(event) =>
                            setRevisionComment((current) => ({ ...current, [revision.id]: event.target.value }))
                          }
                        />
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Budget control</h1>
        <p className="text-sm text-muted-foreground">Baselines, commitments, cost ledger, thresholds and variance across projects.</p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Planned" value={formatCurrency(totals?.planned ?? 0, currency)} hint={`${formatNumber(dashboard?.budgetCount ?? 0)} budgets`} />
        <StatCard label="Committed" value={formatCurrency(totals?.committed ?? 0, currency)} tone="warning" hint={`${formatNumber(dashboard?.commitments?.open ?? 0)} open commitments`} />
        <StatCard label="Actual" value={formatCurrency(totals?.actual ?? 0, currency)} tone="accent" />
        <StatCard
          label="Available"
          value={formatCurrency(totals?.available ?? 0, currency)}
          tone={(totals?.available ?? 0) < 0 ? 'danger' : 'success'}
          hint={`${formatPercent(totals?.utilization ?? 0)} utilised`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Budgets</CardTitle>
            <Button size="sm" variant="outline" onClick={load} loading={loading}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : budgets.length === 0 ? (
              <EmptyState title="No budgets" description="Create a project budget from the API or a project workspace to start controlling cost." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Budget</th>
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-5 py-3 font-medium">Planned</th>
                    <th className="px-5 py-3 font-medium">Committed</th>
                    <th className="px-5 py-3 font-medium">Actual</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((row) => {
                    const planned = Number(row.totalPlanned) || 0;
                    const used = (Number(row.totalCommitted) || 0) + (Number(row.totalActual) || 0);
                    const utilization = planned > 0 ? (used / planned) * 100 : 0;
                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <button className="text-left font-medium hover:underline" onClick={() => openBudget(row)}>
                            {row.code}
                          </button>
                          <div className="text-xs text-muted-foreground">{row.name}</div>
                        </td>
                        <td className="px-5 py-3">{row.project?.name ?? '—'}</td>
                        <td className="px-5 py-3">{formatCurrency(planned, row.currency)}</td>
                        <td className="px-5 py-3">{formatCurrency(Number(row.totalCommitted), row.currency)}</td>
                        <td className="px-5 py-3">
                          {formatCurrency(Number(row.totalActual), row.currency)}
                          <div className="mt-1 w-24">
                            <Progress value={Math.min(utilization, 100)} tone={utilization >= 100 ? 'danger' : utilization >= 80 ? 'warning' : 'success'} />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => openBudget(row)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unresolved alerts.</p>
            ) : (
              alerts.map((alert: any) => (
                <div key={alert.id} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={alert.type === 'HARD_STOP' ? 'danger' : alert.type === 'CRITICAL' ? 'warning' : 'info'}>
                      {titleCase(alert.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{relativeTime(alert.createdAt)}</span>
                  </div>
                  <button className="mt-1 text-left hover:underline" onClick={() => openBudget(alert.budget as BudgetRow)}>
                    {alert.message}
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
