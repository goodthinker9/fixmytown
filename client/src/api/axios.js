// Single axios instance used across the app.
// - baseURL comes from VITE_API_URL (Vite exposes VITE_-prefixed env vars).
// - A request interceptor attaches the JWT from localStorage so every API call
//   is authenticated automatically — no manual header wiring in each call.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  // No default Content-Type: axios auto-sets application/json for object bodies
  // and multipart/form-data (with boundary) for FormData bodies. Hard-coding
  // application/json here would break the multipart image upload.
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fixmytown_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
