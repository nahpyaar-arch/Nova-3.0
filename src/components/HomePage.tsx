import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next'; // ✅ import i18n hook

const toNum = (v: any, d = 0) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const fmt = (v: any, digits = 2) => toNum(v).toFixed(digits);
const fmtPrice = (v: any) =>
  toNum(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: toNum(v) < 1 ? 6 : 2,
  });
const fmtVolM = (v: any) => fmt(toNum(v) / 1_000_000, 2);
const fmtVolB = (v: any) => fmt(toNum(v) / 1_000_000_000, 2);

export default function HomePage() {
  const { user, coins, loading } = useApp();
  const { t } = useTranslation(); // ✅ translation hook

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">{t("home.loadingTitle")}</h2>
          <p className="text-gray-400">{t("home.loadingSubtitle")}</p>
        </div>
      </div>
    );
  }

  const list = Array.isArray(coins) ? coins : [];
  const getChange = (c: any) => toNum((c as any).change24h ?? (c as any).change_24h);
  const featuredCoins = list.filter((coin) => ['BTC', 'ETH', 'BNB'].includes(coin.symbol));
  const topCoins = list.slice(0, 10);

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                {t("home.welcomeBack")}{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Nova
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                {t("home.gateway")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/market"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <span>{t("home.exploreMarkets")}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/trade"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  {t("home.startTrading")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Coins */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-white mb-8">{t("home.featured")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {featuredCoins.map((coin) => {
              const chg = getChange(coin);
              return (
                <div
                  key={coin.symbol}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{coin.name}</h3>
                      <p className="text-gray-400">{coin.symbol}</p>
                    </div>
                    <div className={`flex items-center space-x-1 ${chg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {chg >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="font-semibold">{fmt(chg, 2)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">${fmtPrice(coin.price)}</div>
                  <div className="text-sm text-gray-400">{t("home.volume")}: ${fmtVolB(coin.volume)}B</div>
                </div>
              );
            })}
          </div>

          {/* Live Market Data */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{t("home.liveMarket")}</h2>
              <p className="text-gray-400">{t("home.realTimePrices")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t("home.coin")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t("home.price")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t("home.change")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t("home.volume")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {topCoins.map((coin) => {
                    const chg = getChange(coin);
                    return (
                      <tr key={coin.symbol} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-white">{coin.name}</div>
                              <div className="text-sm text-gray-400">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          ${fmtPrice(coin.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center space-x-1 ${chg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {chg >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{fmt(chg, 2)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          ${fmtVolM(coin.volume)}M
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Public landing (not logged in)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              {t("home.welcome")}{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Nova</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {t("home.tagline")}
            </p>
            <Link
              to="/profile"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center space-x-2"
            >
              <span>{t("home.getStarted")}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">{t("home.whyChoose")}</h2>
          <p className="text-gray-300 text-lg">{t("home.futureExperience")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t("home.fast")}</h3>
            <p className="text-gray-400">{t("home.fastDesc")}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-purple-500 transition-colors">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t("home.security")}</h3>
            <p className="text-gray-400">{t("home.securityDesc")}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-green-500 transition-colors">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">{t("home.global")}</h3>
            <p className="text-gray-400">{t("home.globalDesc")}</p>
          </div>
        </div>
      </div>

      {/* Live Market Preview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">{t("home.liveMarket")}</h2>
          <p className="text-gray-300">{t("home.realTimePrices")}</p>
        </div>
      </div>
    </div>
  );
}
