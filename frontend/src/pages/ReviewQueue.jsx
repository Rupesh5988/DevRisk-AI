import React, { useState, useEffect } from 'react';
import { getOverview } from '../services/api';
import PRTable from '../components/PRTable';

export default function ReviewQueue() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for recent PRs
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const overviewRes = await getOverview();
        setOverview(overviewRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load review queue data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading Review Queue...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Error</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  const recentPRs = overview?.recent_prs || [];

  const filteredPRs = recentPRs.filter((pr) => {
    const matchesRisk = riskFilter === 'ALL' || (pr.risk_label && pr.risk_label.toUpperCase() === riskFilter);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (pr.title && pr.title.toLowerCase().includes(q)) || (pr.author && pr.author.toLowerCase().includes(q)) || (pr.repo_name && pr.repo_name.toLowerCase().includes(q)) || String(pr.pr_number).includes(q);
    return matchesRisk && matchesSearch;
  });

  const highCount = recentPRs.filter((pr) => pr.risk_label === 'HIGH').length;
  const medCount = recentPRs.filter((pr) => pr.risk_label === 'MEDIUM').length;
  const lowCount = recentPRs.filter((pr) => pr.risk_label === 'LOW').length;

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Review Queue</h1>
        <p className="page-subtitle">Track and analyze all pull requests via JIT Defect Pipeline.</p>
      </div>

      <div className="card animate-in" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 17, marginBottom: 2 }}>Pull Requests</h3>
            <span className="card-subtitle">
              Showing {filteredPRs.length} of {recentPRs.length} pull requests
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg-input)', padding: 3, borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
              <button className={`chip ${riskFilter === 'ALL' ? 'active' : ''}`} onClick={() => setRiskFilter('ALL')} style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}>
                All ({recentPRs.length})
              </button>
              <button className={`chip ${riskFilter === 'HIGH' ? 'active' : ''}`} onClick={() => setRiskFilter('HIGH')} style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}>
                🛑 High ({highCount})
              </button>
              <button className={`chip ${riskFilter === 'MEDIUM' ? 'active' : ''}`} onClick={() => setRiskFilter('MEDIUM')} style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}>
                ⚠️ Medium ({medCount})
              </button>
              <button className={`chip ${riskFilter === 'LOW' ? 'active' : ''}`} onClick={() => setRiskFilter('LOW')} style={{ borderRadius: 16, padding: '4px 12px', fontSize: 12 }}>
                ✅ Safe ({lowCount})
              </button>
            </div>

            <div style={{ position: 'relative', width: 240 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
              <input type="text" placeholder="Search PR or author..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '7px 28px 7px 30px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
              )}
            </div>
          </div>
        </div>

        <PRTable pullRequests={filteredPRs} />

        {filteredPRs.length === 0 && (
          <div className="empty-state" style={{ padding: '36px 16px' }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No matching pull requests found</div>
            <div className="empty-state-text">
              No PRs match filter "{riskFilter}" {searchQuery ? `and query "${searchQuery}"` : ''}.
            </div>
            <button className="btn btn-secondary" onClick={() => { setRiskFilter('ALL'); setSearchQuery(''); }} style={{ marginTop: 12 }}>
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
