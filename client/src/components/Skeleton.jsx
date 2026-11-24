// Loading skeleton — two modes:
//   default: grid of cards (3-col) used on the full browse page.
//   compact: stacked narrow cards used in the civic-browse sidebar.
export default function Skeleton({ count = 6, compact = false }) {
  if (compact) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div className="skeleton-card skeleton-card--compact" key={i}>
            <div className="skeleton skeleton--img-sm" />
            <div className="skeleton-card__lines">
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line skeleton--short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="report-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton--img" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--line" />
        </div>
      ))}
    </div>
  );
}
