import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewReport from './pages/NewReport.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      {/* main grows to fill available space, pushing footer down */}
      <main className="app-main">
        <Routes>
          {/* Public routes — Home owns its own .container/hero */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<div className="container"><Login /></div>} />
          <Route path="/register" element={<div className="container"><Register /></div>} />
          <Route path="/reports/:id" element={<div className="container"><ReportDetail /></div>} />

          {/* Authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div className="container"><Dashboard /></div>} />
            <Route path="/reports/new" element={<div className="container"><NewReport /></div>} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div className="container"><Admin /></div>} />
          </Route>

          <Route path="*" element={<div className="container"><NotFound /></div>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
