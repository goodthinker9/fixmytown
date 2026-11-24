// Public stats helper — no JWT required.
// Returns { total, resolved, in_progress, reported }.
import api from './axios.js';

export async function getPublicStats() {
  const res = await api.get('/api/stats');
  return res.data;
}
