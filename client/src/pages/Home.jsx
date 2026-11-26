/**
 * Home — UI-E3
 *
 * Page order (top → bottom):
 *   1.  Hero               — photo + dark overlay + search card  (UI-E2, unchanged)
 *   2.  Impact strip       — live API stats with count-up        (UI-E2, unchanged)
 *   3.  Category grid      — photo tiles + live counts
 *   4.  Browse / map       — split list + map                    (UI-B-Revised, unchanged)
 *   5.  How it works       — 3 steps + animated connecting line
 *   6.  Community / trust  — split photo + honest copy
 *   7.  CTA band           — gradient band + two buttons
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Search, LocateFixed, Loader2, List, Map as MapIcon,
  X, Camera, ThumbsUp, CheckCircle2,
  FileText, AlertTriangle, Percent,
  ShieldCheck, Users, Sparkles,
  Droplets, Zap, Construction, Trash2, ShieldAlert, CircleHelp,
  ArrowRight,
} from 'lucide-react';

import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard    from '../components/ReportCard.jsx';
import ReportMap     from '../components/ReportMap.jsx';
import Pagination    from '../components/Pagination.jsx';
import Skeleton      from '../components/Skeleton.jsx';
import Reveal        from '../components/Reveal.jsx';

import { listReports }      from '../api/reports.js';
import { getPublicStats }   from '../api/stats.js';
import { useDebounce }      from '../hooks/useDebounce.js';
import { useNominatim }     from '../hooks/useNominatim.js';
import { useCountUp }       from '../hooks/useCountUp.js';
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
    setChosen(true); setFocused(false);
    onSelect({ lat: item.lat, lng: item.lng });
  };
  const clear = () => { setInput(''); setChosen(false); };
  const showDropdown = focused && !chosen && results.length > 0;

  return (
    <div className="geocoder geocoder--hero" ref={wrapRef}>
      <div className="geocoder__input-wrap">
        <Search size={17} className="geocoder__icon" aria-hidden="true" />
        <input
          type="search" className="geocoder__input"
          placeholder="Search an address or area…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setChosen(false); }}
          onFocus={() => setFocused(true)}
          aria-label="Search an address or area to find nearby reports"
          aria-autocomplete="list" aria-expanded={showDropdown}
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
          <>{count.toLocaleString()}{suffix && <span className="impact-stat__suffix">{suffix}</span>}</>
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
          <h2 id="impact-heading" className="impact-strip__title">Real problems. Real fixes.</h2>
        </Reveal>
        <div className="impact-grid">
          <Reveal delay={0.05}><ImpactStat value={stats?.total}       label="Reports submitted" color="blue"  loading={loading} /></Reveal>
          <Reveal delay={0.10}><ImpactStat value={stats?.resolved}    label="Issues resolved"   color="green" loading={loading} /></Reveal>
          <Reveal delay={0.15}><ImpactStat value={stats?.in_progress} label="In progress"       color="amber" loading={loading} /></Reveal>
          <Reveal delay={0.20}><ImpactStat value={resolvedRate ?? 0}  label="Resolved rate" suffix="%" color="teal" loading={loading} /></Reveal>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES GRID
// Each tile has a photo, dark overlay, icon, label, and the real live count.
// Clicking applies the category filter and scrolls to #browse.
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORY_TILES = [
  {
    value: 'water',
    label: 'Water',
    icon: Droplets,
    // Use .jpg when available; keep .svg as the placeholder fallback.
    img: '/images/water.jpg',
    alt: 'A communal water tap on a town street',
    color: '#2563eb',
  },
  {
    value: 'roads',
    label: 'Roads',
    icon: Construction,
    img: '/images/roads.jpg',
    alt: 'A road with surface damage and potholes',
    color: '#64748b',
  },
  {
    value: 'garbage',
    label: 'Garbage',
    icon: Trash2,
    img: '/images/garbage.jpg',
    alt: 'Overflowing rubbish bins on a street corner',
    color: '#16a34a',
  },
  {
    value: 'electricity',
    label: 'Electricity',
    icon: Zap,
    img: '/images/electricity.jpg',
    alt: 'Power poles and electricity lines in a residential neighbourhood',
    color: '#d97706',
  },
  {
    value: 'safety',
    label: 'Safety',
    icon: ShieldAlert,
    img: null,
    color: '#dc2626',
  },
  {
    value: 'other',
    label: 'Other',
    icon: CircleHelp,
    img: null,
    color: '#7c3aed',
  },
];

function CategoryGrid({ stats, statsLoading, onCategoryClick }) {
  return (
    <section className="section-spacing" aria-labelledby="categories-heading">
      <div className="container">
        <Reveal>
          <div className="section-header">
            <h2 id="categories-heading" className="section-title">Browse by category</h2>
            <p className="section-sub">
              Every report is tagged so issues reach the right team faster.
            </p>
          </div>
        </Reveal>

        <div className="cat-grid" role="list">
          {CATEGORY_TILES.map(({ value, label, icon: Icon, img, alt, color }, i) => {
            const count = stats?.by_category?.[value];
            return (
              <Reveal key={value} delay={i * 0.06}>
                <button
                  type="button"
                  className={`cat-tile${!img ? ' cat-tile--icon-only' : ''}`}
                  style={!img ? { '--cat-color': color } : undefined}
                  onClick={() => onCategoryClick(value)}
                  aria-label={`${label} — ${count ?? '…'} report${count !== 1 ? 's' : ''}. Click to filter.`}
                  role="listitem"
                >
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={alt}
                        className="cat-tile__photo"
                        loading="lazy"
                        width="400"
                        height="270"
                      />
                      <div className="cat-tile__overlay" />
                    </>
                  ) : (
                    <div className="cat-tile__bg" aria-hidden="true" />
                  )}
                  <div className="cat-tile__content">
                    <span className="cat-tile__icon" aria-hidden="true">
                      <Icon size={img ? 26 : 32} />
                    </span>
                    <span className="cat-tile__label">{label}</span>
                    <span className="cat-tile__count" aria-hidden="true">
                      {statsLoading
                        ? <span className="skeleton skeleton--count" />
                        : count ?? '—'}
                    </span>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS (#how)
// 3 steps connected by a line that draws itself as the section scrolls in.
// ═══════════════════════════════════════════════════════════════════════════════
const HOW_STEPS = [
  {
    step: '01',
    icon: Camera,
    title: 'Spot it, report it',
    desc: 'Drop a pin on the map, add a photo and describe the problem. The whole process takes under 60 seconds on any phone.',
  },
  {
    step: '02',
    icon: ThumbsUp,
    title: 'The community weighs in',
    desc: 'Neighbours upvote the issues they share. High vote counts signal urgency so the most critical problems get attention first.',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Track it to resolution',
    desc: 'Admins update the status as work progresses — in progress, then resolved. Every change is timestamped and public.',
  },
];

function HowItWorks() {
  const lineRef    = useRef(null);
  const sectionRef = useRef(null);
  const inView     = useInView(sectionRef, { once: true, margin: '-100px' });
  const reduced    = useReducedMotion();

  return (
    <section
      id="how"
      className="section-spacing how-section-v2"
      aria-labelledby="how-heading"
      ref={sectionRef}
    >
      <div className="container">
        <Reveal>
          <div className="section-header">
            <h2 id="how-heading" className="section-title">How it works</h2>
            <p className="section-sub">Three simple steps, completely transparent at every stage.</p>
          </div>
        </Reveal>

        <div className="how-v2__steps">
          {/* The connecting line lives here as a sibling of the step cards,
              spanning the full width. We animate its scaleX from 0 → 1. */}
          <div className="how-v2__line-track" aria-hidden="true">
            <motion.div
              className="how-v2__line-fill"
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{
                duration: reduced ? 0 : 1.1,
                delay:    reduced ? 0 : 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{ transformOrigin: 'left center' }}
            />
          </div>

          {HOW_STEPS.map(({ step, icon: Icon, title, desc }, i) => (
            <Reveal key={step} delay={i * 0.12}>
              <div className="how-v2__step">
                <div className="how-v2__bubble" aria-hidden="true">
                  <span className="how-v2__step-num">{step}</span>
                  <div className="how-v2__icon-wrap">
                    <Icon size={24} />
                  </div>
                </div>
                <h3 className="how-v2__title">{title}</h3>
                <p className="how-v2__desc">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY / TRUST  (#impact)
// Split layout: photo left, honest text right. No invented stats or testimonials.
// ═══════════════════════════════════════════════════════════════════════════════
function CommunitySection() {
  return (
    <section
      id="community"
      className="section-spacing community-section"
      aria-labelledby="community-heading"
    >
      <div className="container">
        <div className="community-split">
          {/* Photo */}
          <Reveal className="community-split__image-wrap">
              <img
              src="/images/community.jpg"
              alt="Residential street in the evening with lit houses and community members visible"
              className="community-split__image"
              loading="lazy"
              width="960"
              height="640"
            />
          </Reveal>

          {/* Text */}
          <div className="community-split__text">
            <Reveal>
              <span className="community-eyebrow">Why transparency matters</span>
              <h2 id="community-heading" className="section-title">
                Public tracking builds public trust
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="community-body">
                When a pothole gets reported, every resident can see it on the map. When an admin
                changes the status to "in progress", that change is timestamped and visible to
                everyone — not buried in a helpdesk ticket.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="community-body">
                Upvotes tell decision-makers which problems affect the most people, without anyone
                needing to make a phone call or write a letter. The data is public, the history is
                permanent, and anyone can see exactly what has — and hasn't — been fixed.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="community-actions">
                <Link to="/register" className="btn btn--primary btn--icon">
                  Report an issue
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/login" className="btn btn--ghost">
                  Already a member? Log in
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA BAND
// ═══════════════════════════════════════════════════════════════════════════════
function CtaBand() {
  return (
    <section className="cta-band" aria-labelledby="cta-heading">
      <div className="container cta-band__inner">
        <Reveal>
          <h2 id="cta-heading" className="cta-band__title">
            Help fix your town today
          </h2>
          <p className="cta-band__sub">
            Reporting takes 60 seconds. Every report makes the data more useful for everyone.
          </p>
          <div className="cta-band__actions">
            <Link to="/register" className="btn btn--white btn--lg btn--icon">
              Report an issue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="btn btn--white-ghost btn--lg"
              onClick={() => {
                document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Browse the map
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { user }  = useAuth();
  const reduced   = useReducedMotion();

  // map/list mobile toggle
  const [mobileView, setMobileView] = useState('map');

  // filters — shared across browse section and category grid
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
  const [reports,    setReports]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError,   setListError]   = useState('');

  // global stats (shared between ImpactStrip and CategoryGrid)
  const [globalStats,   setGlobalStats]   = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);

  useEffect(() => {
    getPublicStats()
      .then(setGlobalStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

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

  // Category tile click: set filter and scroll to #browse
  const handleCategoryClick = (cat) => {
    setCategory(cat); setPage(1);
    document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Hero entrance variants
  const heroVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: reduced ? 0 : 0.14, delayChildren: reduced ? 0 : 0.1 } },
  };
  const heroItemVariants = {
    hidden:  { opacity: 0, y: reduced ? 0 : 28 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <>
      {/* ══════ 1. HERO ══════ */}
      <section className="hero2" aria-label="Welcome to FixMyTown">
        <div className="hero2__bg" aria-hidden="true">
          <img
            src="/images/hero.jpg"
            alt=""
            className="hero2__photo"
            fetchpriority="high"
            decoding="async"
            width="1920"
            height="1080"
          />
          <div className="hero2__overlay" />
        </div>

        <motion.div className="hero2__inner" variants={heroVariants} initial="hidden" animate="visible">
          <motion.div variants={heroItemVariants} className="hero2__badge">
            <span className="hero2__badge-dot" aria-hidden="true" />
            Community problem reporting
          </motion.div>

          <motion.h1 variants={heroItemVariants} className="hero2__headline">
            See a problem in your town?{' '}
            <span className="hero2__headline--accent">
              Report&nbsp;it. Track&nbsp;it. Get&nbsp;it&nbsp;fixed.
            </span>
          </motion.h1>

          <motion.p variants={heroItemVariants} className="hero2__sub">
            Search for your area, drop a pin on the problem, and let the whole
            community track it to resolution — for free.
          </motion.p>

          <motion.ul variants={heroItemVariants} className="hero2__chips" aria-label="Key features">
            {TRUST_CHIPS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero2__chip">
                <Icon size={14} aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>

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
                onClick={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <Search size={16} aria-hidden="true" />
                Search reports
              </button>
            </div>
            {geoError && <p className="hero2__geo-error" role="alert">{geoError}</p>}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════ 2. IMPACT STRIP ══════ */}
      <ImpactStrip />

      {/* ══════ 3. CATEGORY GRID ══════ */}
      <CategoryGrid
        stats={globalStats}
        statsLoading={statsLoading}
        onCategoryClick={handleCategoryClick}
      />

      {/* ══════ 4. BROWSE / MAP ══════ */}
      <div className="container">
        <section id="browse" className="civic-browse section-spacing" aria-label="Browse reports">
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
                reports={reports} loading={listLoading} error={listError}
                center={mapCenter} zoom={mapZoom}
                activeId={activeId} onMarkerClick={handleMarkerClick}
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
      </div>

      {/* ══════ 5. HOW IT WORKS ══════ */}
      <HowItWorks />

      {/* ══════ 6. COMMUNITY / TRUST ══════ */}
      <CommunitySection />

      {/* ══════ 7. CTA BAND ══════ */}
      <CtaBand />
    </>
  );
}
