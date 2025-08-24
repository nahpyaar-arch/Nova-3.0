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

    await sql`UPDATE transactions SET status = 'rejected', updated_at = NOW() WHERE id = ${id}`;
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('reject-deposit error', e);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
