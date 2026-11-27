/**
 * Home — redesign
 *
 * Structure inspired by the common civic-reporting pattern (search-first hero,
 * live counters, short numbered "how it works", who-it's-for blocks, public map):
 *   1. Hero            — headline + address search + illustrated app preview
 *   2. Live stats      — real numbers from /api/stats (overlaps the hero)
 *   3. Categories      — what can be reported, with live counts
 *   4. Browse / map    — split list + map (unchanged behaviour)
 *   5. How it works    — 4 numbered steps
 *   6. Who it's for    — residents / officials / everyone
 *   7. Trust section   — why public tracking matters
 *   8. CTA band
 *
 * All colors come from theme.css tokens; no photos are required (an optional
 * /images/hero.jpg and /images/community.jpg are used if present).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Search, LocateFixed, Loader2, List, X, Camera, Plus, PanelLeftClose,
  ThumbsUp, CheckCircle2, FileText, ShieldCheck, Users, Sparkles,
  Droplets, Zap, Construction, Trash2, ShieldAlert, CircleHelp,
  ArrowRight, MapPin, Landmark, Eye,
  Wrench, Percent,
} from 'lucide-react';

import ReportFilters from '../components/ReportFilters.jsx';
import ReportCard    from '../components/ReportCard.jsx';
import LazyReportMap from '../components/LazyReportMap.jsx';
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

import '../home.css';

const LIMIT          = 12;
const DEFAULT_RADIUS = 25; // km

const scrollToId = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

// ═══════════════════════════════════════════════════════════════════════════════
// HERO PREVIEW — an illustration of the product (decorative, no real data)
// ═══════════════════════════════════════════════════════════════════════════════
function HeroPreview() {
  return (
    <div className="hx-preview" aria-hidden="true">
      <div className="hx-phone">
        <div className="hx-phone__notch" />
        <div className="hx-phone__map">
          <svg viewBox="0 0 320 250" preserveAspectRatio="xMidYMid slice" className="hx-phone__svg">
            <rect width="320" height="250" fill="#e3eeed" />
            <path d="M-10 190 C 70 160, 120 215, 190 180 S 300 140, 340 165" fill="none" stroke="#b9dcec" strokeWidth="22" strokeLinecap="round" />
            {[[14,14,70,48],[96,14,60,48],[170,14,70,36],[254,14,60,60],[14,78,70,56],[96,78,60,44],[254,86,60,52],[14,150,56,30],[104,196,66,44],[190,206,56,34],[262,200,54,40]].map(([x,y,w,h],i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx="6" fill="#f4f8f7" />
            ))}
            <path d="M0 70 H320 M88 0 V250 M246 0 V250 M0 140 H320" stroke="#ffffff" strokeWidth="7" />
            <path d="M-10 40 L330 215" stroke="#ffffff" strokeWidth="9" />
          </svg>
          <span className="hx-pin hx-pin--a"><MapPin size={18} /></span>
          <span className="hx-pin hx-pin--b"><MapPin size={18} /></span>
          <span className="hx-pin hx-pin--c"><span className="hx-pin__ring" /><MapPin size={22} /></span>
        </div>
        <div className="hx-phone__sheet">
          <span className="hx-phone__chip"><Droplets size={13} /> Water</span>
          <strong className="hx-phone__title">Broken water point</strong>
          <span className="hx-phone__meta"><MapPin size={12} /> Pinned on map &nbsp;·&nbsp; <Camera size={12} /> Photo attached</span>
          <div className="hx-phone__track">
            <span className="is-done" /><span className="is-active" /><span />
          </div>
          <div className="hx-phone__labels"><span>Reported</span><span>In progress</span><span>Fixed</span></div>
        </div>
      </div>
      <div className="hx-float hx-float--a"><ThumbsUp size={16} /> Neighbours confirm it</div>
      <div className="hx-float hx-float--b"><CheckCircle2 size={16} /> Public status updates</div>
      <div className="hx-float hx-float--c"><Sparkles size={16} /> AI-assisted priority</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE STATS
// ═══════════════════════════════════════════════════════════════════════════════
function Stat({ icon: Icon, value, suffix = '', label, tone, loading }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const count  = useCountUp(value ?? 0, { started: inView && !loading, duration: 1400 });
  return (
    <div ref={ref} className="hx-stat">
      <span className={`hx-stat__icon hx-tone--${tone}`}><Icon size={20} aria-hidden="true" /></span>
      <div>
        <div className="hx-stat__value" aria-label={`${value ?? 0}${suffix} ${label}`}>
          {loading ? <span className="skeleton skeleton--stat-lg" aria-hidden="true" />
                   : <>{count.toLocaleString()}{suffix}</>}
        </div>
        <div className="hx-stat__label">{label}</div>
      </div>
    </div>
  );
}

function StatsStrip({ stats, loading }) {
  const rate = stats?.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  return (
    <section className="hx-stats-wrap" aria-label="Live community statistics">
      <div className="hx-container">
        <Reveal>
          <div className="hx-stats">
            <Stat icon={FileText}     value={stats?.total}       label="Reports submitted" tone="teal"  loading={loading} />
            <Stat icon={CheckCircle2} value={stats?.resolved}    label="Issues fixed"      tone="green" loading={loading} />
            <Stat icon={Wrench}       value={stats?.in_progress} label="Being worked on"   tone="blue"  loading={loading} />
            <Stat icon={Percent}      value={rate} suffix="%"    label="Fix rate"          tone="coral" loading={loading} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  { value: 'water',       label: 'Water',       icon: Droplets,     tone: 'blue',   desc: 'Broken taps, leaking pipes, dry water points' },
  { value: 'electricity', label: 'Electricity', icon: Zap,          tone: 'amber',  desc: 'Power cuts, fallen lines, broken street lights' },
  { value: 'roads',       label: 'Roads',       icon: Construction, tone: 'slate',  desc: 'Potholes, damaged roads, blocked drains' },
  { value: 'garbage',     label: 'Garbage',     icon: Trash2,       tone: 'green',  desc: 'Overflowing bins, illegal dumping, litter' },
  { value: 'safety',      label: 'Safety',      icon: ShieldAlert,  tone: 'red',    desc: 'Unsafe spots, missing signs, open manholes' },
  { value: 'other',       label: 'Other',       icon: CircleHelp,   tone: 'violet', desc: 'Anything else that affects your neighbourhood' },
];

function Categories({ stats, onPick }) {
  return (
    <section className="hx-section" aria-labelledby="hx-cat-title">
      <div className="hx-container">
        <Reveal>
          <header className="hx-head">
            <span className="hx-eyebrow">What can you report?</span>
            <h2 id="hx-cat-title" className="hx-title">Every problem, in the right place</h2>
            <p className="hx-lead">Pick a category to see what has already been reported near you.</p>
          </header>
        </Reveal>
        <div className="hx-cats">
          {CATEGORIES.map(({ value, label, icon: Icon, tone, desc }, i) => {
            const n = stats?.by_category?.[value];
            return (
              <Reveal key={value} delay={i * 0.05}>
                <button type="button" className="hx-cat" onClick={() => onPick(value)}
                        aria-label={`${label}: ${n ?? 0} reports. Show them.`}>
                  <span className={`hx-cat__icon hx-tone--${tone}`}><Icon size={24} aria-hidden="true" /></span>
                  <span className="hx-cat__body">
                    <span className="hx-cat__name">{label}</span>
                    <span className="hx-cat__desc">{desc}</span>
                  </span>
                  <span className="hx-cat__count">{n ?? 0}</span>
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
// HOW IT WORKS — 4 numbered steps
// ═══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { icon: MapPin,        title: 'Pin the location',   text: 'Search an address or tap the map to mark exactly where the problem is.' },
  { icon: Camera,        title: 'Add a photo',        text: 'Describe the issue and attach a photo so everyone can see what you see.' },
  { icon: ThumbsUp,      title: 'Neighbours confirm', text: 'Residents upvote reports they share, so the biggest problems rise to the top.' },
  { icon: CheckCircle2,  title: 'Track it to fixed',  text: 'Every status change is public and dated, from reported to resolved.' },
];

function HowItWorks() {
  return (
    <section id="how" className="hx-section hx-section--alt" aria-labelledby="hx-how-title">
      <div className="hx-container">
        <Reveal>
          <header className="hx-head">
            <span className="hx-eyebrow">How it works</span>
            <h2 id="hx-how-title" className="hx-title">Report a problem in under a minute</h2>
            <p className="hx-lead">Four simple steps, completely transparent from start to finish.</p>
          </header>
        </Reveal>
        <ol className="hx-steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="hx-step">
              <span className="hx-step__num" aria-hidden="true">{i + 1}</span>
              <span className="hx-step__icon"><Icon size={26} aria-hidden="true" /></span>
              <h3 className="hx-step__title">{title}</h3>
              <p className="hx-step__text">{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHO IT'S FOR
// ═══════════════════════════════════════════════════════════════════════════════
const AUDIENCE = [
  { icon: Users,    title: 'For residents',            text: 'Report problems, back the ones you share, and follow every update without phone calls or letters.', to: '/reports/new', cta: 'Report an issue' },
  { icon: Landmark, title: 'For officials & volunteers', text: 'A dashboard with charts, filters and status tools to prioritise work and show progress.',        to: '/login',       cta: 'Admin login' },
  { icon: Eye,      title: 'For everyone',             text: 'All reports and their history are public, so the whole community can see what is fixed.',          to: '#browse',      cta: 'Browse the map' },
];

function Audience() {
  return (
    <section className="hx-section" aria-labelledby="hx-aud-title">
      <div className="hx-container">
        <Reveal>
          <header className="hx-head">
            <span className="hx-eyebrow">Built for the whole community</span>
            <h2 id="hx-aud-title" className="hx-title">One platform, three ways to help</h2>
          </header>
        </Reveal>
        <div className="hx-aud">
          {AUDIENCE.map(({ icon: Icon, title, text, to, cta }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <article className="hx-aud__card">
                <span className="hx-aud__icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {to.startsWith('#')
                  ? <button type="button" className="hx-link" onClick={() => scrollToId(to.slice(1))}>{cta} <ArrowRight size={15} aria-hidden="true" /></button>
                  : <Link to={to} className="hx-link">{cta} <ArrowRight size={15} aria-hidden="true" /></Link>}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

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
              src="https://images.unsplash.com/photo-1518389902083-b8d6104fc7c9?w=960&h=640&fit=crop&q=80"
              alt="Residential street in the evening with lit houses and community members visible"
              className="community-split__image"
              loading="lazy"
              width="960"
              height="640"
              onError={(e) => {
                e.currentTarget.classList.add('community-split__image--error');
                e.currentTarget.closest('.community-split__image-wrap')?.classList.add('community-split__image-wrap--error');
              }}
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
                <Link to="/reports/new" className="btn btn--primary btn--icon">
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
            <Link to="/reports/new" className="btn btn--white btn--lg btn--icon">
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
  const [panelOpen, setPanelOpen] = useState(true);

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
    setPanelOpen(true);
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

  const heroVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: reduced ? 0 : 0.1, delayChildren: reduced ? 0 : 0.05 } },
  };
  const heroItem = {
    hidden:  { opacity: 0, y: reduced ? 0 : 22 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <>
      {/* ══════ 1. HERO ══════ */}
      <section className="hx-hero" aria-label="Welcome to FixMyTown">
        <div className="hx-hero__bg" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1449429473617-4372f478504a?w=1200&h=800&fit=crop&q=80" alt="" className="hx-hero__photo" fetchpriority="high" decoding="async"
               onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="hx-hero__grid" />
        </div>

        <div className="hx-container hx-hero__inner">
          <motion.div className="hx-hero__copy" variants={heroVariants} initial="hidden" animate="visible">
            <motion.span variants={heroItem} className="hx-badge">
              <span className="hx-badge__dot" aria-hidden="true" /> Community problem reporting
            </motion.span>

            <motion.h1 variants={heroItem} className="hx-h1">
              See a problem in your town?
              <span className="hx-h1__accent"> Report it. Track it. Get it fixed.</span>
            </motion.h1>

            <motion.p variants={heroItem} className="hx-sub">
              Pin it on the map, add a photo, and let your neighbours confirm it.
              Every update is public, from reported to fixed.
            </motion.p>

            <motion.form variants={heroItem} className="hx-search" role="search"
                         onSubmit={(e) => { e.preventDefault(); scrollToId('browse'); }}>
              <div className="hx-search__row">
                <GeocoderBox onSelect={handleGeocoderSelect} />
                <button type="submit" className="hx-search__btn">
                  <Search size={18} aria-hidden="true" /> <span>Find reports</span>
                </button>
              </div>
              <div className="hx-search__links">
                <button type="button" className="hx-search__link" onClick={requestGeoLocation} disabled={geoLoading}>
                  {geoLoading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
                  {geoLoading ? 'Locating…' : 'Use my current location'}
                </button>
                <Link to="/reports/new" className="hx-search__link hx-search__link--strong">
                  <Camera size={15} aria-hidden="true" /> Report a problem with a photo
                </Link>
              </div>
              {geoError && <p className="hx-search__error" role="alert">{geoError}</p>}
            </motion.form>

            <motion.ul variants={heroItem} className="hx-chips" aria-label="Key features">
              <li><ShieldCheck size={15} aria-hidden="true" /> Free to use</li>
              <li><Users size={15} aria-hidden="true" /> Public and transparent</li>
              <li><Sparkles size={15} aria-hidden="true" /> AI-assisted triage</li>
            </motion.ul>
          </motion.div>

          <HeroPreview />
        </div>
      </section>

      {/* ══════ 2. LIVE STATS ══════ */}
      <StatsStrip stats={globalStats} loading={statsLoading} />

      {/* ══════ 3. CATEGORIES ══════ */}
      <Categories stats={globalStats} onPick={handleCategoryClick} />

      {/* ══════ 4. LIVE MAP — full-size map with floating panels ══════ */}
      <section id="browse" className="hx-browse" aria-label="Browse reports on the map">
        <div className="hx-container hx-browse-head">
          <Reveal>
            <header className="hx-head hx-head--left">
              <span className="hx-eyebrow">Live map</span>
              <h2 className="hx-title">{userCoords ? 'Reports near you' : 'See what is happening in your town'}</h2>
              <p className="hx-lead">Search, filter and open any report. Click a pin to see its photo and status.</p>
            </header>
          </Reveal>
        </div>

        <div className="hx-container">
          <div className={`hx-map${panelOpen ? '' : ' is-collapsed'}`}>
            <div className="hx-map__canvas">
              <LazyReportMap
                reports={reports} loading={listLoading} error={listError}
                center={mapCenter} zoom={mapZoom}
                activeId={activeId} onMarkerClick={handleMarkerClick}
              />

              <ul className="hx-legend" aria-label="Map legend">
                <li><span className="hx-dot hx-dot--reported" /> Reported</li>
                <li><span className="hx-dot hx-dot--progress" /> In progress</li>
                <li><span className="hx-dot hx-dot--resolved" /> Fixed</li>
              </ul>

              <Link to="/reports/new" className="hx-map__report">
                <Plus size={18} aria-hidden="true" /> Report a problem
              </Link>
            </div>

            {!panelOpen && (
              <button type="button" className="hx-panel-open" onClick={() => setPanelOpen(true)}>
                <List size={16} aria-hidden="true" /> Show list ({total})
              </button>
            )}

            <aside className="hx-panel" aria-label="Report list" aria-hidden={!panelOpen}>
              <div className="hx-panel__head">
                <div>
                  <h3 className="hx-panel__title">{userCoords ? 'Reports near you' : 'Community reports'}</h3>
                  {!listLoading && <span className="hx-panel__count">{total} report{total !== 1 ? 's' : ''}</span>}
                </div>
                <button type="button" className="hx-icon-btn" onClick={() => setPanelOpen(false)}
                        aria-label="Hide report list" tabIndex={panelOpen ? 0 : -1}>
                  <PanelLeftClose size={18} aria-hidden="true" />
                </button>
              </div>

              <ReportFilters
                category={category} status={status} sort={sort} searchInput={searchInput}
                onCategory={onCategory} onStatus={onStatus} onSort={onSort}
                onSearch={onSearch} onClear={clearFilters}
                showDistanceSort={true}
              />

              <div className="hx-panel__list" ref={listRef}>
                {listLoading ? (
                  <Skeleton count={3} compact />
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
                <div className="hx-panel__foot">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* ══════ 5. HOW IT WORKS ══════ */}
      <HowItWorks />

      {/* ══════ 6. WHO IT'S FOR ══════ */}
      <Audience />

      {/* ══════ 7. TRUST ══════ */}
      <CommunitySection />

      {/* ══════ 8. CTA ══════ */}
      <CtaBand />
    </>
  );
}
