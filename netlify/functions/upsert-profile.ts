import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
const sql = dbUrl ? neon(dbUrl) : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'content-type': 'text/plain' }, body: 'POST only' };
  }
  try {
    if (!sql) throw new Error('DB not configured');

    const { id, email, name } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: 'Missing email' };

    const now = new Date().toISOString();
    const rows = await (sql as any)`
      INSERT INTO profiles (id, email, name, is_admin, language, created_at, updated_at)
      VALUES (${id ?? crypto.randomUUID()}, ${email}, ${name ?? email.split('@')[0]}, false, 'en', ${now}, ${now})
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name, updated_at = ${now}
      RETURNING id, email, name, is_admin, language, created_at, updated_at
    `;
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, profile: rows[0] }),
    };
  } catch (e) {
    console.error('upsert-profile error:', e);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
};
