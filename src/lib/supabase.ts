// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Rely on environment. Do not hardcode secrets in source.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful message during local dev / misconfigured deploys
  throw new Error(
    'Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─────────────────────────────────────────────────────────────
// Database Types (shared in app)
// ─────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  volume: number;
  market_cap: number;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  coin_symbol: string;
  balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'trade' | 'exchange';
  coin_symbol: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  details: any;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  coin_symbol: string;
  price: number;
  timestamp: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}
