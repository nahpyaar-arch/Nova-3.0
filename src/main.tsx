// src/main.tsx
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Lazy-load the app bundle
const App = lazy(() => import('./App'));

function Fallback() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center">
      Loading…
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<Fallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
