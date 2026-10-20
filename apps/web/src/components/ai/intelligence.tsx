'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, BadgeCheck, Bot, FileBarChart2, Lightbulb, RefreshCw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCompactCurrency, formatCurrency, formatNumber, relativeTime, statusTone, titleCase } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Progress, Skeleton } from '@/components/ui';
import { BarsChart, LineTrend, CHART_COLORS } from '@/components/charts';
import { MarkdownLite } from './assistant';

function AiBadge({ engine }: { engine?: string }) {
  return (
    <Badge tone={engine === 'llm' ? 'success' : 'info'}>
      <Sparkles className="h-3 w-3" />
      {engine === 'llm' ? 'AI generated' : 'Statistical analysis'}
    </Badge>
  );
}

function Disclaimer({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-[11px] leading-relaxed text-muted-foreground">{text}</p>;
}

/* ------------------------------------------------------------------ Leads */
export function LeadInsightsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'insights', 'leads'],
    queryFn: () => api<any>('/ai/insights/leads'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const s = data.summary;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open leads</p><p className="mt-2 text-2xl font-semibold">{formatNumber(s.total)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High priority</p><p className="mt-2 text-2xl font-semibold text-accent">{formatNumber(s.highPriority)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue follow-ups</p><p className="mt-2 text-2xl font-semibold text-warning">{formatNumber(s.overdueFollowUps)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. conversion probability</p><p className="mt-2 text-2xl font-semibold text-success">{s.avgProbability}%</p></CardContent></Card>
      </div>

      {data.narrative ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-accent" /> AI summary</CardTitle>
            <AiBadge engine={data.engine} />
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground/90"><MarkdownLite text={data.narrative} /></CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Lead intelligence</CardTitle>
            <p className="text-sm text-muted-foreground">Prioritized by predicted conversion probability.</p>
          </div>
          <AiBadge engine={data.engine} />
        </CardHeader>
        <CardContent className="space-y-3">
          {data.leads.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No open leads" description="Leads in your pipeline will appear here with AI estimates." />
          ) : (
            data.leads.map((l: any) => <LeadInsightRow key={l.id} lead={l} />)
          )}
          <Disclaimer text={data.disclaimer} />
        </CardContent>
      </Card>
    </div>
  );
}

function LeadInsightRow({ lead }: { lead: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card/60 p-4 transition hover:border-accent/40">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{lead.name}</p>
            <Badge tone={lead.priority === 'HIGH' ? 'danger' : lead.priority === 'MEDIUM' ? 'warning' : 'default'}>{lead.priority}</Badge>
            {lead.followUpOverdue ? <Badge tone="warning">Follow-up overdue</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lead.leadNumber} · {titleCase(lead.source)} · {titleCase(lead.status)} · {lead.phone}
            {lead.nextFollowUpAt ? ` · next follow-up ${relativeTime(lead.nextFollowUpAt)}` : ''}
          </p>
        </div>
        <div className="w-40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversion</span>
            <span className="font-semibold">{lead.conversionProbability}%</span>
          </div>
          <Progress value={lead.conversionProbability} tone={lead.conversionProbability >= 70 ? 'success' : lead.conversionProbability >= 40 ? 'accent' : 'warning'} className="mt-1.5" />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Suggestion'}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 rounded-lg bg-muted/60 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Suggested sales message (AI-generated)
          </p>
          <p className="text-sm leading-relaxed">{lead.suggestedMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Finance */
export function FinanceInsightsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'insights', 'finance'],
    queryFn: () => api<any>('/ai/insights/finance'),
    refetchInterval: 60_000,
  });
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next-month collection forecast</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.prediction.nextMonthCollections)}</p>
            <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', data.prediction.trendUp ? 'text-success' : 'text-warning')}>
              {data.prediction.trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {data.prediction.trendUp ? 'Upward trend' : 'Downward trend'} · {data.prediction.collectionRate}% collection ratio
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding receivables</p>
            <p className="mt-2 text-2xl font-semibold text-warning">{formatCurrency(data.outstanding.totalOutstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Object.entries(data.outstanding.byStatus ?? {}).map(([k, v]) => `${titleCase(k)} ${formatCompactCurrency(Number(v))}`).join(' · ')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue demands</p>
            <p className="mt-2 text-2xl font-semibold text-destructive">{formatNumber(data.overdue.length)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Oldest: {data.overdue[0] ? relativeTime(data.overdue[0].dueDate) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Revenue &amp; collections</CardTitle>
            <AiBadge engine={data.engine} />
          </CardHeader>
          <CardContent>
            <LineTrend
              data={data.trend.map((r: any) => ({ month: r.month, sales: Number(r.sales), collections: Number(r.collections) }))}
              xKey="month"
              series={[
                { key: 'sales', label: 'Sales', color: CHART_COLORS[0] },
                { key: 'collections', label: 'Collections', color: CHART_COLORS[1] },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-accent" /> Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.insights.map((i: any, idx: number) => (
              <div key={idx} className="rounded-lg border bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titleCase(i.kind)}</p>
                  <Badge tone={i.severity === 'GOOD' ? 'success' : i.severity === 'RISK' || i.severity === 'WARN' ? 'warning' : 'info'}>{i.severity}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed">{i.text}</p>
              </div>
            ))}
            <Disclaimer text={data.disclaimer} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top debtors requiring action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.overdue.length === 0 ? (
            <EmptyState icon={<BadgeCheck className="h-5 w-5" />} title="No overdue demands" description="All receivables are on schedule." />
          ) : (
            data.overdue.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.customer}</p>
                  <p className="text-xs text-muted-foreground">{d.demandNumber} · {d.title} · due {new Date(d.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{formatCurrency(d.dueAmount)}</p>
                  {d.phone ? <a className="text-xs text-accent hover:underline" href={`tel:${d.phone}`}>{d.phone}</a> : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Projects */
export function ProjectInsightsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai', 'insights', 'projects'],
    queryFn: () => api<any>('/ai/insights/projects'),
    refetchInterval: 60_000,
  });
  if (isLoading) return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}</div>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {data.narrative ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-accent" /> Execution summary</CardTitle>
            <AiBadge engine={data.engine} />
          </CardHeader>
          <CardContent className="text-sm leading-relaxed"><MarkdownLite text={data.narrative} /></CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.projects.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{p.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.code} · {p.city ?? '—'} · {titleCase(p.status)}</p>
              </div>
              <Badge tone={p.delayRisk === 'HIGH' ? 'danger' : p.delayRisk === 'MEDIUM' ? 'warning' : 'success'}>
                {p.delayRisk === 'HIGH' ? <AlertTriangle className="h-3 w-3" /> : null}
                {p.delayRisk} delay risk
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Milestone progress</span>
                  <span className="font-semibold">{p.progress}% <span className="text-muted-foreground">vs expected {p.expectedProgress}%</span></span>
                </div>
                <Progress value={p.progress} tone={p.delayRisk === 'HIGH' ? 'danger' : p.delayRisk === 'MEDIUM' ? 'warning' : 'accent'} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-lg font-semibold">{p.openTasks}</p>
                  <p className="text-[11px] text-muted-foreground">Open tasks</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-lg font-semibold">{p.units}</p>
                  <p className="text-[11px] text-muted-foreground">Units</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-lg font-semibold">{p.bookings}</p>
                  <p className="text-[11px] text-muted-foreground">Bookings</p>
                </div>
              </div>
              {p.milestones.length ? (
                <div className="space-y-1.5">
                  {p.milestones.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="flex items-center gap-2">
                        <span>{m.progress}%</span>
                        <Badge tone={statusTone(m.status)}>{titleCase(m.status)}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {p.delayedMilestones.length ? (
                <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                  {p.delayedMilestones.length} milestone{p.delayedMilestones.length > 1 ? 's' : ''} past due: {p.delayedMilestones.map((m: any) => m.name).join(', ')}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      <Disclaimer text={data.disclaimer} />
    </div>
  );
}

/* ------------------------------------------------------------------ Reports */
const REPORT_PROMPTS = [
  'Generate this month sales report',
  'Compare all projects performance',
  'Show the top five sales executives',
  'Summarize our pipeline and receivables',
];

export function ReportGeneratorPanel() {
  const [prompt, setPrompt] = useState('');
  const generate = useMutation({
    mutationFn: (p: string) => api<any>('/ai/reports/generate', { method: 'POST', body: JSON.stringify({ prompt: p }) }),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-accent" /> Report generator</CardTitle>
          <p className="text-sm text-muted-foreground">Request a structured report using your authorized ERP data.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Generate this month sales report" />
          <Button className="w-full" onClick={() => prompt.trim().length > 2 && generate.mutate(prompt.trim())} loading={generate.isPending} disabled={prompt.trim().length < 3}>
            <Sparkles className="h-4 w-4" /> Generate report
          </Button>
          <div className="space-y-1.5 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
            {REPORT_PROMPTS.map((p) => (
              <button key={p} onClick={() => { setPrompt(p); generate.mutate(p); }} className="w-full rounded-lg border bg-card/60 px-3 py-2 text-left text-xs transition hover:border-accent/40 hover:bg-muted">
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Generated report</CardTitle>
          {generate.data ? <AiBadge engine={generate.data.engine} /> : null}
        </CardHeader>
        <CardContent>
          {generate.isPending ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Compiling report from your live data…
            </div>
          ) : generate.isError ? (
            <p className="text-sm text-destructive">{(generate.error as Error).message}</p>
          ) : generate.data ? (
            <div className="space-y-3">
              <MarkdownLite text={generate.data.content} />
              <Disclaimer text={generate.data.disclaimer} />
            </div>
          ) : (
            <EmptyState icon={<FileBarChart2 className="h-5 w-5" />} title="No report yet" description="Pick a prompt on the left or write your own request." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
