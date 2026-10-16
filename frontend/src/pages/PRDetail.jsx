// ============================================================
// PR Detail Page — Full Analysis Report with In-Place Explanations
// ============================================================
// Displays risk gauge, CI/CD quality gate, TreeSHAP drivers,
// dynamic value interpretations, and AST dependency graph.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPRDetail, refreshPRAnalysis, getGroundTruthByPR, analyzeGroundTruth } from '../services/api';
import RiskGauge from '../components/RiskGauge';
import ShapCard from '../components/ShapCard';
import GraphView from '../components/GraphView';
import FeatureTooltip from '../components/FeatureTooltip';
import { getFeatureDef, FEATURE_CATEGORIES } from '../utils/featureDefinitions';

export default function PRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gtData, setGtData] = useState(null);
  const [gtLoading, setGtLoading] = useState(false);

  useEffect(() => {
    async function fetchPR() {
      try {
        setLoading(true);
        const res = await getPRDetail(id);
        setData(res.data);
        
        try {
          const gtRes = await getGroundTruthByPR(id);
          setGtData(gtRes.data);
        } catch (gtErr) {
          console.error('Failed to fetch ground truth:', gtErr);
        }
      } catch (err) {
        console.error('Failed to fetch PR detail:', err);
        setError('Failed to load pull request details.');
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
        <div className="loading-text">Analyzing pull request risk profile...</div>
      </div>
    );
  }

  if (error || !data || !data.pull_request) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">{error || 'Pull Request not found.'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const pr = data.pull_request;
  const features = data.features;
  const shapExplanations = data.shap_explanations || [];
  const securityVulnerabilities = data.security_vulnerabilities || [];
  const graph = data.dependency_graph || { nodes: [], edges: [] };

  const riskScore = pr.risk_score || 0;
  const hasCriticalVulns = securityVulnerabilities.some(
    (v) => v.severity === 'CRITICAL' || (v.cvss_score && v.cvss_score >= 9.0)
  );
  const maxCvss = securityVulnerabilities.length > 0
    ? Math.max(...securityVulnerabilities.map((v) => v.cvss_score || 0))
    : 0;

  // CI/CD Quality Gate logic
  const cicdStatus =
    hasCriticalVulns
      ? {
          status: 'MERGE_BLOCKED',
          label: `Merge Blocked — Critical Security Vulnerability (CVSS ${maxCvss})`,
          color: 'var(--risk-high)',
          bg: 'rgba(239, 68, 68, 0.16)',
          border: 'rgba(239, 68, 68, 0.6)',
          icon: '🚨',
          reason: `Detected ${securityVulnerabilities.length} severe security vulnerability(ies) in code diff. Remote Code Execution, SQL Injection, or credential exposure detected. Quality Gate blocked until code is sanitized.`,
        }
      : riskScore >= 70
      ? {
          status: 'MERGE_BLOCKED',
          label: 'Merge Blocked — High Defect Risk',
          color: 'var(--risk-high)',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.4)',
          icon: '🛑',
          reason: 'Defect risk exceeds 70% safety threshold. Requires senior code review approval and passing test suite verification before merge.',
        }
      : riskScore >= 40
      ? {
          status: 'MANUAL_REVIEW_REQUIRED',
          label: 'Peer Review Required',
          color: 'var(--risk-medium)',
          bg: 'rgba(234, 179, 8, 0.12)',
          border: 'rgba(234, 179, 8, 0.4)',
          icon: '⚠️',
          reason: 'Moderate defect risk (40%–70%). Auto-merge paused. Requires at least 1 peer approval addressing flagged risk drivers.',
        }
      : {
          status: 'MERGE_APPROVED',
          label: 'Quality Gate Passed',
          color: 'var(--risk-low)',
          bg: 'rgba(34, 197, 94, 0.12)',
          border: 'rgba(34, 197, 94, 0.4)',
          icon: '✅',
          reason: 'Low defect risk (<40%). Code modifications meet repository stability and test coverage standards.',
        };

  const handleCopyReviewComment = () => {
    let comment = `### 🛡️ DevRisk AI Report: **${pr.risk_label} RISK (${pr.risk_score}%)**
- **Author:** @${pr.author}
- **Quality Gate:** \`${cicdStatus.status}\` (${cicdStatus.label})
- **Changes:** +${pr.additions || 0} / -${pr.deletions || 0} across ${pr.files_changed || 0} file(s)
`;

    if (securityVulnerabilities.length > 0) {
      comment += `\n#### 🚨 Security Vulnerabilities Detected (${securityVulnerabilities.length}):\n`;
      securityVulnerabilities.forEach((v) => {
        comment += `- **[${v.severity}] ${v.vulnerability_type}** (CVSS: ${v.cvss_score}) at \`${v.file_path}:${v.line_number}\`\n  - *Remediation:* ${v.remediation}\n`;
      });
    }

    comment += `\n#### 🔍 Top Risk Factors (TreeSHAP):\n`;
    comment += shapExplanations.slice(0, 3).map((e) => `- **${e.feature_name}**: ${e.explanation}`).join('\n');
    comment += `\n\n> Generated by DevRisk AI Just-In-Time Intelligence.`;

    navigator.clipboard.writeText(comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRunGroundTruth = async () => {
    try {
      setGtLoading(true);
      const res = await analyzeGroundTruth(id);
      setGtData(res.data);
    } catch (err) {
      console.error('Failed to run ground truth analysis:', err);
      alert('Failed to run analysis. Check console for details.');
    } finally {
      setGtLoading(false);
    }
  };

  const handleRefreshRisk = async () => {
    try {
      setRefreshing(true);
      setRefreshSuccess(false);
      const res = await refreshPRAnalysis(id);
      setData(res.data);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to refresh PR analysis:', err);
      alert('Failed to refresh risk prediction. Please ensure backend and ML service are running.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulateInPlayground = () => {
    navigate('/simulator', {
      state: {
        preloadedFeatures: features,
        prTitle: pr.title,
        prNumber: pr.pr_number,
        repoName: `${pr.repo_owner || 'repo'}/${pr.repo_name || 'project'}`,
      },
    });
  };

  return (
    <div className="pr-detail-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {pr.repo_owner || 'repo'}/{pr.repo_name || 'project'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>•</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'monospace' }}>
              PR #{pr.pr_number}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleRefreshRisk}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                padding: '7px 14px',
                borderColor: refreshSuccess ? 'var(--risk-low)' : undefined,
                color: refreshSuccess ? 'var(--risk-low)' : undefined,
              }}
              title="Re-fetch code, re-compute features, re-run calibrated ML & AST security scanner"
            >
              <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
                {refreshing ? '⏳' : refreshSuccess ? '✅' : '🔄'}
              </span>
              <span>{refreshing ? 'Recalculating...' : refreshSuccess ? 'Risk Synchronized!' : 'Refresh Risk'}</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSimulateInPlayground}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
              title="Open in Playground to adjust metrics and explore counterfactual risk"
            >
              <span>⚡</span>
              <span>Simulate in Playground</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleCopyReviewComment}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '7px 14px', width: 210 }}
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Review Comment'}</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/metrics-dictionary', { state: { from: 'PR Detail', path: `/prs/${pr.id}` } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
              title="Open full 28-metric dictionary"
            >
              <span>📖</span>
              <span>Metrics Guide</span>
            </button>
          </div>
        </div>

        <h1 className="page-title" style={{ marginTop: 12, fontSize: 24 }}>
          {pr.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>Author: <strong>@{pr.author}</strong></span>
          <span>Branch: <code style={{ color: 'var(--text-primary)' }}>{pr.branch}</code></span>
          <span>
            Diff: <strong style={{ color: 'var(--risk-low)' }}>+{pr.additions || 0}</strong> / <strong style={{ color: 'var(--risk-high)' }}>-{pr.deletions || 0}</strong>
          </span>
          <span>Evaluated: {new Date(pr.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* CI/CD Quality Gate Banner */}
      <div
        className="animate-in"
        style={{
          borderRadius: 'var(--radius-md)',
          background: cicdStatus.bg,
          border: `1px solid ${cicdStatus.border}`,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>{cicdStatus.icon}</span>
          <strong style={{ color: cicdStatus.color, fontSize: 15 }}>
            {cicdStatus.label} ({cicdStatus.status})
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {cicdStatus.reason}
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECURITY & AST VULNERABILITY SECTION                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {securityVulnerabilities && securityVulnerabilities.length > 0 && (
        <div
          className="card animate-in"
          style={{
            padding: 24,
            marginBottom: 28,
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <h3 className="card-title" style={{ fontSize: 18, color: 'var(--risk-high)', margin: 0 }}>
                  Security & AST Vulnerabilities Detected ({securityVulnerabilities.length})
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--risk-high)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  HIGH IMPACT OVERRIDE
                </span>
              </div>
              <span className="card-subtitle" style={{ display: 'block' }}>
                Severe vulnerability patterns detected in modified code lines. These findings escalate the PR risk score and block automated merge gates.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--risk-high)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                Security Penalty: +{pr.security_score || Math.min(98, securityVulnerabilities.reduce((acc, v) => acc + (v.impact_score || 20), 0))}%
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {securityVulnerabilities.map((vuln, idx) => {
              const isCrit = vuln.severity === 'CRITICAL' || (vuln.cvss_score && vuln.cvss_score >= 9.0);
              return (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    background: 'var(--bg-glass)',
                    border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          background: isCrit ? 'rgba(239, 68, 68, 0.25)' : 'rgba(234, 179, 8, 0.25)',
                          color: isCrit ? '#f87171' : '#fbbf24',
                          border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                        }}
                      >
                        {vuln.severity || 'CRITICAL'}
                      </span>
                      {vuln.cvss_score && (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          CVSS {vuln.cvss_score}
                        </span>
                      )}
                      <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {vuln.vulnerability_type}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                      <code style={{ color: 'var(--accent-primary)', fontSize: 12 }}>
                        {vuln.file_path}:{vuln.line_number}
                      </code>
                      {vuln.impact_score && (
                        <span style={{ color: 'var(--risk-high)', fontWeight: 700 }}>
                          +{vuln.impact_score}% Risk
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {vuln.description}
                  </p>

                  {vuln.snippet && (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: '#fca5a5',
                        marginBottom: 10,
                        overflowX: 'auto',
                      }}
                    >
                      <code>{vuln.snippet}</code>
                    </div>
                  )}

                  {vuln.remediation && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 12.5,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>💡</span>
                      <div>
                        <strong style={{ color: 'var(--risk-low)' }}>Recommended Remediation: </strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{vuln.remediation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* GROUND TRUTH VALIDATION SECTION                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {gtData && (
        <div className="card animate-in" style={{ padding: 24, marginBottom: 28, background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>SZZ Git-Blame Ground Truth Verification</h3>
              <span className="card-subtitle" style={{ display: 'block', marginBottom: 12 }}>
                Post-merge outcome verified via SZZ git blame trace and downstream bug-fix matching.
              </span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                  <strong style={{ color: 'var(--text-muted)' }}>SZZ OUTCOME:</strong>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: 11,
                    background: gtData.ground_truth_status === 'DEFECT_INDUCING' ? 'rgba(239, 68, 68, 0.15)' :
                                gtData.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'rgba(34, 197, 94, 0.15)' :
                                'rgba(156, 163, 175, 0.15)',
                    color: gtData.ground_truth_status === 'DEFECT_INDUCING' ? 'var(--risk-high)' :
                           gtData.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'var(--risk-low)' :
                           'var(--text-secondary)'
                  }}>
                    {gtData.ground_truth_status === 'DEFECT_INDUCING' ? 'Defect-Inducing (Bug Confirmed)' :
                     gtData.ground_truth_status === 'NON_DEFECT_INDUCING' ? 'Clean / Non-Defect' :
                     gtData.ground_truth_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                  <strong style={{ color: 'var(--text-muted)' }}>SZZ CONFIDENCE:</strong>
                  <span>{gtData.confidence}</span>
                </div>
                {gtData.evaluation_result !== 'NOT_EVALUATED' && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                    <strong style={{ color: 'var(--text-muted)' }}>MODEL ALIGNMENT:</strong>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontSize: 11,
                      background: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(gtData.evaluation_result) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: ['TRUE_POSITIVE', 'TRUE_NEGATIVE'].includes(gtData.evaluation_result) ? 'var(--risk-low)' : 'var(--risk-high)'
                    }}>
                      {gtData.evaluation_result === 'TRUE_POSITIVE' ? 'Accurately Flagged High Risk (True Positive)' :
                       gtData.evaluation_result === 'TRUE_NEGATIVE' ? 'Accurately Cleared Safe (True Negative)' :
                       gtData.evaluation_result === 'FALSE_POSITIVE' ? 'False Alarm (Flagged High, Was Safe)' :
                       gtData.evaluation_result === 'FALSE_NEGATIVE' ? 'Missed Defect (Flagged Low, Had Bug)' :
                       gtData.evaluation_result.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              className="btn btn-secondary" 
              onClick={handleRunGroundTruth} 
              disabled={gtLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
            >
              <span>{gtLoading ? '⏳' : '🔄'}</span>
              <span>{gtLoading ? 'Running SZZ Trace...' : 'Run SZZ Blame Trace'}</span>
            </button>
          </div>

          {gtData.evidence && gtData.evidence.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <strong style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidence Log</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gtData.evidence.map((ev, idx) => (
                  <div key={idx} style={{ padding: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 16 }}>{ev.strength === 'HIGH' ? '🔥' : ev.strength === 'MEDIUM' ? '🔍' : '📝'}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{ev.evidence_type.replace(/_/g, ' ')} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>({ev.strength})</span></div>
                      <div style={{ color: 'var(--text-secondary)' }}>{ev.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Gauge + SHAP Drivers side-by-side */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <RiskGauge score={riskScore} />
          <div style={{ marginTop: 20, display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Files Touched</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{pr.files_changed || 0}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AST Dependencies</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>{graph.edges.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Factors</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--risk-high)' }}>{shapExplanations.length}</div>
            </div>
            {securityVulnerabilities.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--risk-high)', textTransform: 'uppercase', fontWeight: 700 }}>Security Issues</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--risk-high)' }}>
                  🚨 {securityVulnerabilities.length}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="animate-in">
          <ShapCard explanations={shapExplanations} />
        </div>
      </div>

      {/* Features Table with In-Place Explanations & Dynamic Meanings */}
      {features && (
        <div className="card animate-in" style={{ marginBottom: 28, padding: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 17, marginBottom: 2 }}>
                Extracted Change Metrics & Risk Interpretations
              </h3>
              <span className="card-subtitle">
                Observed code metrics for this pull request, evaluated against safe repository baselines.
              </span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/metrics-dictionary', { state: { from: 'PR Detail', path: `/prs/${pr.id}` } })}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              📖 Open Feature Dictionary
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Metric</th>
                  <th style={{ width: '13%' }}>Observed Value</th>
                  <th style={{ width: '13%' }}>Risk Rating</th>
                  <th style={{ width: '37%' }}>Technical Interpretation & Guidance</th>
                  <th style={{ width: '15%' }}>Safe Baseline</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(features).map(([key, rawVal]) => {
                  if (key === 'id' || key === 'pr_id') return null;
                  const def = getFeatureDef(key);
                  const interpretation = def.interpretValue(rawVal);
                  const displayVal =
                    typeof rawVal === 'number'
                      ? Number.isInteger(rawVal)
                        ? rawVal
                        : rawVal.toFixed(2)
                      : rawVal;

                  return (
                    <tr key={key}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
                            {key}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {def.label}
                          </span>
                          <FeatureTooltip featureName={key} value={rawVal} />
                        </div>
                      </td>

                      <td style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {displayVal} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{def.unit}</span>
                      </td>

                      <td>
                        <span className={`glossary-rating-pill rating-${interpretation.rating}`}>
                          <span className="rating-dot"></span>
                          {interpretation.label}
                        </span>
                      </td>

                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {interpretation.meaning}
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {def.safeRange}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dependency Graph */}
      <div className="card animate-in" style={{ padding: 24, marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Cross-File AST Dependency Graph</h3>
          <span className="card-subtitle">
            Visual blast radius showing imported and dependent modules connected to modified files.
          </span>
        </div>
        <GraphView graphData={graph} modifiedFiles={graph.nodes || []} />
      </div>

      {/* External Link */}
      {pr.github_url && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <a
            href={pr.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Original Pull Request on GitHub ↗
          </a>
        </div>
      )}
    </div>
  );
}
