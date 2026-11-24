import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, Loader2 } from 'lucide-react';
import LocationMap from '../components/LocationMap.jsx';
import { createReport } from '../api/reports.js';

const CATEGORIES = [
  { value: '', label: 'Select a category…' },
  { value: 'water',       label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'roads',       label: 'Roads' },
  { value: 'garbage',     label: 'Garbage' },
  { value: 'safety',      label: 'Safety' },
  { value: 'other',       label: 'Other' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export default function NewReport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ title: '', category: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [position, setPosition] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((p) => ({ ...p, image: 'Image must be JPEG, PNG, or WEBP.' }));
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrors((p) => ({ ...p, image: 'Image must be 5MB or smaller.' }));
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, image: undefined }));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            ? 'Location permission denied. You can still click the map.'
            : 'Could not get your location. You can still click the map.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (!form.category) e.category = 'Please choose a category';
    if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!position) e.location = 'Please choose a location on the map or use your current location';
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
      fd.append('title', form.title.trim());
      fd.append('category', form.category);
      fd.append('description', form.description.trim());
      fd.append('latitude', String(position[0]));
      fd.append('longitude', String(position[1]));
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
      <h1>New report</h1>
      <form className="card form-report" onSubmit={handleSubmit} noValidate>
        {serverError && <div className="alert alert--error" role="alert">{serverError}</div>}

        {duplicateWarning && (
          <div className="alert alert--warn" role="alert">
            <strong>Possible duplicate:</strong> Our AI thinks this may be the same issue as{' '}
            <a href={`/reports/${duplicateWarning.id}`} target="_blank" rel="noreferrer">
              an existing report
            </a>.{' '}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                navigate(`/reports/${duplicateWarning.reportId}`, {
                  state: { flash: 'Your report was submitted successfully.' },
                })
              }
            >
              Go to your report anyway
            </button>
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="title">Title</label>
          <input
            id="title" name="title"
            className={errors.title ? 'input input--error' : 'input'}
            value={form.title} onChange={handleChange}
            placeholder="e.g. Broken water point near the market"
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && <span id="title-error" className="field__error" role="alert">{errors.title}</span>}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="category">Category</label>
          <select
            id="category" name="category"
            className={errors.category ? 'input input--error' : 'input'}
            value={form.category} onChange={handleChange}
            aria-describedby={errors.category ? 'category-error' : undefined}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} disabled={c.value === ''}>{c.label}</option>
            ))}
          </select>
          {errors.category && <span id="category-error" className="field__error" role="alert">{errors.category}</span>}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="description">Description</label>
          <textarea
            id="description" name="description" rows={4}
            className={errors.description ? 'input input--error' : 'input'}
            value={form.description} onChange={handleChange}
            placeholder="Describe the problem and its impact…"
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && <span id="description-error" className="field__error" role="alert">{errors.description}</span>}
        </div>

        <div className="field">
          <label className="field__label">Location</label>
          <div className="location-actions">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={handleGeolocate}
              disabled={geoLoading || submitting}
              aria-label="Use my current location"
            >
              {geoLoading
                ? <Loader2 size={15} className="spin" aria-hidden="true" />
                : <LocateFixed size={15} aria-hidden="true" />}
              {geoLoading ? 'Finding…' : 'Use my location'}
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
          {errors.location && <span className="field__error" role="alert">{errors.location}</span>}
          <small className="field__hint">Click the map to drop a pin, or use your current location.</small>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="image">Photo (optional)</label>
          <input
            id="image" name="image" type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImage} ref={fileInputRef} className="input"
          />
          {errors.image && <span className="field__error" role="alert">{errors.image}</span>}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected preview" />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={removeImage}
                aria-label="Remove selected image"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting && <Loader2 size={15} className="spin" aria-hidden="true" />}
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}
