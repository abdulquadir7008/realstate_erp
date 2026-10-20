'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Field, Option } from '@/lib/modules';
import { REFS } from '@/lib/modules';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';

function collectRefs(fields: Field[]): string[] {
  const refs = new Set<string>();
  const walk = (fs: Field[]) => {
    for (const f of fs) {
      if ((f.type === 'ref' || f.type === 'multiselect') && f.ref) refs.add(f.ref);
      if (f.itemFields) walk(f.itemFields);
    }
  };
  walk(fields);
  return [...refs];
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function loadRefOptions(ref: string, values?: Record<string, any>): Promise<Option[]> {
  if (ref === 'permissions') {
    const grouped = await api<Record<string, { code: string; action: string }[]>>('/roles/permissions');
    return Object.entries(grouped).flatMap(([mod, list]) =>
      list.map((p) => ({ value: p.code, label: `${mod} · ${p.action}` })),
    );
  }
  const def = REFS[ref];
  if (!def) return [];
  const params = new URLSearchParams({ limit: '100' });
  if (ref === 'buildings' && values?.projectId) params.set('projectId', values.projectId);
  if (ref === 'floors') {
    if (values?.buildingId) params.set('buildingId', values.buildingId);
    if (values?.projectId) params.set('projectId', values.projectId);
  }
  if (ref === 'units') {
    if (values?.projectId) params.set('projectId', values.projectId);
    if (values?.buildingId) params.set('buildingId', values.buildingId);
    if (values?.floorId) params.set('floorId', values.floorId);
  }
  const data = await api<any>(`${def.endpoint}?${params.toString()}`);
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const opts = items.map((i) => ({ value: i[def.value ?? 'id'], label: def.label(i) }));
  if (ref.includes('categor')) opts.push({ value: '__new__', label: '+ Add new…' });
  return opts;
}

function initialValue(field: Field, initial: Record<string, any> | null | undefined): any {
  const raw = initial ? initial[field.name] : undefined;
  if (field.type === 'items') return Array.isArray(raw) ? raw : [];
  if (field.type === 'multiselect') {
    if (Array.isArray(raw)) return raw;
    if (field.name === 'roleCodes' && raw) return [raw];
    return [];
  }
  if (field.type === 'checkbox') return raw ?? field.defaultValue ?? false;
  if (raw !== undefined && raw !== null) {
    if (field.type === 'date') return String(raw).slice(0, 10);
    if (field.type === 'datetime') return String(raw).slice(0, 16);
    if (field.type === 'json') return JSON.stringify(raw, null, 2);
    return raw;
  }
  return field.defaultValue ?? '';
}

function coerce(field: Field, value: any): any {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'number' || field.type === 'currency') {
    if (value === '' || value === undefined || value === null) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  if (field.type === 'json') {
    if (!value) return undefined;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      throw new Error(`${field.label} is not valid JSON`);
    }
  }
  if (field.type === 'items') {
    return (value as any[]).map((row) => {
      const out: Record<string, any> = {};
      for (const f of field.itemFields ?? []) out[f.name] = coerce(f, row[f.name]);
      return out;
    });
  }
  if (field.type === 'multiselect') return value ?? [];
  if (field.name === 'roleCodes') return value ? [value] : [];
  if (value === '') return undefined;
  return value;
}

interface RecordFormProps {
  open: boolean;
  title: string;
  fields: Field[];
  initial?: Record<string, any> | null;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export function RecordForm({ open, title, fields, initial, submitLabel = 'Save', onSubmit, onClose }: RecordFormProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const next: Record<string, any> = {};
    for (const f of fields) next[f.name] = initialValue(f, initial);
    setValues(next);
  }, [open, fields, initial]);

  useEffect(() => {
    if (!open) return;
    const refs = collectRefs(fields);
    let cancelled = false;
    Promise.all(
      refs.map((r) =>
        loadRefOptions(r, values)
          .then((o) => [r, o] as const)
          .catch(() => [r, [] as Option[]] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setOptions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [open, fields, values]);

  const set = (name: string, value: any) => setValues((v) => ({ ...v, [name]: value }));

  const cols = useMemo(() => fields, [fields]);
  if (!open) return null;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        const value = coerce(f, values[f.name]);
        if (f.required && (value === undefined || value === null || value === '')) {
          throw new Error(`${f.label} is required`);
        }
        if (value === undefined) continue;
        if (f.type === 'items' && Array.isArray(value) && value.length === 0 && f.required) {
          throw new Error(`${f.label} needs at least one row`);
        }
        payload[f.name] = value;
      }
      await onSubmit(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-pop">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 text-lg text-muted-foreground hover:bg-muted">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cols.map((f) => (
              <div key={f.name} className={cn('space-y-1.5', f.colSpan === 2 || f.type === 'items' || f.type === 'textarea' || f.type === 'multiselect' ? 'sm:col-span-2' : '')}>
                <label className="text-sm font-medium">
                  {f.label}
                  {f.required ? <span className="text-red-500"> *</span> : null}
                </label>
                {renderControl(f, values[f.name], set, options, setOptions)}
                {f.help ? <p className="text-xs text-muted-foreground">{f.help}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderControl(field: Field, value: any, set: (n: string, v: any) => void, optMap: Record<string, Option[]>, setOptions?: (u: any) => void) {
  const options = field.type === 'select' || field.type === 'multiselect' ? (field.options ?? optMap[field.ref ?? ''] ?? []) : optMap[field.ref ?? ''] ?? [];
  switch (field.type) {
    case 'textarea':
      return <textarea className="min-h-[80px] w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'json':
      return <textarea className="min-h-[80px] w-full rounded-lg border bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'select':
    case 'ref':
      return (
        <select
          className="h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={value ?? ''}
          onChange={async (e) => {
            const v = e.target.value;
            if (v === '__new__' && field.ref) {
              const name = window.prompt('New category name');
              if (!name) return;
              const def = REFS[field.ref];
              try {
                const created = await api<any>(def.endpoint, { method: 'POST', body: JSON.stringify({ name, code: name.toUpperCase().replace(/\\s+/g, '_').slice(0, 20) }) });
                const opt = { value: created.id ?? created.value, label: def.label(created) };
                setOptions?.((prev: any) => ({ ...prev, [field.ref as string]: [...(prev?.[field.ref as string] ?? []), opt] }));
                set(field.name, opt.value);
              } catch {
                /* ignore */
              }
              return;
            }
            set(field.name, v);
          }}
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <div className="flex h-10 items-center">
          <input type="checkbox" className="h-4 w-4" checked={Boolean(value)} onChange={(e) => set(field.name, e.target.checked)} />
        </div>
      );
    case 'number':
    case 'currency':
      return <Input type="number" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'date':
      return <Input type="date" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'datetime':
      return <Input type="datetime-local" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
    case 'password':
      return (
        <div className="flex gap-2">
          <Input type="password" value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />
          <button type="button" onClick={() => set(field.name, generatePassword())} className="shrink-0 rounded-lg border px-3 text-xs hover:bg-muted">
            Generate
          </button>
        </div>
      );
    case 'multiselect':
      return <MultiSelect value={value ?? []} options={options} onChange={(v) => set(field.name, v)} />;
    case 'items':
      return <ItemsEditor field={field} value={value ?? []} onChange={(v) => set(field.name, v)} optMap={optMap} setOptions={setOptions} />;
    default:
      return <Input value={value ?? ''} onChange={(e) => set(field.name, e.target.value)} />;
  }
}

function MultiSelect({ value, options, onChange }: { value: any[]; options: Option[]; onChange: (v: any[]) => void }) {
  const [search, setSearch] = useState('');
  const selected = new Set(value);
  const filtered = useMemo(
    () => (search ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options),
    [options, search],
  );
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Input className="h-8 border-0 p-0 focus-visible:ring-0" placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="whitespace-nowrap text-xs text-muted-foreground">{value.length} selected</span>
      </div>
      <div className="max-h-52 overflow-y-auto p-2">
        {filtered.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.has(o.value)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o.value);
                else next.delete(o.value);
                onChange([...next]);
              }}
            />
            <span>{o.label}</span>
          </label>
        ))}
        {filtered.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p> : null}
      </div>
    </div>
  );
}

function ItemsEditor({
  field,
  value,
  onChange,
  optMap,
  setOptions,
}: {
  field: Field;
  value: any[];
  onChange: (v: any[]) => void;
  optMap: Record<string, Option[]>;
  setOptions?: (u: any) => void;
}) {
  const itemFields = field.itemFields ?? [];
  const addRow = () => {
    const row: Record<string, any> = {};
    for (const f of itemFields) row[f.name] = initialValue(f, null);
    onChange([...value, row]);
  };
  const update = (idx: number, name: string, v: any) => {
    const next = value.map((r, i) => (i === idx ? { ...r, [name]: v } : r));
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {value.map((row, idx) => (
        <div key={idx} className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {field.itemLabel ?? 'Item'} {idx + 1}
            </span>
            <button onClick={() => remove(idx)} className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {itemFields.map((f) => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs font-medium">{f.label}</label>
                {renderControl(f, row[f.name], (n, v) => update(idx, n, v), optMap, setOptions)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addRow} className="h-9">
        + Add {field.itemLabel ?? 'item'}
      </Button>
    </div>
  );
}
