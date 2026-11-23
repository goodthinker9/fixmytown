import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import '../utils/leafletIcons.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { getReport, toggleUpvote, deleteReport } from '../api/reports.js';
import useAuth from '../hooks/useAuth.js';

export default function ReportDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const flash = location.state?.flash; // one-shot success message

  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [upvoted, setUpvoted] = useState(null); // unknown until the user clicks
  const [voteCount, setVoteCount] = useState(0);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setLoading(true);
    getReport(id)
      .then((data) => {
        setReport(data.report);
        setHistory(data.status_history);
        setVoteCount(data.report.upvote_count);
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this report.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpvote = async () => {
    setVoteError('');
    setVoting(true);
    try {
      const data = await toggleUpvote(id);
      setUpvoted(data.upvoted);
      setVoteCount(data.upvote_count);
    } catch (err) {
      setVoteError(err.response?.data?.error || 'Could not update your upvote.');
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteReport(id);
      navigate('/', { state: { flash: 'Report deleted.' } });
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Could not delete this report.');
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) {
    return (
      <div className="page report-detail">
        {flash && <div className="alert alert--success">{flash}</div>}
        <div className="alert alert--error">{error}</div>
        <Link to="/" className="btn btn--link">Go back</Link>
      </div>
    );
  }
  if (!report) return null;

  const isOwner = user && user.id === report.user_id;
  const isAdmin = user && user.role === 'admin';
  const canDelete = isOwner || isAdmin;

  return (
    <div className="page report-detail">
      {flash && <div className="alert alert--success">{flash}</div>}
      {deleteError && <div className="alert alert--error">{deleteError}</div>}

      <Link to="/" className="back-link">← Back to reports</Link>

      <StatusBadge status={report.status} />
      <h1>{report.title}</h1>
      <p className="report-detail__meta">
        By {report.reporter_name} · {new Date(report.created_at).toLocaleString()}
      </p>

      {report.image_url && (
        <img src={report.image_url} alt={report.title} className="report-detail__image" />
      )}

      <p className="report-detail__desc">{report.description}</p>

      <div className="report-detail__tags">
        <span className="chip">📍 {report.category}</span>
        <span className="chip">📐 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
      </div>

      {/* Upvote */}
      <div className="vote">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleUpvote}
          disabled={!user || voting}
          title={!user ? 'Log in to upvote' : ''}
        >
          {upvoted ? '▲ Upvoted' : '△ Upvote'}
        </button>
        <span className="vote__count">{voteCount}</span>
        {!user && <span className="vote__hint">Log in to upvote.</span>}
        {voteError && <span className="vote__error">{voteError}</span>}
      </div>

      {/* Location mini-map */}
      <h2 className="report-detail__section">Location</h2>
      <MapContainer
        center={[report.latitude, report.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="mini-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[report.latitude, report.longitude]} />
      </MapContainer>

      {/* Status timeline */}
      <h2 className="report-detail__section">Status history</h2>
      {history.length === 0 ? (
        <p className="empty-mini">No status changes yet.</p>
      ) : (
        <ol className="timeline">
          {history.map((h) => (
            <li key={h.id} className="timeline__item">
              <div className="timeline__dot" />
              <div className="timeline__content">
                <div className="timeline__row">
                  <StatusBadge status={h.new_status} />
                  <span className="timeline__date">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.old_status && (
                  <div className="timeline__from">from {h.old_status.replace('_', ' ')}</div>
                )}
                {h.note && <p className="timeline__note">{h.note}</p>}
                <div className="timeline__by">by {h.changed_by_name || 'unknown'}</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Delete (owner / admin only) */}
      {canDelete && (
        <div className="report-detail__actions">
          <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete report'}
          </button>
        </div>
      )}
    </div>
  );
}
