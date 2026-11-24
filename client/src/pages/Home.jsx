import { useEffect, useState } from 'react';
import { List, Map } from 'lucide-react';
import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportMap from '../components/ReportMap.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { listReports } from '../api/reports.js';
import { useDebounce } from '../hooks/useDebounce.js';

const LIMIT = 9;

export default function Home() {
  const [view, setView] = useState('list');

  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);

  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [mapReports, setMapReports] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  const applyFilter = (setter) => (v) => { setter(v); setPage(1); };
  const onCategory = applyFilter(setCategory);
  const onStatus   = applyFilter(setStatus);
  const onSort     = applyFilter(setSort);
  const onSearch   = applyFilter(setSearchInput);

  const clearFilters = () => {
    setCategory(''); setStatus(''); setSort('newest'); setSearchInput(''); setPage(1);
  };

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError('');
    listReports({ category, status, search: debouncedSearch, sort, page, limit: LIMIT })
      .then((data) => {
        if (!active) return;
        setReports(data.reports);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        if (active) setListError(err.response?.data?.error || 'Could not load reports.');
      })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [category, status, debouncedSearch, sort, page]);

  useEffect(() => {
    if (view !== 'map') return;
    let active = true;
    setMapLoading(true);
    setMapError('');
    listReports({ category, status, search: debouncedSearch, sort, page: 1, limit: 50 })
      .then((data) => { if (active) setMapReports(data.reports); })
      .catch((err) => { if (active) setMapError(err.response?.data?.error || 'Could not load the map.'); })
      .finally(() => { if (active) setMapLoading(false); });
    return () => { active = false; };
  }, [view, category, status, debouncedSearch, sort]);

  return (
    <div className="page browse">
      <div className="browse__header">
        <h1>Community reports</h1>
        <div className="view-toggle" role="group" aria-label="Switch between list and map view">
          <button
            type="button"
            className={view === 'list' ? 'view-toggle__btn active' : 'view-toggle__btn'}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <List size={15} aria-hidden="true" /> List
          </button>
          <button
            type="button"
            className={view === 'map' ? 'view-toggle__btn active' : 'view-toggle__btn'}
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
          >
            <Map size={15} aria-hidden="true" /> Map
          </button>
        </div>
      </div>

      <ReportFilters
        category={category} status={status} sort={sort} searchInput={searchInput}
        onCategory={onCategory} onStatus={onStatus} onSort={onSort}
        onSearch={onSearch} onClear={clearFilters}
      />

      {view === 'list' ? (
        <div className="browse__content">
          {listLoading ? (
            <Skeleton count={LIMIT} />
          ) : listError ? (
            <div className="alert alert--error">{listError}</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <p>No reports match your filters.</p>
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="report-grid">
                {reports.map((r) => <ReportCard key={r.id} report={r} />)}
              </div>
              <div className="browse__footer">
                <span className="browse__count">
                  {total} report{total !== 1 ? 's' : ''}
                </span>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="browse__content">
          <ReportMap reports={mapReports} loading={mapLoading} error={mapError} />
          <p className="browse__map-note">Showing up to 50 matching reports on the map.</p>
        </div>
      )}
    </div>
  );
}
