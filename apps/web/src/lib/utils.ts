import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AVATAR_FALLBACK = 'User';

export function initialsOf(name?: string | null) {
  if (!name) return AVATAR_FALLBACK.slice(0, 2).toUpperCase();
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatCurrency(value: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toLocaleString()}`;
  }
}

export function formatCompactCurrency(value: number, currency = 'INR') {
  const abs = Math.abs(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      notation: abs >= 1_00_000 ? 'compact' : 'standard',
      maximumFractionDigits: abs >= 1_00_000 ? 1 : 0,
    }).format(value || 0);
  } catch {
    return formatCurrency(value, currency);
  }
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { notation: Math.abs(value) >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0);
}

export function formatPercent(value: number, digits = 1) {
  return `${(value || 0).toFixed(digits)}%`;
}

export function titleCase(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function relativeTime(input?: string | Date | null) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function statusTone(value?: string | boolean | null): Tone {
  if (typeof value === 'boolean') return value ? 'success' : 'default';
  const v = String(value ?? '').toUpperCase();
  if (['ACTIVE', 'CONFIRMED', 'COMPLETED', 'DONE', 'PAID', 'SUCCESS', 'SOLD', 'PRESENT', 'AVAILABLE', 'APPROVED', 'PASS', 'VERIFIED', 'RECEIVED', 'RESOLVED', 'CONVERTED', 'TRUE', 'ISSUED'].includes(v)) return 'success';
  if (['PENDING', 'IN_PROGRESS', 'PARTIAL', 'DUE', 'NEW', 'OPEN', 'DRAFT', 'QUALIFIED', 'CONDITIONAL', 'SUBMITTED', 'CONTACTED', 'ASSIGNED', 'RESERVED', 'AGREEMENT_PENDING'].includes(v)) return 'info';
  if (['OVERDUE', 'CANCELLED', 'LOST', 'REJECTED', 'FAILED', 'ABSENT', 'FAIL', 'BLACKLISTED', 'FALSE', 'UNQUALIFIED', 'URGENT'].includes(v)) return 'danger';
  if (['ON_HOLD', 'HOLD', 'NEGOTIATION', 'SITE_VISIT', 'WAITING_CUSTOMER', 'BLOCKED', 'MEDIUM'].includes(v)) return 'warning';
  return 'default';
}
