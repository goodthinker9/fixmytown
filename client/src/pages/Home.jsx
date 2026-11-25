import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, LocateFixed, Loader2, List, Map as MapIcon,
  FileText, CheckCircle2, AlertTriangle, Percent,
  Camera, ThumbsUp, ChevronDown, X,
} from 'lucide-react';

import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportMap from '../components/ReportMap.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { listReports } from '../api/reports.js';
import { getPublicStats } from '../api/stats.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useNominatim } from '../hooks/useNominatim.js';
import useAuth from '../hooks/useAuth.js';

const LIMIT = 12;
const DEFAULT_RADIUS = 25;  // km — shown to users as "near me" radius

// ── Geocoder search box ───────────────────────────────────────────────
function GeocoderBox({ onSelect }) {
  const [input, setInput]       = useState('');
  const [focused, setFocused]   = useState(false);
  const [chosen, setChosen]     = useState(false);
  const debouncedInput = useDebounce(input, 1000); // Nominatim policy: max 1 req/s
  const { results, loading }    = useNominatim(chosen ? '' : debouncedInput);
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setFocused(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (item) => {
    setInput(item.label.split(',').slice(0, 2).join(','));
    setChosen(true);
    setFocused(false);
    onSelect({ lat: item.lat, lng: item.lng });
  };

  const clear = () => { setInput(''); setChosen(false); };

  const showDropdown = focused && !chosen && results.length > 0;

  return (
    <div className="geocoder" ref={wrapRef}>
      <div className="geocoder__input-wrap">
        <Search size={17} className="geocoder__icon" aria-hidden="true" />
        <input
          type="search"
          className="geocoder__input"
          placeholder="Search an address or place…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setChosen(false); }}
          onFocus={() => setFocused(true)}
          aria-label="Search an address or place"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {loading && <Loader2 size={15} className="geocoder__spinner spin" aria-label="Searching…" />}
        {input && !loading && (
          <button type="button" className="geocoder__clear" onClick={clear} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>
      {showDropdown && (
        <ul className="geocoder__results" role="listbox" aria-label="Address suggestions">
          {results.map((r, i) => (
            <li
              key={i}
              role="option"
              className="geocoder__result"
              onMouseDown={() => select(r)}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Live stats strip ──────────────────────────────────────────────────
function StatsStrip() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resolvedRate = stats
    ? stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
    : null;

  const items = [
    { icon: FileText,     label: 'Reports',     key: 'total',       color: 'blue' },
    { icon: CheckCircle2, label: 'Resolved',    key: 'resolved',    color: 'green' },
    { icon: AlertTriangle,label: 'In progress', key: 'in_progress', color: 'amber' },
    { icon: Percent,      label: 'Resolved rate', key: '_rate',     color: 'teal',
      value: resolvedRate != null ? `${resolvedRate}%` : '—' },
  ];

  return (
    <div className="stats-strip" aria-label="Live community statistics">
      {items.map(({ icon: Icon, label, key, color, value }) => (
        <div key={key} className={`stats-strip__item stats-strip__item--${color}`}>
          <div className="stats-strip__icon" aria-hidden="true"><Icon size={18} /></div>
          <div>
            <div className="stats-strip__value">
              {loading
                ? <span className="skeleton skeleton--stat" aria-hidden="true" />
                : (value ?? (stats?.[key] ?? '—'))}
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
  { icon: Camera,       step: '01', title: 'Report a problem',
    desc: 'Drop a pin, snap a photo, describe what you see. Takes 60 seconds.' },
  { icon: ThumbsUp,     step: '02', title: 'Community upvotes',
    desc: 'Neighbours upvote the issues they share. High-priority problems rise to the top.' },
  { icon: CheckCircle2, step: '03', title: 'Track until fixed',
    desc: 'Admins update the status as work progresses. Every change is logged.' },
];

function HowItWorks() {
  return (
    <section className="how-section" aria-labelledby="how-heading" id="how">
      <h2 id="how-heading" className="how-section__title">How it works</h2>
      <div className="how-steps">
        {HOW_STEPS.map(({ icon: Icon, step, title, desc }) => (
          <div key={step} className="how-step">
            <div className="how-step__number" aria-hidden="true">{step}</div>
            <div className="how-step__icon" aria-hidden="true"><Icon size={22} /></div>
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

  // --- Map/list view toggle (mobile) ---
  const [mobileView, setMobileView] = useState('map'); // 'map' | 'list'

  // --- Filters ---
  const [category, setCategory] = useState('');
  const [status,   setStatus]   = useState('');
  const [sort,     setSort]     = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);

  // --- Proximity / geocoder state ---
  // mapCenter: [lat, lng] — where the map is focused (from geocoder or geolocation).
  const [mapCenter, setMapCenter]   = useState(null);
  const [mapZoom,   setMapZoom]     = useState(null);
  // userCoords: set when "Use my location" is clicked; triggers proximity sort.
  const [userCoords, setUserCoords] = useState(null); // { lat, lng }
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,   setGeoError]   = useState('');

  // --- Active report (bidirectional list↔map highlight) ---
  const [activeId, setActiveId] = useState(null);
  const listRef = useRef(null);

  // --- Report data ---
  const [reports, setReports]       = useState([]);
  const [total,   setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError,   setListError]   = useState('');

  const applyFilter = (setter) => (v) => { setter(v); setPage(1); };
  const onCategory = applyFilter(setCategory);
  const onStatus   = applyFilter(setStatus);
  const onSearch   = applyFilter(setSearchInput);

  const onSort = (v) => {
    setSort(v);
    setPage(1);
    // If the user picks "distance" but no coords exist yet, trigger geolocation.
    if (v === 'distance' && !userCoords) requestGeoLocation();
  };

  const clearFilters = () => {
    setCategory(''); setStatus(''); setSort('newest'); setSearchInput('');
    setUserCoords(null); setPage(1);
  };

  // Geolocation
  const requestGeoLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(13);
        setSort('distance');
        setPage(1);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. You can still search above.'
            : 'Could not get your location.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Geocoder result → center the map, sort by distance.
  const handleGeocoderSelect = ({ lat, lng }) => {
    setMapCenter([lat, lng]);
    setMapZoom(13);
    setUserCoords({ lat, lng });
    setSort('distance');
    setPage(1);
  };

  // Fetch the list (and map data) whenever filters or proximity change.
  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError('');

    const params = {
      category, status, search: debouncedSearch, sort,
      page, limit: LIMIT,
      ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng, radius_km: DEFAULT_RADIUS }),
    };

    listReports(params)
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
  }, [category, status, debouncedSearch, sort, page, userCoords]);

  // When a marker is clicked → highlight + scroll the list card into view.
  const handleMarkerClick = useCallback((report) => {
    setActiveId((prev) => (prev === report.id ? null : report.id));
    // Switch to list view on mobile so the card is visible.
    setMobileView('list');
  }, []);

  // Scroll the active card into view.
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

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
            Search for your area, drop a pin on the problem, and let the whole
            community track it to resolution.
          </p>

          {/* Geocoder + "Use my location" */}
          <div className="hero__search-row">
            <GeocoderBox onSelect={handleGeocoderSelect} />
            <button
              type="button"
              className="btn btn--hero-ghost btn--lg hero__locate-btn"
              onClick={requestGeoLocation}
              disabled={geoLoading}
              aria-label="Use my current location"
            >
              {geoLoading
                ? <Loader2 size={17} className="spin" aria-hidden="true" />
                : <LocateFixed size={17} aria-hidden="true" />}
              {geoLoading ? 'Locating…' : 'Use my location'}
            </button>
          </div>
          {geoError && (
            <p className="hero__geo-error" role="alert">{geoError}</p>
          )}

          <div className="hero__actions">
            {user ? (
              <Link to="/reports/new" className="btn btn--primary btn--lg">
                Report an issue
              </Link>
            ) : (
              <>
                <Link to="/register"  className="btn btn--primary btn--lg">Report an issue</Link>
                <Link to="/login"     className="btn btn--hero-ghost btn--lg">Log in</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {/* ── Stats strip ── */}
        <StatsStrip />

        {/* ── Split layout: filters+list LEFT, map RIGHT ── */}
        <section id="browse" className="civic-browse" aria-label="Browse reports">

          {/* Mobile toggle */}
          <div className="civic-browse__mobile-toggle" aria-label="Switch view">
            <button
              type="button"
              className={mobileView === 'list' ? 'view-toggle__btn active' : 'view-toggle__btn'}
              onClick={() => setMobileView('list')}
              aria-pressed={mobileView === 'list'}
            >
              <List size={14} aria-hidden="true" /> List
            </button>
            <button
              type="button"
              className={mobileView === 'map' ? 'view-toggle__btn active' : 'view-toggle__btn'}
              onClick={() => setMobileView('map')}
              aria-pressed={mobileView === 'map'}
            >
              <MapIcon size={14} aria-hidden="true" /> Map
            </button>
          </div>

          <div className="civic-split">
            {/* ── LEFT PANEL: filters + list ── */}
            <aside
              className={`civic-split__list${mobileView === 'map' ? ' civic-split__list--hidden' : ''}`}
              aria-label="Report list"
            >
              <div className="civic-list-header">
                <h2 className="browse__title">
                  {userCoords ? 'Reports near you' : 'Community reports'}
                </h2>
                {!listLoading && (
                  <span className="browse__count">{total} report{total !== 1 ? 's' : ''}</span>
                )}
              </div>

              <ReportFilters
                category={category} status={status} sort={sort} searchInput={searchInput}
                onCategory={onCategory} onStatus={onStatus} onSort={onSort}
                onSearch={onSearch} onClear={clearFilters}
                showDistanceSort={true}
              />

              <div className="civic-list-scroll" ref={listRef}>
                {listLoading ? (
                  <Skeleton count={4} compact />
                ) : listError ? (
                  <div className="alert alert--error">{listError}</div>
                ) : reports.length === 0 ? (
                  <div className="empty-state">
                    <p>No reports match your filters.</p>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  reports.map((r) => (
                    <div key={r.id} data-id={r.id}>
                      <ReportCard
                        report={r}
                        isActive={r.id === activeId}
                        onClick={() => setActiveId((prev) => (prev === r.id ? null : r.id))}
                      />
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && !listLoading && (
                <div className="civic-list-pagination">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </aside>

            {/* ── RIGHT PANEL: map ── */}
            <div
              className={`civic-split__map${mobileView === 'list' ? ' civic-split__map--hidden' : ''}`}
              aria-label="Reports map"
            >
              <ReportMap
                reports={reports}
                loading={listLoading}
                error={listError}
                center={mapCenter}
                zoom={mapZoom}
                activeId={activeId}
                onMarkerClick={handleMarkerClick}
              />
              <p className="map-attribution">
                Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <HowItWorks />
      </div>
    </>
  );
}
