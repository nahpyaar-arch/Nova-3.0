// src/components/ProfilePage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { User, Mail, Globe, Bell, Shield, LogOut } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { pingSupabase, supabase } from '../lib/supabase';

export default function ProfilePage() {
  const { user, login, register, logout, language, setLanguage, refreshData, t } = useApp();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Quick connectivity check to Supabase
  useEffect(() => {
    (async () => {
      const { data, error } = await pingSupabase();
      console.log('supabase ping →', { rows: data?.length ?? 0, error });
    })();
  }, []);

  // DEV: write a quick test row to confirm insert policy works
  const insertTestProfile = async () => {
    const testEmail = `dev+${Date.now()}@example.com`;
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email: testEmail,
          name: 'Dev Test',
          is_admin: false,
          language: 'en',
        },
      ])
      .select('*');

    console.log('insert test →', { data, error });
    if (error) alert(`Insert failed: ${error.message}`);
    else alert(`Inserted: ${data?.[0]?.email || testEmail}`);
  };

  const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = isLogin ? await login(email, password) : await register(email, password, name);
      if (!ok) alert(isLogin ? 'Invalid credentials' : 'Registration failed');
    } catch {
      alert('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // ───────── Unauthenticated view (login/register) ─────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              {isLogin ? 'Sign in to Nova' : 'Create your Nova account'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    {t('profile.fullName')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  {t('profile.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <p className="mt-1 text-xs text-gray-400">Password must be at least 8 characters long</p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ───────── Authenticated view (profile settings) ─────────
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{t('profile.title')}</h1>
            <p className="text-gray-400">Manage your account settings and preferences</p>
          </div>

          {/* DEV-only button for testing insert */}
          {import.meta.env.DEV && (
            <button
              onClick={insertTestProfile}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              title="Insert a test row into supabase.public.profiles"
            >
              DEV: Insert test profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Account Information */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">{t('profile.accountInfo')}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.fullName')}</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.email')}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.accountType')}</label>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.is_admin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {user.is_admin ? t('profile.admin') : t('profile.standard')}
                    </span>
                    <Shield className="w-5 h-5 text-gray-400" />
                    <button
                      onClick={refreshData}
                      className="ml-2 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded"
                      title="Refresh from database"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Globe className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold text-white">{t('profile.languageRegion')}</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('profile.preferredLanguage')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-400">
                  Changes will be applied immediately across the platform
                </p>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Bell className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Trade Notifications</h3>
                    <p className="text-sm text-gray-400">Get notified when your trades are executed</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Price Alerts</h3>
                    <p className="text-sm text-gray-400">Receive alerts for significant price movements</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Security Alerts</h3>
                    <p className="text-sm text-gray-400">Important security and account notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Account Status</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs">Active</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Verification</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">Verified</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">2FA Status</span>
                  <span className="bg-yellow-600 text-white px-2 py-1 rounded-full text-xs">Disabled</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('profile.signOut')}</span>
                </button>
              </div>

              {user.is_admin && (
                <div className="mt-4">
                  <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4 border border-purple-500">
                    <h4 className="text-purple-400 font-semibold mb-2">Admin Access</h4>
                    <p className="text-sm text-gray-300 mb-3">
                      You have administrator privileges with full platform control.
                    </p>
                    <a
                      href="/admin"
                      className="inline-flex items-center text-purple-400 hover:text-purple-300 text-sm font-medium"
                    >
                      Go to Admin Panel →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
