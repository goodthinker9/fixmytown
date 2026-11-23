// Report API helpers. Built on the shared axios instance (api/axios.js) which
// already attaches the JWT, so these calls stay tiny.
import api from './axios.js';

// Create a report. `formData` is a FormData (multipart/form-data) instance that
// includes the text fields and an optional `image` File. We pass FormData
// straight through — axios sets the multipart content type + boundary itself.
export async function createReport(formData) {
  const res = await api.post('/api/reports', formData);
  return res.data;
}

// Fetch a single report + its status history.
export async function getReport(id) {
  const res = await api.get(`/api/reports/${id}`);
  return res.data;
}
