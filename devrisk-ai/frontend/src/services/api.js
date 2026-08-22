// ============================================================
// API Service — Axios Client with JWT Auth
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- JWT Interceptor ----
// Automatically attaches the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devrisk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect
      localStorage.removeItem('devrisk_token');
      localStorage.removeItem('devrisk_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// ---- Health ----
export const getHealth = () => api.get('/health');

// ---- Repositories ----
export const listRepos = () => api.get('/repos');
export const addRepo = (githubUrl) => api.post('/repos', { github_url: githubUrl });
export const getRepo = (id) => api.get(`/repos/${id}`);

// ---- Pull Requests ----
export const getPRsByRepo = (repoId, page = 1, limit = 20, riskLabel = null) => {
  const params = { page, limit };
  if (riskLabel) params.risk_label = riskLabel;
  return api.get(`/repos/${repoId}/prs`, { params });
};

export const getPRDetail = (id) => api.get(`/prs/${id}`);

// ---- Analytics ----
export const getOverview = () => api.get('/analytics/overview');
export const getTrends = (days = 30, repoId = null) => {
  const params = { days };
  if (repoId) params.repo_id = repoId;
  return api.get('/analytics/trends', { params });
};

export default api;
