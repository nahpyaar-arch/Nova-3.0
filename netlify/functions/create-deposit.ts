// netlify/functions/create-deposit.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Use POST' };

    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { user_id, coin_symbol, amount, details } = JSON.parse(event.body || '{}');
    if (!user_id || !coin_symbol || !amount) {
      return { statusCode: 400, body: 'Missing user_id/coin_symbol/amount' };
    }

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO transactions (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
      VALUES (${id}, ${user_id}, 'deposit', ${coin_symbol}, ${Number(amount)}, 'pending',
              ${JSON.stringify(details || {})}, NOW(), NOW())
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (e: any) {
    console.error('create-deposit error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
