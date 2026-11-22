import useAuth from '../hooks/useAuth';

// Protected page: proves the JWT is attached and the user is restored.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Welcome, {user?.name} 👋</h1>
      <p>
        You&apos;re signed in as <strong>{user?.email}</strong>
        {user?.role === 'admin' ? ' (admin)' : ' (resident)'}.
      </p>
      <p>The reports map, upvoting and your submissions arrive in the next phase.</p>
    </div>
  );
}
