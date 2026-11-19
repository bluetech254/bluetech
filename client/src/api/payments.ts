import axios from 'axios';

const baseURL = (import.meta.env.VITE_PAYMENTS_API_URL as string) || '';

const paymentsApi = axios.create({
  baseURL,
  headers: { 'X-API-Key': (import.meta.env.VITE_PAYMENTS_API_KEY as string) || '' },
});

export interface InitiateOrderResponse {
  reference: string;
  external_reference?: string;
  gateway: string;
  requires_stk: boolean;
  amount_kes: number;
  message?: string;
}

export interface VerifyOrderResponse {
  status: string;
  reference: string;
  amount_kes?: number;
  gateway?: string;
}

export const initiateOrderPayment = async (orderId: string): Promise<InitiateOrderResponse> => {
  const res = await paymentsApi.post(`/api/v1/order/${orderId}/initiate`, {});
  return res.data;
};

export const verifyOrderPayment = async (reference: string): Promise<VerifyOrderResponse> => {
  const res = await paymentsApi.post(`/api/v1/order/verify/${reference}`, {});
  return res.data;
};

export const getOrderPaymentStatus = async (
  orderId: string,
): Promise<{ payment_status: string; payment_receipt?: string }> => {
  const res = await paymentsApi.get(`/api/v1/order/${orderId}/status`);
  return res.data;
};

export default paymentsApi;

export const initiateBookingFinalPayment = async (bookingId: string): Promise<InitiateOrderResponse> => {
  const res = await paymentsApi.post(`/api/v1/booking/${bookingId}/final/request`, {});
  return res.data;
};

export const verifyBookingFinalPayment = async (reference: string): Promise<VerifyOrderResponse> => {
  const res = await paymentsApi.post(`/api/v1/booking/final/verify/${reference}`, {});
  return res.data;
};

export const getBookingFinalPaymentStatus = async (bookingId: string) => {
  const res = await paymentsApi.get(`/api/v1/booking/${bookingId}/final/status`);
  return res.data;
};
