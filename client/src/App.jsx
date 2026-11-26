/**
 * App — UI-F
 *
 * Code-split heavy routes with React.lazy + Suspense so the initial bundle
 * drops well below 500 kB.  Home, Login, Register and NotFound are kept
 * eagerly imported because they are the most likely first pages.
 *
 * Dashboard, Admin, NewReport and ReportDetail are lazy-loaded — they
 * contain Recharts / Leaflet / framer-motion heavy components that only
 * matter once the user has navigated past the home page.
 */
import { lazy, Suspense } from 'react';
import { useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Navbar        from './components/Navbar.jsx';
import Footer        from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute    from './components/AdminRoute.jsx';
import { useReducedMotion } from './hooks/useReducedMotion.js';

// Eager — first load paths
import Home      from './pages/Home.jsx';
import Login     from './pages/Login.jsx';
import Register  from './pages/Register.jsx';
import NotFound  from './pages/NotFound.jsx';

// Lazy — only needed after first navigation
const Dashboard  = lazy(() => import('./pages/Dashboard.jsx'));
const NewReport  = lazy(() => import('./pages/NewReport.jsx'));
const ReportDetail = lazy(() => import('./pages/ReportDetail.jsx'));
const Admin      = lazy(() => import('./pages/Admin.jsx'));

// Thin loading fallback for lazy routes — a full-height centred pulse.
function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: 'var(--text-sm)',
      }}
      aria-live="polite"
      aria-label="Page is loading"
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  );
}

function PageWrapper({ children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: 'easeInOut' }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname + location.search}>
              {/* Public — eager */}
              <Route path="/"        element={<PageWrapper><Home /></PageWrapper>} />
              <Route path="/login"   element={<PageWrapper><div className="container"><Login /></div></PageWrapper>} />
              <Route path="/register" element={<PageWrapper><div className="container"><Register /></div></PageWrapper>} />

              {/* Public — lazy */}
              <Route path="/reports/:id" element={<PageWrapper><div className="container"><ReportDetail /></div></PageWrapper>} />

              {/* Authenticated — lazy */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard"   element={<PageWrapper><div className="container"><Dashboard /></div></PageWrapper>} />
                <Route path="/reports/new" element={<PageWrapper><div className="container"><NewReport /></div></PageWrapper>} />
              </Route>

              {/* Admin-only — lazy */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<PageWrapper><div className="container"><Admin /></div></PageWrapper>} />
              </Route>

              <Route path="*" element={<PageWrapper><div className="container"><NotFound /></div></PageWrapper>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
