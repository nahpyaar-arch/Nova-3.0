// src/App.tsx
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// ── Route-level code splitting (reduces initial JS) ─────────────────────────
const HomePage    = lazy(() => import('./components/HomePage'));
const MarketPage  = lazy(() => import('./components/MarketPage'));
const TradePage   = lazy(() => import('./components/TradePage'));
const AssetsPage  = lazy(() => import('./components/AssetsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage   = lazy(() => import('./components/AdminPage'));

// Dev helpers (lazy too, so they don’t bloat prod)
const DebugEnv    = lazy(() => import('./pages/DebugEnv'));

// ── Dev-only helper page: promote or create admin, then refresh ────────────
function SeedAdminPage() {
  const [msg, setMsg] = useState<string>('Seeding admin…');
  const { refreshData } = useApp();

  useEffect(() => {
    (async () => {
      try {
        // uses the client NeonDB stub (safe on dev)
        const { NeonDB } = await import('./lib/neon');
        const promoted = await (NeonDB as any).promoteAdminByEmail?.('admin52980@gmail.com');
        if (promoted) {
          setMsg(`✅ Promoted: ${promoted.email}`);
        } else {
          const created = await NeonDB.createUser('admin52980@gmail.com', 'Admin', true);
          setMsg(`✅ Admin created: ${created.email}`);
        }
        await refreshData?.();
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

// ── Tiny dev ribbon (only in dev) ───────────────────────────────────────────
function DevRibbon() {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="fixed bottom-3 right-3 flex gap-2 z-50">
      <Link
        to="/dev/env"
        title="Show env"
        className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3 py-1 rounded-full shadow"
      >
        DEV: Env
      </Link>
      <Link
        to="/dev/seed-admin"
        title="Seed Admin"
        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded-full shadow"
      >
        DEV: Seed Admin
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route element={<Layout />}>
              <Route
                index
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <HomePage />
                  </Suspense>
                }
              />
              <Route
                path="market"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <MarketPage />
                  </Suspense>
                }
              />
              <Route
                path="trade"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <TradePage />
                  </Suspense>
                }
              />
              <Route
                path="assets"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AssetsPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="admin"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminPage />
                  </Suspense>
                }
              />

              {/* dev-only routes */}
              {import.meta.env.DEV && (
                <>
                  <Route
                    path="dev/env"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <DebugEnv />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dev/seed-admin"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SeedAdminPage />
                      </Suspense>
                    }
                  />
                </>
              )}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <DevRibbon />
      </Router>
    </AppProvider>
  );
}
