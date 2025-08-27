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
    // Optional manual trigger: /.netlify/functions/applyMoonPlan?run=now&key=SECRET
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

    // Ensure idempotency ledger exists
    await sql`
      CREATE TABLE IF NOT EXISTS planner_runs (
        day date PRIMARY KEY,
        pct numeric NOT NULL,
        applied_at timestamptz DEFAULT now(),
        note text
      )
    `;

    // Today in JST
    const r1 = await sql`SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date AS d`;
    const todayJST = String(r1[0]?.d); // e.g., "2025-08-28"

    // Already applied today?
    const already = await sql`SELECT 1 FROM planner_runs WHERE day=${todayJST} LIMIT 1`;
    if (already.length) {
      return resp(200, { ok: true, message: `Already applied for ${todayJST}` });
    }

    // Pull today's plan
    const planRows = await sql`
      SELECT target_pct::numeric AS pct, COALESCE(note,'') AS note
      FROM moon_plans
      WHERE day = ${todayJST}
      LIMIT 1
    `;
    if (planRows.length === 0) {
      return resp(200, { ok: true, message: `No plan for ${todayJST}` });
    }
    const pct: number = Number(planRows[0].pct);
    const note: string = String(planRows[0].note || '');

    // Current price
    const curRow = await sql`SELECT price FROM coins WHERE symbol='MOON' LIMIT 1`;
    if (curRow.length === 0) return resp(500, { ok: false, error: 'MOON not found in coins' });

    const cur = Number(curRow[0].price);
    const next = Number((cur * (1 + pct / 100)).toFixed(8));

    // Apply update
    await sql`UPDATE coins SET price=${next}, change_24h=${pct} WHERE symbol='MOON'`;

    // Record idempotent run
    await sql`
      INSERT INTO planner_runs(day, pct, note)
      VALUES (${todayJST}, ${pct}, ${note})
      ON CONFLICT (day) DO NOTHING
    `;

    // Best-effort logging to price_history (schema-agnostic)
    const logMsg = `Applied ${pct}% for ${todayJST}${note ? ' — ' + note : ''}`;

    try {
      // Variant A: coin_symbol / created_at
      await sql`
        INSERT INTO price_history (coin_symbol, price, created_at, source, note)
        VALUES ('MOON', ${next}, now(), 'planner', ${logMsg})
      `;
    } catch {
      try {
        // Variant B: symbol / ts
        await sql`
          INSERT INTO price_history (symbol, price, ts, source, note)
          VALUES ('MOON', ${next}, now(), 'planner', ${logMsg})
        `;
      } catch {
        // If neither schema matches, ignore; planner_runs is our source of truth
      }
    }

    return resp(200, { ok: true, applied_for: todayJST, pct, old: cur, next });
  } catch (err: any) {
    return resp(500, { ok: false, error: err?.message || String(err) });
  }
};
