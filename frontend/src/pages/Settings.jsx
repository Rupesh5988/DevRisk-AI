// ============================================================
// Settings Page — Sub-Settings & System Configuration
// ============================================================
// Supports tabbed sub-settings so users see only the selected
// configuration section (System, ML Engine, Webhooks, Env, Profile).
// ============================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Server, BrainCircuit, Webhook, Settings2, Moon, Sun } from 'lucide-react';

const SUB_SETTINGS = [
  { id: 'profile', label: 'User Profile & Account', icon: <User size={18} />, desc: 'Account credentials and session details' },
  { id: 'system', label: 'System Status', icon: <Server size={18} />, desc: 'Backend, ML service and database health' },
  { id: 'ml-engine', label: 'ML Engine & Metrics', icon: <BrainCircuit size={18} />, desc: 'Model architecture and walk-forward accuracy' },
  { id: 'webhooks', label: 'Webhook Config', icon: <Webhook size={18} />, desc: 'GitHub Pull Request integration setup' },
  { id: 'env', label: 'Environment Variables', icon: <Settings2 size={18} />, desc: 'Server configuration & credentials reference' },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

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

  function handleSelectTab(tabId) {
    setSearchParams({ tab: tabId });
  }

  const backendUrl = window.location.origin;

  return (
    <div className="settings-container">
      {/* Settings Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Settings & Configuration</h1>
        <p className="page-subtitle">
          Manage system connectivity, ML pipeline specs, webhook integrations, and account settings.
        </p>
      </div>

      {/* Sub-Settings Tab Navigation Bar */}
      <div className="settings-subnav-bar">
        {SUB_SETTINGS.map((sub) => {
          const isActive = activeTab === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              className={`settings-subnav-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectTab(sub.id)}
            >
              <span className="settings-subnav-icon">{sub.icon}</span>
              <span className="settings-subnav-label">{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-SETTING 1: SYSTEM STATUS */}
      {activeTab === 'system' && (
        <div className="card animate-in">
          <div className="card-header">
            <div>
              <h3 className="card-title">System Status & Service Connectivity</h3>
              <span className="card-subtitle">Real-time health verification across all backend services</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => window.location.reload()}
            >
              ↻ Refresh Status
            </button>
          </div>

          {loading ? (
            <div className="loading-container" style={{ minHeight: 120 }}>
              <div className="spinner"></div>
              <div className="loading-text">Pinging services...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Backend Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span className={`status-dot ${health?.status === 'ok' ? 'online' : 'offline'}`} style={{ width: 10, height: 10 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Node.js / Express Backend</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>REST API Server • Port 3001</div>
                </div>
                <span className={`risk-badge ${health?.status === 'ok' ? 'low' : 'high'}`}>
                  {health?.status === 'ok' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* ML Service Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span className={`status-dot ${health?.ml_service === 'connected' ? 'online' : 'offline'}`} style={{ width: 10, height: 10 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Python ML Inference Microservice</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>FastAPI + XGBoost + TreeSHAP • Port 8000</div>
                </div>
                <span className={`risk-badge ${health?.ml_service === 'connected' ? 'low' : 'medium'}`}>
                  {health?.ml_service === 'connected' ? 'Connected' : 'Unavailable'}
                </span>
              </div>

              {/* Database Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span className={`status-dot ${health?.status === 'ok' ? 'online' : 'offline'}`} style={{ width: 10, height: 10 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>PostgreSQL Primary Database</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PR Metadata, Risk Scores & Commit History</div>
                </div>
                <span className={`risk-badge ${health?.status === 'ok' ? 'low' : 'high'}`}>
                  {health?.status === 'ok' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-SETTING 2: ML ENGINE & METRICS */}
      {activeTab === 'ml-engine' && (
        <div className="card animate-in">
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

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '14px 18px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            ⚡ <strong>Architecture Details:</strong> The system employs an ensemble of <strong>XGBoost (450 trees)</strong> and <strong>LightGBM (450 trees)</strong> with Soft-Voting and Platt Sigmoid Calibration, evaluated against 106,674 real-world commits from Apache projects via chronological walk-forward validation. Explainability is computed instantaneously (&lt; 2ms) using <strong>TreeSHAP</strong> on the primary tree structure.
          </div>
        </div>
      )}

      {/* SUB-SETTING 3: WEBHOOK CONFIGURATION */}
      {activeTab === 'webhooks' && (
        <div className="card animate-in">
          <div className="card-header">
            <div>
              <h3 className="card-title">GitHub Webhook Configuration</h3>
              <span className="card-subtitle">Connect your GitHub repositories to automatically trigger PR risk evaluations</span>
            </div>
            <span className="badge badge-low" style={{ fontSize: 11, padding: '3px 10px' }}>
              Active Endpoint
            </span>
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: 16 }}>
              Follow these steps to connect any GitHub repository with DevRisk AI:
            </p>

            <ol style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <li>
                Navigate to your GitHub repository → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add webhook</strong>.
              </li>
              <li>
                Set <strong>Payload URL</strong> to:
                <div style={{
                  marginTop: 6, padding: '12px 18px', background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: 13.5,
                  border: '1px solid var(--border-subtle)', color: 'var(--text-accent)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>{backendUrl}/api/webhook</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => navigator.clipboard.writeText(`${backendUrl}/api/webhook`)}
                  >
                    📋 Copy
                  </button>
                </div>
              </li>
              <li>Set <strong>Content type</strong> to <code style={{ color: 'var(--text-accent)', fontWeight: 600 }}>application/json</code></li>
              <li>Set <strong>Secret</strong> to match your <code style={{ color: 'var(--text-accent)', fontWeight: 600 }}>GITHUB_WEBHOOK_SECRET</code> configured in your backend .env file.</li>
              <li>Under <strong>"Which events would you like to trigger this webhook?"</strong>, select <strong>"Let me select individual events"</strong> and check <strong>Pull requests</strong>.</li>
              <li>Ensure <strong>Active</strong> is checked, then click <strong>Add webhook</strong>.</li>
            </ol>

            <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
              💡 <strong>Local Development Setup:</strong> If testing locally, use <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>ngrok</a> to create a public tunnel:
              <pre style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-accent)' }}>
                ngrok http 3001
              </pre>
              Use the HTTPS URL generated by ngrok with <code>/api/webhook</code> as your Payload URL.
            </div>
          </div>
        </div>
      )}

      {/* SUB-SETTING 4: ENVIRONMENT VARIABLES */}
      {activeTab === 'env' && (
        <div className="card animate-in">
          <div className="card-header">
            <div>
              <h3 className="card-title">Environment Variables Reference</h3>
              <span className="card-subtitle">Backend and ML service configuration parameters</span>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variable Name</th>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Default / Recommended</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>PORT</code></td>
                  <td>Node Backend</td>
                  <td>Port on which the Express REST API listens</td>
                  <td><code>3001</code></td>
                </tr>
                <tr>
                  <td><code>GITHUB_TOKEN</code></td>
                  <td>Node Backend</td>
                  <td>GitHub personal access token for querying PR commit diffs & files</td>
                  <td><code>ghp_...</code></td>
                </tr>
                <tr>
                  <td><code>GITHUB_WEBHOOK_SECRET</code></td>
                  <td>Node Backend</td>
                  <td>HMAC secret for validating GitHub webhook payloads</td>
                  <td><code>devrisk_webhook_secret</code></td>
                </tr>
                <tr>
                  <td><code>PG_HOST</code></td>
                  <td>Node Backend</td>
                  <td>PostgreSQL database host address</td>
                  <td><code>localhost</code></td>
                </tr>
                <tr>
                  <td><code>PG_DATABASE</code></td>
                  <td>Node Backend</td>
                  <td>PostgreSQL database name</td>
                  <td><code>devrisk_ai</code></td>
                </tr>
                <tr>
                  <td><code>ML_SERVICE_URL</code></td>
                  <td>Node Backend</td>
                  <td>Internal endpoint of the Python ML FastAPI service</td>
                  <td><code>http://localhost:8000</code></td>
                </tr>
                <tr>
                  <td><code>JWT_SECRET</code></td>
                  <td>Node Backend</td>
                  <td>Secret key used to sign and verify user JWT session tokens</td>
                  <td><code>devrisk-secret-key-2024</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-SETTING 5: USER PROFILE & ACCOUNT */}
      {activeTab === 'profile' && (
        <div className="card animate-in">
          <div className="card-header">
            <div>
              <h3 className="card-title">User Profile & Account Information</h3>
              <span className="card-subtitle">Manage your account credentials, security and preferences</span>
            </div>
            <span className="badge badge-primary" style={{ padding: '6px 12px' }}>
              {user?.role || 'Active User'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 700, color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.3)'
                }}>
                  {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user?.full_name || user?.username}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {user?.email || 'user@devrisk.ai'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Username</span>
                  <span style={{ fontWeight: 600 }}>{user?.username || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-accent)' }}>{user?.id || 'USR-01'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Role</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{user?.role || 'Administrator'}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-glass)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Display & Theme Preference</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Current theme is set to <strong>{isDark ? 'Dark Mode' : 'Light Mode'}</strong>. You can switch themes at any time from here or from the top-right profile icon.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={toggleTheme}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {isDark ? <Moon size={16} /> : <Sun size={16} />}
                </span>
                <span>Switch to {isDark ? 'Light' : 'Dark'} Theme</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
