// Reusable empty state: icon + heading + description + optional action.
// Usage:
//   <EmptyState icon={FileSearch} title="No reports yet" desc="…" action={<button>…</button>} />
export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="empty-state" role="status">
      {Icon && (
        <div className="empty-state__icon" aria-hidden="true">
          <Icon size={40} strokeWidth={1.5} />
        </div>
      )}
      {title && <h3 className="empty-state__title">{title}</h3>}
      {desc  && <p  className="empty-state__desc">{desc}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
