import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { id } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, body: 'Missing id' };

    // Approve the deposit and get data to credit the balance
    const rows = await sql`
      UPDATE transactions
         SET status = 'approved'
       WHERE id = ${id} AND type = 'deposit' AND status = 'pending'
       RETURNING user_id, amount, coin_symbol;
    `;
    if (rows.length === 0) {
      return { statusCode: 404, body: 'Not found or not pending' };
    }

    const { user_id, amount, coin_symbol } = rows[0] as {
      user_id: string; amount: string | number; coin_symbol: string;
    };

    await sql`
      INSERT INTO user_balances (user_id, coin_symbol, balance)
      VALUES (${user_id}, ${coin_symbol}, ${Number(amount)})
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET balance = user_balances.balance + EXCLUDED.balance;
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-deposit error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
