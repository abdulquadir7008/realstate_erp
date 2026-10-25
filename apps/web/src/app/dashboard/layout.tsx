'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';
import { AppShell } from '@/components/shell/app-shell';
import { WorkspaceProvider } from '@/components/shell/workspace';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    const user = getUser();
    if (user?.isCustomer) {
      router.replace('/portal');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
