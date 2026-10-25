export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010/api/v1';

const ACCESS_KEY = 're_access_token';
const REFRESH_KEY = 're_refresh_token';
const USER_KEY = 're_user';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  scope?: 'TENANT' | 'SAAS' | string;
  organizationId?: string | null;
  organization?: { id: string; name: string; slug?: string; status?: string } | null;
  roles?: { code: string; name: string }[];
  permissions?: string[];
  isCustomer?: boolean;
  branchId?: string | null;
  designation?: string | null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setSession(data: { accessToken: string; refreshToken?: string; user: AuthUser }) {
  window.localStorage.setItem(ACCESS_KEY, data.accessToken);
  if (data.refreshToken) window.localStorage.setItem(REFRESH_KEY, data.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
  }

  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }

  if (!res.ok) {
    const message =
      body?.message ||
      (typeof body?.error === 'string' ? body.error : body?.error?.message) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return (body?.data ?? body) as T;
}

export async function login(email: string, password: string) {
  const data = await api<{ tokens: { accessToken: string; refreshToken: string }; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSession({ accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken, user: data.user });
  return data.user;
}

/** Permission helper — wildcard owners/admins pass every check. */
export function can(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function hasAny(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  if (perms.includes('*')) return true;
  return permissions.some((p) => perms.includes(p));
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  }
  const out = s.toString();
  return out ? `?${out}` : '';
}
