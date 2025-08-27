// src/contexts/AppContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useRef,
} from 'react';

import {
  NeonDB,                 // still used for some writes / coin helpers
  initializeDatabase,     // no-op on client stub
  type Profile,
  type Coin,
  type Transaction,
  pingDB,                  // client stub returns { ok:false }
} from '../lib/neon';

// Lazily load Supabase only when needed (shrinks initial JS bundle)
type SupabaseMod = typeof import('../lib/supabase');
let _supabaseMod: Promise<SupabaseMod> | null = null;
const sb = (): Promise<SupabaseMod> =>
  _supabaseMod ?? (_supabaseMod = import('../lib/supabase'));

/* ──────────────────────────────────────────────────────────────────────────
   Translations
   ────────────────────────────────────────────────────────────────────────── */
const TR: Record<string, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.market': 'Market',
    'nav.trade': 'Trade',
    'nav.assets': 'Assets',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin',
    'profile.title': 'Profile Settings',
    'profile.accountInfo': 'Account Information',
    'profile.fullName': 'Full Name',
    'profile.email': 'Email Address',
    'profile.accountType': 'Account Type',
    'profile.admin': 'Administrator',
    'profile.standard': 'Standard User',
    'profile.languageRegion': 'Language & Region',
    'profile.preferredLanguage': 'Preferred Language',
    'profile.signOut': 'Sign Out',
    'admin.accessDenied.title': 'Access Denied',
    'admin.accessDenied.text':
      'You need administrator privileges to access this page.',
    'admin.accessDenied.recheck': 'Recheck Admin Status',
  },
  // ... (rest of your translations unchanged)
  es: { /* ... */ },
  fr: { /* ... */ },
  de: { /* ... */ },
  it: { /* ... */ },
  pt: { /* ... */ },
  ru: { /* ... */ },
  ja: { /* ... */ },
  ko: { /* ... */ },
  zh: { /* ... */ },
};

function translate(lang: string, key: string): string {
  const L = TR[lang] || TR.en;
  return L[key] || TR.en[key] || key;
}

/* ──────────────────────────────────────────────────────────────────────────
   Binance polling
   ────────────────────────────────────────────────────────────────────────── */
type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
};

const BINANCE_MAP: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  ADA: 'ADAUSDT',
  AVAX: 'AVAXUSDT',
  DOT: 'DOTUSDT',
  MATIC: 'MATICUSDT',
};

const BINANCE_TO_LOCAL: Record<string, string> = Object.fromEntries(
  Object.entries(BINANCE_MAP).map(([k, v]) => [v, k]),
);

interface AppUser extends Profile {
  balances: Record<string, number>;
}

interface AppContextType {
  user: AppUser | null;
  coins: Coin[];
  transactions: Transaction[];
  language: string;
  loading: boolean;
  t: (key: string) => string;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  setLanguage: (lang: string) => void;

  updateBalance: (coin: string, amount: number) => Promise<void>;
  addTransaction: (
    t: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  updateCoinPrice: (symbol: string, price: number) => Promise<void>;
  refreshData: () => Promise<void>;

  refreshUserData?: (userId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const toNum = (v: any, d = 0) =>
  v === null || v === undefined || v === '' ? d : Number(v);
const normalizeCoin = (c: any) => ({
  ...c,
  price: toNum(c.price),
  change24h: toNum((c as any).change24h ?? (c as any).change_24h),
  volume: toNum(c.volume),
  market_cap: toNum((c as any).market_cap ?? (c as any).marketCap),
});

/* ──────────────────────────────────────────────────────────────────────────
   Helper: call server to get profile+balances+transactions
   ────────────────────────────────────────────────────────────────────────── */
async function fetchUserDataFromServer(opts: {
  email?: string;
  id?: string;
}): Promise<{
  profile: Profile;
  balances: Array<{ coin_symbol: string; balance: number }>;
  transactions: Transaction[];
}> {
  const qs = opts.id
    ? `id=${encodeURIComponent(opts.id)}`
    : `email=${encodeURIComponent(opts.email || '')}`;
  const res = await fetch(`/.netlify/functions/get-user-data?${qs}`);
  const json = await res.json();
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || res.statusText);
  }
  return json;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [language, setLanguageState] = useState<string>(
    localStorage.getItem('nova_lang') || 'en'
  );
  const [loading, setLoading] = useState(true);

  const t = (key: string) => translate(language, key);

  // ── App init
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase(); // no-op on client stub
        const res = await pingDB(); // { ok:false } on client stub
        console.log('Neon ping:', res);
        await loadCoins();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Restore user & transactions via server function
  useEffect(() => {
    const savedEmail = localStorage.getItem('nova_user_email');
    if (!savedEmail) return;
    (async () => {
      try {
        const j = await fetchUserDataFromServer({ email: savedEmail });

        const balMap: Record<string, number> = {};
        (j.balances || []).forEach((r) => {
          balMap[r.coin_symbol] = Number(r.balance ?? 0);
        });

        const profile = j.profile as Profile;
        setUser({ ...profile, balances: balMap });
        setTransactions((j.transactions || []) as Transaction[]);

        if (profile.language && profile.language !== language) {
          setLanguage(profile.language);
        }
      } catch (e) {
        console.warn('Could not restore user:', e);
        localStorage.removeItem('nova_user_email');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep language in localStorage
  useEffect(() => {
    localStorage.setItem('nova_lang', language);
  }, [language]);

  // Load coins (server first, fallback to client stub)
  const loadCoins = async () => {
    try {
      const res = await fetch('/.netlify/functions/get-coins', { cache: 'no-store' });
      if (res.ok) {
        const { coins } = await res.json();
        setCoins(coins.map(normalizeCoin) as any);
        return;
      } else {
        console.warn('get-coins non-200:', res.status, await res.text());
      }
    } catch (e) {
      console.warn('get-coins failed, falling back to stub:', e);
    }
    try {
      const coinsData = await NeonDB.getCoins();
      setCoins(coinsData.map(normalizeCoin) as any);
    } catch (error) {
      console.error('Error loading coins:', error);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const j = await fetchUserDataFromServer({ id: userId });
      const balMap: Record<string, number> = {};
      (j.balances || []).forEach((r) => {
        balMap[r.coin_symbol] = Number(r.balance ?? 0);
      });
      setUser((prev) => (prev ? { ...prev, balances: balMap } : prev));
      setTransactions((j.transactions || []) as Transaction[]);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const refreshUserData = async (targetUserId?: string): Promise<void> => {
    try {
      const uid = targetUserId ?? user?.id;
      if (!uid) return;
      await loadUserData(uid);
    } catch (e) {
      console.error('refreshUserData failed:', e);
    }
  };

  const refreshProfileFromDB = async () => {
    if (!user) return;
    const { getProfileByEmail } = await sb(); // 👈 lazy
    const { profile: fresh } = await getProfileByEmail(user.email);
    if (fresh) {
      const now = new Date().toISOString();
      const merged: Profile = {
        id: (fresh as any).id ?? user.id,
        email: user.email,
        name: fresh.name ?? user.name,
        is_admin: !!fresh.is_admin,
        language: (fresh as any).language ?? user.language ?? 'en',
        created_at: user.created_at ?? now,
        updated_at: now,
      };
      setUser((prev) => (prev ? { ...prev, ...merged } : prev));
      if (merged.language && merged.language !== language) {
        setLanguage(merged.language);
      }
    }
  };

  /* ────────────── Auth: Supabase + server upsert + server read ────────────── */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1) Supabase auth (lazy)
      const { supabase } = await sb(); // 👈 lazy
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Auth signIn failed:', error);
        return false;
      }

      // 2) Upsert profile on the server (Netlify Function → Neon)
      try {
        const u = data.user!;
        await fetch('/.netlify/functions/upsert-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: u.id,
            email: u.email,
            name:
              (u.user_metadata as any)?.name ??
              (u.user_metadata as any)?.full_name ??
              (u.email ? u.email.split('@')[0] : 'user'),
          }),
        });
      } catch (err) {
        console.error('Profile sync failed:', err);
      }

      // 3) Pull profile + balances + txs from the server
      const j = await fetchUserDataFromServer({ email });

      const balMap: Record<string, number> = {};
      (j.balances || []).forEach((r) => {
        balMap[r.coin_symbol] = Number(r.balance ?? 0);
      });

      const profile = j.profile as Profile;
      setUser({ ...profile, balances: balMap });
      setTransactions((j.transactions || []) as Transaction[]);
      if (profile.language && profile.language !== language) {
        setLanguage(profile.language);
      }

      localStorage.setItem('nova_user_email', profile.email);
      await refreshData();

      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    try {
      const { supabase, createProfile } = await sb(); // 👈 lazy
      // 1) Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/profile' },
      });
      console.log('supabase.auth.signUp →', { authData, authError });
      if (authError) {
        alert(`Sign up failed: ${authError.message}`);
        return false;
      }

      // 2) Create a Supabase profiles row (public table)
      const isAdmin = email === 'admin52980@gmail.com';
      const { profile, error } = await createProfile(email, name, isAdmin);
      console.log('createProfile →', { profile, error });
      if (error) {
        console.warn('createProfile warning:', error);
      }

      // 3) Upsert Neon profile via Netlify Function (server-side)
      try {
        await fetch('/.netlify/functions/upsert-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: (authData as any)?.user?.id,
            email,
            name,
            is_admin: isAdmin,
          }),
        });
      } catch (e) {
        console.warn('Server profile upsert failed (non-fatal):', e);
      }

      // 4) Pull fresh data from server and set context
      const j = await fetchUserDataFromServer({ email });

      const balMap: Record<string, number> = {};
      (j.balances || []).forEach((r) => {
        balMap[r.coin_symbol] = Number(r.balance ?? 0);
      });

      const serverProfile = j.profile as Profile;
      setUser({ ...serverProfile, balances: balMap });
      setTransactions((j.transactions || []) as Transaction[]);
      localStorage.setItem('nova_user_email', serverProfile.email);

      return true;
    } catch (e) {
      console.error('Registration error:', e);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { supabase } = await sb(); // 👈 lazy
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setTransactions([]);
    localStorage.removeItem('nova_user_email');
  };

  /* ────────────── Data mutations ────────────── */
  const updateBalance = async (
    coinSymbol: string,
    amount: number
  ): Promise<void> => {
    if (!user) return;
    try {
      await NeonDB.updateUserBalance(user.id, coinSymbol, amount);
      await refreshUserData(user.id);
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  };

  const addTransaction = async (
    t: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> => {
    try {
      await NeonDB.addTransaction(t);
      if (user) {
        await refreshUserData(user.id);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateCoinPrice = async (symbol: string, price: number): Promise<void> => {
    try {
      await NeonDB.updateCoinPrice(symbol, price);
      setCoins((prev) =>
        prev.map((coin) =>
          coin.symbol === symbol
            ? ({ ...coin, price: toNum(price), updated_at: new Date().toISOString() } as any)
            : coin
        )
      );
    } catch (error) {
      console.error('Error updating coin price:', error);
      throw error;
    }
  };

  // change UI language + persist to DB if logged in
  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('nova_lang', lang);
    const maybeSetLang = (NeonDB as unknown as {
      setUserLanguage?: (id: string, l: string) => Promise<void>;
    }).setUserLanguage;
    if (user?.id && typeof maybeSetLang === 'function') {
      maybeSetLang(user.id, lang).catch(() => {});
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadCoins();
    if (user) {
      await refreshProfileFromDB();
      await loadUserData(user.id);
    }
  };

  /* ────────────── Live price polling ────────────── */
  const pollMs = Number(import.meta.env.VITE_PRICE_POLL_MS ?? 15000);
  const persistMs = Number(import.meta.env.VITE_PRICE_PERSIST_MS ?? 60000);
  const lastPersistRef = useRef(0);

  useEffect(() => {
    const localSymbols = coins
      .map((c) => c.symbol)
      .filter((s) => !!BINANCE_MAP[s]);
    if (localSymbols.length === 0) return;

    const binanceSymbols = localSymbols.map((s) => BINANCE_MAP[s]);
    const url =
      'https://api.binance.com/api/v3/ticker/24hr?symbols=' +
      encodeURIComponent(JSON.stringify(binanceSymbols));

    let timer: number | undefined;

    const pull = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Binance ${res.status}`);
        const data: BinanceTicker[] = await res.json();

        const map: Record<string, BinanceTicker> = {};
        for (const r of data) map[r.symbol] = r;

        const nowIso = new Date().toISOString();
        setCoins((prev) =>
          prev.map((c) => {
            const mapped = BINANCE_MAP[c.symbol];
            if (!mapped) return c;
            const tkr = map[mapped];
            if (!tkr) return c;
            const price = Number(tkr.lastPrice);
            const change24h = Number(tkr.priceChangePercent);
            const volume = toNum(tkr.quoteVolume || tkr.volume, (c as any).volume ?? 0);
            return { ...c, price, change24h, volume, updated_at: nowIso } as any;
          })
        );

        const now = Date.now();
        if (now - lastPersistRef.current >= persistMs) {
          lastPersistRef.current = now;
          data.forEach((tkr) => {
            const local = BINANCE_TO_LOCAL[tkr.symbol];
            if (!local) return;
            const p = Number(tkr.lastPrice);
            if (isFinite(p) && p > 0) {
              NeonDB.updateCoinPrice(local, p).catch(() => {});
            }
          });
        }
      } catch (e) {
        console.warn('Live price poll failed:', e);
      }
    };

    pull();
    timer = window.setInterval(pull, pollMs);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [coins.length, persistMs, pollMs]);

  return (
    <AppContext.Provider
      value={{
        user,
        coins,
        transactions,
        language,
        loading,
        t,
        login,
        logout,
        register,
        setLanguage,
        updateBalance,
        addTransaction,
        updateCoinPrice,
        refreshData,
        refreshUserData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
