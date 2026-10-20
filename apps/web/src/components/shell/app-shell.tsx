'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Command,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { NAV, type NavItem } from '@/lib/nav';
import { api, can, clearSession, getToken, getUser, type AuthUser } from '@/lib/api';
import { AVATAR_FALLBACK, cn, initialsOf } from '@/lib/utils';
import { Badge, Button, Spinner } from '@/components/ui';
import { CommandPalette } from './command-palette';
import { useWorkspace } from './workspace';

const COLLAPSE_KEY = 're_sidebar_collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleCollapse() {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} user={user} onToggleCollapse={toggleCollapse} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={() => {
            clearSession();
            router.replace('/login');
          }}
        />
        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

/* ------------------------------------------------------------------ Sidebar */
function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  user,
  onToggleCollapse,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: AuthUser | null;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(user, i.perm ?? '')) })).filter((g) => g.items.length > 0),
    [user],
  );

  const content = (
    <div className="flex h-full flex-col navy-gradient text-sidebar-foreground">
      <div className={cn('flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl brand-gradient shadow-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">EstateFlow AI</p>
            <p className="truncate text-[11px] text-sidebar-muted">{user?.organization?.name ?? 'Workspace'}</p>
          </div>
        ) : null}
        <button onClick={onCloseMobile} className="ml-auto rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed ? (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">{group.title}</p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(pathname, item.href)} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="mx-3 mb-3 rounded-xl border border-sidebar-border bg-white/[0.04] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI credits
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-muted">Ask the assistant about sales, collections, leads and construction.</p>
          <Link href="/dashboard/ai" className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">
            Open Command Center <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      <button
        onClick={onToggleCollapse}
        className="hidden items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-muted transition hover:bg-white/5 hover:text-white lg:flex"
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed ? <span>Collapse</span> : null}
      </button>
    </div>
  );

  return (
    <>
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-300 lg:block', collapsed ? 'w-[76px]' : 'w-[264px]')}>{content}</aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
            <motion.div className="absolute left-0 top-0 h-full w-[280px]" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              {content}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
          collapsed && 'justify-center px-0',
          active ? 'bg-white/10 text-white' : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
        )}
      >
        {active ? <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" /> : null}
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : '')} />
        {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
        {!collapsed && item.badge === 'ai' ? <Badge tone="accent" className="bg-accent/20 text-accent">AI</Badge> : null}
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ Topbar */
function Topbar({
  user,
  onOpenPalette,
  onOpenMobile,
  onLogout,
}: {
  user: AuthUser | null;
  onOpenPalette: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <button onClick={onOpenMobile} className="rounded-lg border p-2 lg:hidden">
        <Menu className="h-4 w-4" />
      </button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onOpenPalette}
          className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition hover:border-accent/40 md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="w-32 text-left">Search…</span>
          <kbd className="flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
        <button onClick={onOpenPalette} className="rounded-lg border p-2 md:hidden">
          <Search className="h-4 w-4" />
        </button>

        <ProjectSwitcher />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const flat = useMemo(() => NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))), []);
  const match = flat.find((i) => isActive(pathname, i.href));
  return (
    <nav className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
      <span className="text-muted-foreground">Workspace</span>
      {match ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate font-medium">{match.label}</span>
        </>
      ) : null}
    </nav>
  );
}

function ProjectSwitcher() {
  const { projects, projectId, setProjectId, currentProject } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[180px] items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition hover:border-accent/40"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{currentProject ? currentProject.name : 'All projects'}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 z-50 mt-2 max-h-72 w-60 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-pop scrollbar-thin"
            >
              <button
                onClick={() => {
                  setProjectId(null);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <span>All projects</span>
                {!projectId ? <Check className="h-4 w-4 text-accent" /> : null}
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProjectId(p.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="truncate">{p.name}</span>
                  {projectId === p.id ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              ))}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-lg border bg-card p-2 shadow-sm transition hover:border-accent/40"
      aria-label="Toggle theme"
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => api<any>('/notifications?limit=8'),
    refetchInterval: 60_000,
  });
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const unread = items.filter((n) => !n.isRead).length;

  async function markAll() {
    await api('/notifications/read-all', { method: 'POST', body: '{}' });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-lg border bg-card p-2 shadow-sm transition hover:border-accent/40" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{unread}</span> : null}
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover shadow-pop">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <button onClick={markAll} className="text-xs text-accent hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {items.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
                ) : (
                  items.map((n) => (
                    <div key={n.id} className={cn('border-b px-4 py-3 last:border-0', !n.isRead && 'bg-accent/5')}>
                      <div className="flex items-start gap-2">
                        {!n.isRead ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : <span className="mt-1.5 h-2 w-2 shrink-0" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{n.title}</p>
                          {n.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || AVATAR_FALLBACK : 'User';
  const role = user?.roles?.[0]?.name ?? 'Member';
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border bg-card p-1 pr-2.5 shadow-sm transition hover:border-accent/40">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">{initialsOf(name)}</span>
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-popover shadow-pop">
              <div className="border-b px-4 py-3">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                <Badge tone="accent" className="mt-2">{role}</Badge>
              </div>
              <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-muted">
                Profile & settings
              </Link>
              <button onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
