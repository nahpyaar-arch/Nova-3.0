// netlify/functions/exchange.ts
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
  const from_symbol = String(body.from_symbol || '').toUpperCase();
  const to_symbol   = String(body.to_symbol || '').toUpperCase();
  const amount = Number(body.amount || 0);

  if (!user_id) return { statusCode: 400, body: 'Missing user_id' };
  if (!from_symbol || !to_symbol || from_symbol === to_symbol) {
    return { statusCode: 400, body: 'Invalid symbols' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { statusCode: 400, body: 'Invalid amount' };
  }

  try {
    // fetch prices
    const priceRows: any[] = await sql`
      SELECT symbol, price::float AS price
      FROM coins
      WHERE symbol IN (${from_symbol}, ${to_symbol})
    `;
    const priceMap = Object.fromEntries(priceRows.map((r: any) => [r.symbol, Number(r.price)]));
    const fromPrice = Number(priceMap[from_symbol] || 0);
    const toPrice   = Number(priceMap[to_symbol]   || 0);
    if (!fromPrice || !toPrice) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Price not available' }) };
    }

    const valueUSD = amount * fromPrice;
    const feeUSD   = valueUSD * 0.001; // 0.1%
    const toAmount = (valueUSD - feeUSD) / toPrice;
    const now = new Date().toISOString();

    // ensure destination balance row exists
    await sql`
      INSERT INTO user_balances (id, user_id, coin_symbol, balance, locked_balance, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${user_id}, ${to_symbol}, 0, 0, ${now}, ${now})
      ON CONFLICT (user_id, coin_symbol) DO NOTHING
    `;

    // deduct source (only if enough balance)
    const dec: any[] = await sql`
      UPDATE user_balances
      SET balance = balance - ${amount}, updated_at = ${now}
      WHERE user_id = ${user_id}
        AND coin_symbol = ${from_symbol}
        AND balance >= ${amount}
      RETURNING balance
    `;
    if (dec.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Insufficient balance' }) };
    }

    // credit destination
    await sql`
      UPDATE user_balances
      SET balance = balance + ${toAmount}, updated_at = ${now}
      WHERE user_id = ${user_id} AND coin_symbol = ${to_symbol}
    `;

    // record transaction
    const txid = crypto.randomUUID();
    await sql`
      INSERT INTO transactions
        (id, user_id, type, coin_symbol, amount, status, details, created_at, updated_at)
      VALUES
        (${txid}, ${user_id}, 'exchange', ${from_symbol}, ${amount}, 'completed',
         ${JSON.stringify({ from: from_symbol, to: to_symbol, to_amount: toAmount, fee_usd: feeUSD })}::jsonb,
         ${now}, ${now})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: txid, to_amount: toAmount, fee: feeUSD }),
    };
  } catch (e: any) {
    console.error('exchange error:', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: String(e?.message || e) }) };
  }
};
