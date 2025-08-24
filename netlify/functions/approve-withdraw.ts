import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { id } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, body: 'Missing id' };

    // 1) approve pending withdraw
    const rows = await sql`
      UPDATE transactions
      SET status = 'approved'
      WHERE id = ${id} AND type = 'withdraw' AND status = 'pending'
      RETURNING user_id, coin_symbol, amount;
    `;
    if (rows.length === 0) return { statusCode: 404, body: 'Not found or not pending' };

    const { user_id, coin_symbol, amount } = rows[0];

    // 2) debit balance (allow negative or enforce check)
    // Enforce "enough balance": if not enough, revert and error.
    const bal = await sql`
      SELECT balance FROM user_balances WHERE user_id=${user_id} AND coin_symbol=${coin_symbol};
    `;
    const current = Number(bal[0]?.balance ?? 0);
    if (current < Number(amount)) {
      // revert status back to pending so admin can decide
      await sql`UPDATE transactions SET status='pending' WHERE id=${id};`;
      return { statusCode: 400, body: 'Insufficient balance for withdrawal' };
    }

    await sql`
      UPDATE user_balances
      SET balance = balance - ${Number(amount)}
      WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol};
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-withdraw error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
