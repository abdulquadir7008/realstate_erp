'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { MODULES, type ActionDef, type ModuleConfig } from '@/lib/modules';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, StatCard } from '@/components/ui';
import { RecordForm } from '@/components/record-form';
import { OrganizationPanel } from '@/components/organization-panel';
import { ReportsPanel } from '@/components/reports-panel';

type Modal =
  | { kind: 'create' }
  | { kind: 'edit'; row: Record<string, any> }
  | { kind: 'action'; action: ActionDef; row: Record<string, any> }
  | { kind: 'pageAction'; action: ActionDef }
  | null;

function tone(value: string) {
  const v = String(value).toUpperCase();
  if (['ACTIVE', 'CONFIRMED', 'COMPLETED', 'DONE', 'PAID', 'SUCCESS', 'SOLD', 'PRESENT', 'AVAILABLE', 'APPROVED', 'PASS', 'VERIFIED', 'RECEIVED', 'true'].includes(v)) return 'success' as const;
  if (['PENDING', 'IN_PROGRESS', 'PARTIAL', 'DUE', 'NEW', 'OPEN', 'DRAFT', 'QUALIFIED', 'ISSUED', 'ASSIGNED', 'CONDITIONAL', 'SUBMITTED'].includes(v)) return 'info' as const;
  if (['OVERDUE', 'CANCELLED', 'LOST', 'REJECTED', 'FAILED', 'CLOSED', 'ABSENT', 'FAIL', 'BLACKLISTED', 'false'].includes(v)) return 'danger' as const;
  if (['HOLD', 'ON_HOLD', 'NEGOTIATION', 'RESERVED', 'WAITING_CUSTOMER'].includes(v)) return 'warning' as const;
  return 'default' as const;
}

function renderCell(value: unknown, kind?: string) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  if (kind === 'currency') return formatCurrency(Number(value));
  if (kind === 'number') return formatNumber(Number(value));
  if (kind === 'date') return new Date(String(value)).toLocaleDateString();
  if (kind === 'badge') {
    const text = String(value);
    if (text === 'true' || text === 'false') return <Badge tone={text === 'true' ? 'success' : 'default'}>{text === 'true' ? 'Yes' : 'No'}</Badge>;
    return <Badge tone={tone(text)}>{text}</Badge>;
  }
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 50);
  return String(value);
}

export default function ModulePage() {
  const params = useParams<{ module: string }>();
  const slug = typeof params.module === 'string' ? params.module : '';
  const config: ModuleConfig | undefined = MODULES[slug];

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    if (!config || config.columns.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (search) qs.set('search', search);
      const data = await api<any>(`${config.endpoint}?${qs.toString()}`);
      if (Array.isArray(data)) {
        setRows(data);
        setTotal(data.length);
      } else {
        setRows(data?.items ?? []);
        setTotal(data?.total ?? 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [config, search]);

  useEffect(() => {
    load();
  }, [load]);

  if (!config) {
    return <p className="text-sm text-muted-foreground">Unknown module.</p>;
  }
  if (config.special === 'organization') return <OrganizationPanel />;
  if (config.special === 'reports') return <ReportsPanel />;

  const canCreate = config.canCreate ?? Boolean(config.fields && config.fields.length);
  const createFields = config.fields ?? [];

  async function submitCreate(values: Record<string, any>) {
    await api(config!.createEndpoint ?? config!.endpoint, { method: 'POST', body: JSON.stringify(values) });
    await load();
  }
  async function submitEdit(values: Record<string, any>) {
    if (modal?.kind !== 'edit') return;
    await api(`${config!.endpoint}/${modal.row.id}`, { method: 'PATCH', body: JSON.stringify(values) });
    await load();
  }
  async function submitAction(values: Record<string, any>, action: ActionDef, row?: Record<string, any>) {
    const url = typeof action.endpoint === 'function' ? action.endpoint(row ?? {}) : action.endpoint;
    const body = action.toBody ? action.toBody(values, row ?? {}) : values;
    await api(url, { method: action.method ?? 'POST', body: JSON.stringify(body) });
    await load();
  }
  async function removeRow(row: Record<string, any>) {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api(`${config!.endpoint}/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }
  async function downloadPdf(row: Record<string, any>) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010/api/v1'}${config!.endpoint}/${row.id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.invoiceNumber ?? 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {config.columns.length ? (
            <Input className="w-52" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          ) : null}
          {config.pageActions?.map((a) => (
            <Button key={a.label} variant="outline" onClick={() => setModal({ kind: 'pageAction', action: a })}>
              {a.label}
            </Button>
          ))}
          {canCreate ? <Button onClick={() => setModal({ kind: 'create' })}>+ New</Button> : null}
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No records found. {canCreate ? 'Click “New” to add the first one.' : ''}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{formatNumber(total)} records</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {config.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-5 py-3 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id ?? i} className="border-b last:border-0 hover:bg-muted/40">
                    {config.columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-5 py-3">
                        {renderCell(row[c.key], c.kind)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {config.rowActions?.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => setModal({ kind: 'action', action: a, row })}
                            className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                          >
                            {a.label}
                          </button>
                        ))}
                        {config.canEdit ? (
                          <button onClick={() => setModal({ kind: 'edit', row })} className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                            Edit
                          </button>
                        ) : null}
                         {config.canDownloadPdf ? (
                           <button onClick={() => downloadPdf(row)} className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                             PDF
                           </button>
                         ) : null}
                         {config.canDelete ? (
                           <button onClick={() => removeRow(row)} className="rounded-md border px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                             Delete
                           </button>
                         ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {modal?.kind === 'create' ? (
        <RecordForm open title={`New ${config.title}`} fields={createFields} submitLabel="Create" onSubmit={submitCreate} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === 'edit' ? (
        <RecordForm
          open
          title={`Edit ${config.title}`}
          fields={config.editFields ?? createFields}
          initial={modal.row}
          submitLabel="Save changes"
          onSubmit={submitEdit}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'action' ? (
        <RecordForm
          open
          title={modal.action.label}
          fields={modal.action.fields}
          initial={modal.row}
          submitLabel={modal.action.label}
          onSubmit={(v) => submitAction(v, modal.action, modal.row)}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'pageAction' ? (
        <RecordForm
          open
          title={modal.action.label}
          fields={modal.action.fields}
          submitLabel={modal.action.label}
          onSubmit={(v) => submitAction(v, modal.action)}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
