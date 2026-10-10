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

import { Moon, Sun, Settings, LogOut } from 'lucide-react';


export default function UserDropdown() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
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
    navigate(`/settings?tab=${tab}`);
  }

  function handleOpenAllSettings() {
    setIsOpen(false);
    navigate('/settings');
  }

  function handleLogout() {
    setIsOpen(false);
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
          if (isOpen) {}
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
          <div 
            className="user-dropdown-profile"
            onClick={() => handleNavigateSubSetting('profile')}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-dropdown-avatar">{initial}</div>
            <div className="user-dropdown-profile-info">
              <div className="user-dropdown-name">{user.full_name || user.username}</div>
              <div className="user-dropdown-email">{user.email || 'developer@devrisk.ai'}</div>
              <span className="user-dropdown-role-badge">
                {localStorage.getItem('devrisk_role') || user.role || 'Developer'}
              </span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Settings Tab — Clickable Icon & Row that Slides open the Sub-Settings */}
          {/* Settings Tab */}
          <div
            className="user-dropdown-item user-dropdown-settings-header"
            onClick={handleOpenAllSettings}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenAllSettings();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <button
              type="button"
              className="user-dropdown-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAllSettings();
              }}
              title="Open Settings"
              aria-label="Open Settings"
            >
              <Settings size={16} />
            </button>

            <div className="user-dropdown-item-text" style={{ flex: 1 }}>
              <span className="user-dropdown-item-title">Settings</span>
              <span className="user-dropdown-item-desc">
                Open Full Settings Dashboard
              </span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Theme Toggle in Dropdown */}
          <div className="user-dropdown-theme-row">
            <div className="user-dropdown-theme-label">
              <span className="user-dropdown-item-icon">{isDark ? <Moon size={16} /> : <Sun size={16} />}</span>
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
            <span className="user-dropdown-item-icon"><LogOut size={16} /></span>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
