// netlify/functions/approve-deposit.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Use POST' };

    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { id } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, body: 'Missing id' };

    const rows = await sql`
      UPDATE transactions
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${id} AND type = 'deposit' AND status = 'pending'
      RETURNING user_id, amount, coin_symbol
    `;
    if (rows.length === 0) return { statusCode: 404, body: 'Not found or not pending' };

    const { user_id, amount, coin_symbol } = rows[0];

    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, ${coin_symbol}, ${amount}, 0, NOW(), NOW())
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET
        balance = user_balances.balance + EXCLUDED.balance,
        updated_at = NOW()
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-deposit error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
