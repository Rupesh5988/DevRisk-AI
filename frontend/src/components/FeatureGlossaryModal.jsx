// ============================================================
// FeatureGlossaryModal — Interactive Metrics & Feature Dictionary
// ============================================================
// Slide-over drawer / modal providing plain-English definitions,
// risk rationale, and dynamic value interpretations for all 28 metrics.
// ============================================================

import React, { useState, useEffect } from 'react';
import { FEATURE_DEFINITIONS, FEATURE_CATEGORIES } from '../utils/featureDefinitions';

export default function FeatureGlossaryModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [testFeature, setTestFeature] = useState('la');
  const [testValue, setTestValue] = useState(120);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const featureList = Object.values(FEATURE_DEFINITIONS);

  const filteredFeatures = featureList.filter((feat) => {
    const matchesCategory = selectedCategory === 'ALL' || feat.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      feat.name.toLowerCase().includes(q) ||
      feat.label.toLowerCase().includes(q) ||
      feat.simpleDefinition.toLowerCase().includes(q) ||
      feat.whyItMatters.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const activeTesterDef = FEATURE_DEFINITIONS[testFeature] || FEATURE_DEFINITIONS['la'];
  const testInterpretation = activeTesterDef.interpretValue(testValue);

  return (
    <div className="glossary-backdrop" onClick={onClose}>
      <div className="glossary-drawer animate-in" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="glossary-header">
          <div className="glossary-header-text">
            <div className="glossary-badge">
              <span>📖</span>
              <span>Machine Learning Data Dictionary</span>
            </div>
            <h2 className="glossary-title">Metrics & Feature Explainer</h2>
            <p className="glossary-subtitle">
              Every pull request is evaluated against 28 domain metrics. Below are the plain-English definitions and how the AI interprets each value.
            </p>
          </div>
          <button className="glossary-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* Value Tester Widget */}
        <div className="glossary-tester-card">
          <div className="glossary-tester-title">
            <span>⚡ Interactive Value Tester</span>
            <span className="glossary-tester-hint">Type any value to see what it means in plain English</span>
          </div>
          <div className="glossary-tester-inputs">
            <div className="glossary-tester-field">
              <label>Select Metric</label>
              <select
                value={testFeature}
                onChange={(e) => {
                  setTestFeature(e.target.value);
                  // Set default test value based on metric
                  const def = FEATURE_DEFINITIONS[e.target.value];
                  if (def?.category === 'churn') setTestValue(150);
                  else if (def?.category === 'architecture') setTestValue(4);
                  else if (def?.category === 'developer') setTestValue(25);
                  else setTestValue(1);
                }}
              >
                {featureList.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} — {f.label} ({f.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="glossary-tester-field">
              <label>Enter Value ({activeTesterDef.unit})</label>
              <input
                type="number"
                value={testValue}
                onChange={(e) => setTestValue(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="glossary-tester-result">
            <div className={`glossary-rating-pill rating-${testInterpretation.rating}`}>
              <span className="rating-dot"></span>
              <span>{testInterpretation.label}</span>
            </div>
            <div className="glossary-tester-meaning">
              <strong>Interpretation: </strong>
              {testInterpretation.meaning}
            </div>
            <div className="glossary-tester-benchmark">
              <span>Safe Baseline: <strong>{activeTesterDef.safeRange}</strong></span>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="glossary-toolbar">
          <div className="glossary-search-box">
            <span className="glossary-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by metric name (e.g. entropy, lines added, exp)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="glossary-search-clear" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          <div className="glossary-category-chips">
            <button
              className={`chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All ({featureList.length})
            </button>
            {Object.values(FEATURE_CATEGORIES).map((cat) => {
              const count = featureList.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  className={`chip ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="glossary-grid">
          {filteredFeatures.map((feat) => {
            const cat = FEATURE_CATEGORIES[feat.category] || FEATURE_CATEGORIES.churn;
            return (
              <div key={feat.name} className="glossary-card">
                <div className="glossary-card-top">
                  <div className="glossary-card-ident">
                    <span className="glossary-symbol-tag">{feat.name}</span>
                    <h3 className="glossary-card-name">{feat.label}</h3>
                  </div>
                  <span className="glossary-cat-tag" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                    {cat.icon} {cat.name}
                  </span>
                </div>

                <div className="glossary-card-body">
                  <div className="glossary-card-row">
                    <span className="glossary-row-label">Definition:</span>
                    <span className="glossary-row-value">{feat.simpleDefinition}</span>
                  </div>

                  <div className="glossary-card-row">
                    <span className="glossary-row-label">Why It Matters:</span>
                    <span className="glossary-row-value muted">{feat.whyItMatters}</span>
                  </div>

                  <div className="glossary-card-footer">
                    <div className="glossary-unit-badge">
                      Unit: <strong>{feat.unit}</strong>
                    </div>
                    <div className="glossary-safe-badge">
                      Normal / Safe: <strong>{feat.safeRange}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredFeatures.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px 20px' }}>
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No metrics match your search</div>
              <div className="empty-state-text">
                Try searching for a different keyword or resetting your category filter.
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                style={{ marginTop: 12 }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
