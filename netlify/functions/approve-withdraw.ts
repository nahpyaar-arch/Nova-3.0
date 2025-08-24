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
    if (tx.status !== 'pending') {
      // already processed
      return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'already processed' }) };
    }

    const userId = String(tx.user_id);
    const symbol = String(tx.coin_symbol);
    const amount = Number(tx.amount);

    // Check balances
    const balRows = await sql`
      SELECT balance, locked_balance
      FROM user_balances
      WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      LIMIT 1
    `;
    const b = balRows[0] ?? { balance: 0, locked_balance: 0 };
    const balance = Number(b.balance ?? 0);
    const locked  = Number(b.locked_balance ?? 0);

    // Prefer deducting from locked; fall back to available balance
    if (locked >= amount) {
      await sql`
        UPDATE user_balances
        SET locked_balance = locked_balance - ${amount},
            updated_at     = NOW()
        WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      `;
    } else if (balance >= amount) {
      await sql`
        UPDATE user_balances
        SET balance   = balance - ${amount},
            updated_at = NOW()
        WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      `;
    } else {
      return { statusCode: 400, body: 'Insufficient funds' };
    }

    // Mark transaction done
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
