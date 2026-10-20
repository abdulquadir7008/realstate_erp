'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Card, CardContent, EmptyState, Skeleton } from '@/components/ui';

function humanSize(bytes?: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PortalDocumentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'documents'],
    queryFn: () => api<any>('/portal/documents'),
  });

  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Agreements, letters and other documents shared with you.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !data?.items?.length ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="No documents yet" description="Documents shared as customer-visible will appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((d: any) => (
                <div key={d.id} className="rounded-xl border bg-card/60 p-4 transition hover:border-accent/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <Badge tone={statusTone(d.status)}>{titleCase(d.status)}</Badge>
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold" title={d.name}>
                    {d.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.folder ? `${d.folder} · ` : ''}
                    {humanSize(d.sizeBytes)} · v{d.version}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">Shared {relativeTime(d.createdAt)}</p>
                  {d.signedAt ? <p className="mt-1 text-[11px] font-medium text-success">Signed {new Date(d.signedAt).toLocaleDateString()}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
