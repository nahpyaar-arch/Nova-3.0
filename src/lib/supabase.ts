import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zngdfevnruxghcyckjls.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ2RmZXZucnV4Z2hjeWNramxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzU1NzksImV4cCI6MjA3MTQ1MTU3OX0.eQUi76LM1jPLb8IfifRf7Bfz9F5SFH-g8YIJHJJYTSY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Database types
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