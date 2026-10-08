// ============================================================
// Analytics & Trends Page — Standalone
// ============================================================
// Extracted from Dashboard Tab 2 into its own route.
// Now includes Model Validation & Ground Truth subsystem.
// ============================================================

import React, { useState, useEffect } from 'react';
import { getTrends, getOverview, getValidationSummary, getConfusionMatrix, getCalibration, getThresholdAnalysis } from '../services/api';
import TrendChart from '../components/TrendChart';
import RiskPieChart from '../components/RiskPieChart';
import { ArrowDown, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validation subsystem state
  const [valSummary, setValSummary] = useState(null);
  const [confMatrix, setConfMatrix] = useState(null);
  const [calibration, setCalibration] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [methodExpanded, setMethodExpanded] = useState(false);

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

      // Fetch validation data independently — failures don't block the page
      try {
        const [sumRes, cmRes, calRes, thrRes] = await Promise.allSettled([
          getValidationSummary(),
          getConfusionMatrix(),
          getCalibration(),
          getThresholdAnalysis(),
        ]);
        if (sumRes.status === 'fulfilled') setValSummary(sumRes.value.data);
        if (cmRes.status  === 'fulfilled') setConfMatrix(cmRes.value.data);
        if (calRes.status === 'fulfilled') setCalibration(calRes.value.data);
        if (thrRes.status === 'fulfilled') setThresholds(thrRes.value.data);
      } catch (e) {
        // Validation data unavailable — page continues without it
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
            Risk distribution, 30-day trends, model validation metrics, and ground truth coverage.
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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODEL VALIDATION & GROUND TRUTH SECTION — additive        */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* Validation Summary */}
        <div className="card" style={{ padding: 24 }}>
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>Model Validation & Ground Truth</h3>
          <span className="card-subtitle" style={{ display: 'block', marginBottom: 20 }}>
            Comparing predictions against independently derived defect evidence (SZZ). Only finalized records (not PENDING / INSUFFICIENT) are included in metrics.
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total PRs',             val: valSummary?.total_prs ?? '—', color: 'var(--text-primary)' },
              { label: 'GT Records',            val: valSummary?.total_ground_truth_records ?? '—', color: 'var(--text-primary)' },
              { label: 'Validated',             val: valSummary?.validated ?? '—', color: 'var(--risk-low)' },
              { label: 'Pending',               val: valSummary?.pending ?? '—', color: 'var(--accent-primary)' },
              { label: 'Insufficient Evidence', val: valSummary?.insufficient_evidence ?? '—', color: 'var(--text-muted)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
          {valSummary?.metrics_available ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { label: 'Accuracy',    val: valSummary.metrics?.accuracy },
                { label: 'Precision',   val: valSummary.metrics?.precision },
                { label: 'Recall',      val: valSummary.metrics?.recall },
                { label: 'F1 Score',    val: valSummary.metrics?.f1 },
                { label: 'ROC-AUC',     val: valSummary.metrics?.roc_auc },
                { label: 'Brier Score', val: valSummary.metrics?.brier_score, note: 'lower = better' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: m.val !== null && m.val !== undefined ? 'var(--risk-low)' : 'var(--text-muted)' }}>
                    {m.val !== null && m.val !== undefined ? m.val : '—'}
                  </div>
                  {m.note && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <HelpCircle size={28} style={{ color: 'var(--text-muted)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Not enough validated samples</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {valSummary?.message || 'Run ground-truth analysis on historical PRs to begin model validation.'}
              </div>
            </div>
          )}
        </div>

        {/* Confusion Matrix */}
        <div className="card" style={{ padding: 24 }}>
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>Confusion Matrix</h3>
          <span className="card-subtitle" style={{ display: 'block', marginBottom: 20 }}>
            Evaluated predictions vs. independently derived ground truth. Only finalized records included.
          </span>
          {confMatrix && confMatrix.total > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 8, fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10, textAlign: 'left', color: 'var(--text-muted)' }}></th>
                    <th colSpan={2} style={{ padding: 10, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTUAL</th>
                  </tr>
                  <tr>
                    <th style={{ padding: 10, textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>PREDICTED</th>
                    <th style={{ padding: 10, background: 'var(--risk-high-bg)', borderRadius: 6, color: 'var(--risk-high)', fontWeight: 700, textAlign: 'center', minWidth: 130 }}>DEFECT</th>
                    <th style={{ padding: 10, background: 'var(--risk-low-bg)', borderRadius: 6, color: 'var(--risk-low)', fontWeight: 700, textAlign: 'center', minWidth: 130 }}>SAFE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 10, fontWeight: 600, color: 'var(--risk-high)', fontSize: 13 }}>HIGH / MEDIUM</td>
                    <td style={{ padding: 18, background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--risk-low)' }}>{confMatrix.matrix.tp.count}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>TRUE POSITIVE ({confMatrix.matrix.tp.pct}%)</div>
                    </td>
                    <td style={{ padding: 18, background: 'rgba(234,179,8,0.08)', border: '2px solid rgba(234,179,8,0.3)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--risk-medium)' }}>{confMatrix.matrix.fp.count}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>FALSE POSITIVE ({confMatrix.matrix.fp.pct}%)</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 10, fontWeight: 600, color: 'var(--risk-low)', fontSize: 13 }}>LOW</td>
                    <td style={{ padding: 18, background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--risk-high)' }}>{confMatrix.matrix.fn.count}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>FALSE NEGATIVE ({confMatrix.matrix.fn.pct}%)</div>
                    </td>
                    <td style={{ padding: 18, background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--risk-low)' }}>{confMatrix.matrix.tn.count}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>TRUE NEGATIVE ({confMatrix.matrix.tn.pct}%)</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Total evaluated: {confMatrix.total} PRs</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              <HelpCircle size={24} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div>No evaluated predictions yet. Run <code>POST /api/ground-truth/analyze/:prId</code> on historical PRs.</div>
            </div>
          )}
        </div>

        {/* Threshold Analysis */}
        <div className="card" style={{ padding: 24 }}>
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>Threshold Analysis</h3>
          <span className="card-subtitle" style={{ display: 'block', marginBottom: 20 }}>
            Analytical only — does NOT change production CI/CD thresholds.
          </span>
          {thresholds?.available && thresholds.rows?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Threshold','TP','TN','FP','FN','Precision','Recall','F1','FPR','FNR'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {thresholds.rows.map(row => (
                    <tr key={row.threshold} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--accent-primary)' }}>{row.threshold}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--risk-low)' }}>{row.tp}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--risk-low)' }}>{row.tn}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--risk-medium)' }}>{row.fp}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--risk-high)' }}>{row.fn}</td>
                      <td style={{ padding: '9px 10px' }}>{row.precision ?? '—'}</td>
                      <td style={{ padding: '9px 10px' }}>{row.recall ?? '—'}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>{row.f1 ?? '—'}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{row.fpr ?? '—'}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{row.fnr ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Evaluated samples: {thresholds.total_samples}</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              <HelpCircle size={24} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div>{thresholds?.message || 'Insufficient data for threshold analysis.'}</div>
            </div>
          )}
        </div>

        {/* Methodology Expandable */}
        <div className="card" style={{ padding: 24 }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', width: '100%', color: 'var(--text-primary)' }}
            onClick={() => setMethodExpanded(v => !v)}
          >
            <span style={{ fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'left' }}>❓ How do we know a PR was defective? (Ground Truth Methodology)</span>
            {methodExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {methodExpanded && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {[
                'DevRisk AI makes a prediction at analysis time. The original prediction is stored and NEVER overwritten.',
                'After an observation window (default: 180 days), the system checks repository history.',
                'SZZ analysis traces subsequent commits that touched the same code regions.',
                'Bug-fix PRs, revert commits, issue links, and regression signals contribute as independent evidence.',
                'Each piece of evidence is assigned a confidence level: HIGH, MEDIUM, or LOW.',
                'Ground truth is then assigned: DEFECT_INDUCING, NON_DEFECT_INDUCING, PENDING, or INSUFFICIENT_EVIDENCE.',
                'The stored original prediction is compared against this ground truth → TP / TN / FP / FN.',
                'Aggregate metrics (Precision, Recall, F1, ROC-AUC, Brier Score) are computed from all validated records only.',
                '⚠️ Ground truth is evidence-based, not absolute proof. Repository history provides probabilistic signals, not certainty.',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                  <div>{step}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EXISTING: System Architecture & Validation Pipeline Diagram */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="card" style={{ padding: 32, background: 'var(--bg-card)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h3 className="card-title" style={{ fontSize: 18 }}>System Architecture &amp; Validation Pipeline</h3>
            <span className="card-subtitle">How predictions are validated against ground truth data</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
            
            {/* Top Node */}
            <div style={{ padding: '12px 24px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 8, fontWeight: 700, letterSpacing: '1px' }}>
              DEVRISK AI
            </div>
            
            <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
            
            {/* Horizontal Split */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              
              {/* Left Branch */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220 }}>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)', position: 'relative', left: '50%' }}></div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '10px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border-medium)', borderRadius: 6, fontWeight: 600, fontSize: 13, textAlign: 'center' }}>PREDICTION<br/>PIPELINE</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '8px 16px', background: 'var(--risk-high-bg)', color: 'var(--risk-high)', border: '1px solid var(--risk-high)', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>Risk = 82%</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)', position: 'relative', left: '50%' }}></div>
              </div>
              
              {/* Center Branch */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220 }}>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)' }}></div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)', marginTop: -2 }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '10px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border-medium)', borderRadius: 6, fontWeight: 600, fontSize: 13, textAlign: 'center' }}>GROUND TRUTH<br/>PIPELINE</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '8px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>SZZ / GitHub</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)', marginTop: -2 }}></div>
              </div>
              
              {/* Right Branch */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220 }}>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)', position: 'relative', right: '50%' }}></div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '10px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border-medium)', borderRadius: 6, fontWeight: 600, fontSize: 13, textAlign: 'center' }}>EXPLANATION<br/>PIPELINE</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
                <div style={{ padding: '8px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>TreeSHAP</div>
                <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
                <div style={{ width: '100%', height: 2, background: 'var(--border-medium)', position: 'relative', right: '50%' }}></div>
              </div>

            </div>
            
            {/* Recombine Node */}
            <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
            <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
            
            <div style={{ padding: '12px 24px', background: 'var(--bg-glass)', border: '2px solid var(--accent-primary)', color: 'var(--text-primary)', borderRadius: 8, fontWeight: 700, letterSpacing: '1px' }}>
              VALIDATION ENGINE
            </div>
            
            <div style={{ width: 2, height: 24, background: 'var(--border-medium)' }}></div>
            <ArrowDown size={14} style={{ color: 'var(--text-muted)', marginTop: -6, marginBottom: 8 }} />
            
            <div style={{ padding: '12px 24px', background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low)', color: 'var(--risk-low)', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
              "Was prediction correct?"
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
