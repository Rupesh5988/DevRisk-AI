// ============================================================
// App.jsx — Root Component with Auth, Theme, Routing & Layout
// ============================================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import UserDropdown from './components/UserDropdown';
import Dashboard from './pages/Dashboard';
import PRDetail from './pages/PRDetail';
import Repositories from './pages/Repositories';
import RepoDetail from './pages/RepoDetail';
import DependencyGraphPage from './pages/DependencyGraphPage';
import ReviewQueue from './pages/ReviewQueue';
import Simulator from './pages/Simulator';
import Analytics from './pages/Analytics';
import MetricsDictionary from './pages/MetricsDictionary';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import ProjectInfoWidget from './components/ProjectInfoWidget';
// Protected route wrapper — redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading DevRisk AI...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Guest route wrapper — redirects to dashboard if already logged in
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      {/* Guest-only routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected routes */}
      <Route path="/" element={
        loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <div className="loading-text">Loading DevRisk AI...</div>
          </div>
        ) : isAuthenticated ? (
          <Dashboard />
        ) : (
          <Landing />
        )
      } />
      <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
      <Route path="/prs/:id" element={<ProtectedRoute><PRDetail /></ProtectedRoute>} />
      <Route path="/repos" element={<ProtectedRoute><Repositories /></ProtectedRoute>} />
      <Route path="/repos/:id" element={<ProtectedRoute><RepoDetail /></ProtectedRoute>} />
      <Route path="/graph" element={<ProtectedRoute><DependencyGraphPage /></ProtectedRoute>} />
      <Route path="/review-queue" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/metrics-dictionary" element={<ProtectedRoute><MetricsDictionary /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isAuthenticated && (
        <Navbar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      )}
      {isAuthenticated && <UserDropdown />}
      {isAuthenticated && <ProjectInfoWidget />}
      <main className={isAuthenticated ? "main-content" : "full-page-content"}>
        <AppRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
