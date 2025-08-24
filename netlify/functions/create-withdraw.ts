// netlify/functions/create-withdraw.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' };
  }

  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };

  const sql = neon(dbUrl);

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    // ignore bad JSON
  }

  const user_id = String(body.user_id || '');
  const coin_symbol = String(body.coin_symbol || '').toUpperCase();
  const amount = Number(body.amount || 0);
  const details = body.details ?? {};
  const address = String(details.address || '');
  const network = String(details.network || '');
  const memo = String(details.memo || '');

  if (!user_id) return { statusCode: 400, body: 'Missing user_id' };
  if (!coin_symbol) return { statusCode: 400, body: 'Missing coin_symbol' };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { statusCode: 400, body: 'Invalid amount' };
  }
  if (!address || !network) {
    return { statusCode: 400, body: 'Address and network required' };
  }

  try {
    const now = new Date().toISOString();

    // Check current balance (no generic type args on `sql` here)
    const rows = (await sql`
      SELECT balance::float AS balance
      FROM user_balances
      WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol}
      LIMIT 1
    `) as unknown as Array<{ balance?: number }>;

    const current = Number(rows?.[0]?.balance ?? 0);
    if (current < amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: 'Insufficient balance' }),
      };
    }

    // Move funds to locked and create a pending withdrawal atomically
    // @ts-ignore neon client has `begin`
    await sql.begin(async (tx: any) => {
      // Ensure balance row exists
      await tx`
        INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${user_id}, ${coin_symbol}, 0, 0, ${now}, ${now})
        ON CONFLICT (user_id, coin_symbol) DO NOTHING
      `;

      // Lock funds
      await tx`
        UPDATE user_balances
        SET balance = balance - ${amount},
            locked_balance = locked_balance + ${amount},
            updated_at = ${now}
        WHERE user_id = ${user_id} AND coin_symbol = ${coin_symbol}
      `;

      // Add pending transaction
      const txid = crypto.randomUUID();
      const detailsJson = JSON.stringify({ address, network, memo });

      await tx`
        INSERT INTO transactions
          (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
        VALUES
          (${txid}, ${user_id}, 'withdraw', ${coin_symbol}, ${amount}, 'pending',
           ${detailsJson}::jsonb, ${now}, ${now})
      `;
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('create-withdraw error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: String(e?.message || e) }),
    };
  }
};

export { handler };
