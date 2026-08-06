import api from './axios';

export interface PointsData {
  points_balance: number;
  referral_code: string;
  can_redeem: boolean;
  redeem_minimum: number;
  earn_rate: string;
  referral_bonus: number;
}

export interface PointsHistoryItem {
  id: string;
  type: string;
  points: number;
  reason: string;
  created_at: string;
}

export const getMyPoints = async (): Promise<PointsData> => {
  const res = await api.get('/points/me');
  return res.data;
};

export const getPointsHistory = async (): Promise<PointsHistoryItem[]> => {
  const res = await api.get('/points/history');
  return res.data.data ?? [];
};
