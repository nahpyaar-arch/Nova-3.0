// src/pages/DebugEnv.tsx
export default function DebugEnv() {
  // NOTE: shown only in dev (guarded by import.meta.env.DEV in App.tsx)
  const vals = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '(https://zngdfevnruxghcyckjls.supabase.co)',
    VITE_SUPABASE_ANON_KEY:
      (import.meta.env.VITE_SUPABASE_ANON_KEY
        ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).slice(0, 8) + '…'
        : '(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ2RmZXZucnV4Z2hjeWNramxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzU1NzksImV4cCI6MjA3MTQ1MTU3OX0.eQUi76LM1jPLb8IfifRf7Bfz9F5SFH-g8YIJHJJYTSY)'),
    VITE_DATABASE_URL:
      (import.meta.env.VITE_DATABASE_URL
        ? String(import.meta.env.VITE_DATABASE_URL).slice(0, 30) + '…'
        : '(postgresql://neondb_owner:npg_OaWK1ANp9sYT@ep-odd-wind-addg74db-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require)'),
    VITE_PRICE_POLL_MS: import.meta.env.VITE_PRICE_POLL_MS ?? '(default 15000)',
    VITE_PRICE_PERSIST_MS: import.meta.env.VITE_PRICE_PERSIST_MS ?? '(default 60000)',
    NODE_ENV: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-xl font-semibold mb-4">Debug Env</h1>
      <pre className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-auto">
        {JSON.stringify(vals, null, 2)}
      </pre>
      <p className="text-xs text-gray-400 mt-2">
        Only available in development builds. Remove when done.
      </p>
    </div>
  );
}
