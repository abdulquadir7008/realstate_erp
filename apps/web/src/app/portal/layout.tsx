'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Building2,
  FileText,
  HardHat,
  Home,
  LogOut,
  Menu,
  MessageSquareWarning,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { clearSession, getToken, getUser, type AuthUser } from '@/lib/api';
import { cn } from '@/lib/utils';

const PORTAL_NAV = [
  { href: '/portal', label: 'Overview', icon: Home },
  { href: '/portal/properties', label: 'My property', icon: Building2 },
  { href: '/portal/payments', label: 'Payments & dues', icon: Wallet },
  { href: '/portal/documents', label: 'Documents', icon: FileText },
  { href: '/portal/construction', label: 'Construction', icon: HardHat },
  { href: '/portal/tickets', label: 'Support', icon: MessageSquareWarning },
  { href: '/portal/account', label: 'Notifications & profile', icon: Bell },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    const u = getUser();
    if (u && !u.isCustomer) {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading your portal…</main>;
  }

  const name = user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Customer';

  const nav = (
    <nav className="flex h-full flex-col navy-gradient text-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient shadow-glow">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">EstateFlow</p>
          <p className="text-[11px] text-white/50">Customer portal</p>
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {PORTAL_NAV.map((item) => {
          const active = item.href === '/portal' ? pathname === '/portal' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                active ? 'bg-white/12 font-medium text-white' : 'text-white/60 hover:bg-white/6 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/6 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{nav}</aside>
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              {nav}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted lg:hidden" aria-label="Open menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-sm font-semibold">Welcome, {name.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">Your booking, payments and home updates in one place.</p>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
