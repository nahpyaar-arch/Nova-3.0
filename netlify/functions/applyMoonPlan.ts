// netlify/functions/applyMoonPlan.ts
import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const config = { schedule: '@daily' };

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
const resp = (statusCode: number, body: unknown) =>
  ({ statusCode, headers, body: JSON.stringify(body) });

export const handler: Handler = async (event) => {
  try {
    // optional manual trigger: /.netlify/functions/applyMoonPlan?run=now&key=SECRET
    const runNow = (event.queryStringParameters?.run || '').toLowerCase() === 'now';
    if (runNow) {
      const key = event.queryStringParameters?.key || '';
      if (!process.env.MOON_CRON_SECRET || key !== process.env.MOON_CRON_SECRET) {
        return resp(403, { ok: false, error: 'Forbidden' });
      }
    }

    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.VITE_DATABASE_URL;

    if (!dbUrl) return resp(500, { ok: false, error: 'DATABASE_URL not set' });

    const sql = neon(dbUrl);

    // ── Today in JST (no generics on sql) ────────────────────────────────────
    const r1 = await sql`SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date AS d`;
    const todayJST = String(r1[0]?.d); // e.g., "2025-08-28"

    // ── Pull today's plan ───────────────────────────────────────────────────
    const planRows = await sql`
      SELECT day::date AS day, target_pct::numeric AS target_pct, COALESCE(note,'') AS note
      FROM moon_plans
      WHERE day = ${todayJST}
      LIMIT 1
    `;
    if (planRows.length === 0) {
      return resp(200, { ok: true, message: `No plan for ${todayJST}` });
    }
    const plan = planRows[0];
    const pct = Number(plan.target_pct);

    // ── Idempotency: skip if already applied today (JST) ────────────────────
    const dupe = await sql`
      SELECT 1
      FROM price_history
      WHERE symbol='MOON'
        AND source='planner'
        AND date_trunc('day', ts AT TIME ZONE 'Asia/Tokyo') = ${todayJST}
      LIMIT 1
    `;
    if (dupe.length) return resp(200, { ok: true, message: 'Already applied today' });

    // ── Current price ───────────────────────────────────────────────────────
    const curRow = await sql`SELECT price FROM coins WHERE symbol='MOON' LIMIT 1`;
    if (curRow.length === 0) return resp(500, { ok: false, error: 'MOON not found in coins' });

    const cur = Number(curRow[0].price);
    const next = Number((cur * (1 + pct / 100)).toFixed(8));

    // ── Apply update + log ──────────────────────────────────────────────────
    await sql`UPDATE coins SET price=${next}, change_24h=${pct} WHERE symbol='MOON'`;

    const noteText = plan.note ? ` — ${plan.note}` : '';
    await sql`
      INSERT INTO price_history(symbol, price, ts, source, note)
      VALUES ('MOON', ${next}, now(), 'planner',
              ${`Applied ${pct}% for ${todayJST}${noteText}`})
    `;

    return resp(200, { ok: true, applied_for: todayJST, pct, old: cur, next });
  } catch (err: any) {
    return resp(500, { ok: false, error: err?.message || String(err) });
  }
};
