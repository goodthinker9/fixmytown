// Modal for an admin to change a report's status and add an optional note.
// The modal owns the API call (and its loading/error state); on success it
// tells the parent (so the parent can toast + refresh) and closes itself.
import { useEffect, useState } from 'react';
import { updateReportStatus } from '../api/admin.js';

const STATUSES = [
  { value: 'reported', label: 'Reported' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export default function StatusModal({ report, onClose, onSaved }) {
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset the form whenever a different report is opened.
  useEffect(() => {
    setStatus(report.status);
    setNote('');
    setError('');
  }, [report.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await updateReportStatus(report.id, {
        status,
        note: note.trim() || undefined,
      });
      onSaved(status); // parent shows the toast + refreshes
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change report status"
      >
        <div className="modal__header">
          <h3>Change status</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal__report">{report.title}</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="status">New status</label>
            <select
              id="status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Technician dispatched to the area."
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--link" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
