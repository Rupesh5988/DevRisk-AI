import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  BrainCircuit, 
  ShieldCheck, 
  Network, 
  SlidersHorizontal, 
  BookOpen, 
  ArrowRight,
  Database,
  Server,
  Activity
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  // Scroll to section handler
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    document.title = "DevRisk AI | Autonomous Pull Request Risk Analyzer";
  }, []);

  return (
    <div className="landing-page" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'inherit' }}>
      
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => scrollTo('hero')}>
              <img src="/logo.jpg" alt="DevRisk AI" style={{ width: 32, height: 32, borderRadius: '6px' }} />
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>DevRisk AI</span>
            </div>
            <nav className="landing-nav hide-mobile" style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500 }}>
              <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollTo('about')}>Product</span>
              <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollTo('features')}>Features</span>
              <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollTo('how-it-works')}>How It Works</span>
              <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollTo('ml')}>ML & Explainability</span>
              <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollTo('technology')}>Technology</span>
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ fontSize: 14, padding: '8px 16px' }}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ fontSize: 14, padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none' }}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section id="hero" style={{ paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
            
            {/* Hero Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: '1px' }}>
                JIT DEFECT PREDICTION • EXPLAINABLE AI • CI/CD
              </div>
              <h1 style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, margin: 0, letterSpacing: '-1px' }}>
                Autonomous Pull Request Risk Analyzer & JIT Defect Prevention
              </h1>
              <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Stop bugs before they reach production. DevRisk AI evaluates every pull request in real-time using calibrated machine learning and Explainable AI (TreeSHAP) to predict regression risks and enforce CI/CD quality gates.
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '12px 24px', fontSize: 15 }}>
                  Get Started
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ padding: '12px 24px', fontSize: 15 }}>
                  Login to Dashboard
                </button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Built for modern software engineering teams.
              </div>
            </div>

            {/* Hero Right Visual */}
            <div className="hero-visual" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Pull Request #101</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>Refactor Core JWT Authentication</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Risk Score</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--risk-high)' }}>85% <span style={{ fontSize: 14 }}>HIGH</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--risk-high-bg)', color: 'var(--risk-high)', padding: '6px 12px', borderRadius: '4px', fontSize: 12, fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Quality Gate: BLOCKED
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Risk Contributors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Code Churn</span>
                  <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>HIGH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dependency Spread</span>
                  <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>HIGH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>File History</span>
                  <span style={{ color: 'var(--risk-medium)', fontWeight: 600 }}>MEDIUM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Developer Context</span>
                  <span style={{ color: 'var(--risk-medium)', fontWeight: 600 }}>MEDIUM</span>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>TreeSHAP Explanation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)' }}>Lines Added</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', background: 'var(--risk-high)' }}></div>
                  </div>
                  <div style={{ width: 40, fontSize: 12, textAlign: 'right', color: 'var(--risk-high)' }}>+420</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)' }}>Lines Deleted</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '40%', height: '100%', background: 'var(--risk-medium)' }}></div>
                  </div>
                  <div style={{ width: 40, fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>-115</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* TRUST STRIP */}
        <section style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <GitBranch size={16} /> GitHub Integration
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <Activity size={16} /> JIT Defect Prediction
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <BookOpen size={16} /> 28 Engineering Metrics
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <BrainCircuit size={16} /> TreeSHAP Explainability
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} /> CI/CD Quality Gates
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 24 }}>What is DevRisk AI?</h2>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              DevRisk AI is an enterprise-grade, Just-In-Time (JIT) defect prediction and automated code review platform. It acts as an AI-driven safety net for engineering teams.
            </p>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              By combining a calibrated machine learning ensemble with TreeSHAP explainability, DevRisk AI evaluates code changes across GitHub repositories in real-time.
            </p>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              It predicts post-release regression risk on a 0–100% scale, supports automated CI/CD merge-gate controls, and identifies the engineering factors contributing to risk so developers can address issues before merging.
            </p>
          </div>
        </section>

        {/* PIPELINE */}
        <section style={{ paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h3 style={{ fontSize: 14, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 12 }}>From Pull Request to Risk Decision</h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }} className="pipeline-container">
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'var(--border-subtle)', zIndex: 0, transform: 'translateY(-50%)' }}></div>
              
              {['GitHub PR', '28-Metric Analysis', 'ML Prediction', 'TreeSHAP', 'Quality Gate', 'Decision'].map((step, idx) => (
                <div key={idx} style={{ position: 'relative', zIndex: 1, background: 'var(--bg-page)', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'center', width: 100 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 64, textAlign: 'center' }}>Everything needed for risk-aware code review.</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
              
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <GitBranch size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Multi-Repository Live Monitoring</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Connect GitHub repositories and ingest pull requests automatically via webhooks or manual onboarding.</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <BrainCircuit size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Calibrated Soft-Voting Ensemble</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>High-precision defect risk scoring powered by an ensemble of calibrated XGBoost and tuned Random Forest models.</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Network size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Explainable AI with TreeSHAP</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Instant waterfall breakdowns and beeswarm plots identifying the exact top-risk contributors such as high code entropy, junior developers working on legacy files, and large blast radius.</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <SlidersHorizontal size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Interactive What-If Playground</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>A developer sandbox allowing engineers to load any existing tracked PR, adjust 14 interactive sliders, and simulate how modifying code metrics impacts regression risk.</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <BookOpen size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Built-in 28-Metric Feature Dictionary</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>An in-app glossary with plain-English definitions, safe baselines, and an interactive Live Value Tester for ApacheJIT metrics.</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <ShieldCheck size={24} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>CI/CD Quality Gate Automation</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Configurable risk thresholds — Approved, Senior Review Required, and Blocked — with cost-sensitive penalization designed for enterprise software.</p>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>How DevRisk AI Works</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 64 }}>From code change to explainable risk decision in a single automated pipeline.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>01</div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Developer Submits PR</h4>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>A developer opens a Pull Request on GitHub.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>02</div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>28-Feature Extraction</h4>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>The DevRisk engine analyzes code churn, architectural spread, file history, and developer experience using 28 multi-dimensional ApacheJIT metrics.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>03</div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>ML Ensemble Prediction</h4>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>The extracted data is passed through the calibrated machine-learning ensemble to calculate defect probability.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>04</div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Explainable Output</h4>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>DevRisk AI generates a TreeSHAP explanation showing why the score was produced and prepares an automated Markdown review summary for the GitHub PR discussion.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>05</div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Quality Gate Decision</h4>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Based on the configured risk thresholds, the PR is approved, flagged for senior review, or blocked until refactored.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ML & EXPLAINABILITY */}
        <section id="ml" style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16 }}>Machine Learning You Can Explain.</h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>A risk score is useful. Understanding why it exists is better.</p>
            </div>
            
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Risk Score</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--risk-high)', lineHeight: 1 }}>85%</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--risk-high)', marginTop: 4 }}>HIGH RISK</div>
              </div>
              
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Risk Contribution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Code Churn', width: '100%' },
                  { label: 'Dependency Spread', width: '85%' },
                  { label: 'File History', width: '60%' },
                  { label: 'Developer Context', width: '45%' },
                  { label: 'Architectural Spread', width: '25%' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 130, fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</div>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: item.width, height: '100%', background: 'var(--accent-primary)', opacity: 1 - (idx * 0.15) }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* QUALITY GATES */}
        <section style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 64 }}>Turn Risk Predictions Into Engineering Actions.</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--risk-low-bg)', color: 'var(--risk-low)', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>LOW RISK {'< 40%'}</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Approved</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Quality Gate Passed</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--risk-medium-bg)', color: 'var(--risk-medium)', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>MEDIUM RISK {'40%–70%'}</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Senior Review Required</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Manual review recommended</p>
              </div>

              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--risk-high-bg)', color: 'var(--risk-high)', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>HIGH RISK {'> 70%'}</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Blocked</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Mandatory refactoring/review</p>
              </div>

            </div>
          </div>
        </section>

        {/* TECHNOLOGY ARCHITECTURE */}
        <section id="technology" style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16 }}>Built as an engineering system, not a black box.</h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>A look at the technology stack driving DevRisk AI.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginBottom: 64 }}>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>Frontend</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>React 18</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Vite</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Custom CSS System</div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>Backend Gateway</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Node.js</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Express.js</div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>ML Microservice</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Python 3.11+</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>FastAPI</div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 16 }}>AI / ML Core</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>XGBoost</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Random Forest</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>TreeSHAP</div>
              </div>
            </div>

            {/* Architecture Visual */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>GitHub Pull Request</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>Node.js / Express</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>28-Metric Feature Extraction</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--accent-gradient)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>Python / FastAPI ML Service</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>XGBoost + Random Forest</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>TreeSHAP Explainability</div>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', padding: '12px 24px', borderRadius: 6, fontWeight: 600 }}>CI/CD Quality Gate & Dashboard</div>
              </div>
            </div>

          </div>
        </section>

        {/* PLAYGROUND SECTION */}
        <section style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Metric Sliders</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Live Simulation</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span>Lines Added</span>
                    <span>+1,200</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '80%', height: '100%', background: 'var(--accent-primary)' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span>Developer Familiarity</span>
                    <span>Low</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '30%', height: '100%', background: 'var(--risk-high)' }}></div>
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: 16, background: 'var(--risk-high-bg)', borderRadius: 8, border: '1px solid var(--risk-high)' }}>
                  <div style={{ fontSize: 12, color: 'var(--risk-high)', fontWeight: 600, marginBottom: 4 }}>Simulated Risk</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--risk-high)' }}>92% BLOCKED</div>
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16 }}>What If You Changed the Code?</h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Load a tracked Pull Request, adjust engineering metrics, and explore how different code-change scenarios can influence predicted risk.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ fontSize: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <SlidersHorizontal size={16} /> Explore the Playground
              </button>
            </div>
          </div>
        </section>

        {/* DEPENDENCY GRAPH SECTION */}
        <section style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16 }}>See the Blast Radius Before You Merge.</h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Visualize cross-file dependencies, impacted modules, downstream reach, and external library relationships.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ fontSize: 14, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={16} /> View Dependency Graph
              </button>
            </div>

            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: '12px 24px', background: 'var(--risk-high-bg)', color: 'var(--risk-high)', borderRadius: 8, fontWeight: 600, border: '1px solid var(--risk-high)' }}>auth.js</div>
              <div style={{ height: 24, width: 2, background: 'var(--border-medium)' }}></div>
              <div style={{ padding: '12px 24px', background: 'var(--bg-input)', borderRadius: 8, fontWeight: 600, border: '1px solid var(--border-medium)' }}>middleware.js</div>
              <div style={{ height: 24, width: 2, background: 'var(--border-medium)' }}></div>
              <div style={{ padding: '12px 24px', background: 'var(--bg-input)', borderRadius: 8, fontWeight: 600, border: '1px solid var(--border-medium)' }}>session.js</div>
              <div style={{ height: 24, width: 2, background: 'var(--border-medium)' }}></div>
              <div style={{ padding: '12px 24px', background: 'var(--risk-medium-bg)', color: 'var(--risk-medium)', borderRadius: 8, fontWeight: 600, border: '1px solid var(--risk-medium)' }}>database.js</div>
            </div>
          </div>
        </section>

        {/* 28-METRIC SECTION */}
        <section style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 16 }}>Look Beyond Lines Changed.</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px auto' }}>
              DevRisk AI evaluates a 28-metric feature space covering code churn, architectural spread, developer context, code stability, and historical fragility.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
              {['Lines Added', 'Lines Deleted', 'Lines in Modified Files', 'Churn Density', 'Addition vs Deletion Ratio', 'Developer Familiarity', 'Architectural Spread', 'Historical Fragility'].map(metric => (
                <div key={metric} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {metric}
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ fontSize: 14, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} /> Explore the Metrics Dictionary
            </button>
          </div>
        </section>

        {/* PRODUCT PREVIEW SECTION */}
        <section style={{ paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 64 }}>One workspace for Pull Request risk intelligence.</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
              {[
                { title: 'Dashboard', desc: 'Real-time PR risk overview' },
                { title: 'Review Queue', desc: 'Prioritized PRs needing review' },
                { title: 'Playground', desc: 'Interactive risk simulation' },
                { title: 'Dependency Graph', desc: 'Blast radius visualization' },
                { title: 'Analytics & Trends', desc: 'Engineering quality metrics' },
                { title: 'Metrics Dictionary', desc: 'Feature definitions and baselines' }
              ].map(preview => (
                <div key={preview.title} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 24 }}></div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{preview.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{preview.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ paddingTop: 120, paddingBottom: 120, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 16 }}>Stop Reviewing Every PR the Same Way.</h2>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 40 }}>Let machine learning identify where engineering attention matters most.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '14px 28px', fontSize: 16 }}>
              Get Started
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ padding: '14px 28px', fontSize: 16 }}>
              Login to Dashboard
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', padding: '48px 24px', color: 'var(--text-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 48 }}>
          
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <img src="/logo.jpg" alt="DevRisk AI" style={{ width: 24, height: 24, borderRadius: '4px' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>DevRisk AI</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>Autonomous Pull Request Risk Analysis & JIT Defect Prevention.</p>
          </div>

          <div style={{ display: 'flex', gap: 64 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Navigation</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => scrollTo('about')}>Product</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => scrollTo('features')}>Features</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => scrollTo('how-it-works')}>How It Works</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => scrollTo('ml')}>ML & Explainability</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => scrollTo('technology')}>Technology</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Account</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => navigate('/login')}>Sign In</span>
              <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => navigate('/register')}>Sign Up</span>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hide-mobile {
            display: none !important;
          }
          .pipeline-container {
            flex-direction: column;
            gap: 24px;
          }
          .pipeline-container > div:first-child {
            width: 2px !important;
            height: 100% !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
          }
        }
      `}} />
    </div>
  );
}
