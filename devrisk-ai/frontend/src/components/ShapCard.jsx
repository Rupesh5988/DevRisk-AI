// ============================================================
// SHAP Explanation Card Component
// ============================================================
// Displays individual SHAP feature explanations with
// direction indicators and contribution bars.
// ============================================================

import React from 'react';

export default function ShapCard({ explanations = [] }) {
  if (!explanations || explanations.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Risk Factors (SHAP)</h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No Explanations</div>
          <div className="empty-state-text">SHAP analysis data is not available for this PR.</div>
        </div>
      </div>
    );
  }

  // Sort by absolute SHAP value (biggest contributors first)
  const sorted = [...explanations]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 7); // Show top 7

  const maxAbsShap = Math.max(...sorted.map((e) => Math.abs(e.shap_value)), 0.01);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Risk Factors (SHAP Analysis)</h3>
        <span className="card-subtitle">Top contributing features</span>
      </div>

      <div className="shap-list">
        {sorted.map((item, idx) => {
          const isPositive = item.shap_value >= 0;
          const barWidth = (Math.abs(item.shap_value) / maxAbsShap) * 100;

          return (
            <div key={idx} className="shap-item">
              <div className={`shap-direction ${isPositive ? 'up' : 'down'}`}>
                {isPositive ? '▲' : '▼'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="shap-feature-name">
                  {item.feature_name}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                    = {typeof item.feature_value === 'number'
                      ? Number(item.feature_value).toFixed(1)
                      : item.feature_value}
                  </span>
                </div>
                <div className="shap-explanation">{item.explanation}</div>
                <div className="shap-bar-container">
                  <div
                    className={`shap-bar ${isPositive ? 'positive' : 'negative'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
