// netlify/functions/reject-withdraw.ts
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

    const txRows = await sql`
      SELECT user_id, coin_symbol, amount
      FROM transactions
      WHERE id = ${id} AND type = 'withdraw' AND status = 'pending'
    `;
    const tx = txRows[0];
    if (!tx) return { statusCode: 404, body: 'Not found or not pending' };

    const { user_id, coin_symbol, amount } = tx as any;

    // credit back to balance (typical “unlock”/refund)
    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, ${coin_symbol}, ${amount}, 0, NOW(), NOW())
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET balance = user_balances.balance + EXCLUDED.balance, updated_at = NOW()
    `;

    await sql`
      UPDATE transactions
      SET status = 'rejected', updated_at = NOW()
      WHERE id = ${id}
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('reject-withdraw error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
