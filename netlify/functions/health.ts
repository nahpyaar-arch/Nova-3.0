import type { Handler } from '@netlify/functions';

export const handler: Handler = async (_event, context) => {
  const t = async (label: string, fn: () => Promise<any>) => {
    const s = performance.now();
    try { await fn(); return { label, ms: Math.round(performance.now() - s), ok: true }; }
    catch (e:any) { return { label, ms: Math.round(performance.now() - s), ok: false, err: String(e?.message||e) }; }
  };

  const tests = [];
  tests.push(await t('binance',   () => fetch('https://api.binance.com/api/v3/ping')));
  tests.push(await t('get-coins', () => fetch((process.env.URL||'') + '/.netlify/functions/get-coins', { cache:'no-store' })));

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      functionRegion: (context as any)?.awsRegion || 'unknown',
      tests
    }),
  };
};
