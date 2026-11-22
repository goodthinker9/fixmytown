import useAuth from '../hooks/useAuth';

// Admin-only page (guarded by AdminRoute).
export default function Admin() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Admin dashboard</h1>
      <p>Welcome, {user?.name}. Stats charts and report status management arrive in the next phase.</p>
    </div>
  );
}
