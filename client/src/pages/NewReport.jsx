import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, Loader2, Upload, X, AlertCircle, ExternalLink } from 'lucide-react';
import LocationMap from '../components/LocationMap.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { createReport } from '../api/reports.js';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Choose a category…' },
  { value: 'water',       label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'roads',       label: 'Roads' },
  { value: 'garbage',     label: 'Garbage' },
  { value: 'safety',      label: 'Safety' },
  { value: 'other',       label: 'Other' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

// Section header for the multi-section form layout
function FormSection({ step, title, children }) {
  return (
    <div className="form-section">
      <div className="form-section__header">
        <span className="form-section__step" aria-hidden="true">{step}</span>
        <h2 className="form-section__title">{title}</h2>
      </div>
      <div className="form-section__body">{children}</div>
    </div>
  );
}

export default function NewReport() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);
  const dropZoneRef  = useRef(null);

  const [form, setForm] = useState({ title: '', category: '', description: '' });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [position, setPosition]       = useState(null);
  const [flyTo, setFlyTo]             = useState(null);
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [geoLoading, setGeoLoading]   = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({ ...p, image: 'Image must be JPEG, PNG, or WEBP.' }));
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrors((p) => ({ ...p, image: 'Image must be 5 MB or smaller.' }));
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, image: undefined }));
  }, [imagePreview]);

  const handleImageInput = (e) => processFile(e.target.files?.[0]);

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag-and-drop handlers
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = ()  => setIsDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleGeolocate = () => {
    setServerError('');
    if (!navigator.geolocation) {
      setServerError('Your browser does not support geolocation.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        setFlyTo(coords);
        setErrors((p) => ({ ...p, location: undefined }));
        setGeoLoading(false);
      },
      (err) => {
        setServerError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Click the map to set a pin.'
            : 'Could not detect your location. Click the map to set a pin.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 5)    e.title       = 'Title must be at least 5 characters';
    if (!form.category)                   e.category    = 'Please choose a category';
    if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!position)                        e.location    = 'Set a location by clicking the map or using GPS';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title',       form.title.trim());
      fd.append('category',    form.category);
      fd.append('description', form.description.trim());
      fd.append('latitude',    String(position[0]));
      fd.append('longitude',   String(position[1]));
      if (imageFile) fd.append('image', imageFile);

      const data = await createReport(fd);

      if (data.duplicate_of) {
        setDuplicateWarning({ id: data.duplicate_of, reportId: data.report.id });
        setSubmitting(false);
        return;
      }

      navigate(`/reports/${data.report.id}`, {
        state: { flash: 'Your report was submitted successfully.' },
      });
    } catch (err) {
      const d = err.response?.data;
      if (d?.details) {
        const fe = {};
        d.details.forEach((x) => { if (x.field) fe[x.field] = x.message; });
        setErrors((p) => ({ ...p, ...fe }));
        setServerError(d.error || 'Please fix the highlighted fields.');
      } else {
        setServerError(d?.error || 'Could not submit your report. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="form-report-header">
        <h1>Report a problem</h1>
        <p className="form-report-header__sub">
          Fill in the details below so the right people can see and fix this issue.
        </p>
      </div>

      <form className="form-report" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={15} aria-hidden="true" /> {serverError}
          </div>
        )}

        {duplicateWarning && (
          <div className="alert alert--warn" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <div>
              <strong>Possible duplicate:</strong> An existing report may describe the same issue.{' '}
              <a href={`/reports/${duplicateWarning.id}`} target="_blank" rel="noreferrer" className="alert-link">
                View it <ExternalLink size={12} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: 8 }}
                onClick={() =>
                  navigate(`/reports/${duplicateWarning.reportId}`, {
                    state: { flash: 'Your report was submitted successfully.' },
                  })
                }
              >
                Go to my report anyway
              </button>
            </div>
          </div>
        )}

        {/* ── Section 1: What ── */}
        <FormSection step="1" title="What is the problem?">
          <div className="field">
            <label className="field__label" htmlFor="title">Short title</label>
            <input
              id="title" name="title"
              className={errors.title ? 'input input--error' : 'input'}
              value={form.title} onChange={handleChange}
              placeholder="e.g. Broken water pipe near the market"
              aria-describedby="title-hint title-error"
              aria-invalid={!!errors.title}
            />
            <span id="title-hint" className="field__hint">Keep it under 20 words so it's easy to scan.</span>
            {errors.title && (
              <span id="title-error" className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors.title}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="category">Category</label>
            <div className="category-grid" role="group" aria-labelledby="category-label">
              <span id="category-label" className="sr-only">Select a category</span>
              {CATEGORY_OPTIONS.filter((c) => c.value).map((c) => (
                <label
                  key={c.value}
                  className={`category-pill${form.category === c.value ? ' category-pill--selected' : ''}${errors.category ? ' category-pill--error' : ''}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={form.category === c.value}
                    onChange={handleChange}
                    className="sr-only"
                    aria-label={c.label}
                  />
                  <CategoryIcon category={c.value} size={18} aria-hidden="true" />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            {errors.category && (
              <span className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors.category}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="description">Description</label>
            <textarea
              id="description" name="description" rows={4}
              className={errors.description ? 'input input--error' : 'input'}
              value={form.description} onChange={handleChange}
              placeholder="Describe the problem: how long has it been here? Who does it affect? Any safety concerns?"
              aria-describedby="desc-hint description-error"
              aria-invalid={!!errors.description}
            />
            <span id="desc-hint" className="field__hint">
              The more detail you give, the faster it gets fixed.
            </span>
            {errors.description && (
              <span id="description-error" className="field__error" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors.description}
              </span>
            )}
          </div>
        </FormSection>

        {/* ── Section 2: Where ── */}
        <FormSection step="2" title="Where is it?">
          <div className="location-actions">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={handleGeolocate}
              disabled={geoLoading || submitting}
              aria-label="Use my current GPS location"
            >
              {geoLoading
                ? <Loader2 size={15} className="spin" aria-hidden="true" />
                : <LocateFixed size={15} aria-hidden="true" />}
              {geoLoading ? 'Detecting…' : 'Use my location'}
            </button>
            {position && (
              <span className="location-coords" aria-live="polite">
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </span>
            )}
          </div>
          <LocationMap
            position={position} flyTo={flyTo}
            onPositionChange={(p) => {
              setPosition(p);
              setErrors((prev) => ({ ...prev, location: undefined }));
            }}
          />
          {errors.location && (
            <span className="field__error" role="alert">
              <AlertCircle size={12} aria-hidden="true" /> {errors.location}
            </span>
          )}
          <span className="field__hint">Click or tap the map to drop a pin on the exact spot.</span>
        </FormSection>

        {/* ── Section 3: Photo ── */}
        <FormSection step="3" title="Add a photo (optional)">
          {imagePreview ? (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview of the selected photo" />
              <div className="image-preview__overlay">
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
              ref={dropZoneRef}
              className={`drop-zone${isDragging ? ' drop-zone--drag' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload a photo. Click or drag and drop."
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <Upload size={28} className="drop-zone__icon" aria-hidden="true" />
              <p className="drop-zone__text">Drag & drop a photo here, or click to browse</p>
              <p className="drop-zone__hint">JPEG, PNG or WEBP · Max 5 MB</p>
            </div>
          )}
          <input
            id="image" name="image" type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageInput}
            ref={fileInputRef}
            className="sr-only"
            aria-label="Upload a photo"
          />
          {errors.image && (
            <span className="field__error" role="alert">
              <AlertCircle size={12} aria-hidden="true" /> {errors.image}
            </span>
          )}
        </FormSection>

        <div className="form-report__submit">
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting && <Loader2 size={16} className="spin" aria-hidden="true" />}
            {submitting ? 'Submitting your report…' : 'Submit report'}
          </button>
          <p className="form-report__submit-note">
            Your report will be visible to everyone and tracked until it's fixed.
          </p>
        </div>
      </form>
    </div>
  );
}
