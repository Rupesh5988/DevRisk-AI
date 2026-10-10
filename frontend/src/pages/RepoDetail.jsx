// ============================================================
// RepoDetail Page
// ============================================================
// Shows the list of Pull Requests for a specific repository
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepo, getPRsByRepo, syncRepoPRs, updateRepoToken } from '../services/api';
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
  const [patInput, setPatInput] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [patMessage, setPatMessage] = useState(null);

  async function fetchAllData() {
    try {
      const [repoRes, prsRes] = await Promise.all([
        getRepo(id),
        getPRsByRepo(id, 1, 1000)
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
      setPatMessage({ type: 'info', text: '🔄 Syncing Pull Requests & Commits from GitHub...' });
      const res = await syncRepoPRs(id);
      await fetchAllData();
      setPatMessage({ type: 'success', text: `✅ ${res.data?.message || 'PRs synced successfully!'}` });
    } catch (err) {
      console.error('Failed to sync PRs:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to sync PRs from GitHub. Check your Personal Access Token or permissions.';
      setPatMessage({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateToken = async (e) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    try {
      setUpdatingToken(true);
      setPatMessage({ type: 'info', text: '🔄 Authenticating with GitHub & extracting Pull Requests...' });
      const res = await syncRepoPRs(id, patInput.trim());
      await fetchAllData();
      setPatMessage({ type: 'success', text: `✅ ${res.data.message || 'Repository authenticated and PRs synced successfully!'}` });
      setPatInput('');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to authenticate with GitHub';
      setPatMessage({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setUpdatingToken(false);
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

      {/* Private Repository PAT Configuration Box */}
      <div className="card animate-in" style={{ marginBottom: 24, padding: '16px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              GitHub Personal Access Token (PAT)
            </span>
            {repo.is_private && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontWeight: 600 }}>
                Private Repository
              </span>
            )}
          </div>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'none' }}
          >
            Generate PAT on GitHub ↗
          </a>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Private repositories require a Personal Access Token with <code>repo</code> scope to fetch private Pull Request diffs, commits, and code files. Paste your token below and click <strong>Save & Sync PRs</strong>.
        </p>
        <form onSubmit={handleUpdateToken} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="password"
            className="input-field"
            placeholder="ghp_xxxxxxxxxxxx (GitHub Personal Access Token)"
            value={patInput}
            onChange={(e) => setPatInput(e.target.value)}
            disabled={updatingToken}
            style={{ flex: 1, fontSize: 13 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updatingToken || !patInput.trim()}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {updatingToken ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }}></span>
                <span>Saving & Syncing...</span>
              </>
            ) : (
              <span>Save & Sync PRs</span>
            )}
          </button>
        </form>
        {patMessage && (
          <div style={{
            marginTop: 10, fontSize: 12.5,
            color: patMessage.type === 'success' ? 'var(--risk-low)' : 'var(--risk-high)',
            fontWeight: 500
          }}>
            {patMessage.text}
          </div>
        )}
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
