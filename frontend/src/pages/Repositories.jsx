// ============================================================
// Repositories Page
// ============================================================
// Lists all tracked repos with stats, and provides a form
// to add new repositories.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRepos, addRepo, deleteRepo } from '../services/api';
import { Trash2 } from 'lucide-react';

function getRiskClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default function Repositories() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUrl, setNewUrl] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  async function fetchRepos() {
    try {
      setLoading(true);
      const res = await listRepos();
      let fetchedRepos = res.data.repositories || [];
      
      // Restore saved order
      const savedOrder = JSON.parse(localStorage.getItem('devrisk_repos_order') || '[]');
      if (savedOrder.length > 0) {
        fetchedRepos.sort((a, b) => {
          const aIdx = savedOrder.indexOf(a.id);
          const bIdx = savedOrder.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
      }

      setRepos(fetchedRepos);
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this repository? This action cannot be undone.')) return;
    try {
      await deleteRepo(id);
      setRepos(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to delete repository');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) return;
    
    const newRepos = [...repos];
    const draggedItem = newRepos[draggedIdx];
    newRepos.splice(draggedIdx, 1);
    newRepos.splice(dropIdx, 0, draggedItem);
    
    setRepos(newRepos);
    setDraggedIdx(null);

    const newOrderIds = newRepos.map(r => r.id);
    localStorage.setItem('devrisk_repos_order', JSON.stringify(newOrderIds));
  };

  async function handleAddRepo(e) {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      setAddLoading(true);
      setAddMessage(null);
      const res = await addRepo(newUrl.trim());
      setAddMessage({ type: 'success', text: `✅ ${res.data.message}` });
      setNewUrl('');
      fetchRepos(); // Refresh list
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add repository';
      setAddMessage({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading repositories...</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Repositories</h1>

      </div>

      {/* Add Repository Form */}
      <div className="card animate-in" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Add Repository</h3>
            <span className="card-subtitle">Connect a public or private GitHub repository for automated risk scoring</span>
          </div>
        </div>
        <form onSubmit={handleAddRepo} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            className="input-field"
            placeholder="https://github.com/owner/repo or owner/repo"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            disabled={addLoading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={addLoading || !newUrl.trim()}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {addLoading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }}></span>
                <span>Adding...</span>
              </>
            ) : (
              <span>+ Add Repo</span>
            )}
          </button>
        </form>

        {/* Quick Sample Suggestions */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick Suggestions:</span>
          {[
            'https://github.com/Rupesh5988/DevRisk-AI',
            'https://github.com/expressjs/express',
            'https://github.com/public-apis/public-apis',
            'https://github.com/facebook/react',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setNewUrl(sample)}
              style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {sample.replace('https://github.com/', '')}
            </button>
          ))}
        </div>

        {addMessage && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              background: addMessage.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${addMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: addMessage.type === 'success' ? 'var(--risk-low)' : 'var(--risk-high)',
            }}
          >
            {addMessage.text}
          </div>
        )}
      </div>

      {/* Repository Cards */}
      {repos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">No Repositories</div>
          <div className="empty-state-text">
            Add a GitHub repository URL above to start tracking PR risk scores.
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          {repos.map((repo, idx) => (
            <div
              key={repo.id}
              className="stat-card animate-in"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/repos/${repo.id}`)}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {repo.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {repo.owner}/{repo.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {repo.language && (
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 12,
                      background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)',
                      fontWeight: 600,
                    }}>
                      {repo.language}
                    </span>
                  )}
                  <button 
                    onClick={(e) => handleDelete(e, repo.id)}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--text-muted)', 
                      cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--risk-high)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Delete Repository"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
                    {repo.total_prs || 0}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>PRs</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
                    {repo.avg_risk_score || 0}%
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Avg Risk</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--risk-high)' }}>
                    {repo.high_risk_count || 0}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>High Risk</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
