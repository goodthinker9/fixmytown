// Wraps routes that require a logged-in user.
// - While the session is being restored it shows a loading state.
// - If there's no user it redirects to /login and remembers where the user
//   was trying to go (via location state) so we can send them back after login.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}
