'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Search, Sparkles } from 'lucide-react';
import { NAV, QUICK_ACTIONS } from '@/lib/nav';
import { can, getUser } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Command {
  label: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useMemo(() => getUser(), []);

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = NAV.flatMap((g) =>
      g.items
        .filter((i) => can(user, i.perm ?? ''))
        .map((i) => ({ label: i.label, href: i.href, group: g.title, icon: i.icon })),
    );
    const actions: Command[] = QUICK_ACTIONS.filter((a) => can(user, a.perm ?? '')).map((a) => ({
      label: a.label,
      href: a.href,
      group: 'Quick actions',
      icon: a.icon,
    }));
    return [...actions, ...nav];
  }, [user]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 24);
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)).slice(0, 24);
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  function run(cmd?: Command) {
    const target = cmd ?? filtered[active];
    if (!target) return;
    onOpenChange(false);
    router.push(target.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-pop"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search modules, actions and records…"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2 scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">No results for “{query}”.</p>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  const prev = filtered[i - 1];
                  const showGroup = !prev || prev.group !== cmd.group;
                  return (
                    <div key={`${cmd.group}-${cmd.label}`}>
                      {showGroup ? (
                        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cmd.group}</p>
                      ) : null}
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => run(cmd)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                          i === active ? 'bg-accent/10 text-foreground' : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', i === active ? 'text-accent' : '')} />
                        <span className="flex-1 font-medium">{cmd.label}</span>
                        {i === active ? <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" /> : <ArrowRight className="h-3.5 w-3.5 opacity-0" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" /> EstateFlow AI
              </span>
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
