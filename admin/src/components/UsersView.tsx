import { useState } from 'react';
import { User } from '../types';
import { Users, Mail, Phone, Calendar, CheckCircle, XCircle, ShieldOff, ShieldCheck } from 'lucide-react';
import { databaseService } from '../lib/supabase';

interface UsersViewProps {
  users: User[];
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUsersUpdated: () => void;
}

export default function UsersView({ users, onShowToast, onUsersUpdated }: UsersViewProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleToggleActive = async (user: User) => {
    setLoadingId(user.id);
    try {
      const success = await databaseService.toggleUserActive(user.id, !user.is_active);
      if (success) {
        onUsersUpdated();
        onShowToast(`User ${user.full_name} ${!user.is_active ? 'activated' : 'deactivated'}`, 'success');
      } else {
        onShowToast('Failed to update user status', 'error');
      }
    } catch {
      onShowToast('Error updating user', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const sortedUsers = [...users].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            User Management
          </h2>
          <p className="text-slate-600 mt-1">Manage registered users ({users.length} total)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No users registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['User', 'Contact', 'Status', 'Registered', 'Last Sign In', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.is_active === false ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{user.full_name}</div>
                          <div className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4 text-slate-400" />{user.email}
                      </div>
                      {user.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />{user.phone_number}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {user.email_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="h-3 w-3" />Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                          <XCircle className="h-3 w-3" />Unverified
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-slate-700">{formatDate(user.created_at)}</div>
                          <div className="text-xs text-slate-500">{formatRelativeTime(user.created_at)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {user.last_sign_in_at ? (
                        <div>
                          <div className="text-slate-700">{formatDate(user.last_sign_in_at)}</div>
                          <div className="text-xs text-slate-500">{formatRelativeTime(user.last_sign_in_at)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={loadingId === user.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                          user.is_active === false
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {user.is_active === false
                          ? <><ShieldCheck className="h-3.5 w-3.5" />Activate</>
                          : <><ShieldOff className="h-3.5 w-3.5" />Deactivate</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
