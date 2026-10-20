'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, FileBarChart2, LineChart, Sparkles, Target, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { AssistantPanel } from '@/components/ai/assistant';
import { FinanceInsightsPanel, LeadInsightsPanel, ProjectInsightsPanel, ReportGeneratorPanel } from '@/components/ai/intelligence';

interface Status {
  enabled: boolean;
  provider: string;
  model: string;
  mode: 'live' | 'offline';
  baseUrlHost?: string;
}

type Tab = 'assistant' | 'leads' | 'finance' | 'projects' | 'reports';

const TABS: { value: Tab; label: string; icon: typeof Bot }[] = [
  { value: 'assistant', label: 'Assistant', icon: Bot },
  { value: 'leads', label: 'Lead intelligence', icon: Target },
  { value: 'finance', label: 'Finance', icon: Wallet },
  { value: 'projects', label: 'Projects', icon: LineChart },
  { value: 'reports', label: 'Reports', icon: FileBarChart2 },
];

export default function AiCommandCenterPage() {
  const [tab, setTab] = useState<Tab>('assistant');
  const { data: status } = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api<Status>('/ai/status') });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl brand-gradient shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Command Center</h1>
            <p className="text-sm text-muted-foreground">Chat, lead scoring, financial forecasts and reports — all from your live ERP data.</p>
          </div>
        </div>
        {status ? (
          <Badge tone={status.mode === 'live' ? 'success' : 'info'}>
            <span className={cn('h-1.5 w-1.5 rounded-full', status.mode === 'live' ? 'bg-success' : 'bg-info')} />
            {status.mode === 'live' ? `Live AI · ${status.model}` : 'Offline engine (deterministic)'}
          </Badge>
        ) : null}
      </div>

      {status && status.mode !== 'live' ? (
        <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-foreground/80">
          <span className="font-semibold text-info">Offline mode.</span> Set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AI_ENABLED=true</code> and an{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">OPENAI_API_KEY</code> (or compatible) in <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> to enable generative
          narratives. All numbers below are computed from your real data either way.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                tab === t.value ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'assistant' ? <AssistantPanel /> : null}
      {tab === 'leads' ? <LeadInsightsPanel /> : null}
      {tab === 'finance' ? <FinanceInsightsPanel /> : null}
      {tab === 'projects' ? <ProjectInsightsPanel /> : null}
      {tab === 'reports' ? <ReportGeneratorPanel /> : null}
    </div>
  );
}
