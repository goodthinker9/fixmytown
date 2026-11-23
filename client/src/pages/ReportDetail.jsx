// Minimal report detail page — this is the success redirect target for the
// form. The richer version (upvote button, status history, mini-map) comes in
// a later phase.
import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getReport } from '../api/reports.js';

export default function ReportDetail() {
  const { id } = useParams();
  const location = useLocation();
  const flash = location.state?.flash; // one-shot success message from the form

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getReport(id)
      .then((data) => setReport(data.report))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this report.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page report-detail">
      {flash && <div className="alert alert--success">{flash}</div>}
      {error && (
        <>
          <div className="alert alert--error">{error}</div>
          <Link to="/" className="btn btn--link">Go home</Link>
        </>
      )}
      {report && (
        <>
          <span className={`badge badge--${report.status}`}>
            {report.status.replace('_', ' ')}
          </span>
          <h1>{report.title}</h1>
          <p className="report-detail__meta">
            By {report.reporter_name} · {new Date(report.created_at).toLocaleString()}
          </p>
          <p>{report.description}</p>
          <div className="report-detail__tags">
            <span className="chip">📍 {report.category}</span>
            <span className="chip">▲ {report.upvote_count}</span>
            <span className="chip">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
          </div>
          {report.image_url && (
            <img
              src={report.image_url}
              alt={report.title}
              className="report-detail__image"
            />
          )}
        </>
      )}
    </div>
  );
}
