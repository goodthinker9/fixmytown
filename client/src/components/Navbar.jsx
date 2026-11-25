/**
 * Navbar — UI-E1
 *
 * Behaviour:
 *   • On the Home page ("/") the bar starts TRANSPARENT, overlapping the hero
 *     gradient. After 40 px of scroll it transitions to solid white + shadow.
 *   • On every other page it is always solid white.
 *   • A thin sliding underline ("active indicator") moves between nav links on
 *     desktop using framer-motion layout animations.
 *   • Mobile: hamburger → framer-motion slide-in drawer + backdrop.
 *     The drawer closes on route change, Escape key, and backdrop tap.
 *     Focus is trapped inside the drawer while it is open.
 */
import {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  Link, NavLink, useLocation, useNavigate,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, LayoutDashboard, Settings, LogOut,
  ChevronDown, Menu, X, User,
} from 'lucide-react';

import useAuth from '../hooks/useAuth';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import Logo from './Logo.jsx';

// ── constants ────────────────────────────────────────────────────────────────
const SCROLL_THRESHOLD = 40;   // px before navbar solidifies over hero
const NAV_LINKS = [
  { to: '/',        label: 'Home',          exact: true },
  { to: '/#browse', label: 'Map',           hash: true  },
  { to: '/#how',    label: 'How it works',  hash: true  },
];

// ── helpers ──────────────────────────────────────────────────────────────────
/** Smooth-scroll to an in-page anchor, keeping the URL clean. */
function scrollToAnchor(hash) {
  const id = hash.replace('#', '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Returns true when the given link should be highlighted. */
function isLinkActive(to, location) {
  if (to === '/') return location.pathname === '/';
  if (to.startsWith('/#')) return location.pathname === '/' && location.hash === to.slice(1);
  return location.pathname.startsWith(to);
}

// ── UserDropdown (desktop) ────────────────────────────────────────────────────
function UserDropdown({ user, onLogout, solid }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="user-dropdown" ref={ref}>
      <button
        type="button"
        className={`user-dropdown__trigger${solid ? '' : ' user-dropdown__trigger--ghost'}`}
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

      <AnimatePresence>
        {open && (
          <motion.div
            className="user-dropdown__menu"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <div className="user-dropdown__email">{user.email}</div>
            <Link to="/dashboard" className="user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
              <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <Settings size={15} aria-hidden="true" /> Admin
              </Link>
            )}
            <div className="user-dropdown__divider" aria-hidden="true" />
            <button
              type="button"
              className="user-dropdown__item user-dropdown__item--danger"
              role="menuitem"
              onClick={() => { setOpen(false); onLogout(); }}
            >
              <LogOut size={15} aria-hidden="true" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MobileDrawer ──────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, user, onLogout }) {
  const reduced = useReducedMotion();
  const drawerRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    first?.focus();
    firstFocusableRef.current = first;

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [open]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const drawerVariants = {
    closed: { x: '100%', transition: { duration: reduced ? 0.1 : 0.28, ease: [0.4, 0, 0.6, 1] } },
    open:   { x: 0,      transition: { duration: reduced ? 0.1 : 0.28, ease: [0, 0, 0.2, 1] } },
  };
  const backdropVariants = {
    closed: { opacity: 0 },
    open:   { opacity: 1 },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="drawer-backdrop"
            aria-hidden="true"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: reduced ? 0.1 : 0.22 }}
            onClick={onClose}
          />
          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="drawer__header">
              <Logo size={24} />
              <button
                type="button"
                className="drawer__close"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav className="drawer__nav" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ to, label, hash }) => (
                hash ? (
                  <button
                    key={to}
                    type="button"
                    className="drawer__item"
                    onClick={() => { onClose(); if (location.pathname === '/') scrollToAnchor(to.slice(1)); }}
                  >
                    {label}
                  </button>
                ) : (
                  <Link key={to} to={to} className="drawer__item" onClick={onClose}>{label}</Link>
                )
              ))}
            </nav>

            <div className="drawer__divider" aria-hidden="true" />

            {user ? (
              <div className="drawer__user-section">
                <div className="drawer__user-info">
                  <div className="drawer__user-name">{user.name}</div>
                  <div className="drawer__user-email">{user.email}</div>
                </div>
                <Link to="/reports/new" className="btn btn--primary btn--block" onClick={onClose}>
                  <Plus size={15} aria-hidden="true" /> New report
                </Link>
                <Link to="/dashboard" className="drawer__item" onClick={onClose}>
                  <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="drawer__item" onClick={onClose}>
                    <Settings size={16} aria-hidden="true" /> Admin
                  </Link>
                )}
                <button type="button" className="drawer__item drawer__item--danger" onClick={() => { onClose(); onLogout(); }}>
                  <LogOut size={16} aria-hidden="true" /> Log out
                </button>
              </div>
            ) : (
              <div className="drawer__auth">
                <Link to="/login"    className="btn btn--ghost btn--block"   onClick={onClose}>Log in</Link>
                <Link to="/register" className="btn btn--primary btn--block" onClick={onClose}>Register</Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const reduced   = useReducedMotion();

  const isHome    = location.pathname === '/';

  // Scroll-based transparency: only on the home page.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!isHome) { setScrolled(true); return; }
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    // Run immediately so SSR/hydration is correct.
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // The navbar is "solid" when: not on home, or scrolled past threshold.
  const solid = !isHome || scrolled;

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on route change
  useEffect(() => { closeDrawer(); }, [location.pathname, location.hash, closeDrawer]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    closeDrawer();
  }, [logout, navigate, closeDrawer]);

  // Sliding active indicator state: tracks the DOM node of the active link.
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navLinksRef = useRef(null);

  useEffect(() => {
    if (!navLinksRef.current) return;
    const links = navLinksRef.current.querySelectorAll('[data-nav-link]');
    for (const link of links) {
      if (link.getAttribute('data-active') === 'true') {
        const rect = link.getBoundingClientRect();
        const parentRect = navLinksRef.current.getBoundingClientRect();
        setIndicatorStyle({
          left:  rect.left - parentRect.left,
          width: rect.width,
          opacity: 1,
        });
        return;
      }
    }
    setIndicatorStyle((s) => ({ ...s, opacity: 0 }));
  }, [location.pathname, location.hash]);

  return (
    <>
      <header
        className={`navbar${solid ? ' navbar--solid' : ' navbar--transparent'}`}
        role="banner"
      >
        <div className="navbar__inner">
          {/* Brand */}
          <Link to="/" className="navbar__brand" aria-label="FixMyTown home">
            <Logo />
          </Link>

          {/* Desktop nav links + sliding indicator */}
          <nav
            className="navbar__nav"
            aria-label="Main navigation"
            ref={navLinksRef}
          >
            {/* Sliding active indicator — position is set via JS so it works
                for any link width. Layout animation moves it smoothly. */}
            {!reduced && (
              <motion.div
                className="navbar__indicator"
                aria-hidden="true"
                animate={indicatorStyle}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              />
            )}

            {NAV_LINKS.map(({ to, label, hash }) => {
              const active = isLinkActive(to, location);
              if (hash) {
                return (
                  <button
                    key={to}
                    type="button"
                    className={`nav-link${active ? ' active' : ''}`}
                    data-nav-link="true"
                    data-active={active}
                    onClick={() => {
                      if (location.pathname !== '/') {
                        navigate('/');
                        setTimeout(() => scrollToAnchor(to.slice(2)), 100);
                      } else {
                        scrollToAnchor(to.slice(2));
                      }
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  data-nav-link="true"
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop right-side actions */}
          <div className="navbar__actions">
            {user ? (
              <>
                <Link
                  to="/reports/new"
                  className="btn btn--primary btn--sm navbar__report-btn"
                >
                  <Plus size={14} aria-hidden="true" strokeWidth={2.5} />
                  Report an issue
                </Link>
                <UserDropdown user={user} onLogout={handleLogout} solid={solid} />
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  Log in
                </NavLink>
                <Link to="/register" className="btn btn--primary btn--sm">Register</Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            type="button"
            className="navbar__hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label="Open navigation menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        user={user}
        onLogout={handleLogout}
      />
    </>
  );
}
