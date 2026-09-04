// ============================================================
// Dashboard Page — Modular, Intuitive & Dual-Theme Ready
// ============================================================
// Clean modular dashboard with guided onboarding, KPI summary,
// tabbed workspaces (Reviews Hub, Analytics, Metrics Dictionary),
// and plain-English metric explanations.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview, getTrends } from '../services/api';
import PRTable from '../components/PRTable';
import TrendChart from '../components/TrendChart';
import RiskPieChart from '../components/RiskPieChart';
import { FEATURE_DEFINITIONS, FEATURE_CATEGORIES } from '../utils/featureDefinitions';

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active modular workspace tab: 'reviews' | 'analytics' | 'metrics'
  const [activeTab, setActiveTab] = useState('reviews');

  // Dismissible onboarding guide state
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('devrisk_hide_guide') !== 'true';
  });

  // Filters for recent PRs
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics dictionary search in Tab 3
  const [metricSearch, setMetricSearch] = useState('');
  const [metricCategory, setMetricCategory] = useState('ALL');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [overviewRes, trendsRes] = await Promise.all([
          getOverview(),
          getTrends(30),
        ]);
        setOverview(overviewRes.data);
        setTrends(trendsRes.data.trends || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Is the backend running on port 3001?');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleDismissGuide() {
    setShowGuide(false);
    localStorage.setItem('devrisk_hide_guide', 'true');
  }

  function handleOpenGlobalGlossary() {
    window.dispatchEvent(new CustomEvent('open-devrisk-glossary'));
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading DevRisk Intelligence Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
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

  // Filter PRs
  const filteredPRs = recentPRs.filter((pr) => {
    const matchesRisk =
      riskFilter === 'ALL' ||
      (pr.risk_label && pr.risk_label.toUpperCase() === riskFilter);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (pr.title && pr.title.toLowerCase().includes(q)) ||
      (pr.author && pr.author.toLowerCase().includes(q)) ||
      (pr.repo_name && pr.repo_name.toLowerCase().includes(q)) ||
      String(pr.pr_number).includes(q);

    return matchesRisk && matchesSearch;
  });

  const highCount = recentPRs.filter((pr) => pr.risk_label === 'HIGH').length;
  const medCount = recentPRs.filter((pr) => pr.risk_label === 'MEDIUM').length;
  const lowCount = recentPRs.filter((pr) => pr.risk_label === 'LOW').length;

  const totalPRs = summary.total_prs_analyzed || recentPRs.length || 0;
  const highRiskRate = totalPRs > 0 ? ((summary.high_risk_prs || highCount) / totalPRs) * 100 : 0;
  const safeApprovalRate = totalPRs > 0 ? ((summary.low_risk_prs || lowCount) / totalPRs) * 100 : 0;

  // Filter metrics for Tab 3
  const featureList = Object.values(FEATURE_DEFINITIONS);
  const filteredMetrics = featureList.filter((f) => {
    const matchesCat = metricCategory === 'ALL' || f.category === metricCategory;
    const q = metricSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.label.toLowerCase().includes(q) ||
      f.simpleDefinition.toLowerCase().includes(q) ||
      f.whyItMatters.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* Top Header & Fast Actions */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>Review Dashboard</h1>
              <span className="badge badge-low" style={{ fontSize: 11, padding: '2px 8px' }}>
                🟢 Real-Time ML Engine Active
              </span>
            </div>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              Automated defect risk predictions, CI/CD quality gates, and actionable review explanations.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/simulator')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 18px' }}
            >
              <span>⚡</span>
              <span>What-If Simulator</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => navigate('/repos')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 16px' }}
            >
              <span>📁</span>
              <span>Repositories</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleOpenGlobalGlossary}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 16px' }}
              title="Open full 28-metric dictionary"
            >
              <span>📖</span>
              <span>Metrics Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guided Onboarding Banner (Dismissible) */}
      {showGuide && (
        <div className="onboarding-guide-card animate-in">
          <div className="onboarding-header">
            <div className="onboarding-title-wrap">
              <span className="onboarding-icon">💡</span>
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
                <div className="onboarding-step-title">Ingest Pull Request</div>
                <div className="onboarding-step-desc">
                  GitHub webhooks or Playground simulations extract 28 change metrics (lines added, spread, author history).
                </div>
              </div>
            </div>

            <div className="onboarding-step">
              <div className="onboarding-step-num">2</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">AI Soft-Voting Ensemble</div>
                <div className="onboarding-step-desc">
                  Calibrated XGBoost + Random Forest predicts exact defect probability (0–100%) and sets CI/CD Quality Gate.
                </div>
              </div>
            </div>

            <div className="onboarding-step">
              <div className="onboarding-step-num">3</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">Actionable SHAP Guidance</div>
                <div className="onboarding-step-desc">
                  TreeSHAP highlights the exact files and lines driving risk so developers can refactor before merging.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean 4-Card KPI Strip */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Tracked Repositories</span>
            <span className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>📁</span>
          </div>
          <div className="stat-value">{summary.repositories_tracked || 0}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Active git repositories monitored
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total PRs Evaluated</span>
            <span className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>📊</span>
          </div>
          <div className="stat-value">{totalPRs}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Analyzed via JIT Defect Pipeline
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">High Risk Block Rate</span>
            <span className="stat-icon" style={{ background: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}>🛑</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-high)' }}>
            {summary.high_risk_prs || highCount}
            <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, color: 'var(--text-secondary)' }}>
              ({highRiskRate.toFixed(1)}%)
            </span>
          </div>
          <div className="stat-change" style={{ color: 'var(--risk-high)' }}>
            Merge blocked / Require mandatory refactoring
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Safe Merge Rate</span>
            <span className="stat-icon" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)' }}>✅</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-low)' }}>
            {summary.low_risk_prs || lowCount}
            <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, color: 'var(--text-secondary)' }}>
              ({safeApprovalRate.toFixed(1)}%)
            </span>
          </div>
          <div className="stat-change" style={{ color: 'var(--risk-low)' }}>
            Automated Quality Gate Approved
          </div>
        </div>
      </div>

      {/* Modular Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <span>📋</span>
          <span>Pull Request Review Hub</span>
          <span className="tab-badge">{recentPRs.length}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span>📊</span>
          <span>Analytics & Trends</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <span>📖</span>
          <span>Metrics Dictionary</span>
          <span className="tab-badge">28</span>
        </button>
      </div>

      {/* ======================================================
          TAB 1: PULL REQUEST REVIEW HUB
          ====================================================== */}
      {activeTab === 'reviews' && (
        <div className="card animate-in" style={{ padding: 24 }}>
          {/* Toolbar with Search and Filter Chips */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 17, marginBottom: 2 }}>Review Queue</h3>
              <span className="card-subtitle">
                Showing {filteredPRs.length} of {recentPRs.length} pull requests
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: 6, background: 'var(--bg-input)', padding: 3, borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
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

              {/* Search Bar */}
              <div style={{ position: 'relative', width: 240 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search PR or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 28px 7px 30px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PR Table */}
          <PRTable pullRequests={filteredPRs} />

          {/* Reset Filters Prompt if Empty */}
          {filteredPRs.length === 0 && (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
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

      {/* ======================================================
          TAB 2: ANALYTICS & TRENDS
          ====================================================== */}
      {activeTab === 'analytics' && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="grid-2">
            {/* Risk Distribution Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Risk Category Breakdown</h3>
                  <span className="card-subtitle">Distribution of all analyzed pull requests</span>
                </div>
              </div>
              <RiskPieChart distribution={distribution} />
            </div>

            {/* 30-Day Defect Velocity */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">30-Day Risk Velocity</h3>
                  <span className="card-subtitle">Average PR defect probability over time</span>
                </div>
              </div>
              <TrendChart trends={trends} />
            </div>
          </div>

          {/* Educational Summary Card */}
          <div className="card" style={{ padding: 22, background: 'var(--bg-glass)' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              💡 Interpreting Your Quality Gate Metrics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--risk-high-bg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <strong style={{ color: 'var(--risk-high)', display: 'block', marginBottom: 4 }}>🛑 High Risk (&gt; 70%)</strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Merge is automatically blocked in CI/CD. Requires senior reviewer approval and resolving the highlighted TreeSHAP risk factors.
                </span>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: 'var(--risk-medium-bg)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <strong style={{ color: 'var(--risk-medium)', display: 'block', marginBottom: 4 }}>⚠️ Medium Risk (40% – 70%)</strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Merge allowed with manual review. Recommend inspecting highlighted file modifications and running regression test suites.
                </span>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: 'var(--risk-low-bg)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <strong style={{ color: 'var(--risk-low)', display: 'block', marginBottom: 4 }}>✅ Low Risk (&lt; 40%)</strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Quality Gate passed. Low churn, focused file modifications, and experienced authors indicate minimal defect escape probability.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          TAB 3: METRICS DICTIONARY (PLAIN-ENGLISH EXPLAINER)
          ====================================================== */}
      {activeTab === 'metrics' && (
        <div className="card animate-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 18, marginBottom: 2 }}>
                📖 28-Metric Machine Learning Dictionary
              </h3>
              <p className="card-subtitle">
                Plain-English definitions, risk rationale, and safe ranges for every metric evaluated by DevRisk AI.
              </p>
            </div>

            {/* Metric Search */}
            <div style={{ position: 'relative', width: 280 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search metrics (e.g. entropy, exp)..."
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 28px 8px 30px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              {metricSearch && (
                <button
                  onClick={() => setMetricSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              className={`chip ${metricCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setMetricCategory('ALL')}
            >
              All Metrics ({featureList.length})
            </button>
            {Object.values(FEATURE_CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                className={`chip ${metricCategory === cat.id ? 'active' : ''}`}
                onClick={() => setMetricCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {filteredMetrics.map((f) => {
              const cat = FEATURE_CATEGORIES[f.category] || FEATURE_CATEGORIES.churn;
              return (
                <div key={f.name} className="glossary-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="glossary-card-top">
                    <div className="glossary-card-ident">
                      <span className="glossary-symbol-tag">{f.name}</span>
                      <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {f.label}
                      </h4>
                    </div>
                    <span className="glossary-cat-tag" style={{ background: `${cat.color}20`, color: cat.color }}>
                      {cat.icon} {cat.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginTop: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Definition
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                        {f.simpleDefinition}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Why It Matters
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {f.whyItMatters}
                      </span>
                    </div>
                  </div>

                  <div className="glossary-card-footer" style={{ marginTop: 12 }}>
                    <span>Unit: <strong>{f.unit}</strong></span>
                    <span>Safe Range: <strong style={{ color: 'var(--risk-low)' }}>{f.safeRange}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
