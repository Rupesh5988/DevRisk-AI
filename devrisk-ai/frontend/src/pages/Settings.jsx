// ============================================================
// Settings Page
// ============================================================
// Displays system status, webhook configuration instructions,
// and connection health checks.
// ============================================================

import React, { useState, useEffect } from 'react';
import { getHealth } from '../services/api';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await getHealth();
        setHealth(res.data);
      } catch (err) {
        setHealth({ status: 'error', ml_service: 'unavailable' });
      } finally {
        setLoading(false);
      }
    }
    checkHealth();
  }, []);

  const backendUrl = window.location.origin;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and connection status</p>
      </div>

      {/* System Status */}
      <div className="card animate-in" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <h3 className="card-title">System Status</h3>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => window.location.reload()}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: 100 }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Backend Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span className={`status-dot ${health?.status === 'ok' ? 'online' : 'offline'}`}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Node.js Backend</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Express API Server</div>
              </div>
              <span className={`risk-badge ${health?.status === 'ok' ? 'low' : 'high'}`}>
                {health?.status === 'ok' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* ML Service Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span className={`status-dot ${health?.ml_service === 'connected' ? 'online' : 'offline'}`}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Python ML Service</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>FastAPI + XGBoost + SHAP</div>
              </div>
              <span className={`risk-badge ${health?.ml_service === 'connected' ? 'low' : 'medium'}`}>
                {health?.ml_service === 'connected' ? 'Connected' : 'Unavailable'}
              </span>
            </div>

            {/* Database Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span className={`status-dot ${health?.status === 'ok' ? 'online' : 'offline'}`}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>PostgreSQL Database</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Structured data store</div>
              </div>
              <span className={`risk-badge ${health?.status === 'ok' ? 'low' : 'high'}`}>
                {health?.status === 'ok' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ML Pipeline & Model Architecture Card */}
      <div className="card animate-in" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Machine Learning Engine & Accuracy Metrics</h3>
            <span className="card-subtitle">Production Calibrated Soft-Voting Ensemble (XGBoost + LightGBM)</span>
          </div>
          <span className="badge badge-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
            TreeSHAP Enabled
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test AUC-ROC</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>0.8659</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Walk-Forward CV: 0.8521</div>
          </div>

          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PR-AUC</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6', marginTop: 4 }}>0.6614</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Baseline: 16.4%</div>
          </div>

          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buggy Recall</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>71.97%</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>2,511 / 3,489 bugs caught</div>
          </div>

          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calibration (Brier)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#06B6D4', marginTop: 4 }}>0.1137</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Sigmoid Platt Calibrated</div>
          </div>

          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decision Threshold</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>0.46</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>F1-Optimal (Val F1: 0.72)</div>
          </div>

          <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature Space</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#EC4899', marginTop: 4 }}>28 Metrics</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>14 Raw + 14 Engineered</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          ⚡ <strong>Architecture Details:</strong> The system employs an ensemble of <strong>XGBoost (450 trees)</strong> and <strong>LightGBM (450 trees)</strong> with Soft-Voting and Platt Sigmoid Calibration, evaluated against 106,674 real-world commits from Apache projects via chronological walk-forward validation. Explainability is computed instantaneously (&lt; 2ms) using <strong>TreeSHAP</strong> on the primary tree structure.
        </div>
      </div>

      {/* Webhook Configuration Guide */}
      <div className="card animate-in" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <h3 className="card-title">Webhook Configuration</h3>
          <span className="card-subtitle">How to connect a GitHub repository</span>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 16 }}>
            To start analyzing Pull Requests, configure a GitHub webhook on your repository:
          </p>

          <ol style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <li>
              Go to your GitHub repo → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add webhook</strong>
            </li>
            <li>
              Set <strong>Payload URL</strong> to:
              <div style={{
                marginTop: 6, padding: '10px 16px', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: 13,
                border: '1px solid var(--border-subtle)', color: 'var(--text-accent)',
              }}>
                {backendUrl}/api/webhook
              </div>
            </li>
            <li>Set <strong>Content type</strong> to <code style={{ color: 'var(--text-accent)' }}>application/json</code></li>
            <li>Set <strong>Secret</strong> to match your <code style={{ color: 'var(--text-accent)' }}>GITHUB_WEBHOOK_SECRET</code> environment variable</li>
            <li>Under <strong>"Which events?"</strong>, select <strong>"Let me select individual events"</strong> and check <strong>Pull requests</strong></li>
            <li>Click <strong>Add webhook</strong></li>
          </ol>

          <p style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
            💡 <strong>For local development:</strong> Use <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>ngrok</a> to
            tunnel your localhost to the internet. Run <code style={{ color: 'var(--text-accent)' }}>ngrok http 3001</code> and use the generated URL as your Payload URL.
          </p>
        </div>
      </div>

      {/* Environment Variables Reference */}
      <div className="card animate-in">
        <div className="card-header">
          <h3 className="card-title">Environment Variables</h3>
          <span className="card-subtitle">Backend .env configuration reference</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Description</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>PORT</code></td><td>Backend server port</td><td>3001</td></tr>
            <tr><td><code>GITHUB_TOKEN</code></td><td>GitHub personal access token for API calls</td><td>—</td></tr>
            <tr><td><code>GITHUB_WEBHOOK_SECRET</code></td><td>Secret for verifying webhook signatures</td><td>—</td></tr>
            <tr><td><code>PG_HOST</code></td><td>PostgreSQL host</td><td>localhost</td></tr>
            <tr><td><code>PG_DATABASE</code></td><td>PostgreSQL database name</td><td>devrisk_ai</td></tr>
            <tr><td><code>MONGO_URI</code></td><td>MongoDB connection string</td><td>mongodb://localhost:27017/devrisk_ai</td></tr>
            <tr><td><code>ML_SERVICE_URL</code></td><td>Python FastAPI service URL</td><td>http://localhost:8000</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
