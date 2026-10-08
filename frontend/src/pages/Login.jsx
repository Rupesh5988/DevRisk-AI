// ============================================================
// Login Page
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser(form);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ position: 'relative' }}>
      <button 
        onClick={() => navigate('/')} 
        style={{ position: 'absolute', top: 24, left: 24, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}
        className="back-to-home-btn"
      >
        <ArrowLeft size={18} /> Back to home
      </button>

      <div className="auth-card animate-in">
        {/* Logo */}
        <div className="auth-logo">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden' }}>
              <img src="/logo.jpg" alt="DevRisk AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <h1 className="auth-title">DevRisk AI</h1>
          <p className="auth-subtitle">Predict risky Pull Requests with ML</p>
        </div>

        <h2 className="auth-heading">Welcome back</h2>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="btn btn-secondary auth-btn"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
            onClick={() => {
              setForm({ email: 'rupeshhonrao88@gmail.com', password: 'password123' });
              loginUser({ email: 'rupeshhonrao88@gmail.com', password: 'password123' }).then((res) => {
                login(res.data.token, res.data.user);
                navigate('/');
              }).catch(() => {});
            }}
          >
            ⚡ Quick Demo Login (Honrao)
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}
