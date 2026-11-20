/**
 * analytics.ts — Lightweight visitor tracking for Daily Ops F1.
 *
 * - session_id: anonymous UUID, stored in sessionStorage (clears on tab close)
 * - Fires POST /api/v1/analytics/page-view on every page navigation
 * - Never throws — a failed tracking call must never break a page load
 * - No cookies, no PII unless the user explicitly provides a phone (F4)
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const SESSION_KEY = "bt_session_id";

/** Generate a simple UUID v4 */
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Get or create an anonymous session id for this browser tab */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Detect device type from userAgent */
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

/** Parse UTM params from the current URL (only on first page load) */
function getUtmParams(): Record<string, string | undefined> {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source:   p.get("utm_source")   ?? undefined,
    utm_medium:   p.get("utm_medium")   ?? undefined,
    utm_campaign: p.get("utm_campaign") ?? undefined,
  };
}

let _utmCaptured = false;
let _cachedUtm: Record<string, string | undefined> = {};

/**
 * Track a page view. Call this on every route change.
 * Completely silent on failure.
 */
export async function trackPageView(path: string): Promise<void> {
  try {
    const sessionId = getSessionId();

    // UTM params only matter on the landing page — capture once per session
    if (!_utmCaptured) {
      _cachedUtm = getUtmParams();
      _utmCaptured = true;
    }

    const payload = {
      session_id:   sessionId,
      path,
      referrer:     document.referrer || undefined,
      device_type:  getDeviceType(),
      ..._cachedUtm,
    };

    // Fire and forget — don't await, don't block render
    fetch(`${API_BASE}/api/v1/analytics/page-view`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      // keepalive lets the request complete even if the page navigates away
      keepalive: true,
    }).catch(() => {
      // silently swallow — analytics must never surface errors to users
    });
  } catch {
    // silently swallow
  }
}
