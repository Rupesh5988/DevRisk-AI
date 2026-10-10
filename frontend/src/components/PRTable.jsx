// ============================================================
// PR Table Component with Interactive 10-Item Pagination
// ============================================================
// Reusable table for displaying pull request lists with
// risk badges, clickable rows, sorting, and pagination (10 per page).
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function getRiskClass(label) {
  if (!label) return 'unknown';
  return label.toLowerCase();
}

export default function PRTable({ pullRequests = [], showRepo = false, pageSize = 10 }) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the dataset changes (e.g. repo switch or search filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [pullRequests]);

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

  const totalItems = pullRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentPRs = pullRequests.slice(startIndex, endIndex);

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pr-table-wrapper">
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
          {currentPRs.map((pr) => (
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
                  {pr.risk_score >= 0 ? `${Math.round(pr.risk_score)}%` : 'N/A'}{' '}
                  {pr.risk_label || 'UNKNOWN'}
                </span>
              </td>
              <td style={{ textTransform: 'capitalize' }}>
                <div style={{ marginBottom: 4 }}>{pr.status || 'open'}</div>
                {pr.ground_truth_status && (
                  <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        background:
                          pr.ground_truth_status === 'DEFECT_INDUCING'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : pr.ground_truth_status === 'NON_DEFECT_INDUCING'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(156, 163, 175, 0.15)',
                        color:
                          pr.ground_truth_status === 'DEFECT_INDUCING'
                            ? 'var(--risk-high)'
                            : pr.ground_truth_status === 'NON_DEFECT_INDUCING'
                            ? 'var(--risk-low)'
                            : 'var(--text-secondary)',
                      }}
                      title={pr.ground_truth_status === 'DEFECT_INDUCING' ? 'Historical commit caused a regression defect' : 'Historical commit was clean and non-defect'}
                    >
                      {pr.ground_truth_status === 'DEFECT_INDUCING' ? 'Defect-Inducing' : pr.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'Clean' : 'Pending'}
                    </span>
                    {pr.evaluation_result && pr.evaluation_result !== 'NOT_EVALUATED' && (
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          background: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(pr.evaluation_result)
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          color: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(pr.evaluation_result)
                            ? 'var(--risk-low)'
                            : 'var(--risk-high)',
                        }}
                        title={
                          pr.evaluation_result === 'TRUE_POSITIVE'
                            ? 'Accurately blocked high risk (True Positive)'
                            : pr.evaluation_result === 'TRUE_NEGATIVE'
                            ? 'Accurately passed safe (True Negative)'
                            : pr.evaluation_result === 'FALSE_POSITIVE'
                            ? 'False alarm (False Positive)'
                            : 'Missed defect (False Negative)'
                        }
                      >
                        {pr.evaluation_result === 'TRUE_POSITIVE'
                          ? 'TP'
                          : pr.evaluation_result === 'TRUE_NEGATIVE'
                          ? 'TN'
                          : pr.evaluation_result === 'FALSE_POSITIVE'
                          ? 'FP'
                          : 'FN'}
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
                    title={`Test change risk on PR #${pr.pr_number || pr.id} in Simulator`}
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

      {/* Pagination Navigation Footer */}
      <div
        className="pagination-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--bg-glass)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of{' '}
          <strong style={{ color: 'var(--accent-primary)' }}>{totalItems}</strong> Pull Requests
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage <= 1 ? 0.5 : 1,
            }}
          >
            <span>←</span>
            <span>Previous</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {getPageNumbers().map((num, idx) =>
              num === '...' ? (
                <span key={`dots-${idx}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 12 }}>
                  …
                </span>
              ) : (
                <button
                  key={`page-${num}`}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: safeCurrentPage === num ? 700 : 500,
                    borderRadius: 6,
                    border: safeCurrentPage === num ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: safeCurrentPage === num ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: safeCurrentPage === num ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    minWidth: 32,
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                  }}
                >
                  {num}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage >= totalPages ? 0.5 : 1,
            }}
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
