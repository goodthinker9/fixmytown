/**
 * Home — UI-E2
 *
 * Sections:
 *   1. Hero   — full-bleed photo + dark gradient + animated headline + search card
 *   2. Impact — live stats with count-up animation (Reveal scroll-trigger)
 *   3. Browse — split list / map  (unchanged from UI-B-Revised)
 *   4. How it works (unchanged)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import {
  Search, LocateFixed, Loader2, List, Map as MapIcon,
  X, Camera, ThumbsUp, CheckCircle2,
  FileText, AlertTriangle, Percent,
  ShieldCheck, Users, Sparkles,
} from 'lucide-react';

import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard    from '../components/ReportCard.jsx';
import ReportMap     from '../components/ReportMap.jsx';
import Pagination    from '../components/Pagination.jsx';
import Skeleton      from '../components/Skeleton.jsx';
import Reveal        from '../components/Reveal.jsx';

import { listReports }    from '../api/reports.js';
import { getPublicStats } from '../api/stats.js';
import { useDebounce }    from '../hooks/useDebounce.js';
import { useNominatim }   from '../hooks/useNominatim.js';
import { useCountUp }     from '../hooks/useCountUp.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import useAuth from '../hooks/useAuth.js';

const LIMIT          = 12;
const DEFAULT_RADIUS = 25; // km

// ── Geocoder search box ───────────────────────────────────────────────────────
function GeocoderBox({ onSelect }) {
  const [input,   setInput]   = useState('');
  const [focused, setFocused] = useState(false);
  const [chosen,  setChosen]  = useState(false);
  const debouncedInput = useDebounce(input, 1000);
  const { results, loading }  = useNominatim(chosen ? '' : debouncedInput);
  const wrapRef = useRef(null);

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
    <div className="geocoder geocoder--hero" ref={wrapRef}>
      <div className="geocoder__input-wrap">
        <Search size={17} className="geocoder__icon" aria-hidden="true" />
        <input
          type="search"
          className="geocoder__input"
          placeholder="Search an address or area…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setChosen(false); }}
          onFocus={() => setFocused(true)}
          aria-label="Search an address or area to find nearby reports"
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
            <li key={i} role="option" className="geocoder__result" onMouseDown={() => select(r)}>
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Trust chips ───────────────────────────────────────────────────────────────
const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Free to use' },
  { icon: Users,       label: 'Public and transparent' },
  { icon: Sparkles,    label: 'AI-assisted triage' },
];

// ── Single impact counter ─────────────────────────────────────────────────────
function ImpactStat({ value, suffix = '', label, color, loading }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count  = useCountUp(value ?? 0, { started: inView && !loading, duration: 1600 });

  return (
    <div ref={ref} className={`impact-stat impact-stat--${color}`}>
      <div className="impact-stat__value" aria-label={`${value}${suffix} ${label}`}>
        {loading ? (
          <span className="skeleton skeleton--stat-lg" aria-hidden="true" />
        ) : (
          <>
            {count.toLocaleString()}
            {suffix && <span className="impact-stat__suffix">{suffix}</span>}
          </>
        )}
      </div>
      <div className="impact-stat__label">{label}</div>
    </div>
  );
}

// ── Impact strip ──────────────────────────────────────────────────────────────
function ImpactStrip() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resolvedRate = stats?.total > 0
    ? Math.round((stats.resolved / stats.total) * 100)
    : null;

  return (
    <section id="impact" className="impact-strip" aria-labelledby="impact-heading">
      <div className="container">
        <Reveal>
          <h2 id="impact-heading" className="impact-strip__title">
            Real problems. Real fixes.
          </h2>
        </Reveal>
        <div className="impact-grid">
          <Reveal delay={0.05}>
            <ImpactStat value={stats?.total}       label="Reports submitted" color="blue"  loading={loading} />
          </Reveal>
          <Reveal delay={0.10}>
            <ImpactStat value={stats?.resolved}    label="Issues resolved"   color="green" loading={loading} />
          </Reveal>
          <Reveal delay={0.15}>
            <ImpactStat value={stats?.in_progress} label="In progress"       color="amber" loading={loading} />
          </Reveal>
          <Reveal delay={0.20}>
            <ImpactStat value={resolvedRate ?? 0}  label="Resolved rate" suffix="%" color="teal" loading={loading} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
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
      <Reveal>
        <h2 id="how-heading" className="how-section__title">How it works</h2>
      </Reveal>
      <div className="how-steps">
        {HOW_STEPS.map(({ icon: Icon, step, title, desc }, i) => (
          <Reveal key={step} delay={i * 0.08}>
            <div className="how-step">
              <div className="how-step__number" aria-hidden="true">{step}</div>
              <div className="how-step__icon" aria-hidden="true"><Icon size={22} /></div>
              <h3 className="how-step__title">{title}</h3>
              <p className="how-step__desc">{desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
export default function Home() {
  const { user }  = useAuth();
  const reduced   = useReducedMotion();

  // map/list mobile toggle
  const [mobileView, setMobileView] = useState('map');

  // filters
  const [category,    setCategory]    = useState('');
  const [status,      setStatus]      = useState('');
  const [sort,        setSort]        = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);

  // proximity
  const [mapCenter,  setMapCenter]  = useState(null);
  const [mapZoom,    setMapZoom]    = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,   setGeoError]   = useState('');

  // bidirectional highlight
  const [activeId, setActiveId] = useState(null);
  const listRef = useRef(null);

  // reports
  const [reports,   setReports]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError,   setListError]   = useState('');

  const applyFilter = (setter) => (v) => { setter(v); setPage(1); };
  const onCategory  = applyFilter(setCategory);
  const onStatus    = applyFilter(setStatus);
  const onSearch    = applyFilter(setSearchInput);

  const onSort = (v) => {
    setSort(v); setPage(1);
    if (v === 'distance' && !userCoords) requestGeoLocation();
  };

  const clearFilters = () => {
    setCategory(''); setStatus(''); setSort('newest'); setSearchInput('');
    setUserCoords(null); setPage(1);
  };

  const requestGeoLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoError('Geolocation is not supported.'); return; }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords); setMapCenter([coords.lat, coords.lng]);
        setMapZoom(13); setSort('distance'); setPage(1); setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED
          ? 'Location access denied. You can still search above.'
          : 'Could not get your location.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleGeocoderSelect = ({ lat, lng }) => {
    setMapCenter([lat, lng]); setMapZoom(13);
    setUserCoords({ lat, lng }); setSort('distance'); setPage(1);
  };

  useEffect(() => {
    let active = true;
    setListLoading(true); setListError('');
    listReports({
      category, status, search: debouncedSearch, sort, page, limit: LIMIT,
      ...(userCoords && { lat: userCoords.lat, lng: userCoords.lng, radius_km: DEFAULT_RADIUS }),
    })
      .then((data) => {
        if (!active) return;
        setReports(data.reports); setTotal(data.total); setTotalPages(data.totalPages || 1);
      })
      .catch((err) => { if (active) setListError(err.response?.data?.error || 'Could not load reports.'); })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [category, status, debouncedSearch, sort, page, userCoords]);

  const handleMarkerClick = useCallback((report) => {
    setActiveId((prev) => (prev === report.id ? null : report.id));
    setMobileView('list');
  }, []);

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  // Framer-motion variants for the hero entrance stagger.
  // The hero is "above the fold" so we use `initial` + `animate`, NOT `whileInView`.
  const heroVariants = {
    hidden:   { opacity: 0 },
    visible:  { opacity: 1, transition: { staggerChildren: reduced ? 0 : 0.14, delayChildren: reduced ? 0 : 0.1 } },
  };
  const heroItemVariants = {
    hidden:  { opacity: 0, y: reduced ? 0 : 28 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="hero2" aria-label="Welcome to FixMyTown">
        {/* ── Background photo with Ken Burns zoom ── */}
        <div className="hero2__bg" aria-hidden="true">
          {/* width/height set so the browser can reserve space and avoid CLS */}
          <img
            src="/images/hero.svg"
            alt=""
            className="hero2__photo"
            fetchpriority="high"
            decoding="async"
            width="1920"
            height="1080"
          />
          {/* Dark gradient overlay — ensures text contrast ≥ 4.5:1 on WCAG AA */}
          <div className="hero2__overlay" />
        </div>

        {/* ── Animated content ── */}
        <motion.div
          className="hero2__inner"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={heroItemVariants} className="hero2__badge">
            <span className="hero2__badge-dot" aria-hidden="true" />
            Community problem reporting
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={heroItemVariants} className="hero2__headline">
            See a problem in your town?{' '}
            <span className="hero2__headline--accent">
              Report&nbsp;it. Track&nbsp;it. Get&nbsp;it&nbsp;fixed.
            </span>
          </motion.h1>

          {/* Supporting sentence */}
          <motion.p variants={heroItemVariants} className="hero2__sub">
            Search for your area, drop a pin on the problem, and let the whole
            community track it to resolution — for free.
          </motion.p>

          {/* Trust chips */}
          <motion.ul variants={heroItemVariants} className="hero2__chips" aria-label="Key features">
            {TRUST_CHIPS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero2__chip">
                <Icon size={14} aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>

          {/* ── Search card (overlaps hero bottom) ── */}
          <motion.div variants={heroItemVariants} className="hero2__search-card" role="search">
            <GeocoderBox onSelect={handleGeocoderSelect} />

            <div className="hero2__search-row">
              <button
                type="button"
                className="btn btn--ghost hero2__locate-btn"
                onClick={requestGeoLocation}
                disabled={geoLoading}
                aria-label="Use my current GPS location"
              >
                {geoLoading
                  ? <Loader2 size={16} className="spin" aria-hidden="true" />
                  : <LocateFixed size={16} aria-hidden="true" />}
                {geoLoading ? 'Locating…' : 'Use my location'}
              </button>

              <button
                type="button"
                className="btn btn--primary hero2__search-btn"
                onClick={() => {
                  const el = document.getElementById('browse');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <Search size={16} aria-hidden="true" />
                Search reports
              </button>
            </div>

            {geoError && (
              <p className="hero2__geo-error" role="alert">{geoError}</p>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          IMPACT STRIP
      ══════════════════════════════════════════════════════════════ */}
      <ImpactStrip />

      <div className="container">
        {/* ── Split layout: filters+list LEFT, map RIGHT ── */}
        <section id="browse" className="civic-browse" aria-label="Browse reports">
          {/* Mobile toggle */}
          <div className="civic-browse__mobile-toggle" aria-label="Switch view" role="group">
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
                Map data ©{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                  OpenStreetMap
                </a>{' '}
                contributors
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
