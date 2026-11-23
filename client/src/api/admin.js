// Admin API helpers. These hit admin-only endpoints; the backend enforces the
// admin role, and the client's AdminRoute keeps non-admins out of /admin.
import api from './axios.js';

// Aggregate stats: totals, per-category, per-status, per-week, avg resolve time.
export async function getStats() {
  const res = await api.get('/api/admin/stats');
  return res.data;
}

// Change a report's status and record a status_history entry (backend does both
// in a transaction).
export async function updateReportStatus(id, { status, note }) {
  const res = await api.patch(`/api/admin/reports/${id}/status`, { status, note });
  return res.data;
}

// Request a plain-language weekly summary from the AI.
export async function getWeeklySummary() {
  const res = await api.get('/api/admin/weekly-summary');
  return res.data;
}
