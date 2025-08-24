// netlify/functions/approve-withdraw.ts
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

    const balRows = await sql`
      SELECT balance, locked_balance
      FROM user_balances
      WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol}
    `;
    const cur = balRows[0] || { balance: 0, locked_balance: 0 };
    const bal = Number(cur.balance || 0);
    const locked = Number(cur.locked_balance || 0);
    const amt = Number(amount);

    if (locked >= amt) {
      await sql`
        UPDATE user_balances
        SET locked_balance = locked_balance - ${amt}, updated_at = NOW()
        WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol}
      `;
    } else if (bal >= amt) {
      await sql`
        UPDATE user_balances
        SET balance = balance - ${amt}, updated_at = NOW()
        WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol}
      `;
    } else {
      return { statusCode: 400, body: 'Insufficient funds' };
    }

    await sql`
      UPDATE transactions
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${id}
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-withdraw error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
