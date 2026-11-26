/**
 * Footer — UI-G
 *
 * Fixes:
 *  - .footer__built renders inline (the old flex:column CSS is patched in styles.css)
 *  - Photo credits: exact placeholder text "Photos: <I will paste real credits here>"
 *    No invented names or links — the user will paste the real credits.
 */
import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

const NAV_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { to: '/',            label: 'Home' },
      { to: '/#browse',     label: 'Browse reports' },
      { to: '/reports/new', label: 'Report an issue' },
      { to: '/#how',        label: 'How it works' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { to: '/#browse',    label: 'All reports' },
      { to: '/#impact',    label: 'Impact data' },
      { to: '/#community', label: 'Why transparency matters' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { to: '/login',     label: 'Log in' },
      { to: '/register',  label: 'Register free' },
      { to: '/dashboard', label: 'My reports' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer__inner">

        {/* ── Brand column ── */}
        <div className="footer__brand-col">
          <Logo size={28} />

          <p className="footer__desc">
            FixMyTown helps residents report broken infrastructure, power outages,
            potholes and waste. Issues are tracked publicly until they&apos;re fixed.
          </p>

          {/* One inline sentence: "Built with React, Node.js, Supabase and Claude." */}
          <p className="footer__built">
            Built with{' '}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a>,{' '}
            <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">Node.js</a>,{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>{' '}
            and{' '}
            <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer">Claude</a>.
          </p>

          {/*
            Photo credits — paste your real credits in place of the placeholder.
            Exact text as specified: "Photos: <I will paste real credits here>"
          */}
          <p className="footer__credits">
            Photos: &lt;I will paste real credits here&gt;.{' '}
            Map data ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>.
          </p>
        </div>

        {/* ── Link columns ── */}
        {NAV_COLUMNS.map(({ heading, links }) => (
          <nav key={heading} className="footer__nav-col" aria-label={`${heading} links`}>
            <h3 className="footer__col-heading">{heading}</h3>
            <ul className="footer__links">
              {links.map(({ to, label }) => (
                <li key={to + label}>
                  <Link to={to} className="footer__link">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer__bottom">
        <span>© {year} FixMyTown. Open-source portfolio project.</span>
        <span className="footer__bottom-sep" aria-hidden="true">·</span>
        <span>No warranties expressed or implied.</span>
      </div>
    </footer>
  );
}
