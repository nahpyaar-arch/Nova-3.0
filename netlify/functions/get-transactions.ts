import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!dbUrl) return { statusCode: 500, body: 'DATABASE_URL not set' };
    const sql = neon(dbUrl);

    const type = (event.queryStringParameters?.type || '').toLowerCase();     // deposit | withdraw | ''
    const status = (event.queryStringParameters?.status || '').toLowerCase(); // pending | approved | ...

    const rows = await sql`
      SELECT id, user_id, coin_symbol, amount, type, status, details, created_at
      FROM transactions
      WHERE (${type} = ''  OR type   = ${type})
        AND (${status} = '' OR status = ${status})
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true, transactions: rows }) };
  } catch (e: any) {
    console.error('get-transactions error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
