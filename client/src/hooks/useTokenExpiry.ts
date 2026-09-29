/**
 * hooks/useTokenExpiry.ts
 *
 * Manages the auto-logout timer for a JWT token.
 * Reads expiry from tokenStore and fires the provided callback when it hits zero.
 *
 * Usage:
 *   useTokenExpiry(token, () => logout());
 */
import { useEffect } from 'react';
import { getTokenExpiry } from '../utils/tokenStore';

export function useTokenExpiry(
  token: string | null,
  onExpired: () => void,
): void {
  useEffect(() => {
    if (!token) return;

    const expiry = getTokenExpiry();
    if (!expiry) return; // no expiry stored — token has no explicit TTL

    const remaining = expiry - Date.now();

    if (remaining <= 0) {
      // Already expired at mount time
      onExpired();
      return;
    }

    const timer = setTimeout(() => {
      onExpired();
    }, remaining);

    return () => clearTimeout(timer);
    // onExpired is intentionally excluded from deps — callers should
    // memoize it (e.g. useCallback) if they need reactive updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
