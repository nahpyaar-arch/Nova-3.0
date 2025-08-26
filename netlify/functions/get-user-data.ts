// netlify/functions/get-user-data.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || '';
const sql = dbUrl ? neon(dbUrl) : null;

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'GET only' }) };
  }
  try {
    if (!sql) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'DB not configured' }) };
    }

    const q = event.queryStringParameters || {};
    const email = (q.email || '').trim().toLowerCase();
    const rawId = (q.id || '').trim();

    if (!email && !rawId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Provide ?email= or ?id=' }) };
    }

    // ——— Resolve profile ———
    let profile: any = null;

    if (email) {
      const rows = await (sql as any)`
        SELECT * FROM profiles WHERE LOWER(email) = ${email} LIMIT 1
      `;
      profile = rows?.[0] || null;
    } else if (rawId) {
      // Try by profiles.id
      let rows: any[] = [];
      try {
        rows = await (sql as any)`SELECT * FROM profiles WHERE id = ${rawId} LIMIT 1`;
      } catch { /* ignore */ }
      profile = rows?.[0] || null;

      // Try by profiles.auth_id (if column exists)
      if (!profile) {
        try {
          rows = await (sql as any)`SELECT * FROM profiles WHERE auth_id = ${rawId} LIMIT 1`;
          profile = rows?.[0] || null;
        } catch { /* column might not exist */ }
      }

      // Try by profiles.user_id (if column exists)
      if (!profile) {
        try {
          rows = await (sql as any)`SELECT * FROM profiles WHERE user_id = ${rawId} LIMIT 1`;
          profile = rows?.[0] || null;
        } catch { /* column might not exist */ }
      }
    }

    if (!profile) {
      return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Profile not found' }) };
    }

    // ——— Data ———
    const balances = await (sql as any)`
      SELECT coin_symbol, balance::float AS balance
      FROM user_balances
      WHERE user_id = ${profile.id}
      ORDER BY coin_symbol ASC
    `;

    const transactions = await (sql as any)`
      SELECT *
      FROM transactions
      WHERE user_id = ${profile.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, profile, balances, transactions }),
    };
  } catch (e: any) {
    console.error('get-user-data error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
