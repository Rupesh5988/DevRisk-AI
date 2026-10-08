// ============================================================
// Dashboard Page — Modular, Intuitive & Dual-Theme Ready
// ============================================================
// Clean modular dashboard with guided onboarding, KPI summary,
// tabbed workspaces (Reviews Hub, Analytics, Metrics Dictionary),
// and plain-English metric explanations.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview } from '../services/api';
import Repositories from './Repositories';
import { AlertTriangle, Lightbulb, FolderGit2, LineChart, ShieldAlert, ShieldCheck, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dismissible onboarding guide state
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('devrisk_hide_guide') !== 'true';
  });





  useEffect(() => {
    async function fetchData() {
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
    }
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
        <div className="loading-text">Loading DevRisk Intelligence Dashboard...</div>
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
  const lowCount = distribution.LOW || 0;

  const totalPRs = summary.total_prs || 0;
  const highRiskRate = totalPRs > 0 ? (highCount / totalPRs) * 100 : 0;
  const safeApprovalRate = totalPRs > 0 ? (lowCount / totalPRs) * 100 : 0;



  return (
    <div className="dashboard-container">
      {/* Top Header & Fast Actions */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>Review Dashboard</h1>
              <span className="badge badge-low" style={{ fontSize: 11, padding: '2px 8px' }}>
                <CheckCircle size={12} style={{ marginRight: 4 }} /> Real-Time ML Engine Active
              </span>
            </div>

          </div>


        </div>
      </div>

      {/* Guided Onboarding Banner (Dismissible) */}
      {showGuide && (
        <div className="onboarding-guide-card animate-in">
          <div className="onboarding-header">
            <div className="onboarding-title-wrap">
              <span className="onboarding-icon"><Lightbulb size={20} /></span>
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
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <span className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}><FolderGit2 size={16} /></span>
            <span className="stat-label">Tracked Repositories</span>
          </div>
          <div className="stat-value" style={{ textAlign: 'center' }}>{summary.repositories_tracked || 0}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
            Active git repositories monitored
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <span className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}><LineChart size={16} /></span>
            <span className="stat-label">Total PRs Evaluated</span>
          </div>
          <div className="stat-value" style={{ textAlign: 'center' }}>{totalPRs}</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
            Analyzed via JIT Defect Pipeline
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <span className="stat-icon" style={{ background: 'var(--risk-high-bg)', color: 'var(--risk-high)' }}><ShieldAlert size={16} /></span>
            <span className="stat-label">High Risk Block Rate</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-high)', textAlign: 'center' }}>
            {summary.high_risk_prs || highCount}
            <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, color: 'var(--text-secondary)' }}>
              ({Math.round(highRiskRate)}%)
            </span>
          </div>
          <div className="stat-change" style={{ color: 'var(--risk-high)', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
            Merge blocked / Require mandatory refactoring
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <span className="stat-icon" style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low)' }}><ShieldCheck size={16} /></span>
            <span className="stat-label">Safe Merge Rate</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-low)', textAlign: 'center' }}>
            {summary.low_risk_prs || lowCount}
            <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6, color: 'var(--text-secondary)' }}>
              ({Math.round(safeApprovalRate)}%)
            </span>
          </div>
          <div className="stat-change" style={{ color: 'var(--risk-low)', fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
            Automated Quality Gate Approved
          </div>
        </div>
      </div>

      {/* Repositories Section */}
      <div style={{ marginTop: '24px' }}>
        <Repositories />
      </div>
    </div>
  );
}
