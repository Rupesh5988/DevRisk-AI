// ============================================================
// Navbar — Modern Sidebar with Theme Toggle & Metrics Guide
// ============================================================

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/simulator', label: 'Playground', icon: '⚡' },
  { to: '/repos', label: 'Repositories', icon: '📁' },
  { to: '/graph', label: 'Dependency Graph', icon: '🔗' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar({ onOpenGlossary }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleOpenGlossary() {
    if (onOpenGlossary) {
      onOpenGlossary();
    } else {
      window.dispatchEvent(new CustomEvent('open-devrisk-glossary'));
    }
  }

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
          <button
            type="button"
            className="sidebar-link sidebar-btn-link"
            onClick={handleOpenGlossary}
            title="Open 28-Metric Feature Dictionary & Guide"
          >
            <span className="sidebar-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <line x1="9" y1="7" x2="15" y2="7"/>
                <line x1="9" y1="11" x2="15" y2="11"/>
              </svg>
            </span>
            <span className="sidebar-label">Metrics Guide</span>
            <span className="sidebar-tag">28</span>
          </button>
        </li>
      </ul>

      {/* Theme Switcher Toggle */}
      <div className="sidebar-theme-container">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          <div className="theme-toggle-track">
            <span className={`theme-toggle-pill ${isDark ? 'dark' : 'light'}`}>
              {isDark ? '🌙' : '☀️'}
            </span>
          </div>
          <span className="theme-toggle-label">
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </span>
        </button>
      </div>

      {/* User Card at bottom */}
      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {(user.username || 'U')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{user.full_name || user.username}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
          </div>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title="Sign out of DevRisk AI"
          >
            🚪
          </button>
        </div>
      )}
    </nav>
  );
}
