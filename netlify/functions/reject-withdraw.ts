import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const { id } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, body: 'Missing id' };

    // Fetch the transaction
    const txRows = await sql`
      SELECT id, user_id, coin_symbol, amount, status, type
      FROM transactions
      WHERE id = ${id}
      LIMIT 1
    `;
    if (txRows.length === 0) return { statusCode: 404, body: 'Transaction not found' };

    const tx: any = txRows[0];
    if (tx.type !== 'withdraw') return { statusCode: 400, body: 'Not a withdrawal' };

    const userId = String(tx.user_id);
    const symbol = String(tx.coin_symbol);
    const amount = Number(tx.amount);

    // Credit funds back to available balance (in case they were locked)
    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${symbol}, ${amount}, 0, NOW(), NOW())
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET
        balance    = user_balances.balance + ${amount},
        updated_at = NOW()
    `;

    // Mark as rejected
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
