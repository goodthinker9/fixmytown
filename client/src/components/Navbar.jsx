import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Plus, LayoutDashboard, Settings, LogOut, ChevronDown,
  Menu, X, User,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Logo from './Logo.jsx';

const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

// --- User dropdown (desktop) ---
function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="user-dropdown" ref={ref}>
      <button
        type="button"
        className="user-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
      >
        <span className="user-dropdown__avatar" aria-hidden="true">
          <User size={15} />
        </span>
        <span className="user-dropdown__name">{user.name}</span>
        <ChevronDown size={14} aria-hidden="true" className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div className="user-dropdown__menu" role="menu">
          <div className="user-dropdown__email">{user.email}</div>
          <Link
            to="/dashboard"
            className="user-dropdown__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            Dashboard
          </Link>
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="user-dropdown__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings size={15} aria-hidden="true" />
              Admin
            </Link>
          )}
          <div className="user-dropdown__divider" aria-hidden="true" />
          <button
            type="button"
            className="user-dropdown__item user-dropdown__item--danger"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <LogOut size={15} aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Navbar ---
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [navigate]);

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">
        {/* Brand */}
        <Link to="/" className="navbar__brand" aria-label="FixMyTown home">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="navbar__desktop">
          {user ? (
            <>
              <Link to="/reports/new" className="navbar__cta" aria-label="Submit a new report">
                <Plus size={15} aria-hidden="true" strokeWidth={2.5} />
                New report
              </Link>
              <UserDropdown user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Log in</NavLink>
              <Link to="/register" className="btn btn--primary btn--sm">Register</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="navbar__hamburger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="navbar__mobile" aria-label="Mobile menu">
          {user ? (
            <>
              <div className="mobile-menu__user">
                <span className="mobile-menu__name">{user.name}</span>
                <span className="mobile-menu__email">{user.email}</span>
              </div>
              <Link to="/reports/new" className="mobile-menu__item mobile-menu__item--cta" onClick={() => setMobileOpen(false)}>
                <Plus size={16} aria-hidden="true" /> New report
              </Link>
              <Link to="/dashboard" className="mobile-menu__item" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="mobile-menu__item" onClick={() => setMobileOpen(false)}>
                  <Settings size={16} aria-hidden="true" /> Admin
                </Link>
              )}
              <button type="button" className="mobile-menu__item mobile-menu__item--danger" onClick={handleLogout}>
                <LogOut size={16} aria-hidden="true" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="mobile-menu__item" onClick={() => setMobileOpen(false)}>Home</Link>
              <Link to="/login" className="mobile-menu__item" onClick={() => setMobileOpen(false)}>Log in</Link>
              <Link to="/register" className="mobile-menu__item mobile-menu__item--cta" onClick={() => setMobileOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
