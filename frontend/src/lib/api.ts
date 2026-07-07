import axios from 'axios';

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    const pointsToInternal = !!configured && /localhost|127\.0\.0\.1|0\.0\.0\.0|backend:/.test(configured);

    // Browser clients must not call container/internal hosts directly.
    if (pointsToInternal) {
      return '/backend/api';
    }
  }

  return configured || '/backend/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
