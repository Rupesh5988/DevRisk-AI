// ============================================================
// Analytics & Trends Page — Standalone
// ============================================================
// Extracted from Dashboard Tab 2 into its own route.
// ============================================================

import React, { useState, useEffect } from 'react';
import { getTrends, getOverview } from '../services/api';
import TrendChart from '../components/TrendChart';
import RiskPieChart from '../components/RiskPieChart';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        console.error('Failed to fetch analytics data:', err);
        setError('Failed to load analytics data. Is the backend running on port 3001?');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Analytics & Trends...</div>
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

  const distribution = overview?.risk_distribution || {};

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Analytics & Trends</h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Risk distribution breakdown, 30-day velocity trends, and quality gate interpretation.
          </p>
        </div>
      </div>

      {/* Analytics Content */}
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
    </div>
  );
}
