import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// Public landing page. (The reports map + list will replace this in the next phase.)
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="home__hero">
        <h1>Report it. Track it. Fix it.</h1>
        <p className="home__lead">
          FixMyTown helps residents report broken water points, power outages, potholes and garbage —
          and shows which areas need attention most.
        </p>
        <div className="home__actions">
          {user ? (
            <Link to="/dashboard" className="btn btn--primary">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn--primary">Get started</Link>
              <Link to="/login" className="btn btn--link">Log in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
