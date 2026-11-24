import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Brand column */}
        <div className="footer__brand">
          <Logo size={24} />
          <p className="footer__tagline">
            Helping residents report, track and get community problems fixed.
          </p>
        </div>

        {/* Links column */}
        <nav className="footer__nav" aria-label="Footer navigation">
          <span className="footer__nav-label">Navigate</span>
          <Link to="/">Home</Link>
          <Link to="/reports/new">Report an issue</Link>
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
        </nav>

        {/* Built-with column */}
        <div className="footer__built">
          <span className="footer__nav-label">Built with</span>
          <span className="footer__stack">React · Node.js · Supabase</span>
        </div>
      </div>

      <div className="footer__bottom">
        <span>© {year} FixMyTown. Open-source portfolio project.</span>
      </div>
    </footer>
  );
}
