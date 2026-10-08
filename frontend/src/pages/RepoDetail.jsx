// ============================================================
// RepoDetail Page
// ============================================================
// Shows the list of Pull Requests for a specific repository
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepo, getPRsByRepo, syncRepoPRs } from '../services/api';
import PRTable from '../components/PRTable';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function RepoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  async function fetchAllData() {
    try {
      const [repoRes, prsRes] = await Promise.all([
        getRepo(id),
        getPRsByRepo(id)
      ]);
      setRepo(repoRes.data.repository);
      setPrs(prsRes.data.pull_requests || []);
    } catch (err) {
      console.error('Failed to fetch repo details:', err);
      setError('Repository not found or failed to load.');
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncRepoPRs(id);
      await fetchAllData();
    } catch (err) {
      console.error('Failed to sync PRs:', err);
      alert('Failed to sync PRs from GitHub. Note: GitHub rate limits may apply.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    }
    init();
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
        <div className="empty-state-icon"><AlertTriangle size={32} /></div>
        <div className="empty-state-title">Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back to Dashboard
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
            style={{ padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Repository Details
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{repo.name}</h1>
            <p className="page-subtitle">
              {repo.owner}/{repo.name} {repo.language ? `• ${repo.language}` : ''}
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync PRs from GitHub'}
          </button>
        </div>
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
