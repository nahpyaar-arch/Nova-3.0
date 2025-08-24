import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || '';
const sql = dbUrl ? neon(dbUrl) : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { 'content-type': 'text/plain' }, body: 'GET only' };
  }
  try {
    if (!sql) throw new Error('DB not configured');

    const q = event.queryStringParameters || {};
    const email = q.email;
    const id = q.id;

    if (!email && !id) return { statusCode: 400, body: 'Provide ?email= or ?id=' };

    const profRows = id
      ? await (sql as any)`SELECT * FROM profiles WHERE id = ${id} LIMIT 1`
      : await (sql as any)`SELECT * FROM profiles WHERE email = ${email} LIMIT 1`;
    const profile = profRows[0];
    if (!profile) return { statusCode: 404, body: 'Profile not found' };

    const balances = await (sql as any)`
      SELECT coin_symbol, balance::float AS balance FROM user_balances WHERE user_id = ${profile.id}
    `;
    const transactions = await (sql as any)`
      SELECT * FROM transactions WHERE user_id = ${profile.id} ORDER BY created_at DESC LIMIT 200
    `;

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, profile, balances, transactions }),
    };
  } catch (e) {
    console.error('get-user-data error:', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
