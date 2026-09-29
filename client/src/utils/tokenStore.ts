/**
 * utils/tokenStore.ts — Single source of truth for auth token storage.
 *
 * All reads/writes/clears go through here. Nothing else touches sessionStorage
 * directly for auth data. Swapping storage strategy (e.g. to memory-only or
 * a cookie-backed approach) is a one-file change.
 */

const KEYS = {
  TOKEN:  'bluetech_token',
  USER:   'bluetech_user',
  EXPIRY: 'bluetech_token_expiry',
} as const;

// ── Token ─────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return sessionStorage.getItem(KEYS.TOKEN);
}

export function setToken(token: string, expiresInSeconds?: number): void {
  sessionStorage.setItem(KEYS.TOKEN, token);
  if (expiresInSeconds) {
    sessionStorage.setItem(KEYS.EXPIRY, String(Date.now() + expiresInSeconds * 1000));
  } else {
    sessionStorage.removeItem(KEYS.EXPIRY);
  }
}

export function removeToken(): void {
  sessionStorage.removeItem(KEYS.TOKEN);
  sessionStorage.removeItem(KEYS.EXPIRY);
}

// ── Expiry ────────────────────────────────────────────────────────────────────

export function isTokenExpired(): boolean {
  const expiry = sessionStorage.getItem(KEYS.EXPIRY);
  if (!expiry) return false; // no expiry set → treat as valid
  return Date.now() > parseInt(expiry, 10);
}

export function getTokenExpiry(): number | null {
  const expiry = sessionStorage.getItem(KEYS.EXPIRY);
  return expiry ? parseInt(expiry, 10) : null;
}

// ── User cache ────────────────────────────────────────────────────────────────

/** Only safe, non-sensitive fields are stored. */
export interface StoredUser {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  points?: number;
  is_verified?: boolean;
  referral_code?: string;
}

const SAFE_FIELDS: (keyof StoredUser)[] = [
  'id', 'full_name', 'phone_number', 'email', 'points', 'is_verified', 'referral_code',
];

export function setUser(user: Record<string, unknown>): void {
  const safe: Partial<StoredUser> = {};
  for (const field of SAFE_FIELDS) {
    if (field in user) (safe as any)[field] = user[field];
  }
  sessionStorage.setItem(KEYS.USER, JSON.stringify(safe));
}

export function getUser(): StoredUser | null {
  const raw = sessionStorage.getItem(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function removeUser(): void {
  sessionStorage.removeItem(KEYS.USER);
}

// ── Full clear ────────────────────────────────────────────────────────────────

export function clearSession(): void {
  sessionStorage.removeItem(KEYS.TOKEN);
  sessionStorage.removeItem(KEYS.USER);
  sessionStorage.removeItem(KEYS.EXPIRY);
}
