// ============================================================
// Navbar — Modern Sidebar Navigation
// ============================================================
// Clean sidebar navigation containing main features and utilities.
// Settings, Theme Toggle & Profile are moved to the top-right menu.
// ============================================================

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap, Network, ListTodo, Shield, LineChart, BookOpen } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/simulator', label: 'Playground', icon: <Zap size={18} /> },
  { to: '/graph', label: 'Dependency Graph', icon: <Network size={18} /> },
  { to: '/review-queue', label: 'Review Queue', icon: <ListTodo size={18} /> },
];

export default function Navbar({ isCollapsed, onToggle }) {

  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div 
        className="sidebar-logo" 
        onClick={onToggle}
        style={{ cursor: 'pointer', position: 'relative' }}
        title="Toggle Sidebar"
      >
        <div className="logo-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/logo.jpg" alt="DevRisk AI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {!isCollapsed ? (
          <>
            <div className="logo-info">
              <span className="logo-text">DevRisk AI</span>
              <span className="logo-version">v2.0 • JIT Defect ML</span>
            </div>
            <div style={{ position: 'absolute', right: '-12px', background: 'transparent', border: 'none', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', zIndex: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', right: '-12px', background: 'transparent', border: 'none', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', zIndex: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        )}
      </div>

      {/* Primary Navigation */}
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Divider */}
      <div style={{ marginTop: 'auto', padding: isCollapsed ? '0 8px' : '0 20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ height: 1, background: 'var(--border-medium)', width: '100%', opacity: 0.8 }}></div>
      </div>

      {/* Knowledge & Tools Section */}
      <ul className="sidebar-nav-utilities" style={{ paddingTop: 16 }}>
        <li>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? 'Analytics & Trends' : undefined}
          >
            <span className="sidebar-icon" style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', marginRight: isCollapsed ? 0 : '8px' }}><LineChart size={16} /></span>
            {!isCollapsed && <span className="sidebar-label">Analytics & Trends</span>}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/metrics-dictionary"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? 'Metrics Dictionary' : undefined}
          >
            <span className="sidebar-icon" style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', marginRight: isCollapsed ? 0 : '8px' }}><BookOpen size={16} /></span>
            {!isCollapsed && <span className="sidebar-label">Metrics Dictionary</span>}
            {!isCollapsed && <span className="sidebar-tag">28</span>}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/info"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? 'Project Info' : undefined}
          >
            <span className="sidebar-icon" style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', marginRight: isCollapsed ? 0 : '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
            </span>
            {!isCollapsed && <span className="sidebar-label">Project Info</span>}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
