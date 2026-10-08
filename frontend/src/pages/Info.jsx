import React from 'react';

export default function Info() {
  return (
    <div className="dashboard-container animate-in">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Project Information</h1>
        <p className="page-subtitle">Learn more about the DevRisk AI system architecture and goals.</p>
      </div>
      
      <div className="card" style={{ padding: 32, lineHeight: 1.6 }}>
        <h2 style={{ marginBottom: 16 }}>About DevRisk AI</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          DevRisk AI is a Just-In-Time (JIT) Defect Prediction System designed to identify high-risk pull requests before they are merged into production. It leverages Machine Learning, specifically an ensemble of Random Forest and Gradient Boosting models, to analyze code churn, author experience, directory metrics, and AST dependency graphs.
        </p>
        
        <h3 style={{ marginBottom: 12 }}>Core Capabilities</h3>
        <ul style={{ color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginBottom: 24 }}>
          <li style={{ marginBottom: 8 }}><strong>Risk Scoring:</strong> Every PR is scored from 0-100%, indicating the probability of containing a defect.</li>
          <li style={{ marginBottom: 8 }}><strong>Explainability (TreeSHAP):</strong> The exact factors driving the risk score are isolated and explained to the developer.</li>
          <li style={{ marginBottom: 8 }}><strong>SZZ Validation Pipeline:</strong> A ground-truth pipeline independently validates predictions against historical bug-fix commits.</li>
          <li style={{ marginBottom: 8 }}><strong>What-If Playground:</strong> Developers can simulate counterfactual changes (e.g., reducing file count, breaking up commits) to lower risk scores interactively.</li>
        </ul>

        <h3 style={{ marginBottom: 12 }}>Underlying Technologies</h3>
        <ul style={{ color: 'var(--text-secondary)', listStyleType: 'disc', paddingLeft: 24, marginBottom: 24 }}>
          <li style={{ marginBottom: 8 }}>React + Vite + Vanilla CSS (Frontend)</li>
          <li style={{ marginBottom: 8 }}>Node.js + Express (Backend API)</li>
          <li style={{ marginBottom: 8 }}>Python + Scikit-Learn + SHAP (Machine Learning Engine)</li>
          <li style={{ marginBottom: 8 }}>PostgreSQL (Database)</li>
        </ul>
        
        <h3 style={{ marginBottom: 12 }}>How to Use This System</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          To get started, configure your GitHub Webhook to point to the backend API (`/api/repos/webhook`). The system will automatically ingest incoming Pull Requests, compute their feature vectors, run the ML prediction, and display the results in the Review Queue. High-risk PRs should be scrutinized using the TreeSHAP explanations.
        </p>
      </div>
    </div>
  );
}
