// Reusable card for one report, used in the list view. The whole card is a
// link to the report's detail page.
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

export default function ReportCard({ report }) {
  return (
    <Link to={`/reports/${report.id}`} className="report-card">
      {report.image_url ? (
        <img src={report.image_url} alt="" className="report-card__image" />
      ) : (
        <div className="report-card__image report-card__image--placeholder" />
      )}
      <div className="report-card__body">
        <StatusBadge status={report.status} />
        <h3 className="report-card__title">{report.title}</h3>
        <p className="report-card__desc">{report.description}</p>
        <div className="report-card__meta">
          <span className="chip">📍 {report.category}</span>
          <span className="chip">▲ {report.upvote_count}</span>
          <span className="report-card__date">
            {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
