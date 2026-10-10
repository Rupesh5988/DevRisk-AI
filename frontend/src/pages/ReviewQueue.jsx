// ============================================================
// Review Queue — Senior Engineering Triage & Quality Gate Cockpit
// ============================================================
// Low-cognitive-load developer workbench for pull request triage.
// Features:
// - Complete historical PR retrieval with responsive 10-item pagination
// - 3-Card Executive Triage Strip (Blocked, Review Required, Auto-Merge Safe)
// - Dual-axis filtering: Multi-repository dropdown + Risk segments + Live search
// - One-click interactive filtering from triage cards
// - Live queue refresh without full-page reloads
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { listAllPRs, listRepos } from '../services/api';
import PRTable from '../components/PRTable';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  FolderGit2, 
  Search, 
  X
} from 'lucide-react';

export default function ReviewQueue() {
  const [pullRequests, setPullRequests] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter States
  const [selectedRepo, setSelectedRepo] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Data Fetch
  const fetchData = async (isSilentRefresh = false) => {
    try {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Concurrently load full PR history and tracked repositories
      const [prsRes, reposRes] = await Promise.all([
        listAllPRs(1, 1000),
        listRepos()
      ]);

      const prList = prsRes.data?.pull_requests || [];
      const repoList = reposRes.data?.repositories || [];

      setPullRequests(prList);
      setRepositories(repoList);
    } catch (err) {
      console.error('[ReviewQueue] Failed to load triage queue data:', err);
      setError('Unable to load review queue. Please verify backend service connectivity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter PRs by selected repository first (for KPI calculation)
  const repoScopedPRs = useMemo(() => {
    if (selectedRepo === 'ALL') return pullRequests;
    return pullRequests.filter((pr) => String(pr.repo_id) === String(selectedRepo));
  }, [pullRequests, selectedRepo]);

  // Compute situational triage statistics
  const highRiskPRs = useMemo(
    () => repoScopedPRs.filter((pr) => pr.risk_label === 'HIGH'),
    [repoScopedPRs]
  );
  const medRiskPRs = useMemo(
    () => repoScopedPRs.filter((pr) => pr.risk_label === 'MEDIUM'),
    [repoScopedPRs]
  );
  const lowRiskPRs = useMemo(
    () => repoScopedPRs.filter((pr) => pr.risk_label === 'LOW'),
    [repoScopedPRs]
  );

  const highCount = highRiskPRs.length;
  const medCount = medRiskPRs.length;
  const lowCount = lowRiskPRs.length;
  const totalCount = repoScopedPRs.length;

  // Apply secondary risk & search filters for table presentation
  const filteredPRs = useMemo(() => {
    return repoScopedPRs.filter((pr) => {
      // Risk filter
      const matchesRisk =
        riskFilter === 'ALL' ||
        (pr.risk_label && pr.risk_label.toUpperCase() === riskFilter);

      // Search query across PR number, title, author, repo
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (pr.title && pr.title.toLowerCase().includes(q)) ||
        (pr.author && pr.author.toLowerCase().includes(q)) ||
        (pr.repo_name && pr.repo_name.toLowerCase().includes(q)) ||
        String(pr.pr_number).includes(q);

      return matchesRisk && matchesSearch;
    });
  }, [repoScopedPRs, riskFilter, searchQuery]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSelectedRepo('ALL');
    setRiskFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedRepo !== 'ALL' || riskFilter !== 'ALL' || searchQuery.trim() !== '';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Pull Request Review Queue...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <AlertTriangle size={36} color="var(--risk-high)" />
        </div>
        <div className="empty-state-title">Connection Error</div>
        <div className="empty-state-text">{error}</div>
        <button
          className="btn btn-primary"
          onClick={() => fetchData()}
          style={{ marginTop: 16 }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 1. Senior Executive Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>Review Queue</h1>
              <span className="badge badge-low" style={{ fontSize: 11, padding: '2px 8px' }}>
                <CheckCircle size={12} style={{ marginRight: 4 }} /> CI/CD Quality Gate Active
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: 13 }}>
              Continuous Just-In-Time Defect Detection & PR Merge Triage Queue.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Refresh queue status from database & webhooks"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span>{refreshing ? 'Syncing...' : 'Refresh Queue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive 3-Card Triage Strip (Instant Situation Awareness) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Blocked Quality Gate (High Risk) */}
        <div
          onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className="card"
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: riskFilter === 'HIGH' ? '1px solid var(--risk-high)' : '1px solid var(--border-subtle)',
            background: riskFilter === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
            transition: 'all 150ms ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          title="Click to toggle filter to High Risk PRs"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Blocked Quality Gate
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-high)', marginTop: 4 }}>
                {highCount}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--risk-high)',
              }}
            >
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
            Risk $\ge 70\%$: Mandatory senior inspection & TreeSHAP mitigation before merge.
          </div>
        </div>

        {/* Card 2: Review Required (Medium Risk) */}
        <div
          onClick={() => setRiskFilter(riskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className="card"
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: riskFilter === 'MEDIUM' ? '1px solid var(--risk-medium)' : '1px solid var(--border-subtle)',
            background: riskFilter === 'MEDIUM' ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-card)',
            transition: 'all 150ms ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          title="Click to toggle filter to Medium Risk PRs"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Review Required
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-medium)', marginTop: 4 }}>
                {medCount}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--risk-medium)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
            Risk $30\% - 69\%$: Moderate blast radius; verify integration tests and interfaces.
          </div>
        </div>

        {/* Card 3: Auto-Merge Safe (Low Risk) */}
        <div
          onClick={() => setRiskFilter(riskFilter === 'LOW' ? 'ALL' : 'LOW')}
          className="card"
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: riskFilter === 'LOW' ? '1px solid var(--risk-low)' : '1px solid var(--border-subtle)',
            background: riskFilter === 'LOW' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-card)',
            transition: 'all 150ms ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          title="Click to toggle filter to Auto-Merge Safe PRs"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Auto-Merge Safe
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-low)', marginTop: 4 }}>
                {lowCount}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--risk-low)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
            Risk $&lt; 30\%$: Passed automated quality gates; safe for expedited merge.
          </div>
        </div>
      </div>

      {/* 3. Main PR Triage Feed Card */}
      <div className="card animate-in" style={{ padding: 24 }}>
        {/* Dual-Axis Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: Section Title + Active Count */}
          <div>
            <h3 className="card-title" style={{ fontSize: 16, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Pull Request Triage Queue</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {filteredPRs.length} of {totalCount} PRs
              </span>
            </h3>
            <span className="card-subtitle" style={{ fontSize: 12 }}>
              Inspect defect probability, test impact, and launch AST simulations.
            </span>
          </div>

          {/* Right: Controls & Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Repository Selector Dropdown */}
            {repositories.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FolderGit2 size={16} color="var(--text-muted)" />
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  title="Filter PRs by repository"
                >
                  <option value="ALL">All Repositories ({repositories.length})</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Risk Segment Chips */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: 'var(--bg-input)',
                padding: 3,
                borderRadius: 20,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                className={`chip ${riskFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setRiskFilter('ALL')}
                style={{ borderRadius: 16, padding: '4px 10px', fontSize: 11 }}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                className={`chip ${riskFilter === 'HIGH' ? 'active' : ''}`}
                onClick={() => setRiskFilter('HIGH')}
                style={{ borderRadius: 16, padding: '4px 10px', fontSize: 11 }}
              >
                🛑 Blocked ({highCount})
              </button>
              <button
                type="button"
                className={`chip ${riskFilter === 'MEDIUM' ? 'active' : ''}`}
                onClick={() => setRiskFilter('MEDIUM')}
                style={{ borderRadius: 16, padding: '4px 10px', fontSize: 11 }}
              >
                ⚠️ Review ({medCount})
              </button>
              <button
                type="button"
                className={`chip ${riskFilter === 'LOW' ? 'active' : ''}`}
                onClick={() => setRiskFilter('LOW')}
                style={{ borderRadius: 16, padding: '4px 10px', fontSize: 11 }}
              >
                ✅ Safe ({lowCount})
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search PR #, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 26px 6px 30px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Reset Filters Shortcut (if active) */}
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  borderRadius: 'var(--radius-md)',
                }}
                title="Reset all filters to defaults"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* PR Table with Built-In 10-Item Interactive Pagination */}
        {filteredPRs.length > 0 ? (
          <PRTable
            pullRequests={filteredPRs}
            showRepo={selectedRepo === 'ALL'}
            pageSize={10}
          />
        ) : (
          <div className="empty-state" style={{ padding: '48px 16px' }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No Matching Pull Requests</div>
            <div className="empty-state-text" style={{ maxWidth: 440, margin: '8px auto 0' }}>
              No pull requests matched the active filters ({riskFilter !== 'ALL' ? `Risk: ${riskFilter}` : ''}
              {selectedRepo !== 'ALL' ? `, Repo ID: ${selectedRepo}` : ''}
              {searchQuery ? `, Query: "${searchQuery}"` : ''}).
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ marginTop: 16 }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
