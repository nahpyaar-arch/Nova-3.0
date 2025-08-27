import type { Handler } from '@netlify/functions';
export const handler: Handler = async () => {
  try {
    const db = !!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.VITE_DATABASE_URL);
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    const ping = await sql`SELECT 1 AS ok`;
    return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:true, env:{DATABASE_URL:db}, ping }) };
  } catch (e:any) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
