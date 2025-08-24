import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { user_id, coin_symbol, amount, details } = JSON.parse(event.body || '{}');
    if (!user_id || !coin_symbol || !amount) {
      return { statusCode: 400, body: 'Missing user_id/coin_symbol/amount' };
    }

    const rows = await sql`
      INSERT INTO transactions (id, user_id, coin_symbol, amount, type, status, details, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, ${coin_symbol}, ${Number(amount)},
              'deposit', 'pending', ${JSON.stringify(details || {})}, NOW(), NOW())
      RETURNING id;
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: rows[0].id }) };
  } catch (e: any) {
    console.error('create-deposit error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
