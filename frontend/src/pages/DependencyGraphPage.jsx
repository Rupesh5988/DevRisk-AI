// ============================================================
// Dependency Graph Page
// ============================================================
// Standalone page for viewing dependency graphs.
// User selects a repository and PR to view its graph.
// ============================================================

import React, { useState, useEffect } from 'react';
import { listRepos, getPRsByRepo, getPRDetail } from '../services/api';
import GraphView from '../components/GraphView';

export default function DependencyGraphPage() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prs, setPrs] = useState([]);
  const [selectedPR, setSelectedPR] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [modifiedFiles, setModifiedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch repos on mount
  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await listRepos();
        setRepos(res.data.repositories || []);
      } catch (err) {
        console.error('Failed to fetch repos:', err);
      }
    }
    fetchRepos();
  }, []);

  // Fetch PRs when repo is selected
  useEffect(() => {
    if (!selectedRepo) {
      setPrs([]);
      setSelectedPR('');
      return;
    }
    async function fetchPRs() {
      try {
        const res = await getPRsByRepo(selectedRepo, 1, 50);
        setPrs(res.data.pull_requests || []);
      } catch (err) {
        console.error('Failed to fetch PRs:', err);
      }
    }
    fetchPRs();
  }, [selectedRepo]);

  // Fetch graph when PR is selected
  useEffect(() => {
    if (!selectedPR) {
      setGraphData(null);
      return;
    }
    async function fetchGraph() {
      try {
        setLoading(true);
        const res = await getPRDetail(selectedPR);
        setGraphData(res.data.dependency_graph || { nodes: [], edges: [] });
        setModifiedFiles(res.data.dependency_graph?.nodes || []);
      } catch (err) {
        console.error('Failed to fetch graph:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [selectedPR]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dependency Graph</h1>
        <p className="page-subtitle">Interactive visualization of cross-file import/require dependencies</p>
      </div>

      {/* Selectors */}
      <div className="card animate-in" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Repository
            </label>
            <select
              className="input-field"
              value={selectedRepo}
              onChange={(e) => { setSelectedRepo(e.target.value); setSelectedPR(''); }}
            >
              <option value="">Select a repository...</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Pull Request
            </label>
            <select
              className="input-field"
              value={selectedPR}
              onChange={(e) => setSelectedPR(e.target.value)}
              disabled={!selectedRepo}
            >
              <option value="">Select a PR...</option>
              {prs.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  #{pr.pr_number} — {pr.title ? pr.title.slice(0, 60) : 'Untitled'}
                  {pr.risk_label ? ` (${pr.risk_label})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Graph */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Loading dependency graph...</div>
        </div>
      ) : graphData ? (
        <div className="animate-in">
          <GraphView graphData={graphData} modifiedFiles={modifiedFiles} />
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ minHeight: 400 }}>
            <div className="empty-state-icon">🔗</div>
            <div className="empty-state-title">Select a PR to View Dependencies</div>
            <div className="empty-state-text">
              Choose a repository and pull request above to visualize the cross-file dependency graph.
              Dependency data is available for JavaScript/Node.js repositories only.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
