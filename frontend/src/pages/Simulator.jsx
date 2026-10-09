// ============================================================
// DevRisk Playground — Interactive PR Risk Simulator
// ============================================================
// Allows developers and reviewers to simulate code changes,
// tweak 14 ApacheJIT risk metrics with live sliders, inspect
// TreeSHAP factor explanations, preview CI/CD merge-gate
// decisions, and save simulated changes directly to PostgreSQL.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { simulatePR, listRepos, listAllPRs, getPRDetail } from '../services/api';
import RiskGauge from '../components/RiskGauge';
import ShapCard from '../components/ShapCard';
import FeatureTooltip from '../components/FeatureTooltip';
import { getFeatureDef } from '../utils/featureDefinitions';
import { Copy, Check } from 'lucide-react';

const PRESETS = [
  {
    name: '🔴 High-Risk Architecture Overhaul',
    badge: 'HIGH RISK',
    badgeColor: 'badge-high',
    title: 'Refactor Core JWT Auth & Session Handling',
    features: {
      ns: 5, nd: 4, nf: 8, entropy: 1.65, la: 420, ld: 115, lt: 750,
      fix: 1, ndev: 12, age: 140, nuc: 18, exp: 3, rexp: 1, sexp: 0,
    },
  },
  {
    name: '🟡 Medium-Risk Payment Feature',
    badge: 'MEDIUM RISK',
    badgeColor: 'badge-medium',
    title: 'Add Stripe Webhook Listener & Routing',
    features: {
      ns: 2, nd: 2, nf: 4, entropy: 0.85, la: 180, ld: 45, lt: 420,
      fix: 0, ndev: 4, age: 45, nuc: 6, exp: 25, rexp: 8, sexp: 4,
    },
  },
  {
    name: '🟢 Low-Risk Docs & Typo Fix',
    badge: 'LOW RISK',
    badgeColor: 'badge-low',
    title: 'Update API Documentation & Fix Headers',
    features: {
      ns: 1, nd: 1, nf: 2, entropy: 0.20, la: 15, ld: 4, lt: 120,
      fix: 0, ndev: 2, age: 8, nuc: 1, exp: 40, rexp: 12, sexp: 10,
    },
  },
  {
    name: '⚠️ Junior Dev on Stale Core File',
    badge: 'HIGH REGRESSION',
    badgeColor: 'badge-high',
    title: 'Hotfix Stale Database Pooling Connection',
    features: {
      ns: 3, nd: 2, nf: 3, entropy: 1.20, la: 140, ld: 90, lt: 650,
      fix: 1, ndev: 18, age: 365, nuc: 28, exp: 2, rexp: 0, sexp: 0,
    },
  },
];

export default function Simulator() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize from location.state if navigated from PR detail, else default preset
  const initialFeatures = location.state?.features || PRESETS[0].features;
  const initialTitle = location.state?.title || PRESETS[0].title;

  const [activePreset, setActivePreset] = useState(location.state?.features ? -1 : 0);
  const [prTitle, setPrTitle] = useState(initialTitle);
  const [author, setAuthor] = useState('developer_sandbox');
  const [features, setFeatures] = useState({ ...initialFeatures });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Persistence state
  const [repos, setRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [savingToDb, setSavingToDb] = useState(false);
  const [savedPr, setSavedPr] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Tracked real PRs from database
  const [searchParams] = useSearchParams();
  const prIdFromUrl = searchParams.get('prId') || location.state?.prId;
  const [trackedPRs, setTrackedPRs] = useState([]);
  const [filterRepoId, setFilterRepoId] = useState(sessionStorage.getItem('simulator_filter_repo_id') || '');
  const [selectedPRId, setSelectedPRId] = useState(prIdFromUrl || sessionStorage.getItem('simulator_selected_pr_id') || '');
  const [loadingPR, setLoadingPR] = useState(false);
  const [loadPRMessage, setLoadPRMessage] = useState(null);
  const [showScopeInfo, setShowScopeInfo] = useState(false);

  const debounceTimerRef = useRef(null);

  // Load available repositories & all tracked PRs for simulator selection
  useEffect(() => {
    async function loadData() {
      try {
        const [repoRes, prRes] = await Promise.all([
          listRepos(),
          listAllPRs(1, 100),
        ]);
        const repoList = repoRes.data.repositories || [];
        setRepos(repoList);
        if (repoList.length > 0) {
          setSelectedRepoId(repoList[0].id);
        }
        const prList = prRes.data.pull_requests || [];
        setTrackedPRs(prList);
      } catch (err) {
        console.error('Failed to load repositories or PRs:', err);
      }
    }
    loadData();
  }, []);

  // Run simulation API call
  const executeSimulation = useCallback(async (featuresToSimulate, titleToSimulate, save = false) => {
    setLoading(true);
    try {
      const payload = {
        title: titleToSimulate || prTitle,
        author,
        features: featuresToSimulate,
        save_to_db: save,
        repo_id: selectedRepoId ? parseInt(selectedRepoId, 10) : null,
      };

      const res = await simulatePR(payload);
      setResult(res.data);

      if (save && res.data.simulated_pr?.id) {
        setSavedPr(res.data.simulated_pr);
        setSaveError(null);
      }
    } catch (err) {
      console.error('Simulation error:', err);
      if (save) {
        setSaveError(err.response?.data?.error || 'Failed to save PR to database');
      }
    } finally {
      setLoading(false);
    }
  }, [author, prTitle]); // Removed selectedRepoId from dependency so we can pass it directly if needed

  // Run simulation API call wrapping
  const triggerSimulationWithRepo = async (newRepoId) => {
    setLoading(true);
    try {
      const payload = {
        title: prTitle,
        author,
        features: features,
        save_to_db: false,
        repo_id: newRepoId ? parseInt(newRepoId, 10) : null,
      };
      const res = await simulatePR(payload);
      setResult(res.data);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced trigger for sliders
  const debouncedSimulate = useCallback((updatedFeatures, title) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      executeSimulation(updatedFeatures, title);
    }, 150);
  }, [executeSimulation]);

  // Load a specific real PR from the database into the simulator
  const loadSpecificPR = useCallback(async (prId) => {
    if (!prId) return;
    setLoadingPR(true);
    try {
      const res = await getPRDetail(prId);
      const prResponse = res.data.pull_request || res.data.pr || res.data;
      if (prResponse) {
        setSelectedPRId(prResponse.id.toString());
        sessionStorage.setItem('simulator_selected_pr_id', prResponse.id.toString());
        setPrTitle(prResponse.title || `PR #${prResponse.pr_number}`);
        setAuthor(prResponse.author || 'developer');
        if (prResponse.repo_id) {
          setSelectedRepoId(prResponse.repo_id);
          setFilterRepoId(prResponse.repo_id.toString());
          sessionStorage.setItem('simulator_filter_repo_id', prResponse.repo_id.toString());
        }

        const rawFeatures = res.data.features || prResponse.features || {};
        const extractedFeatures = {
          ns: rawFeatures.ns ?? 2,
          nd: rawFeatures.nd ?? 2,
          nf: rawFeatures.nf ?? 3,
          entropy: rawFeatures.entropy !== undefined ? Number(rawFeatures.entropy) : 0.85,
          la: rawFeatures.la !== undefined ? Number(rawFeatures.la) : (prResponse.additions || 120),
          ld: rawFeatures.ld !== undefined ? Number(rawFeatures.ld) : (prResponse.deletions || 30),
          lt: rawFeatures.lt !== undefined ? Number(rawFeatures.lt) : 450,
          fix: rawFeatures.fix !== undefined ? Number(rawFeatures.fix) : 0,
          ndev: rawFeatures.ndev !== undefined ? Number(rawFeatures.ndev) : 4,
          age: rawFeatures.age !== undefined ? Number(rawFeatures.age) : 35,
          nuc: rawFeatures.nuc !== undefined ? Number(rawFeatures.nuc) : 6,
          exp: rawFeatures.exp !== undefined ? Number(rawFeatures.exp) : 20,
          rexp: rawFeatures.rexp !== undefined ? Number(rawFeatures.rexp) : 8,
          sexp: rawFeatures.sexp !== undefined ? Number(rawFeatures.sexp) : 2,
        };
        setFeatures(extractedFeatures);
        setActivePreset(-1); // Switch to custom mode
        executeSimulation(extractedFeatures, prResponse.title);
        setLoadPRMessage(`✅ Loaded real Pull Request #${prResponse.pr_number || prResponse.id}: "${prResponse.title}"! Sliders are now populated with its live repository metrics.`);
        setTimeout(() => setLoadPRMessage(null), 7000);
      }
    } catch (err) {
      console.error('Failed to load PR into simulator:', err);
    } finally {
      setLoadingPR(false);
    }
  }, [executeSimulation]);

  // If prId parameter is passed in URL or state, load it automatically
  useEffect(() => {
    if (prIdFromUrl) {
      loadSpecificPR(prIdFromUrl);
    }
  }, [prIdFromUrl, loadSpecificPR]);

  // Initial simulation on mount
  useEffect(() => {
    if (!prIdFromUrl) {
      executeSimulation(features, prTitle);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handlePresetSelect = (index) => {
    setActivePreset(index);
    const p = PRESETS[index];
    setPrTitle(p.title);
    setFeatures({ ...p.features });
    executeSimulation(p.features, p.title);
  };

  const handleSliderChange = (key, value) => {
    const updated = { ...features, [key]: Number(value) };
    setFeatures(updated);
    setActivePreset(-1); // custom mode
    debouncedSimulate(updated, prTitle);
  };

  const handleSaveToDb = async () => {
    setSavingToDb(true);
    setSavedPr(null);
    setSaveError(null);
    try {
      await executeSimulation(features, prTitle, true);
    } finally {
      setSavingToDb(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!result?.simulated_pr?.github_markdown_comment) return;
    navigator.clipboard.writeText(result.simulated_pr.github_markdown_comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const simData = result?.simulated_pr;
  const cicd = simData?.ci_cd_gate;
  const blast = simData?.blast_radius;

  return (
    <>
      <div className="page-header" style={{ position: 'relative' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
          style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}
        >
          <span>← Back</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 className="page-title" style={{ marginTop: 0, marginBottom: 8 }}>Playground</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Interactive developer sandbox to test code change risk, tune 14 metrics, and preview CI/CD gates.
            </p>
          </div>
        </div>
      </div>

      {/* Save to DB Confirmation Banner */}
      {savedPr && (
        <div className="card animate-in" style={{
          marginBottom: 24,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <strong style={{ color: 'var(--risk-low)', fontSize: 14 }}>
              Simulated PR Successfully Persisted to Database!
            </strong>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              "{savedPr.title}" is now permanently recorded in PostgreSQL and visible on Dashboard and Repository views.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/prs/${savedPr.id}`)}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            View Full PR Report #{savedPr.id} →
          </button>
        </div>
      )}

      {saveError && (
        <div className="card animate-in" style={{
          marginBottom: 24,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: 'var(--risk-high)',
          fontSize: 13,
        }}>
          ❌ {saveError}
        </div>
      )}

      {/* Scope & Architecture Clarity Banner */}
      <div className="card animate-in" style={{
        marginBottom: 20,
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 24, lineHeight: 1, marginTop: 2 }}>💡</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Playground Sandbox vs. Live Pull Request Hub
            </div>
            <button
              onClick={() => setShowScopeInfo(!showScopeInfo)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showScopeInfo ? 'Show less ↑' : 'Read more ↓'}
            </button>
          </div>
          {showScopeInfo && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
              DevRisk AI actively tracks and evaluates <strong>all pull requests across all your connected repositories</strong>.
              To inspect all active PRs and their real-time ML defect verdicts, visit the{' '}
              <Link to="/" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'underline' }}>
                Pull Request Dashboard →
              </Link>.
              <br />
              This <strong>Playground</strong> is an interactive "what-if" developer sandbox: you can simulate counterfactual code changes on <strong>any real PR loaded below</strong> or test custom slider values before committing code to GitHub.
            </div>
          )}
        </div>
      </div>

      {/* Real Tracked PR Loader Card */}
      <div className="card animate-in" style={{
        marginBottom: 24,
        padding: '22px 24px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(34, 211, 238, 0.02) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderLeft: '4px solid #10b981',
        boxShadow: '0 8px 32px -8px rgba(16, 185, 129, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-50%', left: '-5%', width: '250px', height: '250px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              padding: '10px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: 0, letterSpacing: '0.2px' }}>
                Load Real Tracked Pull Request
              </h2>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Select any PR from your connected repositories to instantly populate the Simulator with its live metrics
              </div>
            </div>
          </div>
          <span style={{ 
            fontSize: 11.5, 
            padding: '5px 12px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            fontWeight: 600
          }}>
            {trackedPRs.length} Tracked PRs Ready
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ flex: 1, minWidth: 280, cursor: 'pointer', fontSize: 13 }}
            value={filterRepoId}
            onChange={(e) => {
              const val = e.target.value;
              setFilterRepoId(val);
              sessionStorage.setItem('simulator_filter_repo_id', val);
              setSelectedPRId(''); // reset PR selection on repo change
              sessionStorage.removeItem('simulator_selected_pr_id');
            }}
            disabled={loadingPR}
          >
            <option value="">-- First: Select a Repository --</option>
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
            ))}
          </select>

          <select
            className="input-field"
            style={{ flex: 1, minWidth: 280, cursor: filterRepoId ? 'pointer' : 'not-allowed', fontSize: 13, opacity: filterRepoId ? 1 : 0.6 }}
            value={selectedPRId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedPRId(id);
              if (id) {
                sessionStorage.setItem('simulator_selected_pr_id', id);
                loadSpecificPR(id);
              } else {
                sessionStorage.removeItem('simulator_selected_pr_id');
              }
            }}
            disabled={loadingPR || !filterRepoId}
          >
            <option value="">{filterRepoId ? "-- Second: Choose a PR to load --" : "-- Please select a repository first --"}</option>
            {trackedPRs.filter(pr => pr.repo_id == filterRepoId).map((pr) => (
              <option key={pr.id} value={pr.id}>
                #{pr.pr_number || pr.id} — {pr.title} • {pr.risk_label || 'REVIEW'} ({Math.round(pr.risk_score || 0)}% risk)
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/prs/${selectedPRId}`)}
            style={{ fontSize: 12, padding: '9px 16px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: selectedPRId ? 1 : 0.5, cursor: selectedPRId ? 'pointer' : 'not-allowed' }}
            disabled={!selectedPRId}
          >
            <span>View Full PR Analysis</span>
            <span>↗</span>
          </button>
        </div>

        {loadPRMessage && (
          <div style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--risk-low-bg)',
            border: '1px solid var(--risk-low)',
            fontSize: 12.5,
            color: 'var(--risk-low)',
            fontWeight: 600,
          }}>
            {loadPRMessage}
          </div>
        )}
      </div>

      {/* Configuration Section: Presets & Target Config */}
      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h3 className="card-title">Quick Preset Scenarios</h3>
          <span className="card-subtitle">Select a scenario or adjust the sliders below for custom changes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {PRESETS.map((preset, idx) => (
            <label
              key={idx}
              className={`preset-btn ${activePreset === idx ? 'active' : ''}`}
              style={{
                background: activePreset === idx ? 'var(--bg-card-hover)' : 'var(--bg-page)',
                border: activePreset === idx ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                margin: 0
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                <input 
                  type="radio" 
                  name="preset-selection"
                  checked={activePreset === idx} 
                  onChange={() => handlePresetSelect(idx)}
                  style={{ cursor: 'pointer', margin: 0 }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.4, whiteSpace: 'normal', overflowWrap: 'break-word' }}>
                  {preset.name}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--border-medium)', margin: '0 -20px 24px -20px' }}></div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              PR Title
            </label>
            <input
              type="text"
              className="input-field"
              value={prTitle}
              onChange={(e) => {
                setPrTitle(e.target.value);
                debouncedSimulate(features, e.target.value);
              }}
              placeholder="e.g. Add payment webhooks"
            />
          </div>

          {repos.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Target Tracked Repository (For Saving)
              </label>
              <select
                className="input-field"
                value={selectedRepoId}
                onChange={(e) => {
                  setSelectedRepoId(e.target.value);
                  triggerSimulationWithRepo(e.target.value);
                }}
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.owner}/{r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Author Name
            </label>
            <input
              type="text"
              className="input-field"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="developer_sandbox"
            />
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn"
              onClick={handleCopyMarkdown}
              disabled={!simData}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, width: '100%', padding: '6px 10px',
                background: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-glass)',
                border: copied ? '1px solid var(--risk-low)' : '1px solid var(--border-medium)',
                color: copied ? 'var(--risk-low)' : 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy PR Comment'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveToDb}
              disabled={savingToDb || loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, width: '100%', padding: '6px 10px' }}
            >
              {savingToDb ? 'Saving...' : 'Save to Tracked PRs'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Simulation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        
        {/* Left Column: Interactive Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Group 1: Churn & Volume */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">📝 1. Code Churn & Volume</h3>
                <span className="card-subtitle">Volume of modifications and change concentration</span>
              </div>
            </div>

            <div className="slider-group">
              {/* la */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Lines Added (<code>la</code>)</span>
                    <FeatureTooltip featureName="la" value={features.la} />
                  </div>
                  <strong style={{ color: features.la > 300 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    +{features.la} lines
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={features.la}
                  onChange={(e) => handleSliderChange('la', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('la').interpretValue(features.la).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('la').interpretValue(features.la).meaning}</span>
                </div>
              </div>

              {/* ld */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Lines Deleted (<code>ld</code>)</span>
                    <FeatureTooltip featureName="ld" value={features.ld} />
                  </div>
                  <strong style={{ color: features.ld > 100 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    -{features.ld} lines
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={features.ld}
                  onChange={(e) => handleSliderChange('ld', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('ld').interpretValue(features.ld).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('ld').interpretValue(features.ld).meaning}</span>
                </div>
              </div>

              {/* lt */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Lines in Files (<code>lt</code>)</span>
                    <FeatureTooltip featureName="lt" value={features.lt || 500} />
                  </div>
                  <strong>{features.lt || 500} lines</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="50"
                  value={features.lt || 500}
                  onChange={(e) => handleSliderChange('lt', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('lt').interpretValue(features.lt || 500).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('lt').interpretValue(features.lt || 500).meaning}</span>
                </div>
              </div>

              {/* entropy */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Change Entropy (<code>entropy</code>)</span>
                    <FeatureTooltip featureName="entropy" value={features.entropy} />
                  </div>
                  <strong style={{ color: features.entropy > 1.2 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {Number(features.entropy).toFixed(2)}
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.05"
                  value={features.entropy}
                  onChange={(e) => handleSliderChange('entropy', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('entropy').interpretValue(features.entropy).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('entropy').interpretValue(features.entropy).meaning}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Architectural Footprint */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">🏛️ 2. Architectural Footprint</h3>
                <span className="card-subtitle">Diffusion across files, folders, and subsystems</span>
              </div>
            </div>

            <div className="slider-group">
              {/* nf */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Files Modified (<code>nf</code>)</span>
                    <FeatureTooltip featureName="nf" value={features.nf} />
                  </div>
                  <strong style={{ color: features.nf > 5 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {features.nf} files
                  </strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={features.nf}
                  onChange={(e) => handleSliderChange('nf', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('nf').interpretValue(features.nf).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('nf').interpretValue(features.nf).meaning}</span>
                </div>
              </div>

              {/* nd */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Directories Touched (<code>nd</code>)</span>
                    <FeatureTooltip featureName="nd" value={features.nd} />
                  </div>
                  <strong>{features.nd} directories</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={features.nd}
                  onChange={(e) => handleSliderChange('nd', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('nd').interpretValue(features.nd).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('nd').interpretValue(features.nd).meaning}</span>
                </div>
              </div>

              {/* ns */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Subsystems Modified (<code>ns</code>)</span>
                    <FeatureTooltip featureName="ns" value={features.ns} />
                  </div>
                  <strong style={{ color: features.ns > 2 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {features.ns} subsystems
                  </strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={features.ns}
                  onChange={(e) => handleSliderChange('ns', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('ns').interpretValue(features.ns).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('ns').interpretValue(features.ns).meaning}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Contributor Familiarity */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">👤 3. Developer Context & Experience</h3>
                <span className="card-subtitle">Author familiarity and domain background</span>
              </div>
            </div>

            <div className="slider-group">
              {/* exp */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Author Total Commits (<code>exp</code>)</span>
                    <FeatureTooltip featureName="exp" value={features.exp} />
                  </div>
                  <strong style={{ color: features.exp < 5 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                    {features.exp} commits
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={features.exp}
                  onChange={(e) => handleSliderChange('exp', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('exp').interpretValue(features.exp).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('exp').interpretValue(features.exp).meaning}</span>
                </div>
              </div>

              {/* sexp */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Subsystem Commits (<code>sexp</code>)</span>
                    <FeatureTooltip featureName="sexp" value={features.sexp} />
                  </div>
                  <strong>{features.sexp} commits</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={features.sexp}
                  onChange={(e) => handleSliderChange('sexp', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('sexp').interpretValue(features.sexp).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('sexp').interpretValue(features.sexp).meaning}</span>
                </div>
              </div>

              {/* ndev */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Prior Authors on Files (<code>ndev</code>)</span>
                    <FeatureTooltip featureName="ndev" value={features.ndev || 5} />
                  </div>
                  <strong>{features.ndev || 5} developers</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={features.ndev || 5}
                  onChange={(e) => handleSliderChange('ndev', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('ndev').interpretValue(features.ndev || 5).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('ndev').interpretValue(features.ndev || 5).meaning}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group 4: Code Stability & Bug Status */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">🛡️ 4. File Stability & Recurrence Risk</h3>
                <span className="card-subtitle">Historical file age, revisions, and bug status</span>
              </div>
            </div>

            <div className="slider-group">
              {/* age */}
              <div className="slider-row">
                <div className="slider-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>File Age / Dormancy (<code>age</code>)</span>
                    <FeatureTooltip featureName="age" value={features.age} />
                  </div>
                  <strong>{features.age} days dormant</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="365"
                  value={features.age}
                  onChange={(e) => handleSliderChange('age', e.target.value)}
                  className="risk-slider"
                />
                <div className={`feature-tooltip-rating rating-${getFeatureDef('age').interpretValue(features.age).rating}`} style={{ marginTop: 4, fontSize: 11.5 }}>
                  <span className="rating-dot"></span>
                  <span>{getFeatureDef('age').interpretValue(features.age).meaning}</span>
                </div>
              </div>

              {/* fix */}
              <div className="slider-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                      Is Bug Fix? (<code>fix</code>)
                    </span>
                    <FeatureTooltip featureName="fix" value={features.fix} />
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Fixes have 3x higher historical recurrence probability.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSliderChange('fix', features.fix ? 0 : 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: features.fix ? 'var(--risk-high-bg)' : 'var(--bg-input)',
                    border: features.fix ? '1px solid var(--risk-high)' : '1px solid var(--border-medium)',
                    color: features.fix ? 'var(--risk-high)' : 'var(--text-secondary)',
                  }}
                >
                  {features.fix ? 'YES (Fix Commit)' : 'NO (Feature/Refactor)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Verdict, CI/CD Gate, SHAP, and Blast Radius */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Live Risk Gauge & CI/CD Gate Verdict */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-header" style={{ justifyContent: 'center' }}>
              <h3 className="card-title">Real-Time Risk Verdict</h3>
            </div>

            <div style={{ margin: '16px auto' }}>
              <RiskGauge score={simData?.risk_score ?? 0} />
            </div>

            {/* CI/CD Gate Banner */}
            {cicd && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background:
                    cicd.status === 'MERGE_BLOCKED'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : cicd.status === 'MANUAL_REVIEW_REQUIRED'
                      ? 'rgba(234, 179, 8, 0.12)'
                      : 'rgba(34, 197, 94, 0.12)',
                  border:
                    cicd.status === 'MERGE_BLOCKED'
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : cicd.status === 'MANUAL_REVIEW_REQUIRED'
                      ? '1px solid rgba(234, 179, 8, 0.4)'
                      : '1px solid rgba(34, 197, 94, 0.4)',
                  textAlign: 'left',
                  marginTop: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>
                    {cicd.status === 'MERGE_BLOCKED' ? 'BLOCKED' : cicd.status === 'MANUAL_REVIEW_REQUIRED' ? 'REVIEW REQUIRED' : 'PASSED'}
                  </span>
                  <strong
                    style={{
                      color:
                        cicd.status === 'MERGE_BLOCKED'
                          ? 'var(--risk-high)'
                          : cicd.status === 'MANUAL_REVIEW_REQUIRED'
                          ? 'var(--risk-medium)'
                          : 'var(--risk-low)',
                      fontSize: 13,
                    }}
                  >
                    {cicd.headline}
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {cicd.reason}
                </div>
              </div>
            )}

            {/* Blast Radius Metrics */}
            {blast && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
                <div style={{ background: 'var(--bg-page)', padding: '10px 8px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--risk-high)' }}>
                    {blast.directly_modified_count}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Files Touched</div>
                </div>
                <div style={{ background: 'var(--bg-page)', padding: '10px 8px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {blast.impacted_downstream_count}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AST Dependencies</div>
                </div>
                <div style={{ background: 'var(--bg-page)', padding: '10px 8px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {blast.total_affected_modules}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Blast Reach</div>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Developer Recommendations */}
          {simData?.recommendations && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <h3 className="card-title">💡 Actionable Remediation Steps</h3>
                <span className="card-subtitle">Steps to reduce risk before opening PR</span>
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {simData.recommendations.map((rec, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TreeSHAP Factor Explanations */}
          <ShapCard explanations={result?.shap_explanations || []} />
        </div>
      </div>
    </>
  );
}
