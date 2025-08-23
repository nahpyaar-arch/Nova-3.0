import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, ArrowUpDown, Copy, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function AssetsPage() {
  const { user, coins, updateBalance, addTransaction } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'exchange'>('overview');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('');
  const [withdrawMemo, setWithdrawMemo] = useState('');
  const [exchangeFrom, setExchangeFrom] = useState('BTC');
  const [exchangeTo, setExchangeTo] = useState('USDT');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');

  const walletAddresses = {
    BTC: '1LyZHu2xzqYyzLesS7UYecXUTW6AGngBFR',
    ETH: '0x1016a1ff1907e77afa6f4889f8796b4c3237252d',
    USDT_ERC20: '0x1016a1ff1907e77afa6f4889f8796b4c3237252d',
    USDT_TRC20: 'TBdEXqVLqdrdD2mtPGysRQRQj53PEMsT1o'
  };

  const networks = {
    BTC: ['Bitcoin'],
    ETH: ['Ethereum'],
    USDT: ['ERC20', 'TRC20'],
    MOON: ['Nova Network']
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view assets</h2>
          <p className="text-gray-400">You need to be logged in to access your portfolio.</p>
        </div>
      </div>
    );
  }

  const calculateTotalValue = () => {
    return Object.entries(user.balances).reduce((total, [symbol, balance]) => {
      const coin = coins.find(c => c.symbol === symbol);
      return total + (coin ? balance * coin.price : 0);
    }, 0);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  const handleDeposit = () => {
    if (!amount) return;
    
    addTransaction({
      type: 'deposit',
      coin_symbol: selectedCoin,
      amount: parseFloat(amount),
      status: 'pending',
      user_id: user.id,
      details: { network: withdrawNetwork }
    }).catch(console.error);
    
    setAmount('');
    alert('Deposit request submitted for admin approval');
  };

  const handleWithdraw = () => {
    if (!amount || !withdrawAddress) return;
    
    const balance = user.balances[selectedCoin] || 0;
    if (balance < parseFloat(amount)) {
      alert('Insufficient balance');
      return;
    }
    
    addTransaction({
      type: 'withdraw',
      coin_symbol: selectedCoin,
      amount: parseFloat(amount),
      status: 'pending',
      user_id: user.id,
      details: {
        address: withdrawAddress,
        network: withdrawNetwork,
        memo: withdrawMemo
      }
    }).catch(console.error);
    
    setAmount('');
    setWithdrawAddress('');
    setWithdrawMemo('');
    alert('Withdrawal request submitted for admin approval');
  };

  const handleExchange = () => {
    if (!exchangeAmount) return;
    
    const fromCoin = coins.find(c => c.symbol === exchangeFrom);
    const toCoin = coins.find(c => c.symbol === exchangeTo);
    const fromBalance = user.balances[exchangeFrom] || 0;
    
    if (!fromCoin || !toCoin) return;
    if (fromBalance < parseFloat(exchangeAmount)) {
      alert('Insufficient balance');
      return;
    }
    
    const fromValue = parseFloat(exchangeAmount) * fromCoin.price;
    const fee = fromValue * 0.001; // 0.1% fee
    const toAmount = (fromValue - fee) / toCoin.price;
    
    updateBalance(exchangeFrom, -parseFloat(exchangeAmount)).catch(console.error);
    updateBalance(exchangeTo, toAmount).catch(console.error);
    
    addTransaction({
      type: 'exchange',
      coin_symbol: exchangeFrom,
      amount: parseFloat(exchangeAmount),
      status: 'completed',
      user_id: user.id,
      details: {
        from: exchangeFrom,
        to: exchangeTo,
        toAmount,
        fee
      }
    }).catch(console.error);
    
    setExchangeAmount('');
    alert(`Successfully exchanged ${exchangeAmount} ${exchangeFrom} for ${toAmount.toFixed(6)} ${exchangeTo}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">My Assets</h1>
          <p className="text-gray-400">Manage your cryptocurrency portfolio</p>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Wallet className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Portfolio Value</h2>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-gray-400">Total portfolio value in USD</p>
        </div>

        {/* Action Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { id: 'overview', name: 'Overview', icon: Wallet },
              { id: 'deposit', name: 'Deposit', icon: ArrowDownLeft },
              { id: 'withdraw', name: 'Withdraw', icon: ArrowUpRight },
              { id: 'exchange', name: 'Exchange', icon: ArrowUpDown }
            ].map((tab) => {
              const Icon = tab.icon;
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">Asset Balances</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Value (USD)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {coins.map((coin) => {
                        const balance = user.balances[coin.symbol] || 0;
                        const value = balance * coin.price;
                        return (
                          <tr key={coin.symbol} className="hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div>
                                  <div className="text-sm font-medium text-white">{coin.name}</div>
                                  <div className="text-sm text-gray-400">{coin.symbol}</div>
                                </div>
                                {coin.isCustom && (
                                  <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">NOVA</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                              {balance.toFixed(6)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              ${value.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ${coin.price.toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: coin.price < 1 ? 6 : 2 
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
                <h2 className="text-xl font-bold text-white mb-6">Deposit Cryptocurrency</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Cryptocurrency</label>
                    <select
                      value={selectedCoin}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {coins.map(coin => (
                        <option key={coin.symbol} value={coin.symbol}>
                          {coin.name} ({coin.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Network</option>
                      {(networks[selectedCoin as keyof typeof networks] || []).map(network => (
                        <option key={network} value={network}>{network}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Deposit Address</label>
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter deposit amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-900 bg-opacity-50 rounded-lg p-4 border border-yellow-500">
                    <p className="text-yellow-400 text-sm">
                      <strong>Important:</strong> Deposits require admin approval. Please allow 1-24 hours for processing.
                    </p>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={!amount || !withdrawNetwork}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Submit Deposit Request
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Withdraw Cryptocurrency</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Cryptocurrency</label>
                    <select
                      value={selectedCoin}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {coins.map(coin => (
                        <option key={coin.symbol} value={coin.symbol}>
                          {coin.name} ({coin.symbol})
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-400 mt-1">
                      Available: {(user.balances[selectedCoin] || 0).toFixed(6)} {selectedCoin}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Network</option>
                      {(networks[selectedCoin as keyof typeof networks] || []).map(network => (
                        <option key={network} value={network}>{network}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Destination Address</label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="Enter destination wallet address"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {(selectedCoin === 'USDT' && withdrawNetwork === 'TRC20') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Memo (Optional)</label>
                      <input
                        type="text"
                        value={withdrawMemo}
                        onChange={(e) => setWithdrawMemo(e.target.value)}
                        placeholder="Enter memo if required"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter withdrawal amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Network Fee</span>
                      <span className="text-white">~0.001 {selectedCoin}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">Estimated Arrival</span>
                      <span className="text-white">10-30 minutes</span>
                    </div>
                  </div>

                  <div className="bg-red-900 bg-opacity-50 rounded-lg p-4 border border-red-500">
                    <p className="text-red-400 text-sm">
                      <strong>Warning:</strong> Withdrawals require admin approval and cannot be reversed. Double-check all details.
                    </p>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={!amount || !withdrawAddress || !withdrawNetwork}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Submit Withdrawal Request
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'exchange' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Exchange Cryptocurrency</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
                      <select
                        value={exchangeFrom}
                        onChange={(e) => setExchangeFrom(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {coins.map(coin => (
                          <option key={coin.symbol} value={coin.symbol}>
                            {coin.name} ({coin.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-400 mt-1">
                        Available: {(user.balances[exchangeFrom] || 0).toFixed(6)} {exchangeFrom}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
                      <select
                        value={exchangeTo}
                        onChange={(e) => setExchangeTo(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {coins.filter(coin => coin.symbol !== exchangeFrom).map(coin => (
                          <option key={coin.symbol} value={coin.symbol}>
                            {coin.name} ({coin.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Exchange</label>
                    <input
                      type="number"
                      value={exchangeAmount}
                      onChange={(e) => setExchangeAmount(e.target.value)}
                      placeholder={`Enter ${exchangeFrom} amount`}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {exchangeAmount && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3">Exchange Preview</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">You pay</span>
                          <span className="text-white">{exchangeAmount} {exchangeFrom}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Exchange fee (0.1%)</span>
                          <span className="text-white">
                            {((parseFloat(exchangeAmount) * (coins.find(c => c.symbol === exchangeFrom)?.price || 0)) * 0.001).toFixed(2)} USD
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">You receive (approx.)</span>
                          <span className="text-white">
                            {(() => {
                              const fromCoin = coins.find(c => c.symbol === exchangeFrom);
                              const toCoin = coins.find(c => c.symbol === exchangeTo);
                              if (!fromCoin || !toCoin) return '0';
                              const fromValue = parseFloat(exchangeAmount) * fromCoin.price;
                              const fee = fromValue * 0.001;
                              const toAmount = (fromValue - fee) / toCoin.price;
                              return toAmount.toFixed(6);
                            })()} {exchangeTo}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExchange}
                    disabled={!exchangeAmount || parseFloat(exchangeAmount) > (user.balances[exchangeFrom] || 0)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Exchange {exchangeFrom} for {exchangeTo}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Total Assets</p>
                  <p className="text-lg font-semibold text-white">
                    {Object.keys(user.balances).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Largest Holding</p>
                  <p className="text-lg font-semibold text-white">
                    {(() => {
                      const largest = Object.entries(user.balances).reduce((max, [symbol, balance]) => {
                        const coin = coins.find(c => c.symbol === symbol);
                        const value = coin ? balance * coin.price : 0;
                        return value > max.value ? { symbol, value } : max;
                      }, { symbol: '', value: 0 });
                      return largest.symbol || 'None';
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Portfolio Diversity</p>
                  <p className="text-lg font-semibold text-white">
                    {Object.values(user.balances).filter(balance => balance > 0).length} coins
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}