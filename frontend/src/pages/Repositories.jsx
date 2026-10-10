// ============================================================
// Repositories Page & Connect Modal — Clean, Modern & Ergonomic
// ============================================================
// Provides a spacious 3-column repository grid with live search,
// status badges, and an un-cluttered Connect Repository modal.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRepos, addRepo, deleteRepo, checkRepoVisibility } from '../services/api';
import { Trash2 } from 'lucide-react';

export default function Repositories({ 
  onRepoAdded = null, 
  externalModalOpen = false, 
  onCloseExternalModal = null 
}) {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Add Repo State
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen || localModalOpen;

  const [newUrl, setNewUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [visibilityStatus, setVisibilityStatus] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState(null);

  const tokenInputRef = useRef(null);
  const checkTimeoutRef = useRef(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  // Sync external modal state
  const handleCloseModal = () => {
    setLocalModalOpen(false);
    if (onCloseExternalModal) onCloseExternalModal();
    setNewUrl('');
    setAccessToken('');
    setVisibilityStatus(null);
    setAddMessage(null);
  };

  // Automatic Public vs. Private Detection when user pastes or types repository
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const trimmed = newUrl.trim();
    if (!trimmed) {
      setVisibilityStatus(null);
      return;
    }

    const isUrl = /(?:https?:\/\/)?github\.com\/[^/\s]+\/[^/\s]+/.test(trimmed);
    const isShorthand = /^[^/\s]+\/[^/\s]+$/.test(trimmed);

    if (!isUrl && !isShorthand) {
      setVisibilityStatus(null);
      return;
    }

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        setVisibilityStatus({ checking: true });
        const res = await checkRepoVisibility(trimmed, accessToken.trim() || null);
        const data = res.data;
        if (data.is_private) {
          setVisibilityStatus({
            checking: false,
            is_private: true,
            requires_token: data.requires_token,
            token_valid: data.token_valid,
            message: data.message || 'Private repository detected',
          });
          // Automatically prompt developer by opening and focusing PAT input
          if (data.requires_token) {
            setShowTokenInput(true);
            setTimeout(() => tokenInputRef.current?.focus(), 150);
          }
        } else {
          setVisibilityStatus({
            checking: false,
            is_private: false,
            message: 'Public repository — no token required',
          });
          if (!accessToken) {
            setShowTokenInput(false);
          }
        }
      } catch (err) {
        setVisibilityStatus(null);
      }
    }, 450);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [newUrl, accessToken]);

  async function fetchRepos() {
    try {
      setLoading(true);
      const res = await listRepos();
      setRepos(res.data.repositories || []);
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }

  const handleAddRepo = async (e) => {
    e.preventDefault();
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    try {
      setAddLoading(true);
      setAddMessage(null);

      const res = await addRepo(trimmed, accessToken.trim() || null);
      setAddMessage({
        type: 'success',
        text: `✅ ${res.data.message || 'Repository connected successfully!'}`,
      });

      await fetchRepos();
      if (onRepoAdded) onRepoAdded();

      setTimeout(() => {
        handleCloseModal();
      }, 1200);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.is_private && errData?.requires_token) {
        setShowTokenInput(true);
        setAddMessage({
          type: 'warning',
          text: '🔒 Private repository detected. Please enter a Personal Access Token (PAT).',
        });
      } else {
        setAddMessage({
          type: 'error',
          text: `❌ ${errData?.error || 'Failed to add repository. Check URL or token.'}`,
        });
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to disconnect ${name}? This will remove its tracked evaluations.`)) {
      return;
    }
    try {
      await deleteRepo(id);
      setRepos((prev) => prev.filter((r) => r.id !== id));
      if (onRepoAdded) onRepoAdded();
    } catch (err) {
      alert('Failed to delete repository');
    }
  };

  const filteredRepos = repos.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.owner.toLowerCase().includes(q) ||
      (r.language && r.language.toLowerCase().includes(q))
    );
  });

  if (loading && repos.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading monitored repositories...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Controls: Search Bar & Add Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="Filter repositories by name or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 34,
              fontSize: 13,
              borderRadius: 'var(--radius-md)',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setLocalModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 22px',
            fontSize: 14.5,
            fontWeight: 700,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 10px rgba(79, 70, 229, 0.35)',
            transition: 'all 150ms ease',
            letterSpacing: '-0.01em',
          }}
        >
          <span>+</span>
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Spacious 3-Column Repository Grid */}
      {filteredRepos.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">
            {repos.length === 0 ? 'No Repositories Connected' : 'No Matching Repositories'}
          </div>
          <div className="empty-state-text">
            {repos.length === 0
              ? 'Connect a GitHub repository to begin continuous pull request defect risk scoring.'
              : `No repositories match "${searchQuery}".`}
          </div>
          {repos.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setLocalModalOpen(true)}
              style={{ marginTop: 16 }}
            >
              + Connect Your First Repository
            </button>
          )}
        </div>
      ) : (
        <div className="repo-grid-3">
          {filteredRepos.map((repo) => {
            const hasHighRisk = (repo.high_risk_count || 0) > 0;
            return (
              <div
                key={repo.id}
                className="repo-card-modern animate-in"
                onClick={() => navigate(`/repos/${repo.id}`)}
              >
                <div>
                  {/* Top Bar: Name, Language & Delete */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          wordBreak: 'break-word',
                          lineHeight: 1.3,
                        }}
                      >
                        {repo.name}
                      </h4>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginTop: 3,
                          fontFamily: 'monospace',
                        }}
                      >
                        {repo.owner}/{repo.name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {repo.is_private && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: '#eab308',
                            fontWeight: 600,
                          }}
                        >
                          🔒 Private
                        </span>
                      )}
                      {repo.language && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--accent-primary)',
                            fontWeight: 600,
                          }}
                        >
                          {repo.language}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, repo.id, repo.name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 4,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk-high)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Disconnect Repository"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Operational Health Badge */}
                  <div style={{ marginBottom: 16 }}>
                    {hasHighRisk ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: 'var(--risk-high)',
                          background: 'var(--risk-high-bg)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(220, 38, 38, 0.25)',
                        }}
                      >
                        <span>🔴</span>
                        <span>{repo.high_risk_count} High Risk PRs (Attention Needed)</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: 'var(--risk-low)',
                          background: 'var(--risk-low-bg)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        <span>🟢</span>
                        <span>Quality Gate Healthy (0 High Risk)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {repo.total_prs || 0}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Evaluated PRs</div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: hasHighRisk ? 'var(--risk-high)' : 'var(--text-primary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {repo.avg_risk_score || 0}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Risk Score</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View PRs ↗
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Repository Modal (Progressive Disclosure) */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Connect Repository</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Continuous pull request risk scoring and CI/CD quality gate enforcement.
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal} title="Close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleAddRepo}>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginBottom: 6,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    GitHub Repository URL or Shorthand
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Rupesh5988/COMPLETE-PROJECT-AGRIASSIST or full URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    disabled={addLoading}
                    style={{ fontSize: 13, width: '100%' }}
                    autoFocus
                  />
                </div>

                {/* Real-time Visibility Feedback */}
                {visibilityStatus && (
                  <div style={{ marginBottom: 14, fontSize: 12 }}>
                    {visibilityStatus.checking ? (
                      <span style={{ color: 'var(--text-muted)' }}>🔍 Probing repository type...</span>
                    ) : visibilityStatus.is_private ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#eab308',
                          background: 'rgba(234, 179, 8, 0.12)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontWeight: 600,
                        }}
                      >
                        🔒 Private Repository Detected — Personal Access Token (PAT) Required
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.12)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontWeight: 600,
                        }}
                      >
                        🌐 Public Repository — Ready to Connect (No Token Needed)
                      </span>
                    )}
                  </div>
                )}

                {/* PAT Input Section */}
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: showTokenInput ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{showTokenInput ? '▼' : '▶'}</span>
                    <span>Private Repository? Enter Personal Access Token (PAT)</span>
                  </button>

                  {showTokenInput && (
                    <div
                      style={{
                        marginTop: 10,
                        background: 'var(--bg-input)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                          fontSize: 11.5,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          GitHub PAT (with repo scope)
                        </span>
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                        >
                          Generate on GitHub ↗
                        </a>
                      </div>
                      <input
                        ref={tokenInputRef}
                        type="password"
                        className="input-field"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        disabled={addLoading}
                        style={{ fontSize: 13, width: '100%' }}
                      />
                    </div>
                  )}
                </div>

                {addMessage && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: addMessage.type === 'success' ? 'var(--risk-low)' : 'var(--risk-high)',
                      background:
                        addMessage.type === 'success' ? 'var(--risk-low-bg)' : 'var(--risk-high-bg)',
                    }}
                  >
                    {addMessage.text}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={addLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addLoading || !newUrl.trim()}
                  >
                    {addLoading ? 'Connecting...' : 'Connect Repository'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
