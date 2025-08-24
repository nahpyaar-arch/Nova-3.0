// netlify/functions/upsert-profile.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = dbUrl ? neon(dbUrl) : null;

export const handler: Handler = async (event) => {
  try {
    if (!sql) return { statusCode: 500, body: 'DB not configured' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };

    const { id, email, name, is_admin = false } = JSON.parse(event.body || '{}');
    if (!email || !name) return { statusCode: 400, body: 'Missing email/name' };

    const now = new Date().toISOString();

    await sql`
      INSERT INTO profiles (id, email, name, is_admin, language, created_at, updated_at)
      VALUES (${id || crypto.randomUUID()}, ${email}, ${name}, ${is_admin}, 'en', ${now}, ${now})
      ON CONFLICT (email)
      DO UPDATE SET name = EXCLUDED.name, updated_at = ${now}
    `;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('upsert-profile error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
