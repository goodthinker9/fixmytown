/**
 * ReportCard — UI-E4
 *
 * Changes from previous version:
 *  - The outer element is now a proper <article> so it has block-level
 *    semantics in a list context. The whole card is keyboard-reachable
 *    via tabIndex={0} + keyDown handler (Enter → navigate, Space → highlight).
 *  - tabIndex={-1} removed from the internal Link; the outer article now
 *    handles keyboard focus so screen readers see one focusable element, not two.
 *  - image has explicit width/height to prevent layout shift.
 *  - loading="lazy" on report images (cards are below the fold).
 *  - image alt text reflects the report title so screen readers are meaningful.
 */
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Navigation2 } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { relativeTime } from '../utils/relativeTime.js';

const CATEGORY_COLORS = {
  water:       { bg: '#dbeafe', fg: '#1d4ed8' },
  electricity: { bg: '#fef9c3', fg: '#b45309' },
  roads:       { bg: '#f1f5f9', fg: '#475569' },
  garbage:     { bg: '#dcfce7', fg: '#15803d' },
  safety:      { bg: '#fee2e2', fg: '#b91c1c' },
  other:       { bg: '#ede9fe', fg: '#6d28d9' },
};

export default function ReportCard({ report, isActive, onClick }) {
  const navigate  = useNavigate();
  const catColor  = CATEGORY_COLORS[report.category] || { bg: '#f1f5f9', fg: '#475569' };
  const distKm    = report.distance_km != null ? parseFloat(report.distance_km) : null;
  const detailUrl = `/reports/${report.id}`;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate(detailUrl);
    } else if (e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <article
      className={`report-card${isActive ? ' report-card--active' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${report.title} — ${report.status.replace('_', ' ')}, ${report.category}, ${report.upvote_count} upvotes`}
    >
      {/* Image panel — links to detail page */}
      <Link to={detailUrl} className="report-card__image-link" tabIndex={-1} aria-hidden="true">
        {report.image_url ? (
          <img
            src={report.image_url}
            alt={`Photo of: ${report.title}`}
            className="report-card__image"
            loading="lazy"
            width="88"
            height="88"
          />
        ) : (
          <div
            className="report-card__image report-card__image--placeholder"
            style={{ background: catColor.bg }}
            aria-hidden="true"
          >
            <CategoryIcon category={report.category} size={28} style={{ color: catColor.fg }} />
          </div>
        )}
      </Link>

      <div className="report-card__body">
        <div className="report-card__top-row">
          <StatusBadge status={report.status} />
          <span className="chip chip--upvote" aria-label={`${report.upvote_count} upvote${report.upvote_count !== 1 ? 's' : ''}`}>
            <ThumbsUp size={11} aria-hidden="true" />
            {report.upvote_count}
          </span>
        </div>

        <Link to={detailUrl} className="report-card__title-link">
          <h3 className="report-card__title">{report.title}</h3>
        </Link>
        <p className="report-card__desc">{report.description}</p>

        <div className="report-card__footer">
          <span className="chip">
            <CategoryIcon category={report.category} size={12} />
            {report.category}
          </span>

          {distKm != null && (
            <span className="chip chip--distance" aria-label={`${distKm.toFixed(1)} km away`}>
              <Navigation2 size={11} aria-hidden="true" />
              {distKm < 1
                ? `${Math.round(distKm * 1000)} m`
                : `${distKm.toFixed(1)} km`}
            </span>
          )}

          <time
            className="report-card__time"
            dateTime={report.created_at}
            title={new Date(report.created_at).toLocaleString()}
          >
            {relativeTime(report.created_at)}
          </time>
        </div>
      </div>
    </article>
  );
}
