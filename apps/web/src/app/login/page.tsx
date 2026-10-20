'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Building2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { login } from '@/lib/api';
import { Button, Input, Label } from '@/components/ui';

const FEATURES = [
  { icon: BarChart3, title: 'Revenue intelligence', text: 'Live collections, outstanding dues and sales performance across every project.' },
  { icon: Sparkles, title: 'AI command center', text: 'A tenant-safe assistant that answers questions about your real business data.' },
  { icon: ShieldCheck, title: 'Enterprise control', text: 'Granular roles, permissions and strict multi-tenant data isolation.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('Passw0rd1');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      router.replace(user.isCustomer ? '/portal' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden navy-gradient p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-electric/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">EstateFlow AI</span>
        </div>

        <div className="relative mt-auto max-w-md">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl font-semibold leading-tight tracking-tight text-gradient">
            The AI-first operating system for real estate.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="mt-4 text-sm leading-relaxed text-white/70">
            Sell faster, collect on time and run every project from a single premium workspace.
          </motion.p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.12 + i * 0.08 }} className="flex gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <f.icon className="h-5 w-5 text-electric" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">{f.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Multi-tenant SaaS
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> SOC-ready RBAC
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">EstateFlow AI</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your workspace to continue.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@company.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
              </div>
            </div>

            {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'} {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border bg-card p-3.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo credentials</p>
            <p className="mt-1">john@example.com · Passw0rd1 (owner)</p>
            <p>asha@demo.com · Passw0rd1 (customer portal)</p>
            <p>superadmin@properp.local · SuperAdmin@123 (platform)</p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">EstateFlow AI</Link> · Real Estate ERP, CRM & Intelligence
          </p>
        </motion.div>
      </div>
    </div>
  );
}
