import { Link } from 'react-router-dom';
import { SearchX, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo.jsx';

export default function NotFound() {
  return (
    <div className="not-found-page" role="main">
      <div className="not-found-card">
        <Logo size={40} />
        <div className="not-found-icon" aria-hidden="true">
          <SearchX size={56} strokeWidth={1.5} />
        </div>
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page not found</h2>
        <p className="not-found-desc">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn--primary btn--icon">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
