import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FileText, CheckCircle2, AlertTriangle, FileSearch,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { listReports } from '../api/reports.js';
import { relativeTime } from '../utils/relativeTime.js';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Dashboard() {
  const { user } = useAuth();

  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!user) return;
    listReports({ limit: 20 })
      .then((data) => {
        // Filter to current user's reports client-side.
        // (A dedicated /api/users/me/reports endpoint would be cleaner in production.)
        const mine = data.reports.filter((r) => r.user_id === user.id);
        setMyReports(mine);
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load reports.'))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = {
    total:       myReports.length,
    resolved:    myReports.filter((r) => r.status === 'resolved').length,
    in_progress: myReports.filter((r) => r.status === 'in_progress').length,
  };

  return (
    <div className="page dashboard">
      <div className="dashboard__header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p className="dashboard__sub">Here's a summary of your community activity.</p>
        </div>
        <Link to="/reports/new" className="btn btn--primary btn--icon">
          <Plus size={15} aria-hidden="true" />
          New report
        </Link>
      </div>

      {/* Quick stat cards */}
      <div className="dashboard__stats">
        <div className="dash-stat">
          <div className="dash-stat__icon dash-stat__icon--blue" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div>
            <div className="dash-stat__value">{loading ? '…' : stats.total}</div>
            <div className="dash-stat__label">My reports</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon dash-stat__icon--amber" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="dash-stat__value">{loading ? '…' : stats.in_progress}</div>
            <div className="dash-stat__label">In progress</div>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat__icon dash-stat__icon--green" aria-hidden="true">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="dash-stat__value">{loading ? '…' : stats.resolved}</div>
            <div className="dash-stat__label">Resolved</div>
          </div>
        </div>
      </div>

      {/* Recent reports table */}
      <section className="dashboard__section" aria-labelledby="my-reports-heading">
        <h2 id="my-reports-heading" className="dashboard__section-title">My recent reports</h2>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="loading">Loading your reports…</div>
        ) : myReports.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No reports yet"
            desc="When you submit a report it will appear here."
            action={
              <Link to="/reports/new" className="btn btn--primary btn--sm btn--icon">
                <Plus size={14} aria-hidden="true" /> Submit your first report
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="reports-table reports-table--sticky">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {myReports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/reports/${r.id}`} className="reports-table__title">{r.title}</Link>
                    </td>
                    <td>{r.category}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="reports-table__date">
                      <time dateTime={r.created_at} title={new Date(r.created_at).toLocaleString()}>
                        {relativeTime(r.created_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
