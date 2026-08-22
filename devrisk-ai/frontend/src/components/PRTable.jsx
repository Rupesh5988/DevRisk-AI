// ============================================================
// PR Table Component
// ============================================================
// Reusable table for displaying pull request lists with
// risk badges, clickable rows, and sorting.
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';

function getRiskClass(label) {
  if (!label) return 'unknown';
  return label.toLowerCase();
}

export default function PRTable({ pullRequests = [], showRepo = false }) {
  const navigate = useNavigate();

  if (pullRequests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">No Pull Requests</div>
        <div className="empty-state-text">
          No PRs have been analyzed yet. Configure a GitHub webhook to start tracking.
        </div>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Pull Request</th>
          {showRepo && <th>Repository</th>}
          <th>Author</th>
          <th>Changes</th>
          <th>Risk Score</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {pullRequests.map((pr) => (
          <tr
            key={pr.id}
            onClick={() => navigate(`/prs/${pr.id}`)}
          >
            <td>
              <div style={{ fontWeight: 600 }}>#{pr.pr_number}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {pr.title ? (pr.title.length > 50 ? pr.title.slice(0, 50) + '...' : pr.title) : 'Untitled'}
              </div>
            </td>
            {showRepo && (
              <td style={{ fontSize: 13 }}>
                {pr.repo_owner}/{pr.repo_name}
              </td>
            )}
            <td>{pr.author}</td>
            <td>
              <span style={{ color: 'var(--risk-low)' }}>+{pr.additions || 0}</span>
              {' / '}
              <span style={{ color: 'var(--risk-high)' }}>-{pr.deletions || 0}</span>
            </td>
            <td>
              <span className={`risk-badge ${getRiskClass(pr.risk_label)}`}>
                {pr.risk_score >= 0 ? `${Math.round(pr.risk_score)}%` : 'N/A'}
                {' '}
                {pr.risk_label || 'UNKNOWN'}
              </span>
            </td>
            <td style={{ textTransform: 'capitalize' }}>
              {pr.status || 'open'}
            </td>
            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {pr.created_at
                ? new Date(pr.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
