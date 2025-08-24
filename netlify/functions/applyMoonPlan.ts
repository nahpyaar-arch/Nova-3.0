import { NeonDB } from '../../src/lib/neon';

export default async function handler() {
  const today = new Date().toISOString().slice(0, 10);

  // get plan for today
  const plans = await NeonDB.listMoonPlans(today, today);
  if (plans.length === 0) {
    return { statusCode: 200, body: 'No plan for today' };
  }

  const plan = plans[0];

  // get current MOON price
  const coins = await NeonDB.getCoins();
  const moon = coins.find(c => c.symbol === 'MOON');
  if (!moon) return { statusCode: 500, body: 'MOON not found' };

  // calculate new price
  const newPrice = moon.price * (1 + plan.target_pct / 100);

  // apply it
  await NeonDB.updateCoinPrice('MOON', newPrice, plan.target_pct);

  return {
    statusCode: 200,
    body: `Applied ${plan.target_pct}% change to MOON → new price ${newPrice}`
  };
}
