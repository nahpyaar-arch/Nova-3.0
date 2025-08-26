// src/components/Layout.tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  BarChart3,
  Wallet,
  User,
  MessageCircle,
  Globe,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import BottomTabs from './BottomTabs';

const LANGUAGES = [
  { code: 'en', name: 'English',  flag: '🇺🇸' },
  { code: 'es', name: 'Español',  flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',  flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português',flag: '🇵🇹' },
  { code: 'ru', name: 'Русский',  flag: '🇷🇺' },
  { code: 'ja', name: '日本語',     flag: '🇯🇵' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
];

export default function Layout() {
  const { user, language, setLanguage, t } = useApp();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const nav = [
    { key: 'home',    name: t('nav.home'),    href: '/',        icon: Home },
    { key: 'market',  name: t('nav.market'),  href: '/market',  icon: TrendingUp },
    { key: 'trade',   name: t('nav.trade'),   href: '/trade',   icon: BarChart3 },
    { key: 'assets',  name: t('nav.assets'),  href: '/assets',  icon: Wallet },
    { key: 'profile', name: t('nav.profile'), href: '/profile', icon: User },
  ] as Array<{ key: string; name: string; href: string; icon: any }>;

  if (user?.is_admin) {
    nav.push({ key: 'admin', name: t('nav.admin'), href: '/admin', icon: Shield });
  }

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const currentLanguage =
    LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-xl font-bold text-white">Nova</span>
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex space-x-8">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right controls */}
            <div className="flex items-center space-x-4">
              {/* Chat (local modal) */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Live Chat"
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              {/* Language */}
              <div className="relative">
                <button
                  onClick={() => setIsLanguageOpen((v) => !v)}
                  className="flex items-center space-x-1 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm">{currentLanguage.flag}</span>
                </button>

                {isLanguageOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
                    <div className="py-1">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLanguageOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center space-x-2 ${
                            language === lang.code
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Simple chat modal */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md h-96 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Live Chat</h3>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-gray-700 p-3 rounded-lg text-sm text-gray-300">
                Chat is loading… If the widget doesn’t appear, please try again later.
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message…"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content — extra bottom padding so BottomTabs never covers inputs */}
      <main className="flex-1 pb-28 md:pb-0">
        <Outlet />
      </main>

      {/* Binance-style bottom tabs (mobile only) */}
      <BottomTabs />
    </div>
  );
}
