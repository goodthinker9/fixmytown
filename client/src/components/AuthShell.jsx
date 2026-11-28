// Shared layout for Login and Register: a teal brand panel (left) and the
// form (right). The brand panel is hidden on small screens.
import { Link } from 'react-router-dom';
import { MapPin, Camera, CheckCircle2 } from 'lucide-react';
import '../auth.css';

const POINTS = [
  { icon: MapPin,       text: 'Pin the exact spot of a problem on the map' },
  { icon: Camera,       text: 'Add a photo so crews know what to fix' },
  { icon: CheckCircle2, text: 'Follow every status change until it is resolved' },
];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="as-page">
      <div className="as-card">
        <aside className="as-brand" aria-hidden="true">
          <Link to="/" className="as-brand__logo" tabIndex={-1}>
            <img src="/logo-mark.svg" alt="" width="34" height="34" />
            <span>FixMyTown</span>
          </Link>
          <h2 className="as-brand__title">Small reports. Real repairs.</h2>
          <p className="as-brand__text">
            Join your neighbours in making local problems visible and getting them fixed.
          </p>
          <ul className="as-brand__list">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text}><Icon size={18} /> <span>{text}</span></li>
            ))}
          </ul>
        </aside>

        <section className="as-formwrap">
          <h1 className="as-title">{title}</h1>
          <p className="as-sub">{subtitle}</p>
          {children}
        </section>
      </div>
    </div>
  );
}
