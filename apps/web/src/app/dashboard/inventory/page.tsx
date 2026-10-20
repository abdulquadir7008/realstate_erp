'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Hammer, Layers, Lock, ShoppingCart, Search, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { cn, formatCompactCurrency, formatCurrency, formatNumber, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, EmptyState, Input, Select, Skeleton, StatCard } from '@/components/ui';
import { useWorkspace } from '@/components/shell/workspace';

interface Project {
  id: string;
  name: string;
  code: string;
  city?: string | null;
}

interface Building {
  id: string;
  name: string;
  code: string;
  projectId: string;
  _count?: { units: number; floors: number };
}

interface Floor {
  id: string;
  label: string;
  floorNumber: number;
  buildingId: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  configuration?: string | null;
  status: string;
  basePrice: number;
  carpetArea?: number | null;
  building: { id: string; name: string; code: string };
  floor: { id: string; label: string; floorNumber: number };
}

const STATUS_STYLE: Record<string, { chip: string; ring: string }> = {
  AVAILABLE: { chip: 'bg-success/10 text-success border-success/30', ring: 'border-success/30 hover:border-success' },
  RESERVED: { chip: 'bg-warning/10 text-warning border-warning/30', ring: 'border-warning/30' },
  BOOKED: { chip: 'bg-accent/10 text-accent border-accent/30', ring: 'border-accent/30' },
  AGREEMENT_PENDING: { chip: 'bg-accent/10 text-accent border-accent/30', ring: 'border-accent/30' },
  SOLD: { chip: 'bg-muted text-muted-foreground border-border', ring: 'border-border opacity-70' },
  ON_HOLD: { chip: 'bg-info/10 text-info border-info/30', ring: 'border-info/30' },
  BLOCKED: { chip: 'bg-destructive/10 text-destructive border-destructive/30', ring: 'border-destructive/30' },
  CANCELLED: { chip: 'bg-muted text-muted-foreground border-border', ring: 'border-border opacity-60' },
};

export default function InventoryPage() {
  const { projectId: workspaceProjectId } = useWorkspace();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const effectiveProject = projectId || workspaceProjectId || undefined;

  const { data: projects } = useQuery({
    queryKey: ['projects', 'inventory-select'],
    queryFn: () => api<{ items: Project[] } | Project[]>('/projects?limit=100'),
  });
  const projectList: Project[] = Array.isArray(projects) ? projects : (projects?.items ?? []);

  const { data: buildings } = useQuery({
    queryKey: ['inventory', 'buildings', effectiveProject ?? 'all'],
    queryFn: () => api<Building[]>(`/inventory/buildings${qs({ projectId: effectiveProject })}`),
  });
  const buildingList: Building[] = Array.isArray(buildings) ? buildings : (buildings as any)?.items ?? [];

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ['inventory', 'units', effectiveProject ?? 'all', buildingId, statusFilter],
    queryFn: () =>
      api<{ items: Unit[]; total: number }>(
        `/inventory/units?limit=500${qs({ projectId: effectiveProject, buildingId: buildingId || undefined, status: statusFilter || undefined })}`,
      ),
  });

  const units = useMemo(() => unitsData?.items ?? [], [unitsData]);
  const filtered = useMemo(() => {
    if (!search.trim()) return units;
    const s = search.trim().toLowerCase();
    return units.filter((u) => u.unitNumber.toLowerCase().includes(s) || u.configuration?.toLowerCase().includes(s) || u.building.name.toLowerCase().includes(s));
  }, [units, search]);

  const grouped = useMemo(() => {
    const byBuilding = new Map<string, { building: { id: string; name: string; code: string }; byFloor: Map<number, Unit[]> }>();
    for (const u of filtered) {
      const b = byBuilding.get(u.building.id) ?? { building: u.building, byFloor: new Map<number, Unit[]>() };
      const arr = b.byFloor.get(u.floor.floorNumber) ?? [];
      arr.push(u);
      b.byFloor.set(u.floor.floorNumber, arr);
      byBuilding.set(u.building.id, b);
    }
    for (const b of byBuilding.values()) {
      for (const arr of b.byFloor.values()) arr.sort((a, x) => a.unitNumber.localeCompare(x.unitNumber, undefined, { numeric: true }));
    }
    return [...byBuilding.values()].sort((a, b) => a.building.name.localeCompare(b.building.name));
  }, [filtered]);

  const byStatus = new Map<string, number>();
  for (const u of units) byStatus.set(u.status, (byStatus.get(u.status) ?? 0) + 1);
  const available = byStatus.get('AVAILABLE') ?? 0;
  const reserved = (byStatus.get('RESERVED') ?? 0) + (byStatus.get('ON_HOLD') ?? 0);
  const booked = (byStatus.get('BOOKED') ?? 0) + (byStatus.get('AGREEMENT_PENDING') ?? 0);
  const sold = byStatus.get('SOLD') ?? 0;
  const stockValue = units.filter((u) => u.status === 'AVAILABLE').reduce((s, u) => s + Number(u.basePrice ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Project → building → floor → unit. Click an available unit to reserve it.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total units" value={formatNumber(unitsData?.total ?? 0)} icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Available" value={available} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Reserved / hold" value={reserved} icon={<Lock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Booked" value={booked} icon={<ShoppingCart className="h-5 w-5" />} tone="accent" />
        <StatCard label="Available stock value" value={formatCompactCurrency(stockValue)} icon={<Hammer className="h-5 w-5" />} tone="accent" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setBuildingId(''); }}>
            <option value="">All projects</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">All buildings</option>
            {buildingList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b._count?.units ?? 0} units)
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['AVAILABLE', 'RESERVED', 'ON_HOLD', 'BOOKED', 'AGREEMENT_PENDING', 'SOLD', 'BLOCKED'].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit no, config, building…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...byStatus.entries()].map(([status, count]) => (
              <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
                <Badge tone={statusFilter === status ? 'accent' : statusTone(status)}>
                  {titleCase(status)} {count}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Layers className="h-5 w-5" />} title="No units found" description="Adjust the project, building or status filters above." />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <Card key={group.building.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{group.building.name}</h2>
                    <p className="text-xs text-muted-foreground">{group.building.code}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{[...group.byFloor.values()].reduce((s, arr) => s + arr.length, 0)} units</span>
                </div>
                <div className="space-y-3">
                  {[...group.byFloor.entries()]
                    .sort((a, b) => b[0] - a[0])
                    .map(([floorNumber, floorUnits]) => (
                      <div key={floorNumber} className="flex items-start gap-3">
                        <div className="w-20 shrink-0 pt-2 text-right">
                          <p className="text-sm font-semibold">Floor {floorNumber}</p>
                          <p className="text-[11px] text-muted-foreground">{floorUnits.length} units</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {floorUnits.map((u) => {
                            const style = STATUS_STYLE[u.status] ?? STATUS_STYLE.SOLD;
                            return (
                              <button
                                key={u.id}
                                onClick={() => setSelectedUnit(u)}
                                className={cn('w-36 rounded-lg border bg-card p-2.5 text-left transition', style.ring, u.status === 'AVAILABLE' && 'hover:shadow-md')}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold">{u.unitNumber}</p>
                                  <span className={cn('h-2 w-2 rounded-full', u.status === 'AVAILABLE' ? 'bg-success' : u.status === 'SOLD' ? 'bg-muted-foreground' : 'bg-warning')} />
                                </div>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{u.configuration ?? titleCase(u.type)}</p>
                                <p className="mt-1 text-xs font-medium">{formatCompactCurrency(u.basePrice)}</p>
                                <span className={cn('mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium', style.chip)}>{titleCase(u.status)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedUnit ? (
          <ReserveModal
            unit={selectedUnit}
            onClose={() => setSelectedUnit(null)}
            onDone={() => {
              setSelectedUnit(null);
              qc.invalidateQueries({ queryKey: ['inventory', 'units'] });
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ReserveModal({ unit, onClose, onDone }: { unit: Unit; onClose: () => void; onDone: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [holdMinutes, setHoldMinutes] = useState(120);
  const [error, setError] = useState<string | null>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'reserve-select'],
    queryFn: () => api<{ items: any[] } | any[]>('/customers?limit=200'),
  });
  const customers: any[] = Array.isArray(customersData) ? customersData : (customersData?.items ?? []);

  const reserve = useMutation({
    mutationFn: () => api<any>('/bookings/reserve', { method: 'POST', body: JSON.stringify({ unitId: unit.id, customerId, holdMinutes }) }),
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
          <div>
            <h2 className="text-lg font-semibold">Reserve {unit.unitNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {unit.building.name} · {unit.floor.label} · {formatCurrency(unit.basePrice)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Customer</label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </Select>
            {customers.length === 0 ? <p className="mt-1 text-xs text-warning">No customers yet — create one from the Customers module first.</p> : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Hold duration</label>
            <Select value={String(holdMinutes)} onChange={(e) => setHoldMinutes(Number(e.target.value))}>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
              <option value="1440">24 hours</option>
              <option value="4320">3 days</option>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => reserve.mutate()} loading={reserve.isPending} disabled={!customerId}>
              Reserve unit
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
