import { Search, SlidersHorizontal, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'water',       label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'roads',       label: 'Roads' },
  { value: 'garbage',     label: 'Garbage' },
  { value: 'safety',      label: 'Safety' },
  { value: 'other',       label: 'Other' },
];

const STATUSES = [
  { value: 'reported',    label: 'Reported' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
];

export default function ReportFilters({
  category, status, sort, searchInput,
  onCategory, onStatus, onSort, onSearch, onClear,
  showDistanceSort = false,
}) {
  const hasFilters = category || status || sort !== 'newest' || searchInput;

  return (
    <div className="filters">
      <div className="filters__search-wrap">
        <Search size={15} className="filters__search-icon" aria-hidden="true" />
        <input
          type="search"
          className="input filters__search"
          placeholder="Search reports…"
          value={searchInput}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search reports"
        />
      </div>

      <div className="filters__selects">
        <SlidersHorizontal size={15} className="filters__sliders-icon" aria-hidden="true" />
        <select
          className="input filters__select"
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          className="input filters__select"
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          className="input filters__select"
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          aria-label="Sort reports"
        >
          <option value="newest">Newest first</option>
          <option value="top">Most upvoted</option>
          {showDistanceSort && <option value="distance">Nearest first</option>}
        </select>

        {hasFilters && (
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon filters__clear"
            onClick={onClear}
            aria-label="Clear all filters"
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
