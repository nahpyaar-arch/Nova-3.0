// netlify/functions/upsert-moon-plan.ts
import type { Handler } from '@netlify/functions';
import { NeonDB } from '../../src/lib/neon';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'POST only' };
  }
  try {
    const { day, target_pct, note = '' } = JSON.parse(event.body || '{}');
    if (!day || target_pct === undefined || target_pct === null) {
      return { statusCode: 400, body: 'Missing {day, target_pct}' };
    }
    await NeonDB.upsertMoonPlan(String(day), Number(target_pct), String(note));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('upsert-moon-plan error:', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
export default handler;
