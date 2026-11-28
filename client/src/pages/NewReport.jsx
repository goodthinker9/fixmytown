/**
 * New Report — guided 3-step wizard.
 *
 * Step 1  "Where is it?"   — address geocoder + click-to-pin map + GPS
 * Step 2  "What is it?"    — category icon grid + title + description (char counter)
 * Step 3  "Photo & Send"   — image drop-zone + read-only summary + submit
 *
 * After submit:
 *   • Success  → success screen with link to the new report
 *   • Duplicate detected → conflict screen with two choices
 *   • Error    → inline error, stay on step 3
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, useMap, useMapEvents,
} from 'react-leaflet';
import {
  LocateFixed, Loader2, Upload, X, AlertCircle,
  Search, ChevronRight, ChevronLeft, CheckCircle2,
  ArrowRight, ThumbsUp, MapPin,
} from 'lucide-react';
import '../utils/leafletIcons.js';
import '../wizard.css';
import { CATEGORY_ICONS } from '../utils/categoryIcons.jsx';
import { useNominatim } from '../hooks/useNominatim.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { createReport, toggleUpvote } from '../api/reports.js';

// ── constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'water',       label: 'Water',       desc: 'Leaks, outages, contamination' },
  { value: 'electricity', label: 'Electricity', desc: 'Power cuts, broken lights' },
  { value: 'roads',       label: 'Roads',       desc: 'Potholes, damaged surfaces' },
  { value: 'garbage',     label: 'Garbage',     desc: 'Illegal dumping, overflowing bins' },
  { value: 'safety',      label: 'Safety',      desc: 'Hazards affecting residents' },
  { value: 'other',       label: 'Other',       desc: 'Anything else affecting the town' },
];

const CATEGORY_COLORS = {
  water:       { bg: '#dbeafe', fg: '#1d4ed8', hover: '#bfdbfe' },
  electricity: { bg: '#fef9c3', fg: '#b45309', hover: '#fde68a' },
  roads:       { bg: '#f1f5f9', fg: '#475569', hover: '#e2e8f0' },
  garbage:     { bg: '#dcfce7', fg: '#15803d', hover: '#bbf7d0' },
  safety:      { bg: '#fee2e2', fg: '#b91c1c', hover: '#fecaca' },
  other:       { bg: '#ede9fe', fg: '#6d28d9', hover: '#ddd6fe' },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE      = 5 * 1024 * 1024;
const STEPS         = ['Where', 'What', 'Send'];
const DESC_MAX      = 500;

// Where the map opens before the user picks a spot. Set VITE_DEFAULT_LAT and
// VITE_DEFAULT_LNG in Vercel to change it; otherwise it opens on the demo town.
const DEFAULT_CENTER = [
  parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 11.0512,
  parseFloat(import.meta.env.VITE_DEFAULT_LNG) || 39.7478,
];

// ── tiny sub-components ─────────────────────────────────────────────────────

function ProgressBar({ step }) {
  return (
    <nav className="wizard-progress" aria-label="Report submission progress">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'pending';
        return (
          <div key={label} className={`wizard-progress__step wizard-progress__step--${state}`}>
            <div className="wizard-progress__bubble" aria-hidden="true">
              {state === 'done' ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className="wizard-progress__label">{label}</span>
            {i < STEPS.length - 1 && (
              <div className="wizard-progress__line" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Step-1 inline geocoder (not the full GeocoderBox from Home — simpler here).
function AddressSearch({ onSelect }) {
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

  const showDrop = focused && !chosen && results.length > 0;

  return (
    <div className="geocoder" ref={wrapRef} style={{ marginBottom: 'var(--space-3)' }}>
      <div className="geocoder__input-wrap">
        <Search size={15} className="geocoder__icon" aria-hidden="true" />
        <input
          type="search"
          className="geocoder__input"
          placeholder="Search an address or area…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setChosen(false); }}
          onFocus={() => setFocused(true)}
          aria-label="Search an address to center the map"
          aria-autocomplete="list"
          aria-expanded={showDrop}
        />
        {loading  && <Loader2 size={14} className="geocoder__spinner spin" aria-label="Searching…" />}
        {input && !loading && (
          <button type="button" className="geocoder__clear" onClick={clear} aria-label="Clear address">
            <X size={13} />
          </button>
        )}
      </div>
      {showDrop && (
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

// Reusable Leaflet helpers — same as LocationMap but inlined so we can pass
// extra props to MapContainer here.
function ClickHandler({ onClick }) {
  useMapEvents({ click(e) { onClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}
function FlyController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [center, map]);
  return null;
}

// Thumbnail strip for the report summary on step 3.
function SummaryCard({ position, category, title, description, imagePreview }) {
  const col = category ? CATEGORY_COLORS[category] : { bg: '#f1f5f9', fg: '#475569' };
  const Icon = category ? CATEGORY_ICONS[category] : null;
  return (
    <div className="wizard-summary">
      <div className="wizard-summary__image" style={{ background: imagePreview ? undefined : col.bg }}>
        {imagePreview
          ? <img src={imagePreview} alt="Your photo" />
          : Icon && <Icon size={32} style={{ color: col.fg }} aria-hidden="true" />}
      </div>
      <div className="wizard-summary__body">
        <div className="wizard-summary__cat" style={{ color: col.fg, background: col.bg }}>
          {category || 'No category'}
        </div>
        <div className="wizard-summary__title">{title || <em>No title yet</em>}</div>
        {description && (
          <div className="wizard-summary__desc">{description.slice(0, 80)}{description.length > 80 ? '…' : ''}</div>
        )}
        {position && (
          <div className="wizard-summary__loc">
            <MapPin size={12} aria-hidden="true" />
            {position[0].toFixed(4)}, {position[1].toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function NewReport() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);

  // wizard state
  const [step, setStep] = useState(0); // 0 | 1 | 2

  // step 1 — location
  const [position, setPosition] = useState(null);   // [lat, lng]
  const [flyTo,    setFlyTo]    = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,   setGeoError]   = useState('');

  // step 2 — what
  const [category,    setCategory]    = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');

  // step 3 — photo
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);

  // per-step validation errors
  const [stepErrors, setStepErrors] = useState({});

  // submission
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // terminal screens
  const [successId,       setSuccessId]       = useState(null);  // report id after submit
  const [duplicateState,  setDuplicateState]  = useState(null);  // { duplicateId, duplicate }
  const [upvoting,        setUpvoting]        = useState(false);
  const [upvoteError,     setUpvoteError]     = useState('');

  // ── validation ────────────────────────────────────────────────────────────
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!position) e.location = 'Set a location by tapping the map or using GPS.';
    }
    if (s === 1) {
      if (!category)                      e.category    = 'Choose a category.';
      if (title.trim().length < 5)        e.title       = 'Title must be at least 5 characters.';
      if (description.trim().length < 10) e.description = 'Description must be at least 10 characters.';
    }
    setStepErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    if (!validateStep(step)) return;
    setStepErrors({});
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setStepErrors({});
    setStep((s) => s - 1);
  };

  // ── geolocation ───────────────────────────────────────────────────────────
  const handleGeolocate = useCallback(() => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        setFlyTo(coords);
        setStepErrors((p) => ({ ...p, location: undefined }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Tap the map to set a pin.'
            : 'Could not detect your location. Tap the map to set a pin.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── image ─────────────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setStepErrors((p) => ({ ...p, image: 'Image must be JPEG, PNG, or WEBP.' }));
      return;
    }
    if (file.size > MAX_SIZE) {
      setStepErrors((p) => ({ ...p, image: 'Image must be 5 MB or smaller.' }));
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStepErrors((p) => ({ ...p, image: undefined }));
  }, [imagePreview]);

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setServerError('');
    setSubmitting(true);
    try {
      if (!imageFile) {
        setStepErrors((p) => ({ ...p, image: 'A photo is required.' }));
        return;
      }
      const fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('category',    category);
      fd.append('description', description.trim());
      fd.append('latitude',    String(position[0]));
      fd.append('longitude',   String(position[1]));
      fd.append('image', imageFile);

      const data = await createReport(fd);

      if (data.duplicate_of) {
        setDuplicateState({ duplicateId: data.duplicate_of, myId: data.report.id });
        return;
      }

      setSuccessId(data.report.id);
    } catch (err) {
      const d = err.response?.data;
      // 409 duplicate: show the conflict screen instead of a generic error.
      if (err.response?.status === 409 && d?.duplicate_of) {
        setDuplicateState({
          duplicateId: d.duplicate_of,
          duplicate: d.duplicate || null,
        });
        return;
      }
      setServerError(d?.error || 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Re-submit the current report with force=true to bypass duplicate check.
  const handleForceSubmit = async () => {
    if (!imageFile) return;
    setServerError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('category', category);
      fd.append('description', description.trim());
      fd.append('latitude', String(position[0]));
      fd.append('longitude', String(position[1]));
      fd.append('image', imageFile);
      fd.append('force', 'true');

      const data = await createReport(fd);
      setSuccessId(data.report.id);
    } catch (err) {
      const d = err.response?.data;
      setServerError(d?.error || 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // duplicate: upvote the existing one (saves nothing)
  const handleUpvoteExisting = async () => {
    if (!duplicateState) return;
    setUpvoting(true);
    setUpvoteError('');
    try {
      await toggleUpvote(duplicateState.duplicateId);
      navigate(`/reports/${duplicateState.duplicateId}`, {
        state: { flash: 'Thanks for confirming! You\'ve upvoted this report.' },
      });
    } catch {
      setUpvoteError('Could not upvote. Please try from the report page.');
      setUpvoting(false);
    }
  };

  // duplicate: keep own report — re-submit with force=true
  const handleKeepMine = () => {
    if (!duplicateState) return;
    handleForceSubmit();
  };

  // ── terminal screens ──────────────────────────────────────────────────────
  if (successId) {
    return (
      <div className="wizard-terminal" role="main">
        <div className="wizard-terminal__card">
          <div className="wizard-terminal__icon wizard-terminal__icon--success" aria-hidden="true">
            <CheckCircle2 size={56} strokeWidth={1.5} />
          </div>
          <h1 className="wizard-terminal__title">Report submitted!</h1>
          <p className="wizard-terminal__desc">
            Your report is live. The community can now see it, upvote it,
            and admins will track it to resolution.
          </p>
          <div className="wizard-terminal__actions">
            <Link to={`/reports/${successId}`} className="btn btn--primary btn--lg btn--icon">
              View your report <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/" className="btn btn--ghost">Back to map</Link>
          </div>
        </div>
      </div>
    );
  }

  if (duplicateState) {
    return (
      <div className="wizard-terminal" role="main">
        <div className="wizard-terminal__card wizard-terminal__card--warn">
          <div className="wizard-terminal__icon wizard-terminal__icon--warn" aria-hidden="true">
            <AlertCircle size={48} strokeWidth={1.5} />
          </div>
          <h1 className="wizard-terminal__title">A similar report already exists nearby</h1>
          <p className="wizard-terminal__desc">
            Our AI detected an existing report that may describe the same issue.
            Would you like to support it, or keep your separate report?
          </p>
          {upvoteError && (
            <div className="alert alert--error" style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={14} aria-hidden="true" /> {upvoteError}
            </div>
          )}
          <div className="wizard-terminal__dup-actions">
            <button
              type="button"
              className="btn btn--primary btn--icon"
              onClick={handleUpvoteExisting}
              disabled={upvoting}
            >
              {upvoting
                ? <Loader2 size={15} className="spin" aria-hidden="true" />
                : <ThumbsUp size={15} aria-hidden="true" />}
              Yes, upvote the existing report
            </button>
            <Link
              to={`/reports/${duplicateState.duplicateId}`}
              className="btn btn--ghost"
              target="_blank"
              rel="noreferrer"
            >
              View existing report
            </Link>
            <button type="button" className="btn btn--ghost" onClick={handleKeepMine}>
              No, this is a different issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── step views ────────────────────────────────────────────────────────────
  return (
    <div className="wizard-page" aria-label="Report a problem">
      <ProgressBar step={step} />

      {/* ───── STEP 0: WHERE ───── */}
      {step === 0 && (
        <div className="wizard-step" aria-labelledby="step0-heading">
          <h1 id="step0-heading" className="wizard-step__title">Where is the problem?</h1>
          <p className="wizard-step__sub">
            Search for an address, tap the map to drop a pin, or use GPS.
          </p>

          <AddressSearch
            onSelect={({ lat, lng }) => {
              setPosition([lat, lng]);
              setFlyTo([lat, lng]);
              setStepErrors((p) => ({ ...p, location: undefined }));
            }}
          />

          <div className="wizard-step__geo-row">
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={handleGeolocate}
              disabled={geoLoading}
              aria-label="Use my GPS location"
            >
              {geoLoading
                ? <Loader2 size={14} className="spin" aria-hidden="true" />
                : <LocateFixed size={14} aria-hidden="true" />}
              {geoLoading ? 'Detecting…' : 'Use my location'}
            </button>
            {position && (
              <span className="wizard-step__coords" aria-live="polite">
                <MapPin size={12} aria-hidden="true" />
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </span>
            )}
          </div>

          {(geoError || stepErrors.location) && (
            <div className="field__error" role="alert" style={{ marginBottom: 'var(--space-2)' }}>
              <AlertCircle size={12} aria-hidden="true" /> {geoError || stepErrors.location}
            </div>
          )}

          <div className="wizard-map-wrap">
            <MapContainer
              center={position || DEFAULT_CENTER}
              zoom={position ? 14 : 12}
              scrollWheelZoom
              className="wizard-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler onClick={(p) => {
                setPosition(p);
                setStepErrors((prev) => ({ ...prev, location: undefined }));
              }} />
              <FlyController center={flyTo} />
              {position && <Marker position={position} />}
            </MapContainer>
            <p className="wizard-map-hint">Tap or click the map to place the pin</p>
          </div>
        </div>
      )}

      {/* ───── STEP 1: WHAT ───── */}
      {step === 1 && (
        <div className="wizard-step" aria-labelledby="step1-heading">
          <h1 id="step1-heading" className="wizard-step__title">What is the problem?</h1>
          <p className="wizard-step__sub">Choose the category that fits best, then describe it.</p>

          {/* Category icon grid */}
          <div
            className="wizard-category-grid"
            role="group"
            aria-labelledby="cat-label"
          >
            <span id="cat-label" className="sr-only">Select a category</span>
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              const col  = CATEGORY_COLORS[c.value];
              const sel  = category === c.value;
              return (
                <label
                  key={c.value}
                  className={`wizard-cat-btn${sel ? ' wizard-cat-btn--selected' : ''}${stepErrors.category ? ' wizard-cat-btn--error' : ''}`}
                  style={sel ? { borderColor: col.fg, background: col.bg } : undefined}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={sel}
                    onChange={() => {
                      setCategory(c.value);
                      setStepErrors((p) => ({ ...p, category: undefined }));
                    }}
                    className="sr-only"
                    aria-label={`${c.label} — ${c.desc}`}
                  />
                  <span
                    className="wizard-cat-btn__icon"
                    aria-hidden="true"
                    style={sel ? { color: col.fg, background: col.bg } : undefined}
                  >
                    <Icon size={28} />
                  </span>
                  <span className="wizard-cat-btn__label">{c.label}</span>
                  <span className="wizard-cat-btn__desc">{c.desc}</span>
                </label>
              );
            })}
          </div>
          {stepErrors.category && (
            <span className="field__error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-3)' }}>
              <AlertCircle size={12} aria-hidden="true" /> {stepErrors.category}
            </span>
          )}

          {/* Title */}
          <div className="field">
            <label className="field__label" htmlFor="report-title">Short title</label>
            <input
              id="report-title"
              className={stepErrors.title ? 'input input--error' : 'input'}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setStepErrors((p) => ({ ...p, title: undefined }));
              }}
              placeholder="e.g. Broken water pipe near the market"
              maxLength={150}
              aria-describedby="title-hint"
              aria-invalid={!!stepErrors.title}
            />
            <span id="title-hint" className="field__hint">
              Keep it brief — 10 to 20 words is ideal.
            </span>
            {stepErrors.title && (
              <span className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {stepErrors.title}
              </span>
            )}
          </div>

          {/* Description with character counter */}
          <div className="field">
            <div className="field__label-row">
              <label className="field__label" htmlFor="report-desc">Description</label>
              <span
                className={`char-counter${description.length > DESC_MAX * 0.9 ? ' char-counter--warn' : ''}`}
                aria-live="polite"
                aria-label={`${description.length} of ${DESC_MAX} characters used`}
              >
                {description.length}/{DESC_MAX}
              </span>
            </div>
            <textarea
              id="report-desc"
              rows={5}
              className={stepErrors.description ? 'input input--error' : 'input'}
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= DESC_MAX) {
                  setDescription(e.target.value);
                  setStepErrors((p) => ({ ...p, description: undefined }));
                }
              }}
              placeholder="How long has this been here? Who does it affect? Any immediate safety risk?"
              aria-describedby="desc-hint"
              aria-invalid={!!stepErrors.description}
            />
            <span id="desc-hint" className="field__hint">
              The more detail you give, the faster it gets resolved.
            </span>
            {stepErrors.description && (
              <span className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {stepErrors.description}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ───── STEP 2: PHOTO + SUBMIT ───── */}
      {step === 2 && (
        <div className="wizard-step" aria-labelledby="step2-heading">
          <h1 id="step2-heading" className="wizard-step__title">Add a photo and send</h1>
          <p className="wizard-step__sub">
            A photo helps admins understand the problem quickly. It's required.
          </p>

          {/* Photo drop zone */}
          <div className="field">
            {imagePreview ? (
              <div className="wizard-preview">
                <img src={imagePreview} alt="Preview of your selected photo" />
                <div className="wizard-preview__overlay">
                  <button
                    type="button"
                    className="btn btn--danger btn--sm btn--icon"
                    onClick={removeImage}
                    aria-label="Remove selected photo"
                  >
                    <X size={14} aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`drop-zone${isDragging ? ' drop-zone--drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload a photo. Click or drag and drop."
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              >
                <Upload size={28} className="drop-zone__icon" aria-hidden="true" />
                <p className="drop-zone__text">Tap to choose a photo, or drag and drop</p>
                <p className="drop-zone__hint">JPEG · PNG · WEBP · Max 5 MB</p>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => processFile(e.target.files?.[0])}
              ref={fileInputRef}
              className="sr-only"
              aria-label="Upload a photo"
            />
            {stepErrors.image && (
              <span className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {stepErrors.image}
              </span>
            )}
          </div>

          {/* Summary of what they entered */}
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="wizard-summary-heading">Your report summary</h2>
            <SummaryCard
              position={position}
              category={category}
              title={title}
              description={description}
              imagePreview={imagePreview}
            />
          </section>

          {serverError && (
            <div className="alert alert--error" role="alert">
              <AlertCircle size={15} aria-hidden="true" /> {serverError}
            </div>
          )}

          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={handleSubmit}
            disabled={submitting || !imageFile}
            aria-busy={submitting}
          >
            {submitting && <Loader2 size={16} className="spin" aria-hidden="true" />}
            {submitting ? 'Submitting your report…' : 'Submit report'}
          </button>
          <p className="form-report__submit-note">
            Your report will be visible to everyone and tracked until it's fixed.
          </p>
        </div>
      )}

      {/* ── Back / Next navigation ── */}
      <div className="wizard-nav">
        {step > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={goBack}
            aria-label="Go back to previous step"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Back
          </button>
        )}
        {step < 2 && (
          <button
            type="button"
            className="btn btn--primary btn--icon wizard-nav__next"
            onClick={goNext}
            aria-label={`Continue to ${STEPS[step + 1]}`}
          >
            Continue <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
