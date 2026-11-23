// Reusable stat card used in the admin summary row.
export default function SummaryCard({ icon, label, value, accent }) {
  return (
    <div className={`summary-card${accent ? ` summary-card--${accent}` : ''}`}>
      <div className="summary-card__icon">{icon}</div>
      <div className="summary-card__body">
        <div className="summary-card__value">{value}</div>
        <div className="summary-card__label">{label}</div>
      </div>
    </div>
  );
}
