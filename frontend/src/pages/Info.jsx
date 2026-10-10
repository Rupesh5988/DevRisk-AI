import React, { useState } from 'react';

export default function Info() {
  const [activeTab, setActiveTab] = useState('guide');

  return (
    <div className="dashboard-container animate-in">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Project Information</h1>
        <p className="page-subtitle">Learn more about the DevRisk AI system architecture, datasets, and how to use it.</p>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tabs Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-glass)' }}>
          <button 
            onClick={() => setActiveTab('guide')}
            style={{ 
              flex: 1, padding: '16px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, color: activeTab === 'guide' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'guide' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            📖 Project Guide
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            style={{ 
              flex: 1, padding: '16px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, color: activeTab === 'details' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'details' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ Technical Details & Datasets
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: 32, lineHeight: 1.6 }}>
          
          {/* -------------------- GUIDE TAB -------------------- */}
          {activeTab === 'guide' && (
            <div className="animate-in">
              <h2 style={{ marginBottom: 16 }}>How to Use DevRisk AI</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                DevRisk AI acts as a smart quality gate for your development pipeline. By connecting it to your GitHub/GitLab webhooks, the system automatically intercepts Pull Requests, analyzes the code changes, and predicts the likelihood of those changes causing a bug in production.
              </p>

              <h3 style={{ marginBottom: 12 }}>1. The Review Queue</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                The <strong>Review Queue</strong> is your inbox for all incoming PRs. Each PR is assigned a Risk Level (HIGH, MEDIUM, LOW) based on its mathematical risk score (0-100%). You should start by reviewing PRs flagged as HIGH risk.
              </p>

              <h3 style={{ marginBottom: 12 }}>2. Analyzing a Pull Request</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                When you click into a PR, you will see a detailed breakdown:
              </p>
              <ul style={{ color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginBottom: 24 }}>
                <li style={{ marginBottom: 8 }}><strong>TreeSHAP Drivers:</strong> This shows you <em>exactly why</em> the AI gave the score it did. It highlights specific metrics (like high code churn, or too many files modified) that pushed the risk higher.</li>
                <li style={{ marginBottom: 8 }}><strong>Dependency Graph:</strong> A visual map of how the modified files interact with the rest of the codebase, showing the potential "blast radius" of the PR.</li>
                <li style={{ marginBottom: 8 }}><strong>Metrics Dictionary:</strong> Every PR extracts 28 different metrics. Use the Metrics Dictionary (accessible from the sidebar) to understand what each metric means.</li>
              </ul>

              <h3 style={{ marginBottom: 12 }}>3. The What-If Simulator (Playground)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                If a PR is flagged as high risk, click the <strong>⚡ Simulate in Playground</strong> button. This allows you to hypothetically alter the PR's metrics (e.g., "What if I split this PR into smaller chunks and reduced the file count by half?"). The simulator runs a live counterfactual prediction against the AI model to show you how much the risk score would drop. This helps developers learn how to write safer code.
              </p>

              <div style={{ padding: 16, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, color: 'var(--risk-low)', marginBottom: 4 }}>Pro Tip: CI/CD Quality Gates</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  PRs with a risk score over 70% will automatically be flagged as <code>MERGE_BLOCKED</code> by the CI/CD Quality Gate, requiring manual senior review before they can be merged.
                </div>
              </div>
            </div>
          )}

          {/* -------------------- DETAILS TAB -------------------- */}
          {activeTab === 'details' && (
            <div className="animate-in">
              <h2 style={{ marginBottom: 16 }}>System Architecture</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                DevRisk AI is a Just-In-Time (JIT) Defect Prediction System. It leverages an ensemble of Machine Learning models (Random Forest and Gradient Boosting) to analyze code churn, author experience, directory metrics, and AST dependency graphs in real-time.
              </p>

              <h3 style={{ marginBottom: 12 }}>Underlying Technologies</h3>
              <ul style={{ color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginBottom: 32 }}>
                <li style={{ marginBottom: 8 }}><strong>Frontend:</strong> React + Vite + Vanilla CSS (Dynamic Glassmorphism UI)</li>
                <li style={{ marginBottom: 8 }}><strong>Backend API:</strong> Node.js + Express (Handles Webhooks & Orchestration)</li>
                <li style={{ marginBottom: 8 }}><strong>Machine Learning Engine:</strong> Python + Scikit-Learn + SHAP + XGBoost (Running as an independent microservice)</li>
                <li style={{ marginBottom: 8 }}><strong>Database:</strong> PostgreSQL (Stores PR metadata, metrics, and ground-truth results)</li>
              </ul>

              <hr style={{ border: 0, borderTop: '1px solid var(--border-subtle)', margin: '32px 0' }} />

              <h2 style={{ marginBottom: 16 }}>Dataset & SZZ Ground Truth Analysis</h2>
              
              <h3 style={{ marginBottom: 12 }}>1. The AI Training Dataset (ApacheJIT)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                The machine learning models driving DevRisk AI were trained on the <strong>ApacheJIT Dataset</strong>. This is a massive, publicly available scientific dataset hosted on <strong>Zenodo</strong> (managed by CERN).
              </p>
              <ul style={{ color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginBottom: 24 }}>
                <li style={{ marginBottom: 8 }}><strong>Scale:</strong> Contains <strong>106,675 PRs and commits</strong> mined from massive open-source Apache Software Foundation repositories (e.g., Kafka, Hadoop, Tomcat).</li>
                <li style={{ marginBottom: 8 }}><strong>Robustness:</strong> This scale provides immense statistical significance, allowing the system to use 80% of the data (~85,000 PRs) purely for training and 20% (~21,000 PRs) as unseen testing data to prove accuracy without overfitting.</li>
              </ul>

              <h3 style={{ marginBottom: 12 }}>2. Post-Merge SZZ Specification & Demonstration Harness</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                In production architectures with longitudinal history, the system evaluates predictions by running the <strong>SZZ Algorithm</strong> directly on connected repositories as subsequent bug-fix PRs emerge. In the prototype dashboard, the evaluation harness demonstrates this workflow:
              </p>
              <div style={{ padding: 16, background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 6, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>⚙️</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Background Analysis Process (SZZ Algorithm)</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>1.</span>
                    <span><strong>Scan for Fixes:</strong> The system continuously monitors your repository for new pull requests containing bug-fix keywords (e.g., "fix", "resolves #123").</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>2.</span>
                    <span><strong>Extract Deletions:</strong> When a bug fix is found, the algorithm isolates the exact lines of code that were deleted or modified to fix the bug.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>3.</span>
                    <span><strong>Mathematical Blame Trace:</strong> It runs a <code>git blame</code> algorithm on those deleted lines to travel backwards through the commit history.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>4.</span>
                    <span><strong>Attribution:</strong> If the blame trace mathematically points back to the lines introduced in a specific original PR, that PR is officially flagged as "DEFECT INDUCING" (Ground Truth).</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
