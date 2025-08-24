import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: H, body: JSON.stringify({ ok: false, error: 'Use POST' }) };
    }
    const body = event.body ? JSON.parse(event.body) : {};
    const { user_id, coin_symbol, amount, details } = body;
    if (!user_id || !coin_symbol || !amount) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Missing user_id/coin_symbol/amount' }) };
    }

    const db = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!db) return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }) };
    const sql = neon(db);

    const rows = await sql`
      INSERT INTO transactions (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, 'deposit', ${coin_symbol}, ${Number(amount)}, 'pending', ${JSON.stringify(details || {})}, NOW(), NOW())
      RETURNING id
    `;
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, id: rows[0].id }) };
  } catch (e: any) {
    console.error('create-deposit error', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
