import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    const db = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!db) return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }) };
    const sql = neon(db);

    const type = (event.queryStringParameters?.type || '').toLowerCase();
    const status = (event.queryStringParameters?.status || '').toLowerCase();

    const rows = await sql`
      SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
      FROM transactions
      WHERE (${type ? sql`type = ${type}` : sql`TRUE`})
        AND (${status ? sql`status = ${status}` : sql`TRUE`})
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, transactions: rows }) };
  } catch (e: any) {
    console.error('get-transactions error', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
