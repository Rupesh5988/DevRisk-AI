// ============================================================
// PR Detail Page
// ============================================================
// Full analysis report for a single Pull Request showing:
// risk gauge, SHAP explanations, features table, and dep graph.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPRDetail } from '../services/api';
import RiskGauge from '../components/RiskGauge';
import ShapCard from '../components/ShapCard';
import GraphView from '../components/GraphView';

const FEATURE_LABELS = {
  ns: 'Subsystems Modified', nd: 'Directories Modified', nf: 'Files Modified',
  entropy: 'Change Entropy', la: 'Lines Added', ld: 'Lines Deleted',
  lt: 'Lines in Modified Files', fix: 'Is Bug Fix', ndev: 'Prior Developers',
  age: 'File Age (days)', nuc: 'Unique Changes', exp: 'Developer Experience',
  rexp: 'Recent Experience', sexp: 'Subsystem Experience',
};

export default function PRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPR() {
      try {
        setLoading(true);
        const res = await getPRDetail(id);
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch PR detail:', err);
        setError(err.response?.status === 404 ? 'Pull Request not found.' : 'Failed to load PR data.');
      } finally {
        setLoading(false);
      }
    }
    fetchPR();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading PR analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const pr = data.pull_request;
  const features = data.features;
  const shapExplanations = data.shap_explanations || [];
  const graph = data.dependency_graph || { nodes: [], edges: [] };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {pr.repo_owner}/{pr.repo_name}
          </span>
        </div>
        <h1 className="page-title">
          PR #{pr.pr_number}: {pr.title || 'Untitled'}
        </h1>
        <p className="page-subtitle">
          by {pr.author} • {new Date(pr.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
          {' • '}
          <span style={{ color: 'var(--risk-low)' }}>+{pr.additions}</span>
          {' / '}
          <span style={{ color: 'var(--risk-high)' }}>-{pr.deletions}</span>
          {' • '}
          {pr.files_changed} file(s) changed
        </p>
      </div>

      {/* Risk Gauge + SHAP side-by-side */}
      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="card animate-in">
          <RiskGauge score={pr.risk_score} />
        </div>
        <div className="animate-in">
          <ShapCard explanations={shapExplanations} />
        </div>
      </div>

      {/* Features Table */}
      {features && (
        <div className="card animate-in" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <h3 className="card-title">Extracted Features</h3>
            <span className="card-subtitle">14 ApacheJIT change-pattern metrics</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(features).map(([key, value]) => {
                if (key === 'id' || key === 'pr_id') return null;
                return (
                  <tr key={key}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{key}</td>
                    <td>{FEATURE_LABELS[key] || key}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {typeof value === 'number' ? Number(value).toFixed(2) : value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dependency Graph */}
      <div className="animate-in">
        <GraphView graphData={graph} modifiedFiles={graph.nodes || []} />
      </div>

      {/* External Link */}
      {pr.github_url && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a
            href={pr.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View on GitHub ↗
          </a>
        </div>
      )}
    </>
  );
}
