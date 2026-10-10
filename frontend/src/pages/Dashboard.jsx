// ============================================================
// Dashboard Page — Senior Engineering Control Center
// ============================================================
// Ergonomic, low-cognitive-load developer cockpit.
// Combines high-signal release KPIs, actionable PR triage feed,
// spacious repository cards, and a progressive-disclosure Connect modal.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview } from '../services/api';
import Repositories from './Repositories';
import PRTable from '../components/PRTable';
import { 
  AlertTriangle, 
  Lightbulb, 
  FolderGit2, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle,
  ListTodo
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab: 'prs' (default actionable feed) or 'repos' (codebase management)
  const [activeTab, setActiveTab] = useState('prs');

  // PR Triage filters
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Connect Repository Modal trigger
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Dismissible onboarding guide
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('devrisk_hide_guide') !== 'true';
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const overviewRes = await getOverview();
      setOverview(overviewRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Is the backend running on port 3001?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function handleDismissGuide() {
    setShowGuide(false);
    localStorage.setItem('devrisk_hide_guide', 'true');
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading DevRisk Control Center...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><AlertTriangle size={32} /></div>
        <div className="empty-state-title">Backend Connection Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
          Retry Connection
        </button>
      </div>
    );
  }

  const summary = overview?.summary || {};
  const distribution = overview?.risk_distribution || {};
  const recentPRs = overview?.recent_prs || [];

  const highCount = distribution.HIGH || 0;
  const medCount = distribution.MEDIUM || 0;
  const lowCount = distribution.LOW || 0;

  const totalPRs = summary.total_prs || 0;
  const totalRepos = summary.repositories_tracked || 0;
  const highRiskRate = totalPRs > 0 ? (highCount / totalPRs) * 100 : 0;
  const safeApprovalRate = totalPRs > 0 ? (lowCount / totalPRs) * 100 : 0;

  // Filtered PR list for Tab 1
  const filteredPRs = recentPRs.filter((pr) => {
    const matchesRisk = riskFilter === 'ALL' || (pr.risk_label && pr.risk_label.toUpperCase() === riskFilter);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (pr.title && pr.title.toLowerCase().includes(q)) ||
      (pr.author && pr.author.toLowerCase().includes(q)) ||
      (pr.repo_name && pr.repo_name.toLowerCase().includes(q)) ||
      String(pr.pr_number).includes(q);
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* 1. Header & Primary Action Bar */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>Review Dashboard</h1>
              <span className="badge badge-low" style={{ fontSize: 11, padding: '2px 8px' }}>
                <CheckCircle size={12} style={{ marginRight: 4 }} /> CI/CD Quality Gate Active
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: 13 }}>
              Pull request risk assessment & automated quality gate cockpit.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowConnectModal(true)}
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
            <FolderGit2 size={18} />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* 2. Dismissible Onboarding Guide Banner */}
      {showGuide && (
        <div className="onboarding-guide-card animate-in" style={{ marginBottom: 24 }}>
          <div className="onboarding-header">
            <div className="onboarding-title-wrap">
              <span className="onboarding-icon"><Lightbulb size={18} /></span>
              <span className="onboarding-title">How DevRisk AI Protects Your Codebase</span>
            </div>
            <button
              className="onboarding-dismiss-btn"
              onClick={handleDismissGuide}
              title="Dismiss guide"
            >
              ✕
            </button>
          </div>

          <div className="onboarding-steps">
            <div className="onboarding-step">
              <div className="onboarding-step-num">1</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">Extract Change Signals</div>
                <div className="onboarding-step-desc">
                  Measures 14 code change metrics across churn size, file spread, and developer experience.
                </div>
              </div>
            </div>

            <div className="onboarding-step">
              <div className="onboarding-step-num">2</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">Predict Defect Risk</div>
                <div className="onboarding-step-desc">
                  Machine learning models score defect probability (0–100%) and enforce CI/CD merge gates.
                </div>
              </div>
            </div>

            <div className="onboarding-step">
              <div className="onboarding-step-num">3</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">Actionable SHAP Guidance</div>
                <div className="onboarding-step-desc">
                  TreeSHAP isolates the primary risk drivers so developers can address issues before merge.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. High-Signal 3-Card KPI Strip */}
      <div className="kpi-grid-3">
        {/* KPI 1: Critical PRs (Actionable) */}
        <div
          className="stat-card"
          onClick={() => {
            setActiveTab('prs');
            setRiskFilter('HIGH');
          }}
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--risk-high)' }}
          title="Click to view all high-risk pull requests"
        >
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="stat-label" style={{ fontWeight: 600, fontSize: 12.5 }}>Blocked by Quality Gate</span>
            <span className="stat-icon" style={{ background: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}>
              <ShieldAlert size={16} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
            <span className="stat-value" style={{ color: 'var(--risk-high)', margin: 0 }}>
              {highCount}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              PRs ({Math.round(highRiskRate)}%)
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
            Requires senior review and regression testing
          </div>
        </div>

        {/* KPI 2: Safe Merge Rate */}
        <div
          className="stat-card"
          onClick={() => {
            setActiveTab('prs');
            setRiskFilter('LOW');
          }}
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--risk-low)' }}
          title="Click to view all safe pull requests"
        >
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="stat-label" style={{ fontWeight: 600, fontSize: 12.5 }}>Safe Merge Rate</span>
            <span className="stat-icon" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)' }}>
              <ShieldCheck size={16} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
            <span className="stat-value" style={{ color: 'var(--risk-low)', margin: 0 }}>
              {Math.round(safeApprovalRate)}%
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              ({lowCount} PRs)
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
            Automated Quality Gate approval eligible
          </div>
        </div>

        {/* KPI 3: Monitored Codebases */}
        <div
          className="stat-card"
          onClick={() => setActiveTab('repos')}
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--accent-primary)' }}
          title="Click to manage monitored repositories"
        >
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="stat-label" style={{ fontWeight: 600, fontSize: 12.5 }}>Monitored Codebases</span>
            <span className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
              <FolderGit2 size={16} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
            <span className="stat-value" style={{ margin: 0 }}>
              {totalRepos}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Repos ({totalPRs} PRs)
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
            Continuous webhook & commit tracking active
          </div>
        </div>
      </div>

      {/* 4. Dual Tab View Switcher (Cockpit Segmented Control) */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="view-tabs">
          <button
            type="button"
            className={`view-tab-btn ${activeTab === 'prs' ? 'active' : ''}`}
            onClick={() => setActiveTab('prs')}
          >
            <ListTodo size={15} />
            <span>Active Pull Requests ({totalPRs})</span>
          </button>
          <button
            type="button"
            className={`view-tab-btn ${activeTab === 'repos' ? 'active' : ''}`}
            onClick={() => setActiveTab('repos')}
          >
            <FolderGit2 size={15} />
            <span>Monitored Repositories ({totalRepos})</span>
          </button>
        </div>
      </div>

      {/* 5. TAB 1: Actionable Pull Request Triage Feed */}
      {activeTab === 'prs' && (
        <div className="card animate-in" style={{ padding: 24 }}>
          {/* Triage Filter Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>
                Pull Request Risk Triage
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filteredPRs.length} of {recentPRs.length} evaluated pull requests across all repositories.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Risk Level Filter Chips */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  background: 'var(--bg-input)',
                  padding: 3,
                  borderRadius: 20,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  className={`chip ${riskFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('ALL')}
                  style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}
                >
                  All ({recentPRs.length})
                </button>
                <button
                  className={`chip ${riskFilter === 'HIGH' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('HIGH')}
                  style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}
                >
                  🛑 High ({highCount})
                </button>
                <button
                  className={`chip ${riskFilter === 'MEDIUM' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('MEDIUM')}
                  style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}
                >
                  ⚠️ Medium ({medCount})
                </button>
                <button
                  className={`chip ${riskFilter === 'LOW' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('LOW')}
                  style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}
                >
                  ✅ Safe ({lowCount})
                </button>
              </div>

              {/* Live Search Input */}
              <div style={{ position: 'relative', width: 220 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search title, author, repo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 28px 7px 30px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button
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
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Render PRTable with 10-Item Pagination & Counterfactual Simulator */}
          {filteredPRs.length > 0 ? (
            <PRTable pullRequests={filteredPRs} showRepo={true} pageSize={10} />
          ) : (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No matching pull requests found</div>
              <div className="empty-state-text">
                No PRs match filter "{riskFilter}" {searchQuery ? `and query "${searchQuery}"` : ''}.
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setRiskFilter('ALL');
                  setSearchQuery('');
                }}
                style={{ marginTop: 12 }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: Monitored Repositories Management */}
      {activeTab === 'repos' && (
        <Repositories
          onRepoAdded={fetchData}
          externalModalOpen={showConnectModal}
          onCloseExternalModal={() => setShowConnectModal(false)}
        />
      )}

      {/* Connect Modal when invoked from Header while on Tab 1 */}
      {activeTab === 'prs' && showConnectModal && (
        <Repositories
          onRepoAdded={fetchData}
          externalModalOpen={true}
          onCloseExternalModal={() => setShowConnectModal(false)}
        />
      )}
    </div>
  );
}
