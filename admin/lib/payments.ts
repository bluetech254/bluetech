/**
 * lib/payments.ts
 *
 * Payments microservice API client (separate host from the backend API).
 * All requests need the shared X-API-Key (server-side secret baked at build time).
 */
const BASE = process.env.NEXT_PUBLIC_PAYMENTS_API_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_PAYMENTS_API_KEY ?? "";

export async function paymentsRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": KEY,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Payments API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface FinalRequestResponse {
  reference: string;
  external_reference?: string;
  gateway: string;
  requires_stk: boolean;
  amount_kes: number;
  message?: string;
}

export const initiateFinalPayment = (bookingId: string) =>
  paymentsRequest<FinalRequestResponse>(`/api/v1/booking/${bookingId}/final/request`, {
    method: "POST",
    body: {},
  });

export const verifyFinalPayment = (reference: string) =>
  paymentsRequest<{ status: string; reference: string }>(
    `/api/v1/booking/final/verify/${reference}`,
    { method: "POST", body: {} },
  );

export const getFinalPaymentStatus = (bookingId: string) =>
  paymentsRequest<{
    final_payment_status: string;
    final_receipt?: string;
    final_cost?: number;
    pickup_fee?: number;
    commitment_fee?: number;
  }>(`/api/v1/booking/${bookingId}/final/status`);

export const initiateOrderPayment = (orderId: string) =>
  paymentsRequest<FinalRequestResponse>(`/api/v1/order/${orderId}/initiate`, {
    method: "POST",
    body: {},
  });

export const verifyOrderPayment = (reference: string) =>
  paymentsRequest<{ status: string; reference: string }>(
    `/api/v1/order/verify/${reference}`,
    { method: "POST", body: {} },
  );

export const getOrderPaymentStatus = (orderId: string) =>
  paymentsRequest<{
    payment_status: string;
    payment_receipt?: string;
    payment_reference?: string;
  }>(`/api/v1/order/${orderId}/status`);
