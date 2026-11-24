import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  List, Map, FileText, Users, CheckCircle2,
  Loader2, Camera, ThumbsUp, AlertTriangle,
} from 'lucide-react';
import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportMap from '../components/ReportMap.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { listReports } from '../api/reports.js';
import { getPublicStats } from '../api/stats.js';
import { useDebounce } from '../hooks/useDebounce.js';
import useAuth from '../hooks/useAuth.js';

const LIMIT = 9;

// ── Live stats strip ──────────────────────────────────────────────────
function StatsStrip() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch(() => {}) // silent — the strip is a nice-to-have
      .finally(() => setLoading(false));
  }, []);

  const items = [
    { icon: FileText,    label: 'Reports submitted', key: 'total',       color: 'blue' },
    { icon: CheckCircle2,label: 'Issues resolved',   key: 'resolved',    color: 'green' },
    { icon: AlertTriangle,label: 'In progress',      key: 'in_progress', color: 'amber' },
  ];

  return (
    <div className="stats-strip" aria-label="Live community statistics">
      {items.map(({ icon: Icon, label, key, color }) => (
        <div key={key} className={`stats-strip__item stats-strip__item--${color}`}>
          <div className="stats-strip__icon" aria-hidden="true">
            <Icon size={20} />
          </div>
          <div>
            <div className="stats-strip__value">
              {loading
                ? <span className="skeleton skeleton--stat" aria-label="Loading" />
                : (stats?.[key] ?? '—')}
            </div>
            <div className="stats-strip__label">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    icon: Camera,
    title: 'Report a problem',
    desc: 'Drop a pin on the map, add a photo, describe what you see. Takes 60 seconds.',
    step: '01',
  },
  {
    icon: ThumbsUp,
    title: 'Community upvotes',
    desc: 'Neighbours upvote the issues they share. High-priority problems rise to the top.',
    step: '02',
  },
  {
    icon: CheckCircle2,
    title: 'Track until fixed',
    desc: 'Admins update the status as work progresses. You see every change in the timeline.',
    step: '03',
  },
];

function HowItWorks() {
  return (
    <section className="how-section" aria-labelledby="how-heading">
      <h2 id="how-heading" className="how-section__title">How it works</h2>
      <div className="how-steps">
        {HOW_STEPS.map(({ icon: Icon, title, desc, step }) => (
          <div key={step} className="how-step">
            <div className="how-step__number" aria-hidden="true">{step}</div>
            <div className="how-step__icon" aria-hidden="true">
              <Icon size={24} />
            </div>
            <h3 className="how-step__title">{title}</h3>
            <p className="how-step__desc">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
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
      .catch((err) => { if (active) setListError(err.response?.data?.error || 'Could not load reports.'); })
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
    <>
      {/* ── Hero ── */}
      <section className="hero" aria-label="Welcome">
        <div className="hero__inner">
          <div className="hero__badge">
            <span className="hero__badge-dot" aria-hidden="true" />
            Community problem reporting
          </div>
          <h1 className="hero__headline">
            See a problem in your town?<br />
            <span className="hero__headline--accent">Report it. Track it. Get it fixed.</span>
          </h1>
          <p className="hero__sub">
            Residents submit reports with a photo and map pin. The whole community
            upvotes what matters most. Admins track every issue to resolution.
          </p>
          <div className="hero__actions">
            {user ? (
              <Link to="/reports/new" className="btn btn--primary btn--lg">
                Report an issue
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn--primary btn--lg">Report an issue</Link>
                <Link to="/#browse" className="btn btn--hero-ghost btn--lg">Browse the map</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="container">
        <StatsStrip />

        {/* ── How it works ── */}
        <HowItWorks />

        {/* ── Browse section ── */}
        <section id="browse" className="browse" aria-label="Browse reports">
          <div className="browse__header">
            <div>
              <h2 className="browse__title">Community reports</h2>
              {!listLoading && (
                <p className="browse__subtitle">
                  {total} report{total !== 1 ? 's' : ''} submitted by residents
                </p>
              )}
            </div>

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
            <>
              {listLoading ? (
                <Skeleton count={LIMIT} />
              ) : listError ? (
                <div className="alert alert--error">{listError}</div>
              ) : reports.length === 0 ? (
                <div className="empty-state">
                  <p>No reports match your filters.</p>
                  <button type="button" className="btn btn--ghost" onClick={clearFilters}>Clear filters</button>
                </div>
              ) : (
                <>
                  <div className="report-grid">
                    {reports.map((r) => <ReportCard key={r.id} report={r} />)}
                  </div>
                  <div className="browse__footer">
                    <span className="browse__count">{total} report{total !== 1 ? 's' : ''}</span>
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <ReportMap reports={mapReports} loading={mapLoading} error={mapError} />
              <p className="browse__map-note">Showing up to 50 matching reports on the map.</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
