// netlify/functions/get-moon-plans.ts
import type { Handler } from '@netlify/functions';
import { NeonDB } from '../../src/lib/neon';

const dayStrUTC = (d = new Date()) => d.toISOString().slice(0, 10);

export const handler: Handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const today = new Date();

    const from =
      (qs.from as string) ||
      dayStrUTC(new Date(today.getTime() - 10 * 86400_000));
    const to =
      (qs.to as string) ||
      dayStrUTC(new Date(today.getTime() + 10 * 86400_000));

    const plans = await NeonDB.listMoonPlans(from, to);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, from, to, plans }),
    };
  } catch (e: any) {
    console.error('get-moon-plans error:', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
export default handler;
