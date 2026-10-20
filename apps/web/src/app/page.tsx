'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    router.replace(getUser()?.isCustomer ? '/portal' : '/dashboard');
  }, [router]);
  return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading EstateFlow AI…</main>;
}
