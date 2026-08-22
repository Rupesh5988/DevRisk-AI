// ============================================================
// RepoDetail Page
// ============================================================
// Shows the list of Pull Requests for a specific repository
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepo, getPRsByRepo } from '../services/api';
import PRTable from '../components/PRTable';

export default function RepoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // We use getRepo (which we need to add to api.js if not there, or use listRepos and filter)
        // Wait, getRepo is exported in api.js as `export const getRepo = (id) => api.get('/repos/${id}');`
        const [repoRes, prsRes] = await Promise.all([
          getRepo(id),
          getPRsByRepo(id)
        ]);
        setRepo(repoRes.data.repository);
        setPrs(prsRes.data.pull_requests || []);
      } catch (err) {
        console.error('Failed to fetch repo details:', err);
        setError('Repository not found or failed to load.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading repository details...</div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/repos')}>
          ← Back to Repositories
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={() => navigate('/repos')}
          >
            ← Back
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Repository Details
          </span>
        </div>
        <h1 className="page-title">{repo.name}</h1>
        <p className="page-subtitle">
          {repo.owner}/{repo.name} {repo.language ? `• ${repo.language}` : ''}
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card animate-in">
          <div className="stat-value">{repo.total_prs || 0}</div>
          <div className="stat-label">Total PRs</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-value">{repo.avg_risk_score || 0}%</div>
          <div className="stat-label">Avg Risk Score</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-value" style={{ color: 'var(--risk-high)' }}>
            {repo.high_risk_count || 0}
          </div>
          <div className="stat-label">High Risk PRs</div>
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-header">
          <h3 className="card-title">Pull Requests</h3>
          <span className="card-subtitle">All analyzed PRs for this repository</span>
        </div>
        <PRTable pullRequests={prs} showRepo={false} />
      </div>
    </>
  );
}
