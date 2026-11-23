// Reusable filter bar. Controlled: the parent owns the state and passes values
// + change handlers, so filters stay reusable across views (list & map share
// the same filter state).
const CATEGORIES = [
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'roads', label: 'Roads' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'reported', label: 'Reported' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export default function ReportFilters({
  category,
  status,
  sort,
  searchInput,
  onCategory,
  onStatus,
  onSort,
  onSearch,
  onClear,
}) {
  const hasFilters = category || status || sort !== 'newest' || searchInput;

  return (
    <div className="filters">
      <input
        type="search"
        className="input filters__search"
        placeholder="Search reports…"
        value={searchInput}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Search reports"
      />
      <select
        className="input"
        value={category}
        onChange={(e) => onCategory(e.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <select
        className="input"
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select
        className="input"
        value={sort}
        onChange={(e) => onSort(e.target.value)}
        aria-label="Sort reports"
      >
        <option value="newest">Newest</option>
        <option value="top">Most upvoted</option>
      </select>
      {hasFilters && (
        <button type="button" className="btn btn--link" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}
