// src/components/AdminPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Settings, Users, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { NeonDB } from '../lib/neon';

type Tab = 'overview' | 'moon' | 'deposits' | 'withdrawals' | 'settings';

export default function AdminPage() {
  const { user, coins, transactions, updateCoinPrice, updateBalance } = useApp();

  // Works with either shape (DB uses is_admin; some older code used isAdmin)
  const isAdminFromUser = !!(user?.is_admin ?? (user as any)?.isAdmin);

  // When the in-memory user is stale, we can override it after checking Neon
  const [adminOverride, setAdminOverride] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [moonPrice, setMoonPrice] = useState('');
  const [moonSchedule, setMoonSchedule] = useState({ type: 'daily', percentage: '', direction: 'increase' });

  const [loadingQueues, setLoadingQueues] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  const isAllowed = isAdminFromUser || adminOverride;

  async function recheckAdmin() {
    const email = user?.email || localStorage.getItem('nova_user_email') || '';
    if (!email) return;
    try {
      setCheckingAdmin(true);
      const fresh = await NeonDB.getUserByEmail(email);
      setAdminOverride(!!fresh?.is_admin);
    } catch (e) {
      console.error('Admin recheck failed:', e);
    } finally {
      setCheckingAdmin(false);
    }
  }

  useEffect(() => {
    // If the user object isn't marked admin, verify against Neon once
    if (!isAdminFromUser && !adminOverride) {
      recheckAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminFromUser]);

  // ---- Data helpers --------------------------------------------------------
  const moonCoin = useMemo(() => coins.find((c) => c.symbol === 'MOON'), [coins]);
  const safePrice = (moonCoin?.price ?? 0) as number;
  const change = (moonCoin?.change24h ?? moonCoin?.change_24h ?? 0) as number;

  async function loadQueues() {
    if (!isAllowed) return;
    setLoadingQueues(true);
    try {
      const [deps, wds] = await Promise.all([
        NeonDB.getPendingTransactions('deposit'),
        NeonDB.getPendingTransactions('withdraw'),
      ]);
      setPendingDeposits(deps);
      setPendingWithdrawals(wds);
    } catch (e) {
      console.error('Failed to load pending queues:', e);
    } finally {
      setLoadingQueues(false);
    }
  }

  useEffect(() => {
    if (isAllowed) loadQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  // ---- Actions -------------------------------------------------------------
  const handleMoonPriceUpdate = async () => {
    if (!moonPrice) return;
    await updateCoinPrice('MOON', parseFloat(moonPrice));
    setMoonPrice('');
    alert('MOON price updated successfully!');
  };

  const handleScheduleMoonPrice = () => {
    if (!moonSchedule.percentage) return;
    alert(`MOON price scheduled to ${moonSchedule.direction} by ${moonSchedule.percentage}% ${moonSchedule.type}`);
  };

  /// Handle DEPOSIT actions using server-side helpers
const handleDepositAction = async (
  transactionId: string,
  action: 'approve' | 'reject'
) => {
  const tx = pendingDeposits.find((x) => x.id === transactionId);
  if (!tx) return;

  try {
    if (action === 'approve') {
      // credit balance + mark completed (done in DB)
      await NeonDB.approveDeposit(tx.id);
    } else {
      // just mark rejected
      await NeonDB.rejectDeposit(tx.id);
    }
  } catch (e) {
    console.error('Failed to update deposit:', e);
    alert('Failed to update deposit. See console for details.');
  } finally {
    await loadQueues(); // refresh the tables either way
  }
};

// Handle WITHDRAWAL actions using server-side helpers
const handleWithdrawalAction = async (
  transactionId: string,
  action: 'approve' | 'reject'
) => {
  const tx = pendingWithdrawals.find((x) => x.id === transactionId);
  if (!tx) return;

  try {
    if (action === 'approve') {
      // mark completed (DB deducts balance or releases locked funds)
      await NeonDB.approveWithdrawal(tx.id);
    } else {
      // refund (if locked) / credit back + mark rejected
      await NeonDB.rejectWithdrawal(tx.id);
    }
  } catch (e) {
    console.error('Failed to update withdrawal:', e);
    alert('Failed to update withdrawal. See console for details.');
  } finally {
    await loadQueues(); // refresh the tables either way
  }
};


  // ---- Gate ---------------------------------------------------------------
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
          <p className="text-gray-400 mb-6">You need administrator privileges to access this page.</p>
          <button
            onClick={recheckAdmin}
            disabled={checkingAdmin}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
          >
            {checkingAdmin ? 'Checking…' : '↻ Recheck Admin Status'}
          </button>
        </div>
      </div>
    );
  }

  // ---- UI -----------------------------------------------------------------
  const pendingDeps = pendingDeposits;
  const pendingWds = pendingWithdrawals;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-gray-400">Manage Nova platform operations and settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {([
              { id: 'overview', name: 'Overview', icon: Settings },
              { id: 'moon', name: 'MOON Control', icon: TrendingUp },
              { id: 'deposits', name: 'Deposits', icon: DollarSign },
              { id: 'withdrawals', name: 'Withdrawals', icon: DollarSign },
              { id: 'settings', name: 'Settings', icon: Settings },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">1,247</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending Deposits</p>
                  <p className="text-2xl font-bold text-white">{pendingDeps.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-white">{pendingWds.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">MOON Price</p>
                  <p className="text-2xl font-bold text-white">${safePrice.toFixed(6)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* MOON Control */}
        {activeTab === 'moon' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Manual MOON Price Control</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Price</label>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white">${safePrice.toFixed(6)}</p>
                    <div className={`flex items-center space-x-1 mt-2 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="text-sm font-semibold">{change.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Set New Price</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={moonPrice}
                    onChange={(e) => setMoonPrice(e.target.value)}
                    placeholder="Enter new MOON price"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  onClick={handleMoonPriceUpdate}
                  disabled={!moonPrice}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Update MOON Price
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Schedule Price Changes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Type</label>
                  <select
                    value={moonSchedule.type}
                    onChange={(e) => setMoonSchedule({ ...moonSchedule, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMoonSchedule({ ...moonSchedule, direction: 'increase' })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        moonSchedule.direction === 'increase' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Increase
                    </button>
                    <button
                      onClick={() => setMoonSchedule({ ...moonSchedule, direction: 'decrease' })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        moonSchedule.direction === 'decrease' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 inline mr-1" />
                      Decrease
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Percentage Change</label>
                  <input
                    type="number"
                    step="0.1"
                    value={moonSchedule.percentage}
                    onChange={(e) => setMoonSchedule({ ...moonSchedule, percentage: e.target.value })}
                    placeholder="Enter percentage (e.g., 5.5)"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  onClick={handleScheduleMoonPrice}
                  disabled={!moonSchedule.percentage}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Schedule Price Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deposits */}
        {activeTab === 'deposits' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Pending Deposits</h2>
              <p className="text-gray-400">Review and approve user deposit requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Coin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingDeps.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{t.user_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">{t.coin_symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{Number(t.amount).toFixed(6)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{t.details?.network || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleDepositAction(t.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors">
                          <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                        </button>
                        <button onClick={() => handleDepositAction(t.id, 'reject')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                          <XCircle className="w-4 h-4 inline mr-1" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingDeps.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No pending deposits
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Pending Withdrawals</h2>
              <p className="text-gray-400">Review and process user withdrawal requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Coin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingWds.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{t.user_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">{t.coin_symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{Number(t.amount).toFixed(6)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {t.details?.address ? `${t.details.address.slice(0, 10)}...${t.details.address.slice(-6)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{t.details?.network || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button onClick={() => handleWithdrawalAction(t.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors">
                          <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                        </button>
                        <button onClick={() => handleWithdrawalAction(t.id, 'reject')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                          <XCircle className="w-4 h-4 inline mr-1" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingWds.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        No pending withdrawals
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* … (unchanged settings UI) … */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Exchange Settings</h2>
              {/* add your inputs here */}
              <p className="text-gray-400">Coming soon</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Platform Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-300">Trading</span><span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Active</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-300">Deposits</span><span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Active</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-300">Withdrawals</span><span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Active</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-300">MOON Trading</span><span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs">Active</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
