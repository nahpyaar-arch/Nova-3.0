// netlify/functions/get-coins.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const dbUrl =
  process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
const sql = dbUrl ? neon(dbUrl) : null;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'GET only' };
    }
    if (!sql) {
      return { statusCode: 500, body: 'DB not configured' };
    }

    const rows = await sql`
      SELECT id, symbol, name, price, change_24h, volume, market_cap,
             is_custom, is_active, created_at, updated_at
      FROM coins
      WHERE is_active = true
      ORDER BY market_cap DESC
    `;

    const coins = (rows as any[]).map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      price: Number(r.price),
      change_24h: Number(r.change_24h),
      volume: Number(r.volume),
      market_cap: Number(r.market_cap),
      isCustom: Boolean(r.is_custom),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ coins }),
    };
  } catch (e: any) {
    console.error('get-coins error:', e);
    return { statusCode: 500, body: e?.message || 'Server error' };
  }
};
