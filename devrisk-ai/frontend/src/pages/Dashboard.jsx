// ============================================================
// Dashboard Page
// ============================================================
// Main landing page showing overview stats, risk distribution,
// trend chart, and recent PRs table.
// ============================================================

import React, { useState, useEffect } from 'react';
import { getOverview, getTrends } from '../services/api';
import PRTable from '../components/PRTable';
import TrendChart from '../components/TrendChart';
import RiskPieChart from '../components/RiskPieChart';

export default function Dashboard() {
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
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Is the backend running?');
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
        <div className="loading-text">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Connection Error</div>
        <div className="empty-state-text">{error}</div>
      </div>
    );
  }

  const summary = overview?.summary || {};
  const distribution = overview?.risk_distribution || {};
  const recentPRs = overview?.recent_prs || [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time overview of PR risk analysis across all repositories</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card animate-in">
          <div className="stat-icon purple">📊</div>
          <div className="stat-value">{summary.total_prs || 0}</div>
          <div className="stat-label">Total PRs Analyzed</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon blue">📈</div>
          <div className="stat-value">{summary.avg_risk_score || 0}%</div>
          <div className="stat-label">Average Risk Score</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon red">🔴</div>
          <div className="stat-value">{distribution.HIGH || 0}</div>
          <div className="stat-label">High Risk PRs</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{summary.prs_today || 0}</div>
          <div className="stat-label">PRs Analyzed Today</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="animate-in">
          <TrendChart data={trends} />
        </div>
        <div className="animate-in">
          <RiskPieChart distribution={distribution} />
        </div>
      </div>

      {/* Recent PRs Table */}
      <div className="card animate-in">
        <div className="card-header">
          <h3 className="card-title">Recent Pull Requests</h3>
          <span className="card-subtitle">Latest analyzed PRs across all repos</span>
        </div>
        <PRTable pullRequests={recentPRs} showRepo={true} />
      </div>
    </>
  );
}
