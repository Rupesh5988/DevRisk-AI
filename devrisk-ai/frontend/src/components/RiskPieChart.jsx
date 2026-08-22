// ============================================================
// Risk Distribution Pie Chart Component
// ============================================================

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#ef4444',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];

  return (
    <div style={{
      background: '#0c1020',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <span style={{ fontSize: 13, color: '#f1f5f9' }}>
        {name}: <strong>{value}</strong> PRs
      </span>
    </div>
  );
};

export default function RiskPieChart({ distribution = {} }) {
  const data = [
    { name: 'Low Risk', value: distribution.LOW || 0 },
    { name: 'Medium Risk', value: distribution.MEDIUM || 0 },
    { name: 'High Risk', value: distribution.HIGH || 0 },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Risk Distribution</h3>
        </div>
        <div className="empty-state" style={{ minHeight: 200 }}>
          <div className="empty-state-icon">🥧</div>
          <div className="empty-state-text">No data available yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Risk Distribution</h3>
        <span className="card-subtitle">{total} total PRs</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[entry.name.split(' ')[0].toUpperCase()] || '#64748b'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((entry) => {
            const color = COLORS[entry.name.split(' ')[0].toUpperCase()] || '#64748b';
            const pct = ((entry.value / total) * 100).toFixed(0);
            return (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                    {entry.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {entry.value} PRs ({pct}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
