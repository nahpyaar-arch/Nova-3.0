// src/components/TradePage.tsx
import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function TradePage() {
  const { coins, user, refreshData } = useApp();
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');               // amount in COIN units
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const coin = useMemo(
    () => coins.find(c => c.symbol === selectedCoin),
    [coins, selectedCoin]
  );

  const priceUsed = useMemo(() => {
    const p = orderType === 'limit' && limitPrice ? Number(limitPrice) : Number(coin?.price ?? 0);
    return Number.isFinite(p) ? p : 0;
  }, [orderType, limitPrice, coin]);

  const usdtBal = Number(user?.balances?.USDT ?? 0);
  const coinBal = Number(user?.balances?.[selectedCoin] ?? 0);
  const coinAmt = Number(amount || 0);
  const totalUSDT = coinAmt * priceUsed;

  const canSubmit =
    !!user &&
    coinAmt > 0 &&
    priceUsed > 0 &&
    (tradeType === 'buy' ? usdtBal >= totalUSDT : coinBal >= coinAmt) &&
    (orderType === 'market' || (orderType === 'limit' && !!limitPrice));

  async function handleConfirm() {
    if (!user || !canSubmit) return;
    setBusy(true);
    try {
      // We reuse the /exchange function for buy/sell:
      // BUY  => from USDT, to COIN, amount = USDT value (coinAmt * price)
      // SELL => from COIN, to USDT, amount = coinAmt
      const payload =
        tradeType === 'buy'
          ? {
              user_id: user.id,
              from_symbol: 'USDT',
              to_symbol: selectedCoin,
              amount: totalUSDT, // amount is in FROM units (USDT)
            }
          : {
              user_id: user.id,
              from_symbol: selectedCoin,
              to_symbol: 'USDT',
              amount: coinAmt, // amount is in FROM units (COIN)
            };

      const res = await fetch('/.netlify/functions/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.message || `Trade failed (${res.status})`);
      }

      setShowPreview(false);
      setAmount('');
      setLimitPrice('');
      await refreshData?.(); // pull fresh balances/tx from server

      alert(
        tradeType === 'buy'
          ? `Bought ${coinAmt} ${selectedCoin}`
          : `Sold ${coinAmt} ${selectedCoin}`
      );
    } catch (e: any) {
      alert(e?.message || 'Trade failed');
      // console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to trade</h2>
          <p className="text-gray-400">You need to be logged in to access the trading platform.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Spot Trading</h1>
          <p className="text-gray-400">Trade cryptocurrencies with real-time market prices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              {/* Coin Select */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Cryptocurrency
                </label>
                <select
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {coins.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              {coin && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Current Price</p>
                      <p className="text-xl font-bold text-white">
                        $
                        {Number(coin.price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: Number(coin.price) < 1 ? 6 : 2,
                        })}
                      </p>
                    </div>
                    <div
                      className={`flex items-center space-x-1 ${
                        Number(coin.change_24h) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {Number(coin.change_24h) >= 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        {Number(coin.change_24h).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy/Sell Toggle */}
              <div className="mb-6">
                <div className="flex bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      tradeType === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeType('sell')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      tradeType === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              {/* Order Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order Type
                </label>
                <div className="flex bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setOrderType('market')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      orderType === 'market'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      orderType === 'limit'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* Limit price */}
              {orderType === 'limit' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Limit Price (USDT)
                  </label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Enter limit price"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount ({selectedCoin})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 text-sm text-gray-400">
                  Available:{' '}
                  {tradeType === 'buy'
                    ? `${usdtBal.toFixed(2)} USDT`
                    : `${coinBal.toFixed(6)} ${selectedCoin}`}
                </div>
              </div>

              {/* Total */}
              {coinAmt > 0 && priceUsed > 0 && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total (USDT)</span>
                    <span className="text-white font-semibold">{totalUSDT.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Action */}
              <button
                onClick={() => setShowPreview(true)}
                disabled={!canSubmit || busy}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  tradeType === 'buy'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                Preview {tradeType === 'buy' ? 'Buy' : 'Sell'} Order
              </button>
            </div>
          </div>

          {/* Market table (unchanged) */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Market Overview</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Coin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        24h Change
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {coins.slice(0, 10).map((c) => (
                      <tr key={c.symbol} className="hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{c.name}</div>
                          <div className="text-sm text-gray-400">{c.symbol}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          $
                          {Number(c.price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: Number(c.price) < 1 ? 6 : 2,
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div
                            className={`flex items-center space-x-1 ${
                              Number(c.change_24h) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {Number(c.change_24h) >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="text-sm font-semibold">
                              {Number(c.change_24h).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCoin(c.symbol)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Preview modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Order Preview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span
                      className={`font-semibold ${
                        tradeType === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {tradeType.toUpperCase()} {selectedCoin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-white">
                      {coinAmt} {selectedCoin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="text-white">${priceUsed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-semibold">
                      {totalUSDT.toFixed(2)} USDT
                    </span>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!canSubmit || busy}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                      tradeType === 'buy'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                  >
                    Confirm {tradeType === 'buy' ? 'Buy' : 'Sell'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
