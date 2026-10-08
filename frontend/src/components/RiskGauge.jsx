// ============================================================
// Risk Gauge Component
// ============================================================
// Circular SVG gauge that visualizes risk score (0-100%).
// Color transitions: green → yellow → red based on score.
// ============================================================

import React, { useEffect, useState } from 'react';

const RADIUS = 85;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRiskColor(score) {
  if (score < 0) return '#64748b';   // Unknown
  if (score < 40) return '#22c55e';  // Low - green
  if (score < 70) return '#eab308';  // Medium - yellow
  return '#ef4444';                  // High - red
}

function getRiskLabel(score) {
  if (score < 0) return 'UNKNOWN';
  if (score < 40) return 'LOW RISK';
  if (score < 70) return 'MEDIUM RISK';
  return 'HIGH RISK';
}

export default function RiskGauge({ score = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Animate from 0 to the target score
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const displayScore = Math.max(0, animatedScore);
  const offset = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE;
  const color = getRiskColor(score);
  const label = getRiskLabel(score);

  return (
    <div className="risk-gauge-container">
      <div className="risk-gauge">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background track */}
          <circle
            className="risk-gauge-bg"
            cx="100"
            cy="100"
            r={RADIUS}
          />
          {/* Filled arc */}
          <circle
            className="risk-gauge-fill"
            cx="100"
            cy="100"
            r={RADIUS}
            stroke={color}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        {/* Center text */}
        <div className="risk-gauge-value">
          <div className="risk-gauge-number" style={{ color }}>
            {score >= 0 ? Number(score).toFixed(1) : '—'}
          </div>
          <div className="risk-gauge-percent">
            {score >= 0 ? '%' : ''}
          </div>
        </div>
      </div>
      <div className="risk-gauge-label" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
