// ============================================================
// Trend Chart Component
// ============================================================
// Line chart showing risk score trends over time using Recharts.
// ============================================================

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={{
      background: '#0c1020',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: entry.color,
          }} />
          <span style={{ fontSize: 13, color: '#f1f5f9' }}>
            {entry.name}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

export default function TrendChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Risk Score Trend</h3>
        </div>
        <div className="empty-state" style={{ minHeight: 200 }}>
          <div className="empty-state-icon">📈</div>
          <div className="empty-state-text">Not enough data to show trends yet.</div>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    'Avg Risk': parseFloat(d.avg_risk) || 0,
    'Max Risk': parseFloat(d.max_risk) || 0,
    'PRs': parseInt(d.pr_count) || 0,
  }));

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Risk Score Trend</h3>
        <span className="card-subtitle">Daily average risk over time</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="Avg Risk"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#riskGradient)"
          />
          <Area
            type="monotone"
            dataKey="Max Risk"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            fill="url(#maxGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
