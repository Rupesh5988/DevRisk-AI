// ============================================================
// FeatureTooltip — Interactive In-Place Metric Explainer
// ============================================================
// Shows simple definition, why it matters, and dynamic value
// interpretation on hover or click.
// ============================================================

import React, { useState } from 'react';
import { getFeatureDef } from '../utils/featureDefinitions';

export default function FeatureTooltip({ featureName, value = null, children }) {
  const [visible, setVisible] = useState(false);
  const def = getFeatureDef(featureName);
  const interpretation = value !== null && value !== undefined ? def.interpretValue(value) : null;

  return (
    <span
      className="feature-tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setVisible(!visible);
      }}
    >
      {children || (
        <span className="feature-info-icon" title={`Learn about ${def.label}`}>
          ⓘ
        </span>
      )}

      {visible && (
        <div className="feature-tooltip-popover animate-in">
          <div className="feature-tooltip-header">
            <span className="feature-tooltip-tag">{def.name}</span>
            <span className="feature-tooltip-title">{def.label}</span>
          </div>
          <p className="feature-tooltip-desc">{def.simpleDefinition}</p>

          {interpretation && (
            <div className={`feature-tooltip-rating rating-${interpretation.rating}`}>
              <span className="rating-dot"></span>
              <div>
                <strong>Value ({value}): </strong>
                <span>{interpretation.meaning}</span>
              </div>
            </div>
          )}

          <div className="feature-tooltip-meta">
            <span>Safe Baseline: <strong>{def.safeRange}</strong></span>
            <span>Unit: <strong>{def.unit}</strong></span>
          </div>
        </div>
      )}
    </span>
  );
}
