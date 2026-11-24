import { Link } from 'react-router-dom';
import { ThumbsUp, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';

export default function ReportCard({ report }) {
  return (
    <Link to={`/reports/${report.id}`} className="report-card">
      {report.image_url ? (
        <img src={report.image_url} alt="" className="report-card__image" />
      ) : (
        <div className="report-card__image report-card__image--placeholder" aria-hidden="true" />
      )}
      <div className="report-card__body">
        <StatusBadge status={report.status} />
        <h3 className="report-card__title">{report.title}</h3>
        <p className="report-card__desc">{report.description}</p>
        <div className="report-card__meta">
          <span className="chip">
            <CategoryIcon category={report.category} size={13} />
            {report.category}
          </span>
          <span className="chip" aria-label={`${report.upvote_count} upvotes`}>
            <ThumbsUp size={12} aria-hidden="true" />
            {report.upvote_count}
          </span>
          <span className="report-card__date" aria-label={`Reported on ${new Date(report.created_at).toLocaleDateString()}`}>
            <Calendar size={12} aria-hidden="true" />
            {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
