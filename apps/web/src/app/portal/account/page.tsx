'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, User } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, relativeTime } from '@/lib/utils';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton } from '@/components/ui';

export default function PortalAccountPage() {
  const qc = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['portal', 'session'],
    queryFn: () => api<any>('/portal/session'),
  });

  const { data: notifications } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => api<any>('/portal/notifications'),
  });

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: '', city: '', state: '', pincode: '' });
  useEffect(() => {
    const c = session?.customer;
    if (c) {
      setForm({
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        state: c.state ?? '',
        pincode: c.pincode ?? '',
      });
    }
  }, [session?.customer]);

  const save = useMutation({
    mutationFn: () => api<any>('/portal/profile', { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'session'] });
      qc.invalidateQueries({ queryKey: ['portal', 'overview'] });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications &amp; profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stay on top of updates and keep your contact details current.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" /> Notifications
            </CardTitle>
            {notifications?.unread ? <span className="text-xs font-medium text-accent">{notifications.unread} unread</span> : null}
          </CardHeader>
          <CardContent className="max-h-[480px] space-y-2 overflow-y-auto scrollbar-thin">
            {!notifications ? (
              <Skeleton className="h-48 w-full" />
            ) : !notifications.items?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.items.map((n: any) => (
                <div key={n.id} className={cn('rounded-lg border px-3 py-2.5', !n.readAt ? 'border-accent/30 bg-accent/5' : 'bg-card/50')}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent" /> My profile
            </CardTitle>
            {save.isSuccess ? <span className="text-xs font-medium text-success">Saved</span> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {session?.customer ? (
              <>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Customer ID {session.customer.customerCode ?? session.customer.id.slice(0, 8)} · {session.user?.email}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First name</Label>
                    <Input className="mt-1.5" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input className="mt-1.5" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input className="mt-1.5" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input className="mt-1.5" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input className="mt-1.5" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input className="mt-1.5" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                  </div>
                </div>
                {save.isError ? <p className="text-sm text-destructive">{(save.error as Error).message}</p> : null}
                <Button onClick={() => save.mutate()} loading={save.isPending}>
                  <CheckCheck className="h-4 w-4" /> Save changes
                </Button>
              </>
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
