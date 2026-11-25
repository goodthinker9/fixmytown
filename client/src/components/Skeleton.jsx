/**
 * Skeleton — UI-E4
 *
 * Three modes:
 *  compact — matches the horizontal ReportCard layout in the civic-split sidebar
 *  map     — full-height placeholder while the Leaflet map initialises
 *  default — 3-col grid of card skeletons (unused in current Home layout but kept
 *            for other pages that might need a grid skeleton)
 *
 * aria-busy + aria-label on the container tells screen readers "content is loading".
 */
export default function Skeleton({ count = 6, compact = false, map = false }) {
  if (map) {
    return (
      <div
        className="skeleton-map"
        aria-busy="true"
        aria-label="Map is loading"
        role="img"
      >
        <div className="skeleton-map__pulse" aria-hidden="true" />
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="skeleton-list"
        aria-busy="true"
        aria-label="Reports are loading"
        role="list"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div className="skeleton-card skeleton-card--compact" key={i} role="listitem" aria-hidden="true">
            <div className="skeleton skeleton--img-sm" />
            <div className="skeleton-card__lines">
              <div className="skeleton skeleton--line" style={{ width: `${60 + (i % 3) * 15}%` }} />
              <div className="skeleton skeleton--line skeleton--short" style={{ width: `${35 + (i % 2) * 20}%` }} />
              <div className="skeleton skeleton--line" style={{ width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="report-grid"
      aria-busy="true"
      aria-label="Reports are loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i} aria-hidden="true">
          <div className="skeleton skeleton--img" />
          <div style={{ padding: '0.75rem' }}>
            <div className="skeleton skeleton--line" style={{ width: `${55 + (i % 3) * 15}%`, marginBottom: '0.5rem' }} />
            <div className="skeleton skeleton--line skeleton--short" style={{ width: `${30 + (i % 2) * 20}%`, marginBottom: '0.5rem' }} />
            <div className="skeleton skeleton--line" style={{ width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
