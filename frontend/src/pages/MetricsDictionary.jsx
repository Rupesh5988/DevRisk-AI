// ============================================================
// Metrics Dictionary Page — Standalone
// ============================================================
// Extracted from Dashboard Tab 3 into its own route.
// Full 28-metric plain-English dictionary with search and
// category filtering.
// ============================================================

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FEATURE_DEFINITIONS, FEATURE_CATEGORIES } from '../utils/featureDefinitions';

export default function MetricsDictionary() {
  const location = useLocation();
  const navigate = useNavigate();
  const [metricSearch, setMetricSearch] = useState('');
  const [metricCategory, setMetricCategory] = useState('ALL');

  const fromName = location.state?.from;
  const fromPath = location.state?.path;

  const featureList = Object.values(FEATURE_DEFINITIONS);
  const filteredMetrics = featureList.filter((f) => {
    const matchesCat = metricCategory === 'ALL' || f.category === metricCategory;
    const q = metricSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.label.toLowerCase().includes(q) ||
      f.simpleDefinition.toLowerCase().includes(q) ||
      f.whyItMatters.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {fromName && fromPath && (
        <button
          onClick={() => navigate(fromPath)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 20,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
        >
          ← Back to {fromName}
        </button>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Metrics Dictionary</h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Plain-English definitions, risk rationale, and safe ranges for all 28 ApacheJIT metrics.
          </p>
        </div>
      </div>

      {/* Metrics Content */}
      <div className="card animate-in" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 18, marginBottom: 2 }}>
              📖 28-Metric Machine Learning Dictionary
            </h3>
            <p className="card-subtitle">
              Plain-English definitions, risk rationale, and safe ranges for every metric evaluated by DevRisk AI.
            </p>
          </div>

          {/* Metric Search */}
          <div style={{ position: 'relative', width: 280 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search metrics (e.g. entropy, exp)..."
              value={metricSearch}
              onChange={(e) => setMetricSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 28px 8px 30px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {metricSearch && (
              <button
                onClick={() => setMetricSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            className={`chip ${metricCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setMetricCategory('ALL')}
          >
            All Metrics ({featureList.length})
          </button>
          {Object.values(FEATURE_CATEGORIES).map((cat) => (
            <button
              key={cat.id}
              className={`chip ${metricCategory === cat.id ? 'active' : ''}`}
              onClick={() => setMetricCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {filteredMetrics.map((f) => {
            const cat = FEATURE_CATEGORIES[f.category] || FEATURE_CATEGORIES.churn;
            return (
              <div key={f.name} className="glossary-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="glossary-card-top">
                  <div className="glossary-card-ident">
                    <span className="glossary-symbol-tag">{f.name}</span>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {f.label}
                    </h4>
                  </div>
                  <span className="glossary-cat-tag" style={{ background: `${cat.color}20`, color: cat.color }}>
                    {cat.icon} {cat.name}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginTop: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Definition
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      {f.simpleDefinition}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Why It Matters
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {f.whyItMatters}
                    </span>
                  </div>
                </div>

                <div className="glossary-card-footer" style={{ marginTop: 12 }}>
                  <span>Unit: <strong>{f.unit}</strong></span>
                  <span>Safe Range: <strong style={{ color: 'var(--risk-low)' }}>{f.safeRange}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
