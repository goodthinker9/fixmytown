// Report API helpers. Built on the shared axios instance (api/axios.js) which
// already attaches the JWT, so these calls stay tiny.
import api from './axios.js';

// List reports with filters.
// Now also accepts proximity params: lat, lng, radius_km, sort='distance'.
export async function listReports(params = {}) {
  const query = {};
  if (params.category)   query.category   = params.category;
  if (params.status)     query.status     = params.status;
  if (params.search)     query.search     = params.search;
  if (params.sort)       query.sort       = params.sort;
  if (params.page)       query.page       = params.page;
  if (params.limit)      query.limit      = params.limit;
  // Proximity search — omit undefined values to avoid '?lat=undefined' strings.
  if (params.lat        != null) query.lat        = params.lat;
  if (params.lng        != null) query.lng        = params.lng;
  if (params.radius_km  != null) query.radius_km  = params.radius_km;

  const res = await api.get('/api/reports', { params: query });
  return res.data;
}

export async function getReport(id) {
  const res = await api.get(`/api/reports/${id}`);
  return res.data;
}

export async function createReport(formData) {
  const res = await api.post('/api/reports', formData);
  return res.data;
}

export async function toggleUpvote(id) {
  const res = await api.post(`/api/reports/${id}/upvote`);
  return res.data;
}

export async function deleteReport(id) {
  await api.delete(`/api/reports/${id}`);
}
