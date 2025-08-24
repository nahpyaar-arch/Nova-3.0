// netlify/functions/delete-moon-plan.ts
import type { Handler } from '@netlify/functions';
import { NeonDB } from '../../src/lib/neon';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'POST only' };
  }
  try {
    const { day } = JSON.parse(event.body || '{}');
    if (!day) return { statusCode: 400, body: 'Missing {day}' };
    await NeonDB.deleteMoonPlan(String(day));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('delete-moon-plan error:', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
export default handler;
