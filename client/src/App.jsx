/**
 * App — route layout with framer-motion page transitions.
 *
 * AnimatePresence wraps the route tree so exiting pages fade out while the
 * entering page fades in. The key is location.pathname + location.search so
 * React treats each URL as a distinct child.
 *
 * The transition is intentionally short (0.18 s) — long transitions on
 * navigation feel sluggish. useReducedMotion shortens it further to 0 s.
 */
import { useLocation } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import { useReducedMotion } from './hooks/useReducedMotion.js';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewReport from './pages/NewReport.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

// Thin wrapper that provides the fade animation to any route's content.
function PageWrapper({ children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: 'easeInOut' }}
      // Don't use layout animations on the wrapper — that breaks sticky positioning.
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
        {/*
          AnimatePresence mode="wait" means the outgoing page fully exits before
          the incoming page enters, preventing visual overlap.
          The key must change with every unique route — pathname + search covers
          query-string navigation (e.g. ?category=water).
        */}
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname + location.search}>
            {/* Public routes — Home owns its own full-bleed hero */}
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/login"       element={<PageWrapper><div className="container"><Login /></div></PageWrapper>} />
            <Route path="/register"    element={<PageWrapper><div className="container"><Register /></div></PageWrapper>} />
            <Route path="/reports/:id" element={<PageWrapper><div className="container"><ReportDetail /></div></PageWrapper>} />

            {/* Authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"   element={<PageWrapper><div className="container"><Dashboard /></div></PageWrapper>} />
              <Route path="/reports/new" element={<PageWrapper><div className="container"><NewReport /></div></PageWrapper>} />
            </Route>

            {/* Admin-only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<PageWrapper><div className="container"><Admin /></div></PageWrapper>} />
            </Route>

            <Route path="*" element={<PageWrapper><div className="container"><NotFound /></div></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
