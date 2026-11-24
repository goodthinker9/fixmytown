import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  ThumbsUp, ThumbsDown, ArrowLeft, Trash2, MapPin,
  Share2, Check, AlertCircle, Loader2,
} from 'lucide-react';
import '../utils/leafletIcons.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { getReport, toggleUpvote, deleteReport } from '../api/reports.js';
import { relativeTime } from '../utils/relativeTime.js';
import useAuth from '../hooks/useAuth.js';

// Dot color matches the CSS status tokens.
const TIMELINE_DOT_COLORS = {
  reported:    'var(--status-reported-fg)',
  in_progress: 'var(--status-in_progress-fg)',
  resolved:    'var(--status-resolved-fg)',
};

export default function ReportDetail() {
  const { id }      = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const flash       = location.state?.flash;

  const [report,  setReport]  = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [upvoted, setUpvoted] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [voting, setVoting]   = useState(false);
  const [voteError, setVoteError] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Share / copy-link state
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: report?.title, url }); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: nothing — the button is a nice-to-have.
    }
  };

  if (loading) return <div className="loading"><Loader2 size={20} className="spin" aria-hidden="true" /> Loading…</div>;
  if (error) {
    return (
      <div className="page report-detail">
        {flash && <div className="alert alert--success" role="status">{flash}</div>}
        <div className="alert alert--error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {error}</div>
        <Link to="/" className="btn btn--ghost btn--icon"><ArrowLeft size={15} aria-hidden="true" /> Go back</Link>
      </div>
    );
  }
  if (!report) return null;

  const isOwner  = user && user.id === report.user_id;
  const isAdmin  = user && user.role === 'admin';
  const canDelete = isOwner || isAdmin;

  return (
    <div className="page report-detail">
      {flash && <div className="alert alert--success" role="status">{flash}</div>}
      {deleteError && <div className="alert alert--error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {deleteError}</div>}

      {/* Top bar */}
      <div className="report-detail__topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Back to reports
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon"
          onClick={handleShare}
          aria-label="Share this report"
        >
          {copied
            ? <><Check size={14} aria-hidden="true" /> Copied!</>
            : <><Share2 size={14} aria-hidden="true" /> Share</>}
        </button>
      </div>

      {/* Hero image */}
      {report.image_url && (
        <img
          src={report.image_url}
          alt={`Photo of: ${report.title}`}
          className="report-detail__hero-image"
        />
      )}

      {/* Badges + title */}
      <div className="report-detail__badges">
        <StatusBadge status={report.status} />
        <span className="chip">
          <CategoryIcon category={report.category} size={13} />
          {report.category}
        </span>
      </div>

      <h1 className="report-detail__h1">{report.title}</h1>

      <p className="report-detail__meta">
        Reported by <strong>{report.reporter_name}</strong>
        &nbsp;·&nbsp;
        <time dateTime={report.created_at} title={new Date(report.created_at).toLocaleString()}>
          {relativeTime(report.created_at)}
        </time>
      </p>

      <p className="report-detail__desc">{report.description}</p>

      {/* Location chip */}
      <p className="report-detail__coords">
        <MapPin size={13} aria-hidden="true" />
        {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
      </p>

      {/* Upvote row */}
      <div className="vote" role="group" aria-label="Vote on this report">
        <button
          type="button"
          className={`btn ${upvoted ? 'btn--primary' : 'btn--ghost'} btn--icon`}
          onClick={handleUpvote}
          disabled={!user || voting}
          aria-label={upvoted ? 'Remove your upvote' : 'Upvote this report'}
          aria-pressed={upvoted ?? false}
          title={!user ? 'Log in to upvote' : undefined}
        >
          {voting
            ? <Loader2 size={15} className="spin" aria-hidden="true" />
            : upvoted
              ? <ThumbsDown size={15} aria-hidden="true" />
              : <ThumbsUp size={15} aria-hidden="true" />}
          {upvoted ? 'Upvoted' : 'Upvote'}
        </button>
        <span className="vote__count" aria-label={`${voteCount} upvotes`}>{voteCount}</span>
        {!user && <span className="vote__hint"><Link to="/login">Log in</Link> to upvote.</span>}
        {voteError && <span className="vote__error" role="alert"><AlertCircle size={12} aria-hidden="true" /> {voteError}</span>}
      </div>

      {/* Mini map */}
      <h2 className="report-detail__section">Location</h2>
      <MapContainer
        center={[report.latitude, report.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="mini-map"
        aria-label="Map showing report location"
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
        <p className="empty-mini">No status changes recorded yet.</p>
      ) : (
        <ol className="timeline" aria-label="Status change history">
          {history.map((h, idx) => (
            <li key={h.id} className="timeline__item">
              <div
                className="timeline__dot"
                style={{ background: TIMELINE_DOT_COLORS[h.new_status] || 'var(--primary)' }}
                aria-hidden="true"
              />
              {idx < history.length - 1 && (
                <div className="timeline__line" aria-hidden="true" />
              )}
              <div className="timeline__content">
                <div className="timeline__row">
                  <StatusBadge status={h.new_status} />
                  <time className="timeline__date" dateTime={h.created_at}>
                    {new Date(h.created_at).toLocaleDateString('en', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </time>
                </div>
                {h.old_status && (
                  <p className="timeline__from">
                    Changed from <em>{h.old_status.replace('_', ' ')}</em>
                  </p>
                )}
                {h.note && <p className="timeline__note">&ldquo;{h.note}&rdquo;</p>}
                <p className="timeline__by">Updated by {h.changed_by_name || 'a team member'}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Delete */}
      {canDelete && (
        <div className="report-detail__actions">
          <button
            type="button"
            className="btn btn--danger btn--icon"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 size={15} className="spin" aria-hidden="true" />
              : <Trash2 size={15} aria-hidden="true" />}
            {deleting ? 'Deleting…' : 'Delete this report'}
          </button>
        </div>
      )}
    </div>
  );
}
