import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    // allow id via POST body or GET ?id=
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id || event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Missing id' }) };

    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }) };
    const sql = neon(dbUrl);

    // fetch tx
    const txRows = await sql`
      SELECT id, user_id, coin_symbol, amount, status, type
      FROM transactions
      WHERE id = ${id}
      LIMIT 1
    `;
    if (txRows.length === 0) return { statusCode: 404, headers: H, body: JSON.stringify({ ok: false, error: 'Transaction not found' }) };

    const tx: any = txRows[0];
    if (tx.type !== 'withdraw') return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Not a withdrawal' }) };
    if (tx.status !== 'pending') return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, note: 'already processed' }) };

    const userId = String(tx.user_id);
    const symbol = String(tx.coin_symbol);
    const amount = Number(tx.amount);

    // try deduct from locked; else from balance
    const balRows = await sql`
      SELECT balance, locked_balance
      FROM user_balances
      WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      LIMIT 1
    `;
    const b = balRows[0] ?? { balance: 0, locked_balance: 0 };
    const balance = Number(b.balance ?? 0);
    const locked  = Number(b.locked_balance ?? 0);

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
        SET balance = balance - ${amount},
            updated_at = NOW()
        WHERE user_id = ${userId} AND coin_symbol = ${symbol}
      `;
    } else {
      return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Insufficient funds' }) };
    }

    await sql`UPDATE transactions SET status = 'completed', updated_at = NOW() WHERE id = ${id}`;

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-withdraw error', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
