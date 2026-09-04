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
  const [selectedPRId, setSelectedPRId] = useState(prIdFromUrl || '');
  const [loadingPR, setLoadingPR] = useState(false);
  const [loadPRMessage, setLoadPRMessage] = useState(null);

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
  }, [author, prTitle, selectedRepoId]);

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
      const pr = res.data.pr || res.data;
      if (pr) {
        setSelectedPRId(pr.id);
        setPrTitle(pr.title || `PR #${pr.pr_number}`);
        setAuthor(pr.author || 'developer');
        if (pr.repo_id) setSelectedRepoId(pr.repo_id);

        const rawFeatures = pr.features?.features || pr.features || {};
        const extractedFeatures = {
          ns: rawFeatures.ns ?? 2,
          nd: rawFeatures.nd ?? 2,
          nf: rawFeatures.nf ?? 3,
          entropy: rawFeatures.entropy !== undefined ? Number(rawFeatures.entropy) : 0.85,
          la: rawFeatures.la !== undefined ? Number(rawFeatures.la) : (pr.additions || 120),
          ld: rawFeatures.ld !== undefined ? Number(rawFeatures.ld) : (pr.deletions || 30),
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
        executeSimulation(extractedFeatures, pr.title);
        setLoadPRMessage(`✅ Loaded real Pull Request #${pr.pr_number || pr.id}: "${pr.title}"! Sliders are now populated with its live repository metrics.`);
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
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">⚡ DevRisk Playground</h1>
            <p className="page-subtitle">
              Interactive developer sandbox to test code change risk, tune 14 metrics, and preview CI/CD gates.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCopyMarkdown}
              disabled={!simData}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              {copied ? '✅ Copied!' : '📋 Copy PR Comment'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveToDb}
              disabled={savingToDb || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              {savingToDb ? '💾 Saving...' : '💾 Save to Tracked PRs'}
            </button>
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
              ✅ Simulated PR Successfully Persisted to Database!
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
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Playground Sandbox vs. Live Pull Request Hub
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            DevRisk AI actively tracks and evaluates <strong>all pull requests across all your connected repositories</strong>.
            To inspect all active PRs and their real-time ML defect verdicts, visit the{' '}
            <Link to="/" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'underline' }}>
              Pull Request Dashboard →
            </Link>.
            <br />
            This <strong>Playground</strong> is an interactive "what-if" developer sandbox: you can simulate counterfactual code changes on <strong>any real PR loaded below</strong> or test custom slider values before committing code to GitHub.
          </div>
        </div>
      </div>

      {/* Real Tracked PR Loader Card */}
      <div className="card animate-in" style={{
        marginBottom: 20,
        padding: '18px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📂</span>
            <div>
              <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                Load Any Real Tracked Pull Request into Simulator
              </strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Select any PR from your connected repositories to populate the sliders with its live metrics
              </div>
            </div>
          </div>
          <span className="badge badge-low" style={{ fontSize: 11, padding: '3px 10px' }}>
            {trackedPRs.length} Tracked PRs Ready
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ flex: 1, minWidth: 280, cursor: 'pointer', fontSize: 13 }}
            value={selectedPRId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedPRId(id);
              if (id) loadSpecificPR(id);
            }}
            disabled={loadingPR}
          >
            <option value="">-- Choose any real PR to load into sliders ({trackedPRs.length} PRs available) --</option>
            {trackedPRs.map((pr) => (
              <option key={pr.id} value={pr.id}>
                #{pr.pr_number || pr.id} — {pr.title} [{pr.repo_name || 'repo'}] • {pr.risk_label || 'REVIEW'} ({Math.round(pr.risk_score || 0)}% risk)
              </option>
            ))}
          </select>

          {selectedPRId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/prs/${selectedPRId}`)}
              style={{ fontSize: 12, padding: '9px 16px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>View Full PR Analysis</span>
              <span>↗</span>
            </button>
          )}
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

      {/* Preset Selector */}
      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h3 className="card-title">Quick Preset Scenarios</h3>
          <span className="card-subtitle">Select a scenario or adjust the sliders below for custom changes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              className={`preset-btn ${activePreset === idx ? 'active' : ''}`}
              onClick={() => handlePresetSelect(idx)}
              style={{
                background: activePreset === idx ? 'var(--bg-card-hover)' : 'var(--bg-page)',
                border: activePreset === idx ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 13 }}>
                {preset.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {preset.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Repo & Title Config */}
      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div>
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

          <div>
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

          {repos.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Target Tracked Repository
              </label>
              <select
                className="input-field"
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.owner}/{r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  {features.fix ? '🛑 YES (Fix Commit)' : '✅ NO (Feature/Refactor)'}
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
                    {cicd.status === 'MERGE_BLOCKED' ? '🛑' : cicd.status === 'MANUAL_REVIEW_REQUIRED' ? '⚠️' : '✅'}
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
