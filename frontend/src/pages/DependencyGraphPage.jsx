// ============================================================
// Dependency Graph Page — AST Blast Radius Cockpit
// ============================================================
// Visualizes cross-file import/require relationships, detects
// downstream caller blast radius, and highlights ripple effects.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { listRepos, getPRsByRepo, getPRDetail } from '../services/api';
import GraphView from '../components/GraphView';
import { Network, Zap, ExternalLink, ArrowLeft } from 'lucide-react';

export default function DependencyGraphPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const prIdFromUrl = searchParams.get('prId') || location.state?.prId;
  const repoIdFromUrl = searchParams.get('repoId') || location.state?.repoId;

  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(repoIdFromUrl || '');
  const [prs, setPrs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(prIdFromUrl || '');
  const [prDetail, setPrDetail] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [modifiedFiles, setModifiedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 1. Fetch Repositories on Mount and Auto-Select First Repo
  useEffect(() => {
    async function initRepos() {
      try {
        setInitialLoading(true);
        const res = await listRepos();
        const repoList = res.data.repositories || [];
        setRepos(repoList);

        if (repoList.length > 0 && !selectedRepo) {
          // Auto-select first repo if none specified in URL
          const targetRepo = repoList[0].id.toString();
          setSelectedRepo(targetRepo);
        }
      } catch (err) {
        console.error('Failed to fetch repositories:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    initRepos();
  }, []);

  // 2. Fetch PRs when Repository Changes
  const loadPRsForRepo = useCallback(async (repoId, autoSelectFirst = true) => {
    if (!repoId) {
      setPrs([]);
      return;
    }
    try {
      const res = await getPRsByRepo(repoId, 1, 50);
      const prList = res.data.pull_requests || [];
      setPrs(prList);

      // Auto-select first PR if no PR is currently selected or if requested
      if (prList.length > 0 && (autoSelectFirst || !selectedPR)) {
        setSelectedPR(prList[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to fetch PRs for repository:', err);
    }
  }, [selectedPR]);

  useEffect(() => {
    if (selectedRepo) {
      const shouldAutoSelect = !prIdFromUrl;
      loadPRsForRepo(selectedRepo, shouldAutoSelect);
    }
  }, [selectedRepo, loadPRsForRepo, prIdFromUrl]);

  // 3. Fetch Graph & PR Detail when PR is Selected
  useEffect(() => {
    if (!selectedPR) {
      setGraphData(null);
      setPrDetail(null);
      setModifiedFiles([]);
      return;
    }

    async function fetchGraphData() {
      try {
        setLoading(true);
        const res = await getPRDetail(selectedPR);
        const prObj = res.data.pull_request || res.data.pr || res.data;
        setPrDetail(prObj);

        // Keep repository dropdown aligned with loaded PR
        if (prObj.repo_id && prObj.repo_id.toString() !== selectedRepo) {
          setSelectedRepo(prObj.repo_id.toString());
        }

        const rawGraph = res.data.dependency_graph || { nodes: [], edges: [] };
        setGraphData(rawGraph);

        // Extract directly modified files (sources of dependency edges)
        const directSources = Array.from(new Set((rawGraph.edges || []).map((e) => e.source)));
        setModifiedFiles(directSources.length > 0 ? directSources : (rawGraph.nodes || []));
      } catch (err) {
        console.error('Failed to fetch dependency graph for PR:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraphData();
  }, [selectedPR]);

  const edges = graphData?.edges || [];
  const nodes = graphData?.nodes || [];
  const directSources = Array.from(new Set(edges.map((e) => e.source)));
  const downstreamCallers = Array.from(new Set(edges.map((e) => e.target)));
  const totalBlastReach = nodes.length;

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Dependency Blast Radius Cockpit...</div>
      </div>
    );
  }

  const currentRepo = repos.find((r) => r.id.toString() === selectedRepo);
  const repoLanguage = currentRepo?.language || '';
  const isJSRepo = !repoLanguage || ['javascript', 'typescript', 'js', 'ts', 'node'].includes(repoLanguage.toLowerCase());
  const hasNoGraphData = !graphData || !graphData.nodes || graphData.nodes.length === 0;

  return (
    <div className="dashboard-container">
      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: 20 }}>AST Dependency & Blast Radius Graph</h1>
              <p className="page-subtitle" style={{ margin: '2px 0 0', fontSize: 12 }}>
                Visualize cross-file ripple effects and downstream caller impact before merging code.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compact Control Strip: Repository & PR Switcher */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Repository:
              </span>
              <select
                className="input-field"
                value={selectedRepo}
                onChange={(e) => {
                  setSelectedRepo(e.target.value);
                  setSelectedPR('');
                }}
                style={{ fontSize: 12.5, padding: '5px 10px', minWidth: 180 }}
              >
                <option value="">-- Select Repository --</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.owner}/{r.name} {r.language ? `(${r.language})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Pull Request:
              </span>
              <select
                className="input-field"
                value={selectedPR}
                onChange={(e) => setSelectedPR(e.target.value)}
                disabled={!selectedRepo || prs.length === 0}
                style={{ fontSize: 12.5, padding: '5px 10px', minWidth: 260, maxWidth: 360 }}
              >
                <option value="">
                  {prs.length === 0 ? '-- No PRs in Repository --' : '-- Choose a Pull Request --'}
                </option>
                {prs.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    #{pr.pr_number || pr.id} — {pr.title ? (pr.title.length > 36 ? pr.title.slice(0, 36) + '...' : pr.title) : 'Untitled'} ({Math.round(pr.risk_score || 0)}% risk)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick PR Chips (Fast 1-Click Navigation) */}
          {prs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Quick Pick:
              </span>
              {prs.slice(0, 3).map((pr) => {
                const isSelected = selectedPR === pr.id.toString();
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setSelectedPR(pr.id.toString())}
                    style={{
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-input)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 14,
                      padding: '3px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    #{pr.pr_number || pr.id}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Blast Radius Impact Strip (Active PR Context) */}
      {prDetail && (
        <div className="card animate-in" style={{ padding: '16px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background:
                    prDetail.risk_score >= 70
                      ? 'var(--risk-high-bg)'
                      : prDetail.risk_score >= 40
                      ? 'var(--risk-medium-bg)'
                      : 'var(--risk-low-bg)',
                  color:
                    prDetail.risk_score >= 70
                      ? 'var(--risk-high)'
                      : prDetail.risk_score >= 40
                      ? 'var(--risk-medium)'
                      : 'var(--risk-low)',
                  border: `1px solid ${
                    prDetail.risk_score >= 70
                      ? 'rgba(239, 68, 68, 0.3)'
                      : prDetail.risk_score >= 40
                      ? 'rgba(234, 179, 8, 0.3)'
                      : 'rgba(34, 197, 94, 0.3)'
                  }`,
                }}
              >
                {Math.round(prDetail.risk_score || 0)}% Defect Risk ({prDetail.risk_label || 'NORMAL'})
              </span>

              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                #{prDetail.pr_number || prDetail.id} — {prDetail.title}
              </span>

              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                by <strong>@{prDetail.author}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/simulator?prId=${prDetail.id}`)}
                style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Open this PR in Playground to simulate counterfactual changes"
              >
                <Zap size={13} />
                <span>Simulate in Playground</span>
              </button>

              <button
                className="btn btn-primary"
                onClick={() => navigate(`/prs/${prDetail.id}`)}
                style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="View full TreeSHAP analysis and commit metrics report"
              >
                <span>View PR Report</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* 3-Metric Blast Radius Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🔴</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {directSources.length || (nodes.length > 0 ? 1 : 0)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Direct Files Modified</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🟡</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: 'var(--risk-medium)' }}>
                  {downstreamCallers.length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Downstream Callers Impacted</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🌐</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                  {totalBlastReach}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Blast Reach (Modules)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Graph Canvas, Language Scope Card, or Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Tracing cross-file AST dependencies...</div>
        </div>
      ) : selectedPR && !isJSRepo && hasNoGraphData ? (
        /* Language Scope Card for Java, Python, and other non-JS repositories */
        <div className="card animate-in" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 16px',
            }}
          >
            {repoLanguage.toLowerCase().includes('java') ? '☕' : repoLanguage.toLowerCase().includes('python') ? '🐍' : '📁'}
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            {repoLanguage || 'Non-JavaScript'} Codebase — AST Graph Scope
          </h3>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto 20px', lineHeight: 1.55 }}>
            The cross-file AST dependency graph currently parses relative <code>import</code> and <code>require()</code> paths in JavaScript & TypeScript.
            Java package namespaces (e.g. <code>import com.company.service.*</code>) are not mapped as file-level graph nodes.
          </p>

          <div style={{ maxWidth: 520, margin: '0 auto 24px', background: 'var(--bg-input)', padding: '14px 18px', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Active Defect Intelligence for this {repoLanguage} PR:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--risk-low)', fontWeight: 800 }}>✓</span>
                <span><strong>ML Defect Risk Scoring</strong>: Active ({Math.round(prDetail?.risk_score || 0)}% predicted risk)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--risk-low)', fontWeight: 800 }}>✓</span>
                <span><strong>TreeSHAP Risk Attribution</strong>: Active across all 28 change metrics</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--risk-low)', fontWeight: 800 }}>✓</span>
                <span><strong>CI/CD Quality Gate</strong>: {prDetail?.risk_score >= 70 ? 'MERGE BLOCKED' : prDetail?.risk_score >= 40 ? 'MANUAL REVIEW' : 'GATE PASSED'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/simulator?prId=${prDetail?.id}`)}
              style={{ fontSize: 12.5, padding: '7px 16px' }}
            >
              ⚡ Simulate in Playground
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/prs/${prDetail?.id}`)}
              style={{ fontSize: 12.5, padding: '7px 16px' }}
            >
              View Full PR Defect Report ↗
            </button>
          </div>
        </div>
      ) : graphData ? (
        <div className="animate-in">
          <GraphView graphData={graphData} modifiedFiles={modifiedFiles} />
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ minHeight: 380 }}>
            <div className="empty-state-icon"><Network size={36} /></div>
            <div className="empty-state-title">Select a Pull Request to View Dependencies</div>
            <div className="empty-state-text">
              Choose a repository and pull request above to visualize cross-file imports and downstream callers.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
