import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id || event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Missing id' }) };

    const db = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!db) return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }) };
    const sql = neon(db);

    const txRows = await sql`
      SELECT id, user_id, coin_symbol, amount, status, type
      FROM transactions WHERE id = ${id} LIMIT 1
    `;
    if (txRows.length === 0) return { statusCode: 404, headers: H, body: JSON.stringify({ ok: false, error: 'Not found' }) };
    const tx: any = txRows[0];
    if (tx.type !== 'deposit') return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'Not a deposit' }) };
    if (tx.status !== 'pending') return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, note: 'already processed' }) };

    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${tx.user_id}, ${tx.coin_symbol}, ${Number(tx.amount)}, 0, NOW(), NOW())
      ON CONFLICT (user_id, coin_symbol)
      DO UPDATE SET balance = user_balances.balance + ${Number(tx.amount)}, updated_at = NOW()
    `;
    await sql`UPDATE transactions SET status = 'completed', updated_at = NOW() WHERE id = ${id}`;

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('approve-deposit error', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
