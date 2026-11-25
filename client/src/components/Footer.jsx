/**
 * Footer — UI-E4
 *
 * Layout: dark background, four columns on desktop.
 *   Col 1: Logo + description + built-with + photo credits
 *   Col 2: Product links
 *   Col 3: Community links
 *   Col 4: Account links
 *
 * No invented testimonials, no fake stats.
 * Photo credits: placeholder text — replace once real photos are added.
 */
import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

const NAV_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { to: '/',             label: 'Home' },
      { to: '/#browse',      label: 'Browse reports' },
      { to: '/reports/new',  label: 'Report an issue' },
      { to: '/#how',         label: 'How it works' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { to: '/#browse',     label: 'All reports' },
      { to: '/#impact',     label: 'Impact data' },
      { to: '/#community',  label: 'Why transparency matters' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { to: '/login',       label: 'Log in' },
      { to: '/register',    label: 'Register free' },
      { to: '/dashboard',   label: 'My reports' },
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
            potholes and waste. Issues are tracked publicly until they're fixed.
          </p>

          <p className="footer__built">
            Built with{' '}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a>
            {', '}
            <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">Node.js</a>
            {', '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
            {' and '}
            <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer">Claude</a>
            .
          </p>

          <p className="footer__credits">
            Photo placeholders: replace with photos you own or license from{' '}
            <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>
            {' '}or similar. All map data ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            .
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
