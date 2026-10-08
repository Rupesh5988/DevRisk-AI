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
          <th style={{ textAlign: 'right' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pullRequests.map((pr) => (
          <tr
            key={pr.id}
            onClick={() => navigate(`/prs/${pr.id}`)}
            style={{ cursor: 'pointer' }}
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
              <div style={{ marginBottom: 4 }}>{pr.status || 'open'}</div>
              {pr.ground_truth_status && (
                <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                    background: pr.ground_truth_status === 'DEFECT_INDUCING' ? 'rgba(239, 68, 68, 0.15)' :
                                pr.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'rgba(34, 197, 94, 0.15)' :
                                'rgba(156, 163, 175, 0.15)',
                    color: pr.ground_truth_status === 'DEFECT_INDUCING' ? 'var(--risk-high)' :
                           pr.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'var(--risk-low)' :
                           'var(--text-secondary)'
                  }}>
                    {pr.ground_truth_status.replace(/_/g, ' ')}
                  </span>
                  {pr.evaluation_result && pr.evaluation_result !== 'NOT_EVALUATED' && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                      background: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(pr.evaluation_result) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(pr.evaluation_result) ? 'var(--risk-low)' : 'var(--risk-high)'
                    }}>
                      {pr.evaluation_result === 'TRUE_POSITIVE' ? 'TP' :
                       pr.evaluation_result === 'TRUE_NEGATIVE' ? 'TN' :
                       pr.evaluation_result === 'FALSE_POSITIVE' ? 'FP' : 'FN'}
                    </span>
                  )}
                </div>
              )}
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
            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(`/simulator?prId=${pr.id}`)}
                  title={`Simulate counterfactual changes on PR #${pr.pr_number || pr.id} in Playground`}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>⚡</span>
                  <span>Simulate</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/prs/${pr.id}`)}
                  title={`View detailed SHAP analysis for PR #${pr.pr_number || pr.id}`}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  View ↗
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
