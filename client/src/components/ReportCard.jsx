import { Link } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { relativeTime } from '../utils/relativeTime.js';

// Category → tailored background colour for the placeholder tile.
// These match the status/category palette in styles.css.
const CATEGORY_COLORS = {
  water:       { bg: '#dbeafe', fg: '#1d4ed8' },
  electricity: { bg: '#fef9c3', fg: '#b45309' },
  roads:       { bg: '#f1f5f9', fg: '#475569' },
  garbage:     { bg: '#dcfce7', fg: '#15803d' },
  safety:      { bg: '#fee2e2', fg: '#b91c1c' },
  other:       { bg: '#ede9fe', fg: '#6d28d9' },
};

export default function ReportCard({ report }) {
  const catColor = CATEGORY_COLORS[report.category] || { bg: '#f1f5f9', fg: '#475569' };

  return (
    <Link to={`/reports/${report.id}`} className="report-card">
      {report.image_url ? (
        <img src={report.image_url} alt="" className="report-card__image" />
      ) : (
        // Category-coloured placeholder with a centred icon instead of blank grey.
        <div
          className="report-card__image report-card__image--placeholder"
          style={{ background: catColor.bg }}
          aria-hidden="true"
        >
          <CategoryIcon category={report.category} size={36} style={{ color: catColor.fg }} />
        </div>
      )}

      <div className="report-card__body">
        <div className="report-card__top-row">
          <StatusBadge status={report.status} />
          <span className="chip chip--upvote" aria-label={`${report.upvote_count} upvotes`}>
            <ThumbsUp size={11} aria-hidden="true" />
            {report.upvote_count}
          </span>
        </div>

        <h3 className="report-card__title">{report.title}</h3>
        <p className="report-card__desc">{report.description}</p>

        <div className="report-card__footer">
          <span className="chip">
            <CategoryIcon category={report.category} size={12} />
            {report.category}
          </span>
          <time
            className="report-card__time"
            dateTime={report.created_at}
            title={new Date(report.created_at).toLocaleString()}
          >
            {relativeTime(report.created_at)}
          </time>
        </div>
      </div>
    </Link>
  );
}
