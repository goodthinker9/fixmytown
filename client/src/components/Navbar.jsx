import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// Navbar adapts to login state:
//   logged out -> Login, Register
//   logged in  -> Dashboard, [Admin if admin], "Hi, {name}", Log out
const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">📍 FixMyTown</Link>

        <div className="navbar__links">
          {user ? (
            <>
              <NavLink to="/reports/new" className="navbar__cta">+ New report</NavLink>
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={navClass}>Admin</NavLink>
              )}
              <span className="navbar__user">Hi, {user.name}</span>
              <button onClick={handleLogout} className="btn btn--link">Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Log in</NavLink>
              <NavLink to="/register" className={navClass}>Register</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
