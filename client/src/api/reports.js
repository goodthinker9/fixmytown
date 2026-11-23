// Report API helpers. Built on the shared axios instance (api/axios.js) which
// already attaches the JWT, so these calls stay tiny.
import api from './axios.js';

// List reports with filters. We only add non-empty params — the backend's Zod
// enum validation would reject an empty `category=` or `status=`, and an empty
// search would add a useless ILIKE clause.
export async function listReports(params = {}) {
  const query = {};
  if (params.category) query.category = params.category;
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;

  // axios serializes `params` into the query string (URL-encoded), so this
  // becomes e.g. GET /api/reports?category=water&sort=top&page=1&limit=9
  const res = await api.get('/api/reports', { params: query });
  return res.data;
}

// Fetch a single report + its status history.
export async function getReport(id) {
  const res = await api.get(`/api/reports/${id}`);
  return res.data;
}

// Create a report. `formData` is a FormData (multipart/form-data) instance;
// axios sets the multipart content type + boundary itself.
export async function createReport(formData) {
  const res = await api.post('/api/reports', formData);
  return res.data;
}

// Toggle the current user's upvote on a report.
export async function toggleUpvote(id) {
  const res = await api.post(`/api/reports/${id}/upvote`);
  return res.data;
}

// Delete a report (owner or admin only; enforced by the backend).
export async function deleteReport(id) {
  await api.delete(`/api/reports/${id}`);
}
