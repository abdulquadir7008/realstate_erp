'use client';

import { useQuery } from '@tanstack/react-query';
import { HardHat } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Progress, Skeleton } from '@/components/ui';

export default function PortalConstructionPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'construction'],
    queryFn: () => api<any>('/portal/construction'),
  });

  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <div className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}</div>;

  const projects = data?.projects ?? [];
  if (!projects.length) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Construction updates</h1>
        <EmptyState icon={<HardHat className="h-5 w-5" />} title="No projects linked" description="Construction updates for your project will appear here." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Construction updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live milestone progress and recent site reports for your project.</p>
      </div>

      {projects.map((p: any) => (
        <Card key={p.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{p.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {p.city ?? '—'} · {titleCase(p.status)}
                {p.endDate ? ` · expected by ${new Date(p.endDate).toLocaleDateString()}` : ''}
              </p>
            </div>
            <span className="text-2xl font-semibold text-accent">{p.progress}%</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress value={p.progress} />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.milestones.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card/50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      {m.dueDate ? <p className="text-xs text-muted-foreground">due {new Date(m.dueDate).toLocaleDateString()}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-semibold">{m.progressPercent ?? 0}%</span>
                      <Badge tone={statusTone(m.status)}>{titleCase(m.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {p.siteReports?.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent site updates</p>
                <div className="space-y-2">
                  {p.siteReports.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="rounded-lg border bg-card/50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{new Date(r.date).toLocaleDateString()}</p>
                        <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
                      </div>
                      {r.workSummary ? <p className="mt-1 text-sm text-foreground/80">{r.workSummary}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">Updated {relativeTime(r.updatedAt ?? r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
