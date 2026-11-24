import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Logo from './Logo.jsx';

const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="FixMyTown home">
          <Logo />
        </Link>

        <div className="navbar__links">
          {user ? (
            <>
              <NavLink to="/reports/new" className="navbar__cta" aria-label="Submit a new report">
                <Plus size={16} aria-hidden="true" strokeWidth={2.5} />
                New report
              </NavLink>
              <NavLink to="/dashboard" className={navClass}>
                <LayoutDashboard size={15} aria-hidden="true" />
                Dashboard
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={navClass}>
                  <Settings size={15} aria-hidden="true" />
                  Admin
                </NavLink>
              )}
              <span className="navbar__user">Hi, {user.name}</span>
              <button
                onClick={handleLogout}
                className="btn btn--ghost"
                aria-label="Log out"
              >
                <LogOut size={15} aria-hidden="true" />
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Log in</NavLink>
              <NavLink to="/register" className="btn btn--primary btn--sm">Register</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
