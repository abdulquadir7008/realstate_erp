'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';
import { AppShell } from '@/components/shell/app-shell';
import { WorkspaceProvider } from '@/components/shell/workspace';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    const user = getUser();
    if (user?.isCustomer) router.replace('/portal');
  }, [router]);

  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
