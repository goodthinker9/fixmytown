import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', padding: '3rem 0' }}>
      <h1>404</h1>
      <p style={{ color: 'var(--muted)' }}>That page doesn&apos;t exist.</p>
      <Link to="/" className="btn btn--primary" style={{ marginTop: '1rem' }}>Go home</Link>
    </div>
  );
}
