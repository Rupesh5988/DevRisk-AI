// ============================================================
// DevRisk Playground — PR "What-If" Risk Simulator
// ============================================================
// Interactive developer sandbox to test code change risk, tune
// metrics, inspect TreeSHAP drivers, preview CI/CD gates, and save
// counterfactual changes to PostgreSQL.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { simulatePR, listRepos, listAllPRs, getPRDetail } from '../services/api';
import RiskGauge from '../components/RiskGauge';
import ShapCard from '../components/ShapCard';
import FeatureTooltip from '../components/FeatureTooltip';
import { getFeatureDef } from '../utils/featureDefinitions';
import { Copy, Check, ArrowLeft, Sliders, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react';

const PRESETS = [
  {
    name: '🔴 Major Refactor',
    tag: 'High Risk',
    title: 'Refactor Core JWT Auth & Session Handling',
    features: {
      ns: 5, nd: 4, nf: 8, entropy: 1.65, la: 420, ld: 115, lt: 750,
      fix: 1, ndev: 12, age: 140, nuc: 18, exp: 3, rexp: 1, sexp: 0,
    },
  },
  {
    name: '🟡 New Feature',
    tag: 'Moderate',
    title: 'Add Stripe Webhook Listener & Routing',
    features: {
      ns: 2, nd: 2, nf: 4, entropy: 0.85, la: 180, ld: 45, lt: 420,
      fix: 0, ndev: 4, age: 45, nuc: 6, exp: 25, rexp: 8, sexp: 4,
    },
  },
  {
    name: '🟢 Minor Fix / Docs',
    tag: 'Safe',
    title: 'Update API Documentation & Fix Headers',
    features: {
      ns: 1, nd: 1, nf: 2, entropy: 0.20, la: 15, ld: 4, lt: 120,
      fix: 0, ndev: 2, age: 8, nuc: 1, exp: 40, rexp: 12, sexp: 10,
    },
  },
  {
    name: '⚠️ Legacy Hotfix',
    tag: 'Regression Risk',
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

  const initialFeatures = location.state?.features || PRESETS[0].features;
  const initialTitle = location.state?.title || PRESETS[0].title;

  const [activePreset, setActivePreset] = useState(location.state?.features ? -1 : 0);
  const [prTitle, setPrTitle] = useState(initialTitle);
  const [author, setAuthor] = useState('developer_sandbox');
  const [features, setFeatures] = useState({ ...initialFeatures });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active category tab: 'all' | 'churn' | 'architecture' | 'developer' | 'stability'
  const [categoryTab, setCategoryTab] = useState('churn');

  // Right column insights tab: 'shap' | 'remediation'
  const [insightTab, setInsightTab] = useState('shap');

  // Persistence state
  const [repos, setRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [savingToDb, setSavingToDb] = useState(false);
  const [savedPr, setSavedPr] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Tracked real PRs
  const [searchParams] = useSearchParams();
  const prIdFromUrl = searchParams.get('prId') || location.state?.prId;
  const [trackedPRs, setTrackedPRs] = useState([]);
  const [filterRepoId, setFilterRepoId] = useState(sessionStorage.getItem('simulator_filter_repo_id') || '');
  const [selectedPRId, setSelectedPRId] = useState(prIdFromUrl || sessionStorage.getItem('simulator_selected_pr_id') || '');
  const [loadingPR, setLoadingPR] = useState(false);
  const [loadPRMessage, setLoadPRMessage] = useState(null);

  const debounceTimerRef = useRef(null);

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
        setTrackedPRs(prRes.data.pull_requests || []);
      } catch (err) {
        console.error('Failed to load repositories or PRs:', err);
      }
    }
    loadData();
  }, []);

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

  const triggerSimulationWithRepo = async (newRepoId) => {
    setLoading(true);
    try {
      const payload = {
        title: prTitle,
        author,
        features,
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

  const debouncedSimulate = useCallback((updatedFeatures, title) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      executeSimulation(updatedFeatures, title);
    }, 150);
  }, [executeSimulation]);

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
        setActivePreset(-1);
        executeSimulation(extractedFeatures, prResponse.title);
        setLoadPRMessage(`✅ Loaded PR #${prResponse.pr_number || prResponse.id}: "${prResponse.title}" into simulator.`);
        setTimeout(() => setLoadPRMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to load PR into simulator:', err);
    } finally {
      setLoadingPR(false);
    }
  }, [executeSimulation]);

  useEffect(() => {
    if (prIdFromUrl) {
      loadSpecificPR(prIdFromUrl);
    }
  }, [prIdFromUrl, loadSpecificPR]);

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

  const handleSliderChange = (featureName, value) => {
    setActivePreset(-1);
    const numValue = featureName === 'entropy' ? parseFloat(value) : parseInt(value, 10);
    const updated = { ...features, [featureName]: numValue };
    setFeatures(updated);
    debouncedSimulate(updated, prTitle);
  };

  const handleSaveToDb = async () => {
    setSavingToDb(true);
    await executeSimulation(features, prTitle, true);
    setSavingToDb(false);
  };

  const handleCopyMarkdown = () => {
    if (!result?.simulated_pr?.github_markdown_comment) return;
    navigator.clipboard.writeText(result.simulated_pr.github_markdown_comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simData = result?.simulated_pr;
  const cicd = simData?.ci_cd_gate;
  const blast = simData?.blast_radius;
  const shapExplanations = result?.shap_explanations || [];
  const recommendations = simData?.recommendations || [];

  // Helper for rendering clean slider rows with inline status pills (NO 11 SCREAMING BOXES)
  const renderSlider = (key, label, min, max, step = 1, unit = '') => {
    const val = features[key] ?? 0;
    const def = getFeatureDef(key);
    const interp = def.interpretValue(val);
    const isHigh = interp.rating === 'risky';
    const isMod = interp.rating === 'moderate';

    return (
      <div key={key} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>({key})</span>
            <FeatureTooltip featureName={key} value={val} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                textTransform: 'uppercase',
                background: isHigh ? 'var(--risk-high-bg)' : isMod ? 'var(--risk-medium-bg)' : 'var(--risk-low-bg)',
                color: isHigh ? 'var(--risk-high)' : isMod ? 'var(--risk-medium)' : 'var(--risk-low)',
                border: `1px solid ${isHigh ? 'rgba(239, 68, 68, 0.25)' : isMod ? 'rgba(234, 179, 8, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
              }}
            >
              {interp.label}
            </span>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: isHigh ? 'var(--risk-high)' : 'var(--text-primary)',
              }}
            >
              {unit === 'lines' && key === 'la' ? `+${val}` : unit === 'lines' && key === 'ld' ? `-${val}` : val} {unit}
            </span>
          </div>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => handleSliderChange(key, e.target.value)}
          className="risk-slider"
        />
      </div>
    );
  };

  const filteredTrackedPRs = filterRepoId
    ? trackedPRs.filter((pr) => pr.repo_id.toString() === filterRepoId)
    : trackedPRs;

  return (
    <div className="dashboard-container">
      {/* 1. Header & Quick Action Row */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: 20 }}>PR "What-If" Simulator</h1>
              <p className="page-subtitle" style={{ margin: '2px 0 0', fontSize: 12 }}>
                Simulate code change risk and evaluate CI/CD quality gate impact before pushing to GitHub.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCopyMarkdown}
              disabled={!simData}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px' }}
              title="Copy markdown assessment comment for GitHub PR"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy PR Comment'}</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSaveToDb}
              disabled={savingToDb || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 14px' }}
            >
              <span>{savingToDb ? 'Saving...' : 'Save to Tracked PRs'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Banner */}
      {savedPr && (
        <div className="card animate-in" style={{ marginBottom: 16, padding: '12px 18px', background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--risk-low)', fontWeight: 600 }}>
            ✅ Simulated PR "{savedPr.title}" saved to PostgreSQL! Visible in Dashboard and Review Queue.
          </div>
          <button className="btn btn-primary" onClick={() => navigate(`/prs/${savedPr.id}`)} style={{ fontSize: 12, padding: '5px 12px' }}>
            View Report ↗
          </button>
        </div>
      )}

      {saveError && (
        <div className="card animate-in" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high)', color: 'var(--risk-high)', fontSize: 12.5 }}>
          ❌ {saveError}
        </div>
      )}

      {/* 2. Unified Control Strip: Presets & Tracked PR Loader */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        {/* Source Row: Presets & Real PR Loader */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
          {/* Quick Scenario Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Scenarios:
            </span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(idx)}
                style={{
                  background: activePreset === idx ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: activePreset === idx ? '#ffffff' : 'var(--text-secondary)',
                  border: activePreset === idx ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 16,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Real Tracked PR Loader */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📥 Or Inspect Tracked PR:
            </span>

            <select
              className="input-field"
              style={{ fontSize: 12, padding: '5px 10px', minWidth: 160 }}
              value={filterRepoId}
              onChange={(e) => {
                setFilterRepoId(e.target.value);
                setSelectedPRId('');
              }}
            >
              <option value="">All Repositories</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.owner}/{r.name}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              style={{ fontSize: 12, padding: '5px 10px', minWidth: 260, maxWidth: 340 }}
              value={selectedPRId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPRId(val);
                if (val) loadSpecificPR(val);
              }}
              disabled={loadingPR}
            >
              <option value="">Choose a PR to inspect...</option>
              {filteredTrackedPRs.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  #{pr.pr_number || pr.id} — {pr.title ? (pr.title.length > 40 ? pr.title.slice(0, 40) + '...' : pr.title) : 'Untitled'} ({Math.round(pr.risk_score || 0)}% risk)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dedicated Simulation Title Bar with Clear Label & Context */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
              🏷️ Simulation Name / PR Title:
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 260, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Enter a descriptive title for this simulated change..."
              value={prTitle}
              onChange={(e) => {
                setPrTitle(e.target.value);
                debouncedSimulate(features, e.target.value);
              }}
              style={{ fontSize: 12.5, padding: '6px 12px', flex: 1, fontWeight: 600, color: 'var(--text-primary)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Used for PR review comments & saved records
            </span>
          </div>

          {loadPRMessage && (
            <span style={{ fontSize: 12, color: 'var(--risk-low)', fontWeight: 600 }}>
              {loadPRMessage}
            </span>
          )}
        </div>
      </div>

      {/* 3. Simulator Cockpit (Two Columns with Sticky Verdict) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)', gap: 20, alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Metric Tuner with Category Switcher (No 11 screaming boxes!) */}
        <div className="card" style={{ padding: 20 }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <button
              type="button"
              className={`chip ${categoryTab === 'churn' ? 'active' : ''}`}
              onClick={() => setCategoryTab('churn')}
              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
            >
              📝 Code Churn (4)
            </button>
            <button
              type="button"
              className={`chip ${categoryTab === 'architecture' ? 'active' : ''}`}
              onClick={() => setCategoryTab('architecture')}
              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
            >
              🏛️ Architecture (3)
            </button>
            <button
              type="button"
              className={`chip ${categoryTab === 'developer' ? 'active' : ''}`}
              onClick={() => setCategoryTab('developer')}
              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
            >
              👤 Contributor (3)
            </button>
            <button
              type="button"
              className={`chip ${categoryTab === 'stability' ? 'active' : ''}`}
              onClick={() => setCategoryTab('stability')}
              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
            >
              ⏱️ File Stability (2)
            </button>
            <button
              type="button"
              className={`chip ${categoryTab === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryTab('all')}
              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
            >
              👁️ View All (12)
            </button>
          </div>

          {/* Metric Category 1: Code Churn */}
          {(categoryTab === 'churn' || categoryTab === 'all') && (
            <div style={{ marginBottom: categoryTab === 'all' ? 24 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📝 Code Churn & Volume</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— Modification scale & density</span>
              </div>
              {renderSlider('la', 'Lines Added', 0, 1000, 10, 'lines')}
              {renderSlider('ld', 'Lines Deleted', 0, 500, 5, 'lines')}
              {renderSlider('lt', 'Lines in Files', 50, 3000, 50, 'lines')}
              {renderSlider('entropy', 'Change Entropy (Scatter)', 0, 2.5, 0.05, '')}
            </div>
          )}

          {/* Metric Category 2: Architecture */}
          {(categoryTab === 'architecture' || categoryTab === 'all') && (
            <div style={{ marginBottom: categoryTab === 'all' ? 24 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏛️ Architectural Footprint</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— Package & subsystem spread</span>
              </div>
              {renderSlider('nf', 'Files Modified', 1, 25, 1, 'files')}
              {renderSlider('nd', 'Directories Touched', 1, 10, 1, 'dirs')}
              {renderSlider('ns', 'Subsystems Modified', 1, 6, 1, 'subsystems')}
            </div>
          )}

          {/* Metric Category 3: Developer Context */}
          {(categoryTab === 'developer' || categoryTab === 'all') && (
            <div style={{ marginBottom: categoryTab === 'all' ? 24 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👤 Contributor Experience</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— Author domain familiarity</span>
              </div>
              {renderSlider('exp', 'Author Total Commits', 0, 100, 1, 'commits')}
              {renderSlider('sexp', 'Subsystem Commits', 0, 50, 1, 'commits')}
              {renderSlider('ndev', 'Prior Authors on Files', 1, 25, 1, 'devs')}
            </div>
          )}

          {/* Metric Category 4: File Stability */}
          {(categoryTab === 'stability' || categoryTab === 'all') && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⏱️ File Stability & Intent</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— Historical dormancy & fix status</span>
              </div>
              {renderSlider('age', 'File Dormancy', 1, 365, 1, 'days')}

              {/* Bug Fix Toggle */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  marginTop: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Is Bug Fix Commit? (fix)</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Historical bug fixes have 3x higher regression probability.</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSliderChange('fix', features.fix ? 0 : 1)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: features.fix ? 'var(--risk-high-bg)' : 'var(--bg-card)',
                    border: features.fix ? '1px solid var(--risk-high)' : '1px solid var(--border-medium)',
                    color: features.fix ? 'var(--risk-high)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {features.fix ? 'YES (Fix Commit)' : 'NO (Routine)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY Real-Time Verdict Panel (Locked in viewport!) */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card A: Verdict & CI/CD Gate */}
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Predicted Defect Risk
            </div>

            <div style={{ margin: '8px auto 14px' }}>
              <RiskGauge score={simData?.risk_score ?? 0} />
            </div>

            {/* Quality Gate Status Block */}
            {cicd && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  textAlign: 'left',
                  background:
                    cicd.status === 'MERGE_BLOCKED'
                      ? 'var(--risk-high-bg)'
                      : cicd.status === 'MANUAL_REVIEW_REQUIRED'
                      ? 'var(--risk-medium-bg)'
                      : 'var(--risk-low-bg)',
                  border: `1px solid ${
                    cicd.status === 'MERGE_BLOCKED'
                      ? 'rgba(239, 68, 68, 0.35)'
                      : cicd.status === 'MANUAL_REVIEW_REQUIRED'
                      ? 'rgba(234, 179, 8, 0.35)'
                      : 'rgba(34, 197, 94, 0.35)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: cicd.status === 'MERGE_BLOCKED' ? 'var(--risk-high)' : cicd.status === 'MANUAL_REVIEW_REQUIRED' ? 'var(--risk-medium)' : 'var(--risk-low)',
                      color: '#ffffff',
                    }}
                  >
                    {cicd.status === 'MERGE_BLOCKED' ? 'GATE BLOCKED' : cicd.status === 'MANUAL_REVIEW_REQUIRED' ? 'REVIEW REQUIRED' : 'GATE PASSED'}
                  </span>
                  <strong style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                    {cicd.headline}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {cicd.reason}
                </div>
              </div>
            )}

            {/* Compact Blast Radius Summary */}
            {blast && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{blast.directly_modified_count}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Direct Files</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{blast.impacted_downstream_count}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Downstream Modules</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{blast.total_affected_modules}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Total Reach</div>
                </div>
              </div>
            )}
          </div>

          {/* Card B: Tabbed Insights (TreeSHAP Drivers vs Actionable Remediation) */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <button
                type="button"
                className={`chip ${insightTab === 'shap' ? 'active' : ''}`}
                onClick={() => setInsightTab('shap')}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600 }}
              >
                🔍 Top Risk Drivers ({shapExplanations.length})
              </button>
              <button
                type="button"
                className={`chip ${insightTab === 'remediation' ? 'active' : ''}`}
                onClick={() => setInsightTab('remediation')}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600 }}
              >
                💡 Actionable Next Steps ({recommendations.length})
              </button>
            </div>

            {insightTab === 'shap' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {shapExplanations.length > 0 ? (
                  shapExplanations.slice(0, 5).map((exp, idx) => (
                    <ShapCard key={idx} explanation={exp} />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: 12 }}>
                    No risk drivers flagged.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommendations.length > 0 ? (
                  recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: 'var(--bg-input)',
                        borderLeft: '3px solid var(--accent-primary)',
                      }}
                    >
                      {rec}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--risk-low)', padding: '10px 12px', background: 'var(--risk-low-bg)', borderRadius: 6, border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                    ✅ Change scope is clean and well-scoped. Safe to merge under standard review.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
