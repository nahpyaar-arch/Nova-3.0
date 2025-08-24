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
  NeonDB,
  initializeDatabase,
  type Profile,
  type Coin,
  type Transaction,
} from '../lib/neon';
import { pingDB } from '../lib/neon';

// Supabase helpers
import { supabase, getProfileByEmail, createProfile } from '../lib/supabase';

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
  es: {
    'nav.home': 'Inicio',
    'nav.market': 'Mercado',
    'nav.trade': 'Operar',
    'nav.assets': 'Activos',
    'nav.profile': 'Perfil',
    'nav.admin': 'Admin',
    'profile.title': 'Configuración de Perfil',
    'profile.accountInfo': 'Información de la cuenta',
    'profile.fullName': 'Nombre completo',
    'profile.email': 'Correo electrónico',
    'profile.accountType': 'Tipo de cuenta',
    'profile.admin': 'Administrador',
    'profile.standard': 'Usuario estándar',
    'profile.languageRegion': 'Idioma y región',
    'profile.preferredLanguage': 'Idioma preferido',
    'profile.signOut': 'Cerrar sesión',
    'admin.accessDenied.title': 'Acceso denegado',
    'admin.accessDenied.text':
      'Necesitas privilegios de administrador para acceder.',
    'admin.accessDenied.recheck': 'Volver a comprobar',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.market': 'Marché',
    'nav.trade': 'Échanger',
    'nav.assets': 'Actifs',
    'nav.profile': 'Profil',
    'nav.admin': 'Admin',
    'profile.title': 'Paramètres du profil',
    'profile.accountInfo': 'Informations du compte',
    'profile.fullName': 'Nom complet',
    'profile.email': 'Adresse e-mail',
    'profile.accountType': 'Type de compte',
    'profile.admin': 'Administrateur',
    'profile.standard': 'Utilisateur standard',
    'profile.languageRegion': 'Langue et région',
    'profile.preferredLanguage': 'Langue préférée',
    'profile.signOut': 'Se déconnecter',
    'admin.accessDenied.title': 'Accès refusé',
    'admin.accessDenied.text':
      "Vous avez besoin des privilèges d'administrateur.",
    'admin.accessDenied.recheck': 'Revérifier',
  },
  de: {
    'nav.home': 'Start',
    'nav.market': 'Markt',
    'nav.trade': 'Handel',
    'nav.assets': 'Vermögen',
    'nav.profile': 'Profil',
    'nav.admin': 'Admin',
    'profile.title': 'Profileinstellungen',
    'profile.accountInfo': 'Kontoinformationen',
    'profile.fullName': 'Vollständiger Name',
    'profile.email': 'E-Mail-Adresse',
    'profile.accountType': 'Kontotyp',
    'profile.admin': 'Administrator',
    'profile.standard': 'Standardbenutzer',
    'profile.languageRegion': 'Sprache & Region',
    'profile.preferredLanguage': 'Bevorzugte Sprache',
    'profile.signOut': 'Abmelden',
    'admin.accessDenied.title': 'Zugriff verweigert',
    'admin.accessDenied.text': 'Administratorrechte sind erforderlich.',
    'admin.accessDenied.recheck': 'Status erneut prüfen',
  },
  it: {
    'nav.home': 'Home',
    'nav.market': 'Mercato',
    'nav.trade': 'Scambia',
    'nav.assets': 'Asset',
    'nav.profile': 'Profilo',
    'nav.admin': 'Admin',
    'profile.title': 'Impostazioni profilo',
    'profile.accountInfo': 'Informazioni account',
    'profile.fullName': 'Nome completo',
    'profile.email': 'Indirizzo e-mail',
    'profile.accountType': 'Tipo di account',
    'profile.admin': 'Amministratore',
    'profile.standard': 'Utente standard',
    'profile.languageRegion': 'Lingua e regione',
    'profile.preferredLanguage': 'Lingua preferita',
    'profile.signOut': 'Esci',
    'admin.accessDenied.title': 'Accesso negato',
    'admin.accessDenied.text':
      "Sono necessari i privilegi d'amministratore.",
    'admin.accessDenied.recheck': 'Ricontrolla stato',
  },
  pt: {
    'nav.home': 'Início',
    'nav.market': 'Mercado',
    'nav.trade': 'Negociar',
    'nav.assets': 'Ativos',
    'nav.profile': 'Perfil',
    'nav.admin': 'Admin',
    'profile.title': 'Configurações do Perfil',
    'profile.accountInfo': 'Informações da conta',
    'profile.fullName': 'Nome completo',
    'profile.email': 'Endereço de e-mail',
    'profile.accountType': 'Tipo de conta',
    'profile.admin': 'Administrador',
    'profile.standard': 'Usuário padrão',
    'profile.languageRegion': 'Idioma e região',
    'profile.preferredLanguage': 'Idioma preferido',
    'profile.signOut': 'Sair',
    'admin.accessDenied.title': 'Acesso negado',
    'admin.accessDenied.text': 'Você precisa de privilégios de administrador.',
    'admin.accessDenied.recheck': 'Verificar novamente',
  },
  ru: {
    'nav.home': 'Главная',
    'nav.market': 'Рынок',
    'nav.trade': 'Торговля',
    'nav.assets': 'Активы',
    'nav.profile': 'Профиль',
    'nav.admin': 'Админ',
    'profile.title': 'Настройки профиля',
    'profile.accountInfo': 'Информация аккаунта',
    'profile.fullName': 'Полное имя',
    'profile.email': 'Электронная почта',
    'profile.accountType': 'Тип аккаунта',
    'profile.admin': 'Администратор',
    'profile.standard': 'Обычный пользователь',
    'profile.languageRegion': 'Язык и регион',
    'profile.preferredLanguage': 'Предпочитаемый язык',
    'profile.signOut': 'Выйти',
    'admin.accessDenied.title': 'Доступ запрещён',
    'admin.accessDenied.text': 'Нужны права администратора.',
    'admin.accessDenied.recheck': 'Проверить снова',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.market': 'マーケット',
    'nav.trade': '取引',
    'nav.assets': '資産',
    'nav.profile': 'プロフィール',
    'nav.admin': '管理',
    'profile.title': 'プロフィール設定',
    'profile.accountInfo': 'アカウント情報',
    'profile.fullName': '氏名',
    'profile.email': 'メールアドレス',
    'profile.accountType': 'アカウント種別',
    'profile.admin': '管理者',
    'profile.standard': '一般ユーザー',
    'profile.languageRegion': '言語と地域',
    'profile.preferredLanguage': '優先言語',
    'profile.signOut': 'サインアウト',
    'admin.accessDenied.title': 'アクセス拒否',
    'admin.accessDenied.text': '管理者権限が必要です。',
    'admin.accessDenied.recheck': '再チェック',
  },
  ko: {
    'nav.home': '홈',
    'nav.market': '마켓',
    'nav.trade': '거래',
    'nav.assets': '자산',
    'nav.profile': '프로필',
    'nav.admin': '관리',
    'profile.title': '프로필 설정',
    'profile.accountInfo': '계정 정보',
    'profile.fullName': '이름',
    'profile.email': '이메일 주소',
    'profile.accountType': '계정 유형',
    'profile.admin': '관리자',
    'profile.standard': '일반 사용자',
    'profile.languageRegion': '언어 및 지역',
    'profile.preferredLanguage': '기본 언어',
    'profile.signOut': '로그아웃',
    'admin.accessDenied.title': '접근 거부',
    'admin.accessDenied.text': '관리자 권한이 필요합니다.',
    'admin.accessDenied.recheck': '다시 확인',
  },
  zh: {
    'nav.home': '首页',
    'nav.market': '行情',
    'nav.trade': '交易',
    'nav.assets': '资产',
    'nav.profile': '个人',
    'nav.admin': '后台',
    'profile.title': '个人设置',
    'profile.accountInfo': '账户信息',
    'profile.fullName': '姓名',
    'profile.email': '邮箱地址',
    'profile.accountType': '账户类型',
    'profile.admin': '管理员',
    'profile.standard': '普通用户',
    'profile.languageRegion': '语言与地区',
    'profile.preferredLanguage': '首选语言',
    'profile.signOut': '退出登录',
    'admin.accessDenied.title': '无权访问',
    'admin.accessDenied.text': '需要管理员权限。',
    'admin.accessDenied.recheck': '重新检查',
  },
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

/* ────────────────────────────────────────────────────────────────────────── */

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

  // NEW: expose a precise refresher you can call for any user
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
        await initializeDatabase();
        const res = await pingDB();
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

  // Restore user & transactions
  useEffect(() => {
    const savedEmail = localStorage.getItem('nova_user_email');
    if (!savedEmail) return;
    (async () => {
      try {
        const profile = await NeonDB.getUserByEmail(savedEmail);
        if (profile) {
          const balances = await NeonDB.getUserBalances(profile.id);
          setUser({ ...profile, balances });
          if (profile.language && profile.language !== language) {
            setLanguage(profile.language);
          }
          const txs = await NeonDB.getUserTransactions(profile.id);
          setTransactions(txs);
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

  // ── Data loaders
  const loadCoins = async () => {
    try {
      const coinsData = await NeonDB.getCoins();
      setCoins(coinsData.map(normalizeCoin) as any);
    } catch (error) {
      console.error('Error loading coins:', error);
      const now = new Date().toISOString();
      setCoins([
        {
          id: '1',
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 43250.0,
          change24h: 2.45,
          volume: 28500000000,
          market_cap: 847000000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '2',
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2650.0,
          change24h: 1.85,
          volume: 15200000000,
          market_cap: 318000000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '3',
          symbol: 'BNB',
          name: 'BNB',
          price: 315.5,
          change24h: 0.95,
          volume: 1800000000,
          market_cap: 47200000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '4',
          symbol: 'USDT',
          name: 'Tether',
          price: 1.0,
          change24h: 0.01,
          volume: 45000000000,
          market_cap: 95000000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '5',
          symbol: 'SOL',
          name: 'Solana',
          price: 98.75,
          change24h: 3.25,
          volume: 2100000000,
          market_cap: 42800000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '6',
          symbol: 'ADA',
          name: 'Cardano',
          price: 0.485,
          change24h: -1.25,
          volume: 580000000,
          market_cap: 17200000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '7',
          symbol: 'AVAX',
          name: 'Avalanche',
          price: 36.8,
          change24h: 2.15,
          volume: 420000000,
          market_cap: 13500000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '8',
          symbol: 'DOT',
          name: 'Polkadot',
          price: 7.25,
          change24h: -0.85,
          volume: 180000000,
          market_cap: 9200000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '9',
          symbol: 'MATIC',
          name: 'Polygon',
          price: 0.825,
          change24h: 1.45,
          volume: 320000000,
          market_cap: 7800000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: '10',
          symbol: 'MOON',
          name: 'Moon Token',
          price: 0.0125,
          change24h: 5.75,
          volume: 15000000,
          market_cap: 125000000,
          is_custom: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ] as any);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const [balances, userTransactions] = await Promise.all([
        NeonDB.getUserBalances(userId),
        NeonDB.getUserTransactions(userId),
      ]);
      setUser((prev) => (prev ? { ...prev, balances } : prev));
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // NEW: single refresher you can call after any DB mutation
  const refreshUserData = async (targetUserId?: string): Promise<void> => {
    try {
      const uid = targetUserId ?? user?.id;
      if (!uid) return;
      const [bals, txs] = await Promise.all([
        NeonDB.getUserBalances(uid),
        NeonDB.getUserTransactions(uid),
      ]);
      // normalize decimals just in case
      Object.keys(bals).forEach((k) => (bals[k] = Number(bals[k] ?? 0)));
      setUser((prev) => (prev ? { ...prev, balances: bals } : prev));
      setTransactions(txs);
    } catch (e) {
      console.error('refreshUserData failed:', e);
    }
  };

  const refreshProfileFromDB = async () => {
    if (!user) return;
    const fresh = await NeonDB.getUserByEmail(user.email);
    if (fresh) {
      setUser((prev) => (prev ? { ...prev, ...fresh } : prev));
      if (fresh.language && fresh.language !== language) {
        setLanguage(fresh.language);
      }
    }
  };

  /* ────────────── Auth: Supabase + Neon profile ────────────── */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
// 1) Supabase auth
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error('Auth signIn failed:', error);
  return false;
}

// 2) Upsert profile on the server (Netlify Function)
try {
  const user = data.user!;
  await fetch('/.netlify/functions/upsert-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      // derive a safe name without relying on an undefined form variable
      name:
        (user.user_metadata as any)?.name ??
        (user.user_metadata as any)?.full_name ??
        (user.email ? user.email.split('@')[0] : 'user'),
    }),
  });
} catch (err) {
  console.error('Profile sync failed:', err);
}



      // 2) Supabase profile (for is_admin/name, etc.)
      const { profile: sbProfile, error: profileErr } =
        await getProfileByEmail(email);
      if (profileErr) {
        console.warn('getProfileByEmail warning:', profileErr);
      }

      // 3) Ensure local Neon user
      let local = await NeonDB.getUserByEmail(email);
      if (!local) {
        local = await NeonDB.createUser(
          email,
          sbProfile?.name ?? email.split('@')[0],
          sbProfile?.is_admin ?? false
        );
      }

      // 4) Load balances, set context, language
      const balances = await NeonDB.getUserBalances(local.id);
      setUser({ ...local, balances });
      if (local.language && local.language !== language) {
        setLanguage(local.language);
      }

      localStorage.setItem('nova_user_email', local.email);
      await loadUserData(local.id);
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

      // 3) Make sure local Neon user exists too
      let local = await NeonDB.getUserByEmail(email);
      if (!local) {
        local = await NeonDB.createUser(email, name, isAdmin);
      }

      // 4) Load balances and set context
      const balances = await NeonDB.getUserBalances(local.id);
      setUser({ ...local, balances });
      localStorage.setItem('nova_user_email', local.email);
      await loadUserData(local.id);

      return true;
    } catch (e) {
      console.error('Registration error:', e);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
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
      // IMPORTANT: do not do local math; pull fresh from Neon
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
        const userTx = await NeonDB.getUserTransactions(user.id);
        setTransactions(userTx);
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
            ? ({
                ...coin,
                price: toNum(price),
                updated_at: new Date().toISOString(),
              } as any)
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
        // NEW: make refresher available to AdminPage and others
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
