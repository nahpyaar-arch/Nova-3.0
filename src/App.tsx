import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import MarketPage from './components/MarketPage';
import TradePage from './components/TradePage';
import AssetsPage from './components/AssetsPage';
import ProfilePage from './components/ProfilePage';
import AdminPage from './components/AdminPage';
import { NeonDB } from './lib/neon';
import { useEffect, useState } from 'react';
import { useApp } from './contexts/AppContext';

/** Dev-only helper page: promotes (or creates+promotes) an admin, then refreshes app state */
function SeedAdminPage() {
  const [msg, setMsg] = useState<string>('Seeding admin…');
  const { refreshData } = useApp();

  useEffect(() => {
    (async () => {
      try {
        // 1) try to promote existing user
        const promoted = await (NeonDB as any).promoteAdminByEmail?.('admin52980@gmail.com');
        if (promoted) {
          setMsg(`✅ Promoted: ${promoted.email}`);
        } else {
          // 2) if not found, create as admin
          const created = await NeonDB.createUser('admin52980@gmail.com', 'Admin', true);
          setMsg(`✅ Admin created: ${created.email}`);
        }

        // Reload in-memory data so UI reflects is_admin=true
        await refreshData();
        // (optional) hard refresh if your page caches the user header:
        // window.location.reload();
      } catch (err: any) {
        console.error('Error creating/promoting admin:', err);
        setMsg(`❌ Error: ${String(err)}`);
      }
    })();
  }, [refreshData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">{msg}</div>
    </div>
  );
}

/** Tiny dev ribbon so you remember there’s a debug route available */
function DevRibbon() {
  if (!import.meta.env.DEV) return null;
  return (
    <a
      href="/dev/seed-admin"
      title="Seed Admin"
      className="fixed bottom-3 right-3 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded-full shadow"
    >
      DEV: Seed Admin
    </a>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="market" element={<MarketPage />} />
              <Route path="trade" element={<TradePage />} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
              {/* dev-only route (only present in dev builds) */}
              {import.meta.env.DEV && <Route path="dev/seed-admin" element={<SeedAdminPage />} />}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <DevRibbon />
      </Router>
    </AppProvider>
  );
}
