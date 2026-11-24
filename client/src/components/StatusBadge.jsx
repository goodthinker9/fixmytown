// Reusable status pill. Colors are defined once in CSS as --status-* tokens,
// so a change to the design system flows through here, the map, and the charts
// automatically.
import { Clock, Wrench, CheckCircle } from 'lucide-react';

const STATUS_META = {
  reported:    { label: 'Reported',    Icon: Clock },
  in_progress: { label: 'In Progress', Icon: Wrench },
  resolved:    { label: 'Resolved',    Icon: CheckCircle },
};

export default function StatusBadge({ status }) {
  const { label, Icon } = STATUS_META[status] || { label: status, Icon: Clock };
  return (
    <span className={`badge badge--${status}`}>
      <Icon size={11} aria-hidden="true" strokeWidth={2.5} />
      {label}
    </span>
  );
}
