import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Gift, Copy, Clock, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { getMyPoints, getPointsHistory, redeemPoints, PointsData, PointsHistoryItem } from '../../api/points';
import toast from 'react-hot-toast';

const typeLabel: Record<string, string> = {
  order_earn: 'Order Reward',
  referral_earn: 'Referral Bonus',
  redemption: 'Redeemed',
  admin_award: 'Bonus Award',
};

const typeColor: Record<string, string> = {
  order_earn: 'text-green-600',
  referral_earn: 'text-blue-600',
  redemption: 'text-red-500',
  admin_award: 'text-purple-600',
};

interface Props {
  /** compact = small card for profile sidebar; full = full page view */
  variant?: 'compact' | 'full';
}

export const PointsCard: React.FC<Props> = ({ variant = 'compact' }) => {
  const [data, setData] = useState<PointsData | null>(null);
  const [history, setHistory] = useState<PointsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    try {
      const [pts, hist] = await Promise.all([getMyPoints(), getPointsHistory()]);
      setData(pts);
      setHistory(hist);
    } catch {
      // silently fail — user may not have points yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyReferral = () => {
    if (!data?.referral_code) return;
    const link = `${window.location.origin}/register?ref=${data.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const handleRedeem = async () => {
    if (!data?.can_redeem) return;
    setRedeeming(true);
    try {
      const res = await redeemPoints(data.points_balance);
      toast.success(`Redeemed! KES ${res.discount_amount.toLocaleString()} discount applied to your next order.`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? e?.message ?? 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  const progressPct = Math.min((data.points_balance / data.redeem_minimum) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <span className="font-bold text-sm">Loyalty Points</span>
          </div>
          {variant === 'compact' && (
            <Link to="/points" className="text-white/70 hover:text-white text-xs flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="text-4xl font-black mb-1">{data.points_balance.toLocaleString()}</div>
        <div className="text-blue-200 text-xs mb-4">
          {data.can_redeem
            ? `Ready to redeem! Worth KES ${data.points_balance.toLocaleString()}`
            : `${(data.redeem_minimum - data.points_balance).toLocaleString()} pts to redeem`}
        </div>

        {/* Progress bar */}
        <div className="bg-white/20 rounded-full h-1.5 mb-4">
          <div
            className="bg-yellow-300 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Redeem button */}
        {data.can_redeem ? (
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-slate-900 font-black text-sm rounded-lg py-2.5 transition-colors"
          >
            <Zap className="w-4 h-4" />
            {redeeming ? 'Redeeming…' : `Redeem ${data.points_balance.toLocaleString()} pts → KES ${data.points_balance.toLocaleString()} off`}
          </button>
        ) : (
          <Link
            to="/shop"
            className="w-full mb-3 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-lg py-2.5 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Shop to earn points
          </Link>
        )}

        {/* Referral link */}
        <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-blue-200 font-semibold uppercase tracking-wide">Your Referral Link</div>
            <div className="font-mono text-[11px] text-white/80 truncate">
              {window.location.origin}/register?ref={data.referral_code}
            </div>
          </div>
          <button onClick={copyReferral} className="ml-2 p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* How to earn */}
      <div className="bg-white border border-slate-100 rounded-xl p-4">
        <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">How to Earn</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
            <div>
              <div className="text-xs font-bold text-slate-800">Shop & Earn</div>
              <div className="text-[11px] text-slate-500">{data.earn_rate} of every order on delivery</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg"><Gift className="w-4 h-4 text-blue-600" /></div>
            <div>
              <div className="text-xs font-bold text-slate-800">Refer a Friend</div>
              <div className="text-[11px] text-slate-500">+{data.referral_bonus} pts when they place their first order</div>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {(variant === 'full' || history.length > 0) && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Points History</span>
          </div>
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No transactions yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {(variant === 'compact' ? history.slice(0, 4) : history).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{typeLabel[item.type] ?? item.type}</div>
                    <div className="text-[11px] text-slate-400">{new Date(item.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <span className={`text-sm font-black ${typeColor[item.type] ?? 'text-slate-700'}`}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PointsCard;
