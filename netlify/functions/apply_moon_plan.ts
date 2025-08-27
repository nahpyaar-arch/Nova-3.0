// netlify/functions/applyMoonPlan.ts
import type { Handler } from '@netlify/functions';

export const config = { schedule: '@daily' };

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const resp = (code: number, body: unknown) => ({ statusCode: code, headers, body: JSON.stringify(body, null, 2) });

export const handler: Handler = async (event) => {
  try {
    // 0) PROBE: verify the handler is even running
    if ((event.queryStringParameters?.probe || '') === '1') {
      return resp(200, { ok: true, phase: 'probe-start' });
    }

    // 1) Optional manual trigger guard
    const runNow = (event.queryStringParameters?.run || '').toLowerCase() === 'now';
    if (runNow) {
      const key = event.queryStringParameters?.key || '';
      if (!process.env.MOON_CRON_SECRET || key !== process.env.MOON_CRON_SECRET) {
        return resp(403, { ok: false, error: 'Forbidden: bad or missing MOON_CRON_SECRET' });
      }
    }

    // 2) Env + client
    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.VITE_DATABASE_URL;

    if (!dbUrl) {
      return resp(500, { ok: false, error: 'DATABASE_URL not set (Functions env)' });
    }

    // dynamic import so bundling/import errors are catchable
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);

    // 3) DRY-RUN: only ping DB and exit
    if ((event.queryStringParameters?.dry || '') === '1') {
      const ping = await sql`SELECT 1 AS ok`;
      return resp(200, { ok: true, phase: 'connected', ping });
    }

    // 4) Idempotency ledger
    await sql`
      CREATE TABLE IF NOT EXISTS planner_runs (
        day date PRIMARY KEY,
        pct numeric NOT NULL,
        applied_at timestamptz DEFAULT now(),
        note text
      )
    `;

    // 5) Today JST + plan
    const r1 = await sql`SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date AS d`;
    const todayJST = String(r1[0]?.d);

    const already = await sql`SELECT 1 FROM planner_runs WHERE day=${todayJST} LIMIT 1`;
    if (already.length) return resp(200, { ok: true, message: `Already applied for ${todayJST}` });

    const plan = await sql`
      SELECT target_pct::numeric AS pct, COALESCE(note,'') AS note
      FROM moon_plans WHERE day=${todayJST} LIMIT 1
    `;
    if (!plan.length) return resp(200, { ok: true, message: `No plan for ${todayJST}` });

    const pct = Number(plan[0].pct);
    const note = String(plan[0].note || '');

    // 6) Current price -> next
    const curRow = await sql`SELECT price FROM coins WHERE symbol='MOON' LIMIT 1`;
    if (!curRow.length) return resp(500, { ok: false, error: 'MOON not found in coins' });

    const cur = Number(curRow[0].price);
    const next = Number((cur * (1 + pct / 100)).toFixed(8));

    // 7) Apply update
    await sql`UPDATE coins SET price=${next}, change_24h=${pct} WHERE symbol='MOON'`;

    // 8) Record idempotent run
    await sql`INSERT INTO planner_runs(day, pct, note)
              VALUES (${todayJST}, ${pct}, ${note})
              ON CONFLICT (day) DO NOTHING`;

    // 9) (Optional) price_history logging disabled during debug
    // Re-enable after success.
    // const msg = `Applied ${pct}% for ${todayJST}${note ? ' — ' + note : ''}`;
    // try {
    //   await sql`INSERT INTO price_history(coin_symbol, price, created_at, source, note)
    //             VALUES ('MOON', ${next}, now(), 'planner', ${msg})`;
    // } catch {
    //   try {
    //     await sql`INSERT INTO price_history(symbol, price, ts, source, note)
    //               VALUES ('MOON', ${next}, now(), 'planner', ${msg})`;
    //   } catch {}
    // }

    return resp(200, { ok: true, applied_for: todayJST, pct, old: cur, next });
  } catch (err: any) {
    // Always return JSON with the error
    return resp(500, { ok: false, error: err?.message || String(err), stack: err?.stack });
  }
};
