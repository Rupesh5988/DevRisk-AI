// ============================================================
// API Service — Axios Client with JWT Auth
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
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
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/password', data);

// ---- Health ----
export const getHealth = () => api.get('/health');

// ---- Repositories ----
export const listRepos = () => api.get('/repos');
export const checkRepoVisibility = (githubUrl, accessToken = null) =>
  api.post('/repos/check-visibility', { github_url: githubUrl, access_token: accessToken });
export const addRepo = (githubUrl, accessToken = null) =>
  api.post('/repos', { github_url: githubUrl, access_token: accessToken });
export const getRepo = (id) => api.get(`/repos/${id}`);
export const updateRepoToken = (id, accessToken) =>
  api.put(`/repos/${id}/token`, { access_token: accessToken });
export const syncRepoPRs = (id, accessToken = null) =>
  api.post(`/repos/${id}/sync`, { access_token: accessToken });
export const deleteRepo = (id) => api.delete(`/repos/${id}`);

// ---- Pull Requests ----
export const getPRsByRepo = (repoId, page = 1, limit = 100, riskLabel = null) => {
  const params = { page, limit };
  if (riskLabel) params.risk_label = riskLabel;
  return api.get(`/repos/${repoId}/prs`, { params });
};

export const listAllPRs = (page = 1, limit = 1000, riskLabel = null, search = null, repoId = null) => {
  const params = { page, limit };
  if (riskLabel && riskLabel !== 'ALL') params.risk_label = riskLabel;
  if (search) params.search = search;
  if (repoId && repoId !== 'ALL') params.repo_id = repoId;
  return api.get('/prs', { params });
};

export const getPRDetail = (id) => api.get(`/prs/${id}`);
export const simulatePR = (data) => api.post('/prs/simulate', data);

// ---- Analytics ----
export const getOverview = () => api.get('/analytics/overview');
export const getTrends = (days = 30, repoId = null) => {
  const params = { days };
  if (repoId) params.repo_id = repoId;
  return api.get('/analytics/trends', { params });
};

// ---- Ground Truth & Model Validation ----
export const getGroundTruthByPR    = (prId)          => api.get(`/ground-truth/pr/${prId}`);
export const analyzeGroundTruth    = (prId)          => api.post(`/ground-truth/analyze/${prId}`);
export const analyzeAllGroundTruth = ()              => api.post('/ground-truth/analyze-all');
export const getGroundTruthByRepo  = (repoId)        => api.get(`/ground-truth/repository/${repoId}`);
export const getBenchmarkMetrics    = ()              => api.get('/model-validation/benchmark-metrics');
export const getValidationSummary  = ()              => api.get('/model-validation/summary');
export const getConfusionMatrix    = ()              => api.get('/model-validation/confusion-matrix');
export const getCalibration        = ()              => api.get('/model-validation/calibration');
export const getThresholdAnalysis  = ()              => api.get('/model-validation/threshold-analysis');
export const getExplanationValidation = (prId)       => api.get(`/explanation-validation/${prId}`);

export default api;
