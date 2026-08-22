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
