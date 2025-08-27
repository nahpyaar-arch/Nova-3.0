// src/main.tsx
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Lazy-load the main app bundle to speed first paint
const App = lazy(() => import('./App'));

function Fallback() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center">
      Loading…
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found. Make sure <div id="root"></div> exists in index.html');
}

createRoot(container).render(
  <StrictMode>
    <Suspense fallback={<Fallback />}>
      <App />
    </Suspense>
  </StrictMode>
);
