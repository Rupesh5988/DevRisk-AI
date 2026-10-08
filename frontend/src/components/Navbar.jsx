// ============================================================
// Navbar — Modern Sidebar Navigation
// ============================================================
// Clean sidebar navigation containing main features and utilities.
// Settings, Theme Toggle & Profile are moved to the top-right menu.
// ============================================================

import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/simulator', label: 'Playground', icon: '⚡' },
  { to: '/repos', label: 'Repositories', icon: '📁' },
  { to: '/graph', label: 'Dependency Graph', icon: '🔗' },
];

export default function Navbar() {
  return (
    <nav className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-logo">
        <div className="logo-badge">
          <span className="logo-icon">🛡️</span>
        </div>
        <div className="logo-info">
          <span className="logo-text">DevRisk AI</span>
          <span className="logo-version">v2.0 • JIT Defect ML</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="sidebar-section-title">MAIN NAVIGATION</div>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Knowledge & Tools Section */}
      <div className="sidebar-section-title">
        <span>KNOWLEDGE & UTILITIES</span>
      </div>
      <ul className="sidebar-nav-utilities">
        <li>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">📊</span>
            <span className="sidebar-label">Analytics & Trends</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/metrics-dictionary"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">📖</span>
            <span className="sidebar-label">Metrics Dictionary</span>
            <span className="sidebar-tag">28</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
