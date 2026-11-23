// Reusable status pill. Color comes from the badge--<status> CSS classes.
const LABELS = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{LABELS[status] || status}</span>;
}
