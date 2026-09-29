/**
 * api/axios.ts — Axios instance shared by all API modules.
 *
 * - Bearer token injected from tokenStore (never read sessionStorage directly)
 * - Expired token caught before the request is sent (avoids wasted round-trip)
 * - 401 response: clear session + redirect to /login + dispatch event so
 *   AuthContext can sync its in-memory state without a circular import
 */
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getToken, isTokenExpired, clearSession } from '../utils/tokenStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    // If the stored token is already expired, evict it before sending
    if (isTokenExpired()) {
      clearSession();
      // Let the request through without a token — backend will return 401
      // which the response interceptor handles below.
      return config;
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────────────────

/**
 * Dispatched when the session is forcibly ended due to a 401.
 * AuthContext listens for this to sync its in-memory state.
 */
export const SESSION_EXPIRED_EVENT = 'bluetech:session-expired';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      // Notify AuthContext without a direct import (avoids circular deps)
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      // Redirect to login, preserving the current path so the user can
      // return after re-authenticating.
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnTo=${returnTo}`;
    }
    return Promise.reject(error);
  },
);

export default api;
