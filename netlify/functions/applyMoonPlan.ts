// netlify/functions/applyMoonPlan.ts
import type { Handler } from '@netlify/functions';

export const config = { schedule: '@daily' };

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const resp = (statusCode: number, body: unknown) =>
  ({ statusCode, headers, body: JSON.stringify(body) });

export const handler: Handler = async (event) => {
  try {
    // manual trigger: ?run=now&key=SECRET
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

    // ✅ dynamic import so module errors are catchable
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);

    // idempotency ledger (simple & robust)
    await sql`
      CREATE TABLE IF NOT EXISTS planner_runs (
        day date PRIMARY KEY,
        pct numeric NOT NULL,
        applied_at timestamptz DEFAULT now(),
        note text
      )
    `;

    // today in JST
    const r1 = await sql`SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date AS d`;
    const todayJST = String(r1[0]?.d);

    // already applied?
    const ran = await sql`SELECT 1 FROM planner_runs WHERE day=${todayJST} LIMIT 1`;
    if (ran.length) return resp(200, { ok: true, message: `Already applied for ${todayJST}` });

    // plan
    const planRows = await sql`
      SELECT target_pct::numeric AS pct, COALESCE(note,'') AS note
      FROM moon_plans WHERE day=${todayJST} LIMIT 1
    `;
    if (!planRows.length) return resp(200, { ok: true, message: `No plan for ${todayJST}` });

    const pct = Number(planRows[0].pct);
    const note = String(planRows[0].note || '');

    // current price
    const curRow = await sql`SELECT price FROM coins WHERE symbol='MOON' LIMIT 1`;
    if (!curRow.length) return resp(500, { ok: false, error: 'MOON not found' });

    const cur = Number(curRow[0].price);
    const next = Number((cur * (1 + pct / 100)).toFixed(8));

    // apply
    await sql`UPDATE coins SET price=${next}, change_24h=${pct} WHERE symbol='MOON'`;

    // record idempotent run
    await sql`INSERT INTO planner_runs(day, pct, note) VALUES (${todayJST}, ${pct}, ${note})
              ON CONFLICT (day) DO NOTHING`;

    // best-effort log to price_history (schema-agnostic)
    const msg = `Applied ${pct}% for ${todayJST}${note ? ' — ' + note : ''}`;
    try {
      await sql`INSERT INTO price_history(coin_symbol, price, created_at, source, note)
                VALUES ('MOON', ${next}, now(), 'planner', ${msg})`;
    } catch {
      try {
        await sql`INSERT INTO price_history(symbol, price, ts, source, note)
                  VALUES ('MOON', ${next}, now(), 'planner', ${msg})`;
      } catch {
        // ignore if table/columns differ; planner_runs is our source of truth
      }
    }

    return resp(200, { ok: true, applied_for: todayJST, pct, old: cur, next });
  } catch (err: any) {
    const debug = (event.queryStringParameters?.debug || '') === '1';
    return resp(500, {
      ok: false,
      error: err?.message || String(err),
      stack: debug ? err?.stack : undefined,
    });
  }
};
