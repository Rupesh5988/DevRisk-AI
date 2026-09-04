// ============================================================
// App.jsx — Root Component with Auth, Theme, Routing & Layout
// ============================================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import FeatureGlossaryModal from './components/FeatureGlossaryModal';
import Dashboard from './pages/Dashboard';
import PRDetail from './pages/PRDetail';
import Repositories from './pages/Repositories';
import RepoDetail from './pages/RepoDetail';
import DependencyGraphPage from './pages/DependencyGraphPage';
import Simulator from './pages/Simulator';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

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
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Guest-only routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
      <Route path="/prs/:id" element={<ProtectedRoute><PRDetail /></ProtectedRoute>} />
      <Route path="/repos" element={<ProtectedRoute><Repositories /></ProtectedRoute>} />
      <Route path="/repos/:id" element={<ProtectedRoute><RepoDetail /></ProtectedRoute>} />
      <Route path="/graph" element={<ProtectedRoute><DependencyGraphPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Allow any component to dispatch 'open-devrisk-glossary' to open the guide
  useEffect(() => {
    function handleOpenEvent() {
      setGlossaryOpen(true);
    }
    window.addEventListener('open-devrisk-glossary', handleOpenEvent);
    return () => window.removeEventListener('open-devrisk-glossary', handleOpenEvent);
  }, []);

  return (
    <div className="app-layout">
      {isAuthenticated && <Navbar onOpenGlossary={() => setGlossaryOpen(true)} />}
      <main className={isAuthenticated ? "main-content" : "full-page-content"}>
        <AppRoutes />
      </main>
      <FeatureGlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
