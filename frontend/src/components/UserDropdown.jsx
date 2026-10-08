// ============================================================
// UserDropdown.jsx — Top-Right Single Rounded Icon Dropdown Menu
// ============================================================
// Displays user profile, theme toggle, and a clickable Settings icon
// that smoothly slides open/closed the sub-settings.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SUB_SETTINGS = [
  { id: 'profile', label: 'Profile & Account', icon: '👤', desc: 'User details & preferences' },
  { id: 'system', label: 'System Status', icon: '🖥️', desc: 'API, ML Service & DB health' },
  { id: 'ml-engine', label: 'ML Engine & Metrics', icon: '🧠', desc: 'XGBoost, SHAP & accuracy' },
  { id: 'webhooks', label: 'Webhook Configuration', icon: '🪝', desc: 'GitHub PR webhook setup' },
  { id: 'env', label: 'Environment Variables', icon: '⚙️', desc: 'Backend .env configuration' },
];

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsSettingsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsSettingsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const initial = (user.full_name || user.username || 'U')[0].toUpperCase();

  function handleNavigateSubSetting(tab) {
    setIsOpen(false);
    setIsSettingsOpen(false);
    navigate(`/settings?tab=${tab}`);
  }

  function handleOpenAllSettings() {
    setIsOpen(false);
    setIsSettingsOpen(false);
    navigate('/settings');
  }

  function handleLogout() {
    setIsOpen(false);
    setIsSettingsOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <div className="top-user-menu" ref={dropdownRef}>
      {/* Single rounded icon button visible in top right corner */}
      <button
        type="button"
        className={`top-user-avatar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (isOpen) setIsSettingsOpen(false);
        }}
        title={`${user.full_name || user.username} — Settings & Profile`}
        aria-label="User profile, settings and theme menu"
        aria-expanded={isOpen}
      >
        <span className="top-user-avatar-initial">{initial}</span>
        <span className="top-user-status-dot" />
      </button>

      {/* Sliding Dropdown Menu Modal */}
      {isOpen && (
        <div className="user-dropdown-panel user-dropdown-sliding-panel">
          {/* User Profile Header */}
          <div className="user-dropdown-profile">
            <div className="user-dropdown-avatar">{initial}</div>
            <div className="user-dropdown-profile-info">
              <div className="user-dropdown-name">{user.full_name || user.username}</div>
              <div className="user-dropdown-email">{user.email || 'developer@devrisk.ai'}</div>
              <span className="user-dropdown-role-badge">
                {user.role || 'Admin'}
              </span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Settings Tab — Clickable Icon & Row that Slides open the Sub-Settings */}
          <div className="user-dropdown-settings-accordion">
            <div
              className={`user-dropdown-item user-dropdown-settings-header ${isSettingsOpen ? 'active-header' : ''}`}
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsSettingsOpen((prev) => !prev);
                }
              }}
            >
              <button
                type="button"
                className={`user-dropdown-icon-btn ${isSettingsOpen ? 'spinning' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen((prev) => !prev);
                }}
                title={isSettingsOpen ? "Click to slide close sub-settings" : "Click to slide open sub-settings"}
                aria-label="Toggle sub-settings slider"
              >
                ⚙️
              </button>

              <div className="user-dropdown-item-text" style={{ flex: 1 }}>
                <span className="user-dropdown-item-title">Settings</span>
                <span className="user-dropdown-item-desc">
                  {isSettingsOpen ? 'Click to slide close' : 'Click icon to slide open'}
                </span>
              </div>

              <span className={`user-dropdown-chevron ${isSettingsOpen ? 'open' : ''}`}>
                ▾
              </span>
            </div>

            {/* Sliding Sub-Settings Container */}
            <div className={`user-dropdown-sliding-tray ${isSettingsOpen ? 'open' : ''}`}>
              <div className="user-dropdown-sliding-inner">
                {SUB_SETTINGS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    className="user-dropdown-subitem"
                    onClick={() => handleNavigateSubSetting(sub.id)}
                  >
                    <span className="user-dropdown-subitem-icon">{sub.icon}</span>
                    <div className="user-dropdown-subitem-text">
                      <span className="user-dropdown-subitem-title">{sub.label}</span>
                      <span className="user-dropdown-subitem-desc">{sub.desc}</span>
                    </div>
                    <span className="user-dropdown-subitem-arrow">→</span>
                  </button>
                ))}

                <button
                  type="button"
                  className="user-dropdown-view-all-btn"
                  onClick={handleOpenAllSettings}
                >
                  <span>Open Full Settings Dashboard</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Theme Toggle in Dropdown */}
          <div className="user-dropdown-theme-row">
            <div className="user-dropdown-theme-label">
              <span className="user-dropdown-item-icon">{isDark ? '🌙' : '☀️'}</span>
              <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <button
              type="button"
              className="theme-switch-btn"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle dark/light theme"
            >
              <div className={`theme-switch-slider ${isDark ? 'dark' : 'light'}`}>
                <span className="theme-switch-thumb" />
              </div>
            </button>
          </div>

          <div className="user-dropdown-divider" />

          {/* Logout Action */}
          <button
            type="button"
            className="user-dropdown-logout-btn"
            onClick={handleLogout}
          >
            <span className="user-dropdown-item-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
