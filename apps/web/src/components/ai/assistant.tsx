'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquarePlus, Send, Sparkles, Trash2, User, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, relativeTime } from '@/lib/utils';
import { Button, Spinner, Textarea } from '@/components/ui';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  meta?: { provider?: string; model?: string; tools?: string[] } | null;
  createdAt: string;
}

const SUGGESTIONS = [
  'How are we doing overall right now?',
  'What is our total outstanding and who are the top debtors?',
  'Show sales vs collections for the last 6 months.',
  'Summarize our lead pipeline and conversion.',
  'Which construction tasks are due in the next two weeks?',
];

export function AssistantPanel() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: convoData } = useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => api<{ items: Conversation[] } | Conversation[]>('/ai/conversations?limit=40'),
  });
  const conversations: Conversation[] = useMemo(() => (Array.isArray(convoData) ? convoData : convoData?.items ?? []), [convoData]);

  const { data: convo } = useQuery({
    queryKey: ['ai', 'conversation', activeId],
    queryFn: () => api<Conversation & { messages: Message[] }>(`/ai/conversations/${activeId}`),
    enabled: Boolean(activeId),
  });

  const createConvo = useMutation({
    mutationFn: () => api<Conversation>('/ai/conversations', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      setActiveId(c.id);
    },
  });

  const deleteConvo = useMutation({
    mutationFn: (id: string) => api(`/ai/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      if (activeId === id) setActiveId(null);
    },
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      let id = activeId;
      if (!id) {
        const created = await api<Conversation>('/ai/conversations', { method: 'POST', body: JSON.stringify({}) });
        id = created.id;
        setActiveId(id);
      }
      return api(`/ai/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai', 'conversation'] });
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [convo?.messages?.length, send.isPending]);

  function submit(text?: string) {
    const content = (text ?? input).trim();
    if (!content || send.isPending) return;
    setInput('');
    send.mutate(content);
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[480px] flex-col gap-4 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col rounded-xl border bg-card lg:w-72">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Conversations</p>
          <Button size="sm" variant="subtle" onClick={() => createConvo.mutate()} loading={createConvo.isPending}>
            <MessageSquarePlus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet. Start chatting with the assistant.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={cn('group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition', activeId === c.id ? 'bg-accent/10 text-foreground' : 'hover:bg-muted')}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setActiveId(c.id)}>
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c._count?.messages ?? 0} messages · {relativeTime(c.updatedAt)}
                  </p>
                </button>
                <button className="opacity-0 transition group-hover:opacity-100" onClick={() => deleteConvo.mutate(c.id)} aria-label="Delete conversation">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin md:p-6">
          {!convo || convo.messages.length === 0 ? (
            <EmptyChat onPick={submit} />
          ) : (
            <AnimatePresence initial={false}>
              {convo.messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </AnimatePresence>
          )}
          {send.isPending ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Bot className="h-4 w-4 text-accent" />
              </span>
              <span className="flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" /> Analysing your data…
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t p-3 md:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Ask EstateFlow AI… (Ctrl/⌘ + Enter to send)"
              rows={2}
              className="min-h-[52px] resize-none"
            />
            <Button className="h-11" onClick={() => submit()} disabled={!input.trim() || send.isPending}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
          {send.isError ? <p className="mt-2 text-xs text-destructive">{(send.error as Error).message}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient shadow-glow">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">How can I help you today?</h2>
      <p className="mt-1 text-sm text-muted-foreground">I can analyse sales, collections, dues, leads, inventory and construction using your live data.</p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border bg-card/60 px-4 py-3 text-left text-sm transition hover:border-accent/40 hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const tools = message.meta?.tools ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', isUser ? 'bg-primary text-primary-foreground' : 'bg-accent/10 text-accent')}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={cn('min-w-0 max-w-[85%] rounded-xl px-4 py-3 text-sm', isUser ? 'bg-primary text-primary-foreground' : 'border bg-card/60')}>
        <MarkdownLite text={message.content} />
        {!isUser && tools.length ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
            <Wrench className="h-3 w-3 text-muted-foreground" />
            {tools.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = (text ?? '').split('\n');
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;
        if (/^#{1,6}\s/.test(trimmed)) {
          return (
            <p key={i} className="font-semibold">
              {renderInline(trimmed.replace(/^#{1,6}\s/, ''))}
            </p>
          );
        }
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
              <span>{renderInline(trimmed.replace(/^[-*]\s/, ''))}</span>
            </p>
          );
        }
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
