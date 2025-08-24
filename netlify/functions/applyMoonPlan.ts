import { NeonDB } from '../../src/lib/neon';

function safeStringify(err: unknown) {
  try { return JSON.stringify(err, Object.getOwnPropertyNames(err)); }
  catch { return String(err); }
}

export async function handler() {
  try {
    // sanity: prove the env is visible in Functions (uses process.env in functions)
    const hasEnv =
      !!(process.env.VITE_DATABASE_URL) ||
      !!((globalThis as any).import?.meta?.env?.VITE_DATABASE_URL);
    if (!hasEnv) {
      throw new Error('VITE_DATABASE_URL is not set in Functions environment');
    }

    // today (UTC) as YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    // 1) fetch plan
    const plans = await NeonDB.listMoonPlans(today, today);
    if (plans.length === 0) {
      return { statusCode: 200, body: `No plan for ${today}` };
    }
    const plan = plans[0];

    // 2) current MOON price
    const coins = await NeonDB.getCoins();
    const moon = coins.find((c) => c.symbol === 'MOON');
    if (!moon) throw new Error('MOON not found in coins');

    // 3) apply target
    const targetPct = Number(plan.target_pct);
    const newPrice = moon.price * (1 + targetPct / 100);

    await NeonDB.updateCoinPrice('MOON', newPrice, targetPct);

    return {
      statusCode: 200,
      body: `Applied ${targetPct}% to MOON. Old=${moon.price} New=${newPrice}`,
    };
  } catch (err) {
    // log to Netlify function logs and return details
    console.error('applyMoonPlan error:', err);
    return {
      statusCode: 500,
      body: `applyMoonPlan crashed: ${safeStringify(err)}`,
    };
  }
}
