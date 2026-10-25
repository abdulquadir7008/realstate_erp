'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { BadgeCheck, Building2, Cpu, Moon, Sparkles, Sun, User } from 'lucide-react';
import { api, getUser } from '@/lib/api';
import { AVATAR_FALLBACK, initialsOf } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, Separator, Spinner } from '@/components/ui';

export default function SettingsPage() {
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => setUser(getUser()), []);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: ai, isLoading } = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api<any>('/ai/status') });

  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || AVATAR_FALLBACK : AVATAR_FALLBACK;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile, workspace and AI configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">{initialsOf(name)}</span>
            <div>
              <p className="text-base font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(Array.isArray(user?.roles) ? user.roles : []).map((r) => (
                  <Badge key={r.code} tone="accent">
                    {r.name ?? r.code}
                  </Badge>
                ))}
                {user?.designation ? <Badge>{user.designation}</Badge> : null}
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permissions</p>
              <p className="mt-1 text-sm">{(user?.permissions ?? []).includes('*') ? 'Full access (owner/admin)' : `${user?.permissions?.length ?? 0} granted`}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Branch</p>
              <p className="mt-1 text-sm">{user?.branchId ?? 'All branches'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
            <p className="mt-1 text-sm font-medium">{user?.organization?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</p>
            <p className="mt-1 text-sm">{user?.organization?.slug ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="mt-1 text-sm">
              <Badge tone="success">{user?.organization?.status ?? 'ACTIVE'}</Badge>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scope</p>
            <p className="mt-1 text-sm">{user?.scope ?? 'TENANT'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4" /> AI assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" /> Checking configuration…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge tone={ai?.mode === 'live' ? 'success' : 'info'}>{ai?.mode === 'live' ? 'Live LLM connected' : 'Offline deterministic engine'}</Badge>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Provider" value={ai?.provider ?? '—'} />
                <Field label="Model" value={ai?.model ?? '—'} />
                <Field label="API key" value={ai?.hasApiKey ? 'Configured' : 'Not set'} />
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available tools ({ai?.tools?.length ?? 0})</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(ai?.tools ?? []).map((t: any) => (
                    <span key={t.name} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
              {ai?.mode !== 'live' ? (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  To enable the live LLM, set <code className="font-mono">AI_ENABLED=true</code>, <code className="font-mono">AI_BASE_URL</code>, <code className="font-mono">AI_API_KEY</code> and optionally{' '}
                  <code className="font-mono">AI_MODEL</code> in the API environment, then restart the API. The assistant continues to work offline with real data in the meantime.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark.</p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm transition hover:border-accent/40"
          >
            {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5" /> EstateFlow AI · Real Estate ERP, CRM &amp; Intelligence
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}
