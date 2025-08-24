// src/lib/neon.ts
import { neon } from '@neondatabase/serverless';

/**
 * IMPORTANT:
 * Put your connection string in env:
 *  - For the app (Vite): VITE_DATABASE_URL
 *  - For Netlify Functions: VITE_DATABASE_URL (or DATABASE_URL)
 */

// --- Resolve DB URL safely in both environments (Node & browser) ---
function resolveDbUrl(): string | undefined {
  // Node / Netlify Functions: prefer process.env
  if (typeof process !== 'undefined' && (process as any).env) {
    return (
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      undefined
    );
  }
  // Browser (Vite): read from import.meta.env
  try {
    // optional chaining protects on older bundlers
    return (import.meta as any)?.env?.VITE_DATABASE_URL;
  } catch {
    return undefined;
  }
}

const databaseUrl = resolveDbUrl();

// Single, canonical SQL export
export const sql = databaseUrl ? neon(databaseUrl) : (null as any);

// Warn in the browser if not configured
if (!databaseUrl) {
  console.warn(
    'No VITE_DATABASE_URL / DATABASE_URL found; using mock data for DB reads.'
  );
}

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────
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
  isCustom: boolean;   // UI-friendly
  is_active: boolean;  // DB-style
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

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────
const toNum = (v: any, d = 0) =>
  v === null || v === undefined || v === '' ? d : Number(v);

export function normalizeCoin(row: any): Coin {
  const now = new Date().toISOString();
  return {
    id: row.id ?? (globalThis.crypto?.randomUUID?.() ?? String(Math.random())),
    symbol: row.symbol,
    name: row.name,
    price: Number(row.price ?? 0),
    change_24h: Number(row.change_24h ?? row.change24h ?? row.change24H ?? 0),
    volume: Number(row.volume ?? 0),
    market_cap: Number(row.market_cap ?? 0),
    isCustom: Boolean(row.isCustom ?? row.is_custom ?? false),
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  };
}

function mockCoins(): Coin[] {
  const now = new Date().toISOString();
  const raw = [
    { id: '1',  symbol: 'BTC',   name: 'Bitcoin',    price: 43250.0, change_24h: 2.45, volume: 28500000000, market_cap: 847000000000, is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '2',  symbol: 'ETH',   name: 'Ethereum',   price: 2650.0,  change_24h: 1.85, volume: 15200000000, market_cap: 318000000000, is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '3',  symbol: 'BNB',   name: 'BNB',        price: 315.5,   change_24h: 0.95, volume: 1800000000,  market_cap: 47200000000,  is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '4',  symbol: 'USDT',  name: 'Tether',     price: 1.0,     change_24h: 0.01, volume: 45000000000, market_cap: 95000000000,  is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '5',  symbol: 'SOL',   name: 'Solana',     price: 98.75,   change_24h: 3.25, volume: 2100000000,  market_cap: 42800000000,  is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '6',  symbol: 'ADA',   name: 'Cardano',    price: 0.485,   change_24h: -1.25,volume: 580000000,   market_cap: 17200000000,  is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '7',  symbol: 'AVAX',  name: 'Avalanche',  price: 36.8,    change_24h: 2.15, volume: 420000000,   market_cap: 13500000000,  is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '8',  symbol: 'DOT',   name: 'Polkadot',   price: 7.25,    change_24h: -0.85,volume: 180000000,   market_cap: 9200000000,   is_custom: false, is_active: true, created_at: now, updated_at: now },
    { id: '9',  symbol: 'MATIC', name: 'Polygon',    price: 0.825,   change_24h: 1.45, volume: 320000000,   market_cap: 7800000000,   is_custom: false, is_active: true, created_at: now, updated_at: now },
    // NOTE: keep mock in sync with DB semantics: is_custom = false for MOON
    { id: '10', symbol: 'MOON',  name: 'Moon Token', price: 0.0125,  change_24h: 5.75, volume: 15000000,    market_cap: 125000000,    is_custom: false, is_active: true, created_at: now, updated_at: now },
  ];
  return raw.map(normalizeCoin);
}

// ───────────────────────────────────────────────────────────
// DB API
// ───────────────────────────────────────────────────────────
export class NeonDB {
  // low-level escape hatch
  static async query(queryText: string, params: any[] = []) {
    if (!sql) throw new Error('Database not connected');
    return await (sql as any)([queryText] as any, ...params);
  }

  // ── Transactions queue helpers ───────────────────────────
  static async getPendingTransactions(type?: 'deposit' | 'withdraw'): Promise<Transaction[]> {
    if (!sql) return [];
    const client = sql as any;

    if (type) {
      const rows = await client`
        SELECT *
        FROM transactions
        WHERE status = 'pending' AND type = ${type}
        ORDER BY created_at DESC
      `;
      return rows as any as Transaction[];
    } else {
      const rows = await client`
        SELECT *
        FROM transactions
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `;
      return rows as any as Transaction[];
    }
  }

  static async getTransactionById(txId: string): Promise<Transaction | null> {
    if (!sql) return null;
    const client = sql as any;
    const r = await client`
      SELECT *
      FROM transactions
      WHERE id = ${txId}
      LIMIT 1
    `;
    return (r as any[])[0] ?? null;
  }

  static async updateTransactionStatus(txId: string, status: Transaction['status']): Promise<void> {
    if (!sql) return;
    const client = sql as any;
    const now = new Date().toISOString();
    await client`
      UPDATE transactions
      SET status = ${status}, updated_at = ${now}
      WHERE id = ${txId}
    `;
  }

  // ── Admin actions: DEPOSIT queue ─────────────────────────
  static async approveDeposit(txId: string): Promise<void> {
    if (!sql) throw new Error('Database not connected');
    const client = sql as any;
    const now = new Date().toISOString();

    const tx = await NeonDB.getTransactionById(txId);
    if (!tx) throw new Error('Transaction not found');
    if (tx.type !== 'deposit') throw new Error('Not a deposit');
    if (tx.status !== 'pending') return;

    await client`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${tx.user_id}, ${tx.coin_symbol}, ${tx.amount}, 0, ${now}, ${now})
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET
        balance    = user_balances.balance + ${tx.amount},
        updated_at = ${now}
    `;

    await client`
      UPDATE transactions
      SET status = 'completed', updated_at = ${now}
      WHERE id = ${txId}
    `;
  }

  static async rejectDeposit(txId: string): Promise<void> {
    await NeonDB.updateTransactionStatus(txId, 'rejected');
  }

  // ── Admin actions: WITHDRAW queue ────────────────────────
  static async approveWithdrawal(txId: string): Promise<void> {
    if (!sql) throw new Error('Database not connected');
    const client = sql as any;
    const now = new Date().toISOString();

    const txRows = await client`
      SELECT id, user_id, coin_symbol, amount, status, type
      FROM transactions
      WHERE id = ${txId}
    `;
    const tx = txRows[0];
    if (!tx) throw new Error('Transaction not found');
    if (tx.type !== 'withdraw') throw new Error('Not a withdrawal');
    if (tx.status !== 'pending') return;

    const userId = tx.user_id as string;
    const symbol = tx.coin_symbol as string;
    const amount = Number(tx.amount);

    const balRows = await client`
      SELECT balance, locked_balance
      FROM user_balances
      WHERE user_id = ${userId} AND coin_symbol = ${symbol}
    `;
    const current = balRows[0] ?? { balance: 0, locked_balance: 0 };
    const balance = toNum(current.balance, 0);
    const locked  = toNum(current.locked_balance, 0);

    if (locked >= amount) {
      await client`
        UPDATE user_balances
        SET locked_balance = locked_balance - ${amount},
            updated_at     = ${now}
        WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      `;
    } else if (balance >= amount) {
      await client`
        UPDATE user_balances
        SET balance   = balance - ${amount},
            updated_at = ${now}
        WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      `;
    } else {
      throw new Error('Insufficient funds to approve withdrawal');
    }

    await client`
      UPDATE transactions
      SET status = 'completed', updated_at = ${now}
      WHERE id = ${txId}
    `;
  }

  static async rejectWithdrawal(txId: string): Promise<void> {
    if (!sql) throw new Error('Database not connected');
    const client = sql as any;
    const now = new Date().toISOString();

    const txRows = await client`
      SELECT id, user_id, coin_symbol, amount, status, type
      FROM transactions
      WHERE id = ${txId}
    `;
    const tx = txRows[0];
    if (!tx) throw new Error('Transaction not found');
    if (tx.type !== 'withdraw') throw new Error('Not a withdrawal');
    if (tx.status !== 'pending') return;

    const userId = tx.user_id as string;
    const symbol = tx.coin_symbol as string;
    const amount = Number(tx.amount);

    await client`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${symbol}, ${amount}, 0, ${now}, ${now})
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET
        balance    = user_balances.balance + ${amount},
        updated_at = ${now}
    `;

    await client`
      UPDATE transactions
      SET status = 'rejected', updated_at = ${now}
      WHERE id = ${txId}
    `;
  }

  // ── User operations ──────────────────────────────────────
  static async createUser(email: string, name: string, isAdmin = false): Promise<Profile> {
    if (!sql) throw new Error('Database not connected');
    const client = sql as any;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await client`
      INSERT INTO profiles (id, email, name, is_admin, language, created_at, updated_at)
      VALUES (${id}, ${email}, ${name}, ${isAdmin}, 'en', ${now}, ${now})
    `;

    return {
      id,
      email,
      name,
      is_admin: isAdmin,
      language: 'en',
      created_at: now,
      updated_at: now,
    };
  }

  static async getUserByEmail(email: string): Promise<Profile | null> {
    if (!sql) return null;
    const client = sql as any;

    const rows = await client`
      SELECT *
      FROM profiles
      WHERE email = ${email}
      LIMIT 1
    `;

    return (rows as any[])[0] ?? null;
  }

  // ── Coin operations ──────────────────────────────────────
  static async getCoins(): Promise<Coin[]> {
    if (!sql) return mockCoins();

    try {
      const rows = (await (sql as any)`
        SELECT *
        FROM coins
        WHERE is_active = true
        ORDER BY market_cap DESC
      `) as any[];
      return rows.map(normalizeCoin);
    } catch (error) {
      console.error('Error fetching coins from database:', error);
      return mockCoins(); // graceful fallback, not recursive
    }
  }

  static async initializeCoins(): Promise<void> {
    if (!sql) return;

    try {
      const countRows = (await (sql as any)`SELECT COUNT(*) AS count FROM coins`) as any[];
      const count = Number(countRows[0]?.count ?? 0);

      if (count === 0) {
        console.log('Initializing coins data...');
        const now = new Date().toISOString();

        await (sql as any)`
          INSERT INTO coins (id, symbol, name, price, change_24h, volume, market_cap, is_custom, is_active, created_at, updated_at)
          VALUES
          (${crypto.randomUUID()}, 'BTC',   'Bitcoin',   43250.00,  2.45, 28500000000, 847000000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'ETH',   'Ethereum',   2650.00,  1.85, 15200000000, 318000000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'BNB',   'BNB',         315.50,  0.95,  1800000000,  47200000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'USDT',  'Tether',        1.00,  0.01, 45000000000,  95000000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'SOL',   'Solana',       98.75,  3.25,  2100000000,  42800000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'ADA',   'Cardano',       0.485, -1.25,  580000000,  17200000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'AVAX',  'Avalanche',    36.80,  2.15,   420000000,  13500000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'DOT',   'Polkadot',      7.25, -0.85,   180000000,   9200000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'MATIC', 'Polygon',       0.825,  1.45,   320000000,   7800000000, false, true, ${now}, ${now}),
          (${crypto.randomUUID()}, 'MOON',  'Moon Token',    0.0125, 5.75,    15000000,    125000000, false, true, ${now}, ${now})
        `;

        console.log('Coins data initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing coins:', error);
    }
  }

  // Update price (optionally change_24h) + record history
  static async updateCoinPrice(
    symbol: string,
    price: number,
    changePct?: number
  ): Promise<void> {
    if (!sql) return;

    const now = new Date().toISOString();
    const client = sql as any;

    if (typeof changePct === 'number') {
      await client`
        UPDATE coins
        SET price = ${price}, change_24h = ${changePct}, updated_at = ${now}
        WHERE symbol = ${symbol}
      `;
    } else {
      await client`
        UPDATE coins
        SET price = ${price}, updated_at = ${now}
        WHERE symbol = ${symbol}
      `;
    }

    await client`
      INSERT INTO price_history (id, coin_symbol, price, timestamp)
      VALUES (${crypto.randomUUID()}, ${symbol}, ${price}, ${now})
    `;
  }

  // ── Balances ─────────────────────────────────────────────
  static async getUserBalances(userId: string): Promise<Record<string, number>> {
    if (!sql) return { USDT: 10000, BTC: 0.1, ETH: 1.5, MOON: 1000 };

    const result = (await (sql as any)`
      SELECT coin_symbol, balance FROM user_balances WHERE user_id = ${userId}
    `) as any[];

    const balances: Record<string, number> = {};
    result.forEach((row) => {
      balances[row.coin_symbol] = toNum(row.balance, 0);
    });

    return balances;
  }

  static async updateUserBalance(
    userId: string,
    coinSymbol: string,
    amountChange: number
  ): Promise<void> {
    if (!sql) return;

    const now = new Date().toISOString();

    await (sql as any)`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${coinSymbol}, ${amountChange}, 0, ${now}, ${now})
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET
        balance   = user_balances.balance + ${amountChange},
        updated_at = ${now}
    `;
  }

  // ── Transactions ─────────────────────────────────────────
  static async addTransaction(
    transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> {
    if (!sql) return;

    const now = new Date().toISOString();

    await (sql as any)`
      INSERT INTO transactions (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
      VALUES (
        ${crypto.randomUUID()},
        ${transaction.user_id},
        ${transaction.type},
        ${transaction.coin_symbol},
        ${transaction.amount},
        ${transaction.status},
        ${JSON.stringify(transaction.details ?? {})},
        ${now},
        ${now}
      )
    `;
  }

  static async getUserTransactions(userId: string): Promise<Transaction[]> {
    if (!sql) return [];
    return (await (sql as any)`
      SELECT * FROM transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `) as any as Transaction[];
  }

  // ── MOON daily target plan helpers ───────────────────────
  static async upsertMoonPlan(day: string, pct: number, note: string) {
    if (!sql) return;
    const client = sql as any;
    await client`
      INSERT INTO moon_plans (day, target_pct, note)
      VALUES (${day}, ${pct}, ${note})
      ON CONFLICT (day)
      DO UPDATE SET target_pct = EXCLUDED.target_pct, note = EXCLUDED.note
    `;
  }

  static async listMoonPlans(from: string, to: string): Promise<Array<{day: string; target_pct: number; note: string}>> {
    if (!sql) return [];
    const client = sql as any;
    const rows = await client`
      SELECT day::text AS day, target_pct::float AS target_pct, COALESCE(note,'') AS note
      FROM moon_plans
      WHERE day BETWEEN ${from} AND ${to}
      ORDER BY day ASC
    `;
    return rows;
  }

  static async deleteMoonPlan(day: string) {
    if (!sql) return;
    const client = sql as any;
    await client`DELETE FROM moon_plans WHERE day = ${day}`;
  }
}

// ───────────────────────────────────────────────────────────
// (Optional) Approve a deposit in a different table naming
// If you don’t use a `deposits` table, you can remove this helper.
// ───────────────────────────────────────────────────────────
export async function approveDepositInNeon(depositId: string, adminId: string) {
  if (!sql) throw new Error('Database not connected');
  const client = sql as any;

  const depRows = await client<{
    user_id: string; coin: string; amount: string;
  }[]>`
    update deposits
       set status = 'approved',
           approved_at = now(),
           approved_by = ${adminId}
     where id = ${depositId}
       and status = 'pending'
    returning user_id, coin, amount
  `;
  if (depRows.length === 0) {
    throw new Error('Deposit not found or already processed');
  }
  const dep = depRows[0];

  await client`
    insert into balances (user_id, coin, amount)
    values (${dep.user_id}, ${dep.coin}, ${dep.amount})
    on conflict (user_id, coin)
    do update set amount = balances.amount + excluded.amount
  `;

  await client`
    insert into transactions (user_id, type, coin, amount, meta)
    values (${dep.user_id}, 'deposit', ${dep.coin}, ${dep.amount},
            jsonb_build_object('deposit_id', ${depositId}))
  `;

  return dep;
}

// ───────────────────────────────────────────────────────────
// Schema initialization + ping
// ───────────────────────────────────────────────────────────
export async function initializeDatabase() {
  if (!sql) {
    console.warn('No database connection, skipping schema initialization');
    return;
  }

  try {
    console.log('Initializing database schema...');

    await (sql as any)`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        language TEXT DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await (sql as any)`
      CREATE TABLE IF NOT EXISTS coins (
        id UUID PRIMARY KEY,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price DECIMAL(20,8) NOT NULL DEFAULT 0,
        change_24h DECIMAL(10,4) DEFAULT 0,
        volume DECIMAL(20,2) DEFAULT 0,
        market_cap DECIMAL(20,2) DEFAULT 0,
        is_custom BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await (sql as any)`
      CREATE TABLE IF NOT EXISTS user_balances (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        coin_symbol TEXT NOT NULL,
        balance DECIMAL(20,8) DEFAULT 0,
        locked_balance DECIMAL(20,8) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, coin_symbol)
      )
    `;

    await (sql as any)`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'trade', 'exchange')),
        coin_symbol TEXT NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await (sql as any)`
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY,
        coin_symbol TEXT NOT NULL,
        price DECIMAL(20,8) NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // NEW: admin-set daily % targets for MOON
    await (sql as any)`
      CREATE TABLE IF NOT EXISTS moon_plans (
        day DATE PRIMARY KEY,
        target_pct DECIMAL(10,2) NOT NULL,
        note TEXT DEFAULT ''
      )
    `;

    console.log('Database schema initialized successfully');
    await NeonDB.initializeCoins();
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

export async function pingDB() {
  if (!sql) return { ok: false, note: 'no sql client' as const };
  try {
    const r = await (sql as any)`SELECT 1 AS ok, NOW() AS ts, current_database() AS db`;
    return { ok: r[0]?.ok === 1, ts: r[0]?.ts, db: r[0]?.db };
  } catch (e) {
    console.error('Ping failed:', e);
    return { ok: false, error: String(e) };
  }
}
