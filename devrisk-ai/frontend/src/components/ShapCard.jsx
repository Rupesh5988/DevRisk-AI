// ============================================================
// SHAP Explanation Card Component
// ============================================================
// Displays individual SHAP feature explanations with
// direction indicators, interactive tabs (Top, Escalators, Mitigators, All),
// and contribution bars.
// ============================================================

import React, { useState } from 'react';

export default function ShapCard({ explanations = [] }) {
  const [activeTab, setActiveTab] = useState('top'); // 'top', 'escalators', 'mitigators', 'all'
  const [search, setSearch] = useState('');

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

  // Filter and sort items based on active tab
  const filtered = explanations.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.feature_name.toLowerCase().includes(q) ||
      (item.explanation && item.explanation.toLowerCase().includes(q))
    );
  });

  let displayed = [];
  if (activeTab === 'top') {
    displayed = [...filtered]
      .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
      .slice(0, 7);
  } else if (activeTab === 'escalators') {
    displayed = [...filtered]
      .filter((e) => e.shap_value > 0)
      .sort((a, b) => b.shap_value - a.shap_value);
  } else if (activeTab === 'mitigators') {
    displayed = [...filtered]
      .filter((e) => e.shap_value < 0)
      .sort((a, b) => a.shap_value - b.shap_value);
  } else {
    displayed = [...filtered].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
  }

  const maxAbsShap = Math.max(...explanations.map((e) => Math.abs(e.shap_value)), 0.01);

  return (
    <div className="card animate-in">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="card-title">Risk Factors (TreeSHAP Analysis)</h3>
          <span className="card-subtitle">
            {explanations.length} metrics evaluated by the model
          </span>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'top' ? 'active' : ''}`}
            onClick={() => setActiveTab('top')}
            style={{
              background: activeTab === 'top' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'top' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Top Drivers
          </button>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'escalators' ? 'active' : ''}`}
            onClick={() => setActiveTab('escalators')}
            style={{
              background: activeTab === 'escalators' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: activeTab === 'escalators' ? 'var(--risk-high)' : 'var(--text-muted)',
              border: activeTab === 'escalators' ? '1px solid var(--risk-high)' : 'none',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ▲ Escalators
          </button>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'mitigators' ? 'active' : ''}`}
            onClick={() => setActiveTab('mitigators')}
            style={{
              background: activeTab === 'mitigators' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: activeTab === 'mitigators' ? 'var(--risk-low)' : 'var(--text-muted)',
              border: activeTab === 'mitigators' ? '1px solid var(--risk-low)' : 'none',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ▼ Mitigators
          </button>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{
              background: activeTab === 'all' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            All ({explanations.length})
          </button>
        </div>
      </div>

      {activeTab === 'all' && (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search metric name or explanation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 12, padding: '6px 12px' }}
          />
        </div>
      )}

      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
          No features in this category.
        </div>
      ) : (
        <div className="shap-list">
          {displayed.map((item, idx) => {
            const isPositive = item.shap_value >= 0;
            const barWidth = Math.min(100, (Math.abs(item.shap_value) / maxAbsShap) * 100);

            return (
              <div key={idx} className="shap-item" style={{ transition: 'all 0.2s ease' }}>
                <div className={`shap-direction ${isPositive ? 'up' : 'down'}`}>
                  {isPositive ? '▲' : '▼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="shap-feature-name" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <code>{item.feature_name}</code>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                        = {typeof item.feature_value === 'number'
                          ? (Number.isInteger(item.feature_value) ? item.feature_value : item.feature_value.toFixed(2))
                          : item.feature_value}
                      </span>
                    </span>
                    <span style={{ fontSize: 11, color: isPositive ? 'var(--risk-high)' : 'var(--risk-low)', fontWeight: 600 }}>
                      {isPositive ? '+' : ''}{Number(item.shap_value).toFixed(3)} SHAP
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
      )}
    </div>
  );
}
