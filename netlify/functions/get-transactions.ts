// netlify/functions/get-transactions.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const type = (event.queryStringParameters?.type || '').toLowerCase();
    const status = (event.queryStringParameters?.status || '').toLowerCase();

    let rows: any[] = [];
    if (type && status) {
      rows = await sql`
        SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
        FROM transactions
        WHERE type = ${type} AND status = ${status}
        ORDER BY created_at DESC
        LIMIT 200`;
    } else if (type) {
      rows = await sql`
        SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
        FROM transactions
        WHERE type = ${type}
        ORDER BY created_at DESC
        LIMIT 200`;
    } else if (status) {
      rows = await sql`
        SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
        FROM transactions
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT 200`;
    } else {
      rows = await sql`
        SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 200`;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, transactions: rows }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (e: any) {
    console.error('get-transactions error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
