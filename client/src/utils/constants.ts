// constants.ts — All runtime config read from environment variables.
// No hardcoded URLs or fallback values — missing vars fail loudly at startup.

const _apiBase = import.meta.env.VITE_API_BASE_URL;
if (!_apiBase) {
  throw new Error(
    '[BlueTech] VITE_API_BASE_URL is not set.\n' +
    'Add it to your .env file (dev) or Vercel environment variables (prod).\n' +
    'Example: VITE_API_BASE_URL=https://bluetechnology-y1f8.onrender.com/api/v1'
  );
}
export const API_BASE_URL: string = _apiBase;

export const MPESA_PAYBILL: string = import.meta.env.VITE_MPESA_PAYBILL ?? '';
export const APP_NAME: string      = import.meta.env.VITE_APP_NAME      ?? 'BlueTech';
