// netlify/functions/create-withdraw.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Use POST' };

  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
  const sql = neon(dbUrl);

  let body: any = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const user_id = String(body.user_id || '');
  const coin_symbol = String(body.coin_symbol || '').toUpperCase();
  const amount = Number(body.amount || 0);
  const details = body.details ?? {};
  const address = String(details.address || '');
  const network = String(details.network || '');
  const memo = String(details.memo || '');

  if (!user_id) return { statusCode: 400, body: 'Missing user_id' };
  if (!coin_symbol) return { statusCode: 400, body: 'Missing coin_symbol' };
  if (!Number.isFinite(amount) || amount <= 0) return { statusCode: 400, body: 'Invalid amount' };
  if (!address || !network) return { statusCode: 400, body: 'Address and network required' };

  try {
    const now = new Date().toISOString();

    // ensure balance row exists (idempotent)
    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, ${coin_symbol}, 0, 0, ${now}, ${now})
      ON CONFLICT (user_id, coin_symbol) DO NOTHING
    `;

    // atomically move funds from balance -> locked if there are enough funds
    const updated: any[] = await sql`
      UPDATE user_balances
      SET balance = balance - ${amount},
          locked_balance = locked_balance + ${amount},
          updated_at = ${now}
      WHERE user_id = ${user_id}
        AND coin_symbol = ${coin_symbol}
        AND balance >= ${amount}
      RETURNING balance, locked_balance
    `;
    if (updated.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Insufficient balance' }) };
    }

    const txid = crypto.randomUUID();
    await sql`
      INSERT INTO transactions
        (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
      VALUES
        (${txid}, ${user_id}, 'withdraw', ${coin_symbol}, ${amount}, 'pending',
         ${JSON.stringify({ address, network, memo })}::jsonb, ${now}, ${now})
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: txid }) };
  } catch (e: any) {
    console.error('create-withdraw error:', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: String(e?.message || e) }) };
  }
};
