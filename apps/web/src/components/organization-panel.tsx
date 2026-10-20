'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Field } from '@/lib/modules';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { RecordForm } from '@/components/record-form';

const profileFields: Field[] = [
  { name: 'name', label: 'Organization Name', type: 'text', required: true, colSpan: 2 },
  { name: 'legalName', label: 'Legal Name', type: 'text', colSpan: 2 },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'website', label: 'Website', type: 'text' },
  { name: 'gstin', label: 'GSTIN', type: 'text' },
  { name: 'pan', label: 'PAN', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'country', label: 'Country', type: 'text' },
  { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
];

const settingsFields: Field[] = [
  { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'INR' },
  { name: 'locale', label: 'Locale', type: 'text', defaultValue: 'en-IN' },
  { name: 'gstPercent', label: 'GST %', type: 'number', defaultValue: 18 },
  { name: 'cgstPercent', label: 'CGST %', type: 'number', defaultValue: 9 },
  { name: 'sgstPercent', label: 'SGST %', type: 'number', defaultValue: 9 },
  { name: 'igstPercent', label: 'IGST %', type: 'number', defaultValue: 18 },
  { name: 'lateFeePercent', label: 'Late Fee %', type: 'number', defaultValue: 0 },
  { name: 'fiscalYearStartMonth', label: 'Fiscal Year Start Month', type: 'number', defaultValue: 4 },
  { name: 'bookingPrefix', label: 'Booking Prefix', type: 'text', defaultValue: 'BKG' },
  { name: 'leadPrefix', label: 'Lead Prefix', type: 'text', defaultValue: 'LD' },
  { name: 'customerPrefix', label: 'Customer Prefix', type: 'text', defaultValue: 'CUS' },
  { name: 'demandPrefix', label: 'Demand Prefix', type: 'text', defaultValue: 'DM' },
  { name: 'receiptPrefix', label: 'Receipt Prefix', type: 'text', defaultValue: 'RCP' },
  { name: 'invoicePrefix', label: 'Invoice Prefix', type: 'text', defaultValue: 'INV' },
  { name: 'ticketPrefix', label: 'Ticket Prefix', type: 'text', defaultValue: 'TKT' },
  { name: 'poPrefix', label: 'PO Prefix', type: 'text', defaultValue: 'PO' },
  { name: 'grnPrefix', label: 'GRN Prefix', type: 'text', defaultValue: 'GRN' },
  { name: 'emailNotifications', label: 'Email Notifications', type: 'checkbox', defaultValue: true },
  { name: 'paymentReminders', label: 'Payment Reminders', type: 'checkbox', defaultValue: true },
  { name: 'reminderDaysBefore', label: 'Reminder Days Before', type: 'number', defaultValue: 3 },
  { name: 'aiEnabled', label: 'AI Enabled', type: 'checkbox' },
  { name: 'whatsappEnabled', label: 'WhatsApp Enabled', type: 'checkbox' },
];

const SUBMODULES = [
  { label: 'Branches', slug: 'branches' },
  { label: 'Departments', slug: 'departments' },
  { label: 'Financial Years', slug: 'financial-years' },
  { label: 'Tax Rates', slug: 'tax-rates' },
];

export function OrganizationPanel() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'profile' | 'settings' | null>(null);

  async function load() {
    try {
      const [p, s] = await Promise.all([api<any>('/organization'), api<any>('/organization/settings')]);
      setProfile(p);
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organization');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Organization</h1>
          <p className="text-sm text-muted-foreground">Company profile, preferences and structure.</p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <Button variant="outline" className="h-8" onClick={() => setEditing('profile')}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {profile ? (
              Object.entries(profile)
                .filter(([k, v]) => !['id', 'settings', 'createdAt', 'updatedAt', 'deletedAt'].includes(k) && (typeof v === 'string' || typeof v === 'number'))
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="font-medium">{String(v)}</p>
                  </div>
                ))
            ) : (
              <p className="text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Settings</CardTitle>
            <Button variant="outline" className="h-8" onClick={() => setEditing('settings')}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {settings ? (
              Object.entries(settings)
                .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="font-medium">{String(v)}</p>
                  </div>
                ))
            ) : (
              <p className="text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Structure</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SUBMODULES.map((s) => (
            <Link key={s.slug} href={`/dashboard/${s.slug}`}>
              <Button variant="outline">{s.label}</Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {editing === 'profile' ? (
        <RecordForm
          open
          title="Edit Profile"
          fields={profileFields}
          initial={profile}
          onSubmit={async (v) => {
            await api('/organization', { method: 'PATCH', body: JSON.stringify(v) });
            await load();
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {editing === 'settings' ? (
        <RecordForm
          open
          title="Edit Settings"
          fields={settingsFields}
          initial={settings}
          onSubmit={async (v) => {
            await api('/organization/settings', { method: 'PATCH', body: JSON.stringify(v) });
            await load();
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
