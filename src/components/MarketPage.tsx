import { useState } from 'react';
import { TrendingUp, TrendingDown, Search, Star } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function MarketPage() {
  const { coins } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const selectedCoinData = coins.find(coin => coin.symbol === selectedCoin);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Cryptocurrency Market</h1>
          <p className="text-gray-400">Real-time prices and market data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Market List */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Coins Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Coin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">24h Change</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Volume</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Market Cap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredCoins.map((coin) => (
                      <tr
                        key={coin.symbol}
                        className={`hover:bg-gray-700 transition-colors cursor-pointer ${
                          selectedCoin === coin.symbol ? 'bg-gray-700' : ''
                        }`}
                        onClick={() => setSelectedCoin(coin.symbol)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(coin.symbol);
                              }}
                              className={`${
                                favorites.includes(coin.symbol) ? 'text-yellow-400' : 'text-gray-400'
                              } hover:text-yellow-400 transition-colors`}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <div>
                              <div className="text-sm font-medium text-white flex items-center space-x-2">
                                <span>{coin.name}</span>
                                {coin.isCustom && (
                                  <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">NOVA</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          ${coin.price.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: coin.price < 1 ? 6 : 2 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center space-x-1 ${coin.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {coin.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{coin.change24h.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          ${(coin.volume / 1000000).toFixed(2)}M
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          ${(coin.marketCap / 1000000000).toFixed(2)}B
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                            Trade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Coin Details */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sticky top-8">
              {selectedCoinData ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>{selectedCoinData.name}</span>
                        {selectedCoinData.isCustom && (
                          <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">NOVA</span>
                        )}
                      </h2>
                      <p className="text-gray-400">{selectedCoinData.symbol}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(selectedCoinData.symbol)}
                      className={`${
                        favorites.includes(selectedCoinData.symbol) ? 'text-yellow-400' : 'text-gray-400'
                      } hover:text-yellow-400 transition-colors`}
                    >
                      <Star className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Current Price</p>
                      <p className="text-2xl font-bold text-white">
                        ${selectedCoinData.price.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: selectedCoinData.price < 1 ? 6 : 2 
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm">24h Change</p>
                      <div className={`flex items-center space-x-1 ${selectedCoinData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedCoinData.change24h >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        <span className="text-lg font-semibold">{selectedCoinData.change24h.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm">24h Volume</p>
                      <p className="text-lg font-semibold text-white">
                        ${(selectedCoinData.volume / 1000000).toFixed(2)}M
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm">Market Cap</p>
                      <p className="text-lg font-semibold text-white">
                        ${(selectedCoinData.marketCap / 1000000000).toFixed(2)}B
                      </p>
                    </div>

                    {selectedCoinData.isCustom && (
                      <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4 border border-purple-500">
                        <h3 className="text-purple-400 font-semibold mb-2">Nova Exclusive</h3>
                        <p className="text-sm text-gray-300">
                          MOON is Nova's exclusive cryptocurrency with admin-controlled pricing and special features.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors">
                      Buy {selectedCoinData.symbol}
                    </button>
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors">
                      Sell {selectedCoinData.symbol}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select a cryptocurrency to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}