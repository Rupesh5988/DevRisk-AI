// ============================================================
// Settings Page — Sub-Settings & System Configuration
// ============================================================
// Supports tabbed sub-settings so users see only the selected
// configuration section (System, ML Engine, Webhooks, Env, Profile).
// ============================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHealth, updateProfile, changePassword, getBenchmarkMetrics } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Server, 
  BrainCircuit, 
  Webhook, 
  Settings2, 
  Moon, 
  Sun,
  Key,
  Shield,
  Check,
  Copy,
  Sliders,
  Terminal,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  FolderGit2
} from 'lucide-react';

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

  const { user, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [health, setHealth] = useState(null);
  const [benchmarkMetrics, setBenchmarkMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [engineeringRole, setEngineeringRole] = useState(() => localStorage.getItem('devrisk_role') || 'Senior Tech Lead & Code Reviewer');
  const [githubHandle, setGithubHandle] = useState(() => localStorage.getItem('devrisk_github_handle') || user?.username || '');
  const [githubToken, setGithubToken] = useState(user?.github_token || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Developer Preferences State
  const [qualityGateThreshold, setQualityGateThreshold] = useState(() => localStorage.getItem('devrisk_gate_threshold') || '70');
  const [defaultPageSize, setDefaultPageSize] = useState(() => localStorage.getItem('devrisk_page_size') || '10');
  const [autoSimulateOnOpen, setAutoSimulateOnOpen] = useState(() => localStorage.getItem('devrisk_auto_simulate') !== 'false');
  const [prefSaved, setPrefSaved] = useState(false);

  // Copy Feedback States
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setGithubToken(user.github_token || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileMessage(null);
      const res = await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        github_token: githubToken.trim() || null,
      });
      localStorage.setItem('devrisk_role', engineeringRole);
      localStorage.setItem('devrisk_github_handle', githubHandle);
      if (updateUser && res.data?.user) {
        updateUser(res.data.user);
      }
      setProfileMessage({ type: 'success', text: 'Profile changes saved successfully!' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setProfileMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      setIsSavingPassword(true);
      setPasswordMessage(null);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update password.';
      setPasswordMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('devrisk_gate_threshold', qualityGateThreshold);
    localStorage.setItem('devrisk_page_size', defaultPageSize);
    localStorage.setItem('devrisk_auto_simulate', String(autoSimulateOnOpen));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const sessionToken = localStorage.getItem('devrisk_token') || 'devrisk_jwt_session_token';

  const handleCopyToken = () => {
    navigator.clipboard.writeText(sessionToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const curlSnippet = `curl -X GET "${window.location.origin}/api/prs" -H "Authorization: Bearer ${sessionToken}"`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const yamlWorkflow = `name: DevRisk AI Quality Gate
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  jit-defect-triage:
    name: JIT Defect Risk Gate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Evaluate Commit Defect Risk
        env:
          DEVRISK_URL: \${{ secrets.DEVRISK_API_URL }}
          DEVRISK_TOKEN: \${{ secrets.DEVRISK_TOKEN }}
        run: |
          echo "Simulating PR risk via DevRisk AI..."
          RESPONSE=\$(curl -s -X POST "\$DEVRISK_URL/api/prs/simulate" \\
            -H "Authorization: Bearer \$DEVRISK_TOKEN" \\
            -H "Content-Type: application/json" \\
            -d "{\\"lines_added\\": \${{ github.event.pull_request.additions }}, \\"lines_deleted\\": \${{ github.event.pull_request.deletions }}, \\"files_modified\\": \${{ github.event.pull_request.changed_files }}}")
          echo "Quality Gate Result: \$RESPONSE"
`;

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlWorkflow);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

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

    async function loadMetrics() {
      try {
        const bmRes = await getBenchmarkMetrics();
        if (bmRes.data?.benchmark) {
          setBenchmarkMetrics(bmRes.data.benchmark);
        }
      } catch (err) {
        // Fallback to static constants
      }
    }

    checkHealth();
    loadMetrics();
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

          {(() => {
            const bm = benchmarkMetrics || {
              auc_roc: 0.8665,
              cv_auc_roc_mean: 0.8525,
              pr_auc: 0.6613,
              recall: 0.7077,
              brier_score: 0.1156,
              decision_threshold: 0.49,
              test_buggy_count: 3489,
              confusion_matrix: [[15158, 2688], [1020, 2469]],
            };
            const tp = bm.confusion_matrix?.[1]?.[1] ?? 2469;
            const totalBuggy = bm.test_buggy_count ?? 3489;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test AUC-ROC</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>
                    {Number(bm.auc_roc).toFixed(4)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Walk-Forward CV: {Number(bm.cv_auc_roc_mean || 0.8525).toFixed(4)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PR-AUC</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6', marginTop: 4 }}>
                    {Number(bm.pr_auc).toFixed(4)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Baseline: 16.4%</div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buggy Recall</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                    {(Number(bm.recall) * 100).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {tp.toLocaleString()} / {totalBuggy.toLocaleString()} bugs caught
                  </div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calibration (Brier)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#06B6D4', marginTop: 4 }}>
                    {Number(bm.brier_score).toFixed(4)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Sigmoid Platt Calibrated</div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decision Threshold</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>
                    {Number(bm.decision_threshold).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Constrained F1-Optimal (Val Recall ≥ 70%)</div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature Space</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#EC4899', marginTop: 4 }}>28 Metrics</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>14 Raw + 14 Engineered</div>
                </div>
              </div>
            );
          })()}

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
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Developer Identity Header Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Developer Identity & Account Profile</h3>
                <span className="card-subtitle">
                  Configure your engineering credentials, public profile, and repository author identity
                </span>
              </div>
              <span className="badge badge-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                {user?.role || 'Active Developer'}
              </span>
            </div>

            {profileMessage && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  background:
                    profileMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  border:
                    profileMessage.type === 'success'
                      ? '1px solid var(--risk-low)'
                      : '1px solid var(--risk-high)',
                  color:
                    profileMessage.type === 'success'
                      ? 'var(--risk-low)'
                      : 'var(--risk-high)',
                }}
              >
                {profileMessage.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@company.com"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Engineering Role / Specialization
                  </label>
                  <select
                    value={engineeringRole}
                    onChange={(e) => setEngineeringRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Senior Tech Lead & Code Reviewer">Senior Tech Lead & Code Reviewer</option>
                    <option value="Staff Software Engineer">Staff Software Engineer</option>
                    <option value="Full-Stack Developer">Full-Stack Developer</option>
                    <option value="DevOps & Release Engineer">DevOps & Release Engineer</option>
                    <option value="Machine Learning Specialist">Machine Learning Specialist</option>
                    <option value="QA & Defect Prevention Lead">QA & Defect Prevention Lead</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    GitHub Handle / Username
                  </label>
                  <input
                    type="text"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    placeholder="e.g. octocat"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingProfile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Save size={15} />
                  <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. Developer Quality Gate & Review Preferences */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">CI/CD Quality Gate & Triage Defaults</h3>
                <span className="card-subtitle">
                  Tune defect detection sensitivity, review queue pagination, and automated analysis triggers
                </span>
              </div>
              <span className="badge badge-low" style={{ padding: '4px 10px', fontSize: 11 }}>
                Customized Defaults
              </span>
            </div>

            {prefSaved && (
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid var(--risk-low)',
                  color: 'var(--risk-low)',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Quality Gate & Review Preferences saved to local profile!</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 16 }}>
              {/* Quality Gate Threshold */}
              <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Quality Gate Block Threshold
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--risk-high)' }}>
                    {qualityGateThreshold}% Risk
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                  PRs scoring above this TreeSHAP threshold will automatically be flagged as <strong>Quality Gate Blocked</strong>.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Strict (60%)', value: '60' },
                    { label: 'Standard (70%)', value: '70' },
                    { label: 'Relaxed (80%)', value: '80' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`chip ${qualityGateThreshold === item.value ? 'active' : ''}`}
                      onClick={() => setQualityGateThreshold(item.value)}
                      style={{ flex: 1, padding: '6px 8px', fontSize: 11, textAlign: 'center' }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Review Queue Page Size */}
              <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Review Queue Page Chunking
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {defaultPageSize} PRs / Page
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                  Set the default number of pull requests displayed per page on the Review Queue & Dashboard feeds.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: '10 PRs (Default)', value: '10' },
                    { label: '20 PRs', value: '20' },
                    { label: '50 PRs', value: '50' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`chip ${defaultPageSize === item.value ? 'active' : ''}`}
                      onClick={() => setDefaultPageSize(item.value)}
                      style={{ flex: 1, padding: '6px 8px', fontSize: 11, textAlign: 'center' }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSavePreferences}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Sliders size={14} />
                <span>Save Quality Gate Defaults</span>
              </button>
            </div>
          </div>

          {/* 3. Developer API Credentials & GitHub Integration */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Developer API Credentials & CLI Integration</h3>
                <span className="card-subtitle">
                  Authenticate CI/CD pipelines, execute automated simulations, and authorize private repository access
                </span>
              </div>
              <span className="badge badge-low" style={{ padding: '4px 10px', fontSize: 11 }}>
                JWT Session Valid
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Active Session Bearer Token */}
              <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <Key size={15} color="var(--accent-primary)" />
                    <span>Active Session JWT Bearer Token</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyToken}
                    style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedToken ? <Check size={12} color="var(--risk-low)" /> : <Copy size={12} />}
                    <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    background: 'var(--bg-input)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  {sessionToken.slice(0, 32)}...{sessionToken.slice(-16)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Expires in 7 days. Include as <code>Authorization: Bearer &lt;token&gt;</code> in CI/CD webhook requests.
                </div>
              </div>

              {/* cURL Command Snippet */}
              <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <Terminal size={15} color="var(--warning)" />
                    <span>Terminal / CLI Test Snippet</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyCurl}
                    style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedCurl ? <Check size={12} color="var(--risk-low)" /> : <Copy size={12} />}
                    <span>{copiedCurl ? 'Copied!' : 'Copy cURL'}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    background: 'var(--bg-input)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  curl -X GET "{window.location.origin}/api/prs" -H "Authorization: Bearer ***"
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Test backend connectivity and retrieve recent PR triage records directly from terminal.
                </div>
              </div>
            </div>

            {/* GitHub Personal Access Token (PAT) for Private Repos */}
            <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  <FolderGit2 size={16} color="var(--text-accent)" />
                  <span>GitHub Personal Access Token (PAT)</span>
                </div>
                <span style={{ fontSize: 11, color: githubToken ? 'var(--risk-low)' : 'var(--text-muted)' }}>
                  {githubToken ? '● Token Configured' : '○ Not Configured'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
                Required for scanning private codebases, AST file AST dependency parsing, and posting automated PR comment reviews.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  Save PAT
                </button>
              </div>
            </div>
          </div>

          {/* 4. CI/CD Quality Gate Workflow Generator (Creative Feature) */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">GitHub Actions Quality Gate Workflow</h3>
                <span className="card-subtitle">
                  Drop this automated CI workflow file into <code>.github/workflows/devrisk-gate.yml</code> to enforce JIT defect gates
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyYaml}
                style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {copiedYaml ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedYaml ? 'Copied YAML!' : 'Copy Workflow YAML'}</span>
              </button>
            </div>

            <pre
              style={{
                background: 'var(--bg-input)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {yamlWorkflow}
            </pre>
          </div>

          {/* 5. Security & Password Management Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Security & Password Management</h3>
                <span className="card-subtitle">Update your developer account password and invalidate active sessions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                <Lock size={14} />
                <span>Bcrypt Hash Encrypted</span>
              </div>
            </div>

            {passwordMessage && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  background:
                    passwordMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  border:
                    passwordMessage.type === 'success'
                      ? '1px solid var(--risk-low)'
                      : '1px solid var(--risk-high)',
                  color:
                    passwordMessage.type === 'success'
                      ? 'var(--risk-low)'
                      : 'var(--risk-high)',
                }}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    New Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={isSavingPassword}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Lock size={15} />
                  <span>{isSavingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 6. Theme & Visual Preferences Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div>
                <h3 className="card-title">Display & Theme Preference</h3>
                <span className="card-subtitle">
                  Toggle between high-contrast dark mode and crisp daylight themes
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                background: 'var(--bg-glass)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active Color Theme: {isDark ? 'Dark Mode' : 'Light Mode'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Selected theme is automatically synced across sessions and local storage.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={toggleTheme}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>Switch to {isDark ? 'Light' : 'Dark'} Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
