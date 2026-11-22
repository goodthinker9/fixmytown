// Single axios instance used across the app.
// - baseURL comes from VITE_API_URL (Vite exposes VITE_-prefixed env vars).
// - A request interceptor attaches the JWT from localStorage so every API call
//   is authenticated automatically — no manual header wiring in each call.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fixmytown_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
