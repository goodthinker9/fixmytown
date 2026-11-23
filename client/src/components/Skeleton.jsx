// Loading skeleton that mirrors the report grid layout. The shimmer is a CSS
// animation, so it's cheap and reusable.
export default function Skeleton({ count = 6 }) {
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
