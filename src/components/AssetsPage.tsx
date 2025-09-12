// src/components/AssetsPage.tsx
import { useMemo, useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, ArrowUpDown, Copy, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';

type TxResp = { ok: boolean; id?: string; to_amount?: number; fee?: number; message?: string };

// Shared JSON POST helper (used by deposit/withdraw/exchange)
async function postJson<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${url} -> ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) msg += `: ${j.message}`;
    } catch {
      /* ignore JSON parse error */
    }
    throw new Error(msg);
  }
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export default function AssetsPage() {
  const { user, coins, refreshData } = useApp();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] =
    useState<'overview' | 'deposit' | 'withdraw' | 'exchange'>('overview');

  const [selectedCoin, setSelectedCoin] = useState('BTC');

  // shared inputs
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('');
  const [withdrawMemo, setWithdrawMemo] = useState('');

  // exchange inputs
  const [exchangeFrom, setExchangeFrom] = useState('BTC');
  const [exchangeTo, setExchangeTo] = useState('USDT');
  const [exchangeAmount, setExchangeAmount] = useState('');

  const [copiedAddress, setCopiedAddress] = useState('');

  // quick lookup helpers
  const priceOf = (sym: string) => Number(coins.find((c) => c.symbol === sym)?.price ?? 0);
  const balances = user?.balances ?? {};

  // address presets
  const walletAddresses: Record<string, string> = {
    BTC: '1LyZHu2xzqYyzLesS7UYecXUTW6AGngBFR',
    ETH: '0x1016a1ff1907e77afa6f4889f8796b4c3237252d',
    USDT_ERC20: '0x1016a1ff1907e77afa6f4889f8796b4c3237252d',
    USDT_TRC20: 'TBdEXqVLqdrdD2mtPGysRQRQj53PEMsT1o',
  };

  const networks: Record<string, string[]> = {
    BTC: ['Bitcoin'],
    ETH: ['Ethereum'],
    USDT: ['ERC20', 'TRC20'],
    MOON: ['Nova Network'],
  };

  // options for selects
  const coinOptions = useMemo(
    () =>
      coins
        .map((c) => ({ label: `${c.name} (${c.symbol})`, value: c.symbol }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    [coins]
  );

  const totalValue = useMemo(() => {
    return Object.entries(balances).reduce(
      (sum, [sym, bal]) => sum + Number(bal ?? 0) * priceOf(sym),
      0
    );
  }, [balances, coins]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(key);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  // -------- Handlers --------------------------------------------------------

  async function handleDeposit() {
    const uid = user?.id;
    if (!uid) { alert(t('assets.errors.signIn')); return; }
    const amt = Number(amount);
    if (!withdrawNetwork || !isFinite(amt) || amt <= 0) {
      alert(t('assets.errors.depositInvalid'));
      return;
    }
    try {
      await postJson('/.netlify/functions/create-deposit', {
        user_id: uid, coin_symbol: selectedCoin, amount: amt, details: { network: withdrawNetwork }
      });
      setAmount('');
      await refreshData?.();
      alert(t('assets.deposit.submitted'));
    } catch (e: any) {
      console.error(e);
      alert(e?.message || t('assets.errors.depositFailed'));
    }
  }

  async function handleWithdraw() {
    const uid = user?.id;
    if (!uid) {
      alert(t('assets.errors.signIn'));
      return;
    }

    const amt = Number(amount);
    if (!withdrawAddress?.trim() || !withdrawNetwork || !isFinite(amt) || amt <= 0) {
      alert(t('assets.errors.withdrawInvalid'));
      return;
    }

    const available = Number(balances[selectedCoin] ?? 0);
    if (available < amt) {
      alert(t('assets.errors.insufficient'));
      return;
    }

    try {
      const resp = await postJson<TxResp>('/.netlify/functions/create-withdraw', {
        user_id: uid,
        coin_symbol: selectedCoin,
        amount: amt,
        details: {
          address: withdrawAddress.trim(),
          network: withdrawNetwork,
          memo: withdrawMemo || '',
        },
      });

      if (!resp?.ok) throw new Error(resp?.message || t('assets.errors.withdrawFailed'));

      setAmount('');
      setWithdrawAddress('');
      setWithdrawMemo('');
      await refreshData?.();
      alert(t('assets.withdraw.submitted'));
    } catch (e: any) {
      console.error('withdraw error:', e);
      alert(`${t('assets.errors.withdrawFailed')}: ${e?.message || e}`);
    }
  }

  async function handleExchange() {
    const uid = user?.id;
    if (!uid) {
      alert(t('assets.errors.signIn'));
      return;
    }
    if (exchangeFrom === exchangeTo) {
      alert(t('assets.errors.exchangeSame'));
      return;
    }

    const amt = Number(exchangeAmount);
    if (!isFinite(amt) || amt <= 0) {
      alert(t('assets.errors.exchangeInvalid'));
      return;
    }

    const have = Number(balances[exchangeFrom] ?? 0);
    if (have < amt) {
      alert(t('assets.errors.insufficient'));
      return;
    }

    const resp = await postJson<TxResp>('/.netlify/functions/exchange', {
      user_id: uid,
      from_symbol: exchangeFrom,
      to_symbol: exchangeTo,
      amount: amt,
    });

    setExchangeAmount('');
    await refreshData?.();

    if (!resp?.ok) {
      alert(resp?.message || t('assets.errors.exchangeFailed'));
      return;
    }
    const got = Number(resp?.to_amount ?? 0);
    alert(t('assets.exchange.success', { amt, from: exchangeFrom, got: got.toFixed(6), to: exchangeTo }));
  }

  // Gate (short-circuit the UI if not logged in)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('assets.login.title')}</h2>
          <p className="text-gray-400">{t('assets.login.desc')}</p>
        </div>
      </div>
    );
  }

  // -------- Preview math for Exchange card (client-side only) --------------
  const previewToAmount = (() => {
    const amt = Number(exchangeAmount || 0);
    if (!amt) return 0;
    const fromP = priceOf(exchangeFrom);
    const toP = priceOf(exchangeTo);
    if (!fromP || !toP) return 0;
    const valueUSD = amt * fromP;
    const fee = valueUSD * 0.001; // 0.1%
    return (valueUSD - fee) / toP;
  })();

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">{t('assets.title')}</h1>
          <p className="text-gray-400">{t('assets.subtitle')}</p>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Wallet className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{t('assets.portfolioValue')}</h2>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-gray-400">{t('assets.portfolioDesc')}</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 -mx-4 md:mx-0">
          <div className="overflow-x-auto no-scrollbar px-4">
            <div className="inline-flex whitespace-nowrap gap-1 bg-gray-800 rounded-lg p-1">
              {[
                { id: 'overview', name: t('assets.tabs.overview'), icon: Wallet },
                { id: 'deposit',  name: t('assets.tabs.deposit'),  icon: ArrowDownLeft },
                { id: 'withdraw', name: t('assets.tabs.withdraw'), icon: ArrowUpRight },
                { id: 'exchange', name: t('assets.tabs.exchange'), icon: ArrowUpDown },
              ].map((tab) => {
                const Icon = tab.icon as any;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>   {/* closes inline-flex */}
</div>   {/* closes overflow-x-auto */}
</div>   {/* closes mb-8 container */}  

                    {activeTab === 'overview' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">{t('assets.overview.title')}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('assets.overview.asset')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('assets.overview.balance')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('assets.overview.value')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('assets.overview.price')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {coins.map((coin) => {
                        const bal = Number(balances[coin.symbol] ?? 0);
                        const value = bal * Number(coin.price ?? 0);
                        return (
                          <tr key={coin.symbol} className="hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div>
                                  <div className="text-sm font-medium text-white">{coin.name}</div>
                                  <div className="text-sm text-gray-400">{coin.symbol}</div>
                                </div>
                                {coin.isCustom && <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">NOVA</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                              {bal.toFixed(6)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${value.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ${Number(coin.price ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: Number(coin.price ?? 0) < 1 ? 6 : 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'deposit' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6">{t('assets.deposit.title')}</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.deposit.select')}</label>
                    <select
                      value={selectedCoin}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {coinOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.deposit.network')}</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('assets.deposit.networkSelect')}</option>
                      {(networks[selectedCoin] ?? []).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.deposit.address')}</label>
                    <div className="bg-gray-700 rounded-lg p-4">
                      {selectedCoin === 'BTC' && (
                        <div className="flex items-center justify-between">
                          <span className="text-white font-mono text-sm break-all">{walletAddresses.BTC}</span>
                          <button
                            onClick={() => copyToClipboard(walletAddresses.BTC, 'BTC')}
                            className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedAddress === 'BTC' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {(selectedCoin === 'ETH' || (selectedCoin === 'USDT' && withdrawNetwork === 'ERC20')) && (
                        <div className="flex items-center justify-between">
                          <span className="text-white font-mono text-sm break-all">{walletAddresses.ETH}</span>
                          <button
                            onClick={() => copyToClipboard(walletAddresses.ETH, 'ETH')}
                            className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedAddress === 'ETH' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {selectedCoin === 'USDT' && withdrawNetwork === 'TRC20' && (
                        <div className="flex items-center justify-between">
                          <span className="text-white font-mono text-sm break-all">{walletAddresses.USDT_TRC20}</span>
                          <button
                            onClick={() => copyToClipboard(walletAddresses.USDT_TRC20, 'USDT_TRC20')}
                            className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedAddress === 'USDT_TRC20' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.deposit.amount')}</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t('assets.deposit.amountPlaceholder')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-900 bg-opacity-50 rounded-lg p-4 border border-yellow-500">
                    <p className="text-yellow-400 text-sm">
                      <strong>{t('assets.deposit.importantTitle')}</strong> {t('assets.deposit.importantDesc')}
                    </p>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={!amount || !withdrawNetwork}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('assets.deposit.submit')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6">{t('assets.withdraw.title')}</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.withdraw.select')}</label>
                    <select
                      value={selectedCoin}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {coinOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('assets.withdraw.available', { amt: Number(balances[selectedCoin] ?? 0).toFixed(6), coin: selectedCoin })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.withdraw.network')}</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('assets.withdraw.networkSelect')}</option>
                      {(networks[selectedCoin] ?? []).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.withdraw.address')}</label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder={t('assets.withdraw.addressPlaceholder')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {selectedCoin === 'USDT' && withdrawNetwork === 'TRC20' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.withdraw.memo')}</label>
                      <input
                        type="text"
                        value={withdrawMemo}
                        onChange={(e) => setWithdrawMemo(e.target.value)}
                        placeholder={t('assets.withdraw.memoPlaceholder')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.withdraw.amount')}</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t('assets.withdraw.amountPlaceholder')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t('assets.withdraw.fee')}</span>
                      <span className="text-white">~0.001 {selectedCoin}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">{t('assets.withdraw.arrival')}</span>
                      <span className="text-white">10–30 {t('assets.withdraw.minutes')}</span>
                    </div>
                  </div>

                  <div className="bg-red-900 bg-opacity-50 rounded-lg p-4 border border-red-500">
                    <p className="text-red-400 text-sm">
                      <strong>{t('assets.withdraw.warningTitle')}</strong> {t('assets.withdraw.warningDesc')}
                    </p>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={!amount || !withdrawAddress || !withdrawNetwork}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('assets.withdraw.submit')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'exchange' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6">{t('assets.exchange.title')}</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.exchange.from')}</label>
                      <select
                        value={exchangeFrom}
                        onChange={(e) => {
                          const v = e.target.value;
                          setExchangeFrom(v);
                          if (v === exchangeTo) {
                            const firstOther = coinOptions.find((o) => o.value !== v)?.value ?? 'USDT';
                            setExchangeTo(firstOther);
                          }
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {coinOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-400 mt-1">
                        {t('assets.exchange.available', { amt: Number(balances[exchangeFrom] ?? 0).toFixed(6), coin: exchangeFrom })}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.exchange.to')}</label>
                      <select
                        value={exchangeTo}
                        onChange={(e) => setExchangeTo(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {coinOptions.filter((o) => o.value !== exchangeFrom).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('assets.exchange.amount')}</label>
                    <input
                      type="number"
                      value={exchangeAmount}
                      onChange={(e) => setExchangeAmount(e.target.value)}
                      placeholder={t('assets.exchange.amountPlaceholder', { coin: exchangeFrom })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {exchangeAmount && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3">{t('assets.exchange.previewTitle')}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('assets.exchange.youPay')}</span>
                          <span className="text-white">
                            {exchangeAmount} {exchangeFrom}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('assets.exchange.fee')}</span>
                          <span className="text-white">
                            {((Number(exchangeAmount || 0) * priceOf(exchangeFrom)) * 0.001).toFixed(2)} USD
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('assets.exchange.youReceive')}</span>
                          <span className="text-white">
                            {previewToAmount.toFixed(6)} {exchangeTo}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExchange}
                    disabled={
                      !exchangeAmount ||
                      Number(exchangeAmount) <= 0 ||
                      Number(exchangeAmount) > Number(balances[exchangeFrom] ?? 0) ||
                      exchangeFrom === exchangeTo
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('assets.exchange.submit', { from: exchangeFrom, to: exchangeTo })}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">{t('assets.sidebar.title')}</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">{t('assets.sidebar.totalAssets')}</p>
                  <p className="text-lg font-semibold text-white">{Object.keys(balances).length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('assets.sidebar.largest')}</p>
                  <p className="text-lg font-semibold text-white">
                    {(() => {
                      const largest = Object.entries(balances).reduce(
                        (max, [sym, bal]) => {
                          const v = Number(bal ?? 0) * priceOf(sym);
                          return v > max.value ? { sym, value: v } : max;
                        },
                        { sym: '', value: 0 }
                      );
                      return largest.sym || t('assets.sidebar.none');
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('assets.sidebar.diversity')}</p>
                  <p className="text-lg font-semibold text-white">
                    {Object.values(balances).filter((b) => Number(b) > 0).length} {t('assets.sidebar.coins')}
                  </p>
                </div>
          </div>
        </div>
      </div>
    </div>
  );
}

