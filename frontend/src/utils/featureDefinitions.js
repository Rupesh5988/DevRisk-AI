// ============================================================
// DevRisk AI — Feature Definitions & Value Interpretation Engine
// ============================================================
// Simple, technical, crisp definitions and actionable guidance
// for all 28 machine learning metrics (14 raw + 14 engineered).
// ============================================================

export const FEATURE_CATEGORIES = {
  churn: {
    id: 'churn',
    name: 'Code Churn & Size',
    icon: '📝',
    color: '#3b82f6',
    description: 'Volume and density of code modifications in this pull request.',
  },
  architecture: {
    id: 'architecture',
    name: 'Architectural Spread',
    icon: '🏛️',
    color: '#8b5cf6',
    description: 'How widely modifications touch different files, folders, and subsystems.',
  },
  developer: {
    id: 'developer',
    name: 'Contributor Experience',
    icon: '👤',
    color: '#10b981',
    description: 'Author familiarity with this repository and the modified components.',
  },
  stability: {
    id: 'stability',
    name: 'Code Stability & History',
    icon: '🛡️',
    color: '#f59e0b',
    description: 'Historical defect frequency, file age, and previous modification history.',
  },
};

export const FEATURE_DEFINITIONS = {
  // ------------------------------------------------------------
  // 1. Code Churn & Size Features
  // ------------------------------------------------------------
  la: {
    name: 'la',
    label: 'Lines Added',
    category: 'churn',
    unit: 'lines',
    simpleDefinition: 'Total count of new lines added.',
    whyItMatters: 'Large additions expand test surface and increase the chance of undetected bugs.',
    safeRange: '< 100 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 50) return { rating: 'safe', label: 'Minimal', meaning: 'Small change (+50 lines or less). Quick to review with low defect risk.' };
      if (num <= 250) return { rating: 'moderate', label: 'Moderate', meaning: 'Standard feature or refactor; review logic thoroughly.' };
      return { rating: 'risky', label: 'High Churn', meaning: `Large addition (+${num} lines). Break into smaller, atomic PRs to simplify review.` };
    },
  },
  ld: {
    name: 'ld',
    label: 'Lines Deleted',
    category: 'churn',
    unit: 'lines',
    simpleDefinition: 'Total count of lines removed from existing files.',
    whyItMatters: 'Deleting code can break undocumented callers, internal APIs, or edge-case handling.',
    safeRange: '< 80 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 30) return { rating: 'safe', label: 'Low', meaning: 'Light deletion. Routine cleanup of unused or redundant code.' };
      if (num <= 150) return { rating: 'moderate', label: 'Moderate', meaning: 'Noticeable deletions; verify all callers and test cases still pass.' };
      return { rating: 'risky', label: 'Heavy Deletion', meaning: `Substantial deletions (-${num} lines). High risk of breaking dependent callers.` };
    },
  },
  lt: {
    name: 'lt',
    label: 'Lines in Modified Files',
    category: 'churn',
    unit: 'lines',
    simpleDefinition: 'Total combined lines across all touched files.',
    whyItMatters: 'Large files ("God classes") have tighter coupling and wider blast radius when modified.',
    safeRange: '< 1,500 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 600) return { rating: 'safe', label: 'Compact Files', meaning: 'Modifications are inside small, well-bounded modules.' };
      if (num <= 2500) return { rating: 'moderate', label: 'Medium Files', meaning: 'Standard module size with manageable blast radius.' };
      return { rating: 'risky', label: 'Monolithic Files', meaning: `Touching files spanning ${num.toLocaleString()} lines. High risk of unintended side effects.` };
    },
  },
  churn_density: {
    name: 'churn_density',
    label: 'Churn Density',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Percentage of the file contents modified ((la + ld) / lt).',
    whyItMatters: 'Rewriting a large percentage of an existing file fundamentally changes its behavior.',
    safeRange: '< 0.30 (30%)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.20) return { rating: 'safe', label: 'Surgical', meaning: 'Surgical edit affecting only a small portion of target files.' };
      if (num <= 0.60) return { rating: 'moderate', label: 'Noticeable', meaning: 'Significant rewrite (20%–60% of file contents changed).' };
      return { rating: 'risky', label: 'Major Overhaul', meaning: 'Over 60% of target files rewritten. Requires full regression testing.' };
    },
  },
  la_ratio: {
    name: 'la_ratio',
    label: 'Addition Ratio',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Proportion of total changes that are new additions (la / (la + ld)).',
    whyItMatters: 'Distinguishes purely additive new features from refactorings or code removals.',
    safeRange: 'Balanced (0.30 – 0.80)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.85) return { rating: 'moderate', label: 'Purely Additive', meaning: 'Primarily new code. Verify unit test coverage for new execution paths.' };
      if (num <= 0.20) return { rating: 'moderate', label: 'Mainly Deletions', meaning: 'Primarily removing code. Verify no active features were broken.' };
      return { rating: 'safe', label: 'Balanced Churn', meaning: 'Healthy balance between adding new code and refactoring existing logic.' };
    },
  },
  churn_per_file: {
    name: 'churn_per_file',
    label: 'Churn Per File',
    category: 'churn',
    unit: 'lines/file',
    simpleDefinition: 'Average modified lines per affected file ((la + ld) / nf).',
    whyItMatters: 'Shows whether changes are spread thinly or concentrated heavily into few files.',
    safeRange: '< 60 lines/file',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 40) return { rating: 'safe', label: 'Light per file', meaning: 'Light changes per file. Fast and straightforward to review.' };
      if (num <= 120) return { rating: 'moderate', label: 'Medium per file', meaning: 'Moderate alterations in each touched file.' };
      return { rating: 'risky', label: 'Heavy per file', meaning: `Average ${Math.round(num)} lines changed per file. High cognitive load for reviewers.` };
    },
  },
  churn_asymmetry: {
    name: 'churn_asymmetry',
    label: 'Churn Asymmetry',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Difference between additions and deletions (|la - ld| / (la + ld)).',
    whyItMatters: 'Extreme asymmetry highlights either large new subsystems or large module removals.',
    safeRange: '0.20 – 0.70',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.40) return { rating: 'safe', label: 'Symmetric Refactor', meaning: 'Balanced additions and deletions; typical of routine refactoring.' };
      return { rating: 'moderate', label: 'Asymmetric Change', meaning: 'One-sided change; either introduces new logic or prunes large blocks.' };
    },
  },

  // ------------------------------------------------------------
  // 2. Architectural Spread Features
  // ------------------------------------------------------------
  nf: {
    name: 'nf',
    label: 'Files Modified',
    category: 'architecture',
    unit: 'files',
    simpleDefinition: 'Total count of distinct files modified.',
    whyItMatters: 'Touching many files expands review scope and increases cross-file regression risk.',
    safeRange: '1 – 4 files',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 3) return { rating: 'safe', label: 'Focused', meaning: `Touches only ${num} file(s); localized and easy to verify.` };
      if (num <= 8) return { rating: 'moderate', label: 'Multi-file', meaning: `Touches ${num} files; requires cross-file review diligence.` };
      return { rating: 'risky', label: 'Wide Footprint', meaning: `Touches ${num} files. Broad change surface; consider splitting into focused PRs.` };
    },
  },
  nd: {
    name: 'nd',
    label: 'Directories Touched',
    category: 'architecture',
    unit: 'directories',
    simpleDefinition: 'Count of distinct folders containing modified files.',
    whyItMatters: 'Cross-folder changes often span architectural layers (e.g., API, DB, UI).',
    safeRange: '1 – 2 directories',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1) return { rating: 'safe', label: 'Single Folder', meaning: 'Changes are strictly confined to a single directory package.' };
      if (num <= 3) return { rating: 'moderate', label: 'Multi-Folder', meaning: `Touches ${num} directories. Crosses package boundaries.` };
      return { rating: 'risky', label: 'Scattered Folders', meaning: `Modifications touch ${num} directories. High architectural spread.` };
    },
  },
  ns: {
    name: 'ns',
    label: 'Subsystems Modified',
    category: 'architecture',
    unit: 'subsystems',
    simpleDefinition: 'Count of top-level architectural subsystems modified.',
    whyItMatters: 'Cross-subsystem PRs cross domain boundaries and have the highest defect escape rate.',
    safeRange: '1 subsystem',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1) return { rating: 'safe', label: 'Single Subsystem', meaning: 'Contained within one domain. Interface contracts are safe.' };
      if (num === 2) return { rating: 'moderate', label: 'Cross-Domain', meaning: 'Touches 2 subsystems; verify inter-module contracts remain intact.' };
      return { rating: 'risky', label: 'Broad Subsystem Spread', meaning: `Spans ${num} subsystems. High risk of breaking service contracts.` };
    },
  },
  entropy: {
    name: 'entropy',
    label: 'Change Entropy',
    category: 'architecture',
    unit: 'score (0.0 – 2.5)',
    simpleDefinition: 'How evenly modifications are scattered across touched files.',
    whyItMatters: 'High entropy means changes are scattered randomly; low entropy means changes are focused.',
    safeRange: '< 0.50',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.35) return { rating: 'safe', label: 'Concentrated', meaning: 'Changes are concentrated cleanly within primary target files.' };
      if (num <= 0.70) return { rating: 'moderate', label: 'Moderate Scatter', meaning: 'Changes are moderately distributed across multiple files.' };
      return { rating: 'risky', label: 'Scattered Edits', meaning: 'Edits are scattered across files; hard to track and easy to miss bugs.' };
    },
  },
  diffusion_factor: {
    name: 'diffusion_factor',
    label: 'Diffusion Factor',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Directory and subsystem spread normalized by file count ((nd * ns) / (nf + 1)).',
    whyItMatters: 'Catches changes that touch few files but scatter them across opposing ends of the system.',
    safeRange: '< 1.5',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1.0) return { rating: 'safe', label: 'Cohesive', meaning: 'Files belong to closely related, co-located packages.' };
      if (num <= 2.5) return { rating: 'moderate', label: 'Diffused', meaning: 'Noticeable architectural spread across separate packages.' };
      return { rating: 'risky', label: 'Highly Diffused', meaning: 'High cross-cutting footprint; touches opposing architectural boundaries.' };
    },
  },
  subsystem_entropy: {
    name: 'subsystem_entropy',
    label: 'Subsystem Entropy',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Entropy normalized by the number of touched subsystems.',
    whyItMatters: 'Identifies whether architectural spread is planned or haphazard.',
    safeRange: '< 0.40',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.30) return { rating: 'safe', label: 'Structured', meaning: 'Clean subsystem boundary alignment.' };
      return { rating: 'moderate', label: 'Complex Spread', meaning: 'Non-trivial spread across subsystem boundaries.' };
    },
  },
  churn_intensity: {
    name: 'churn_intensity',
    label: 'Review Strain Index',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Total churn multiplied by entropy ((la + ld) * entropy).',
    whyItMatters: 'Quantifies reviewer cognitive load. High volume combined with high scatter causes review fatigue.',
    safeRange: '< 150',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 80) return { rating: 'safe', label: 'Low Review Strain', meaning: 'Straightforward for reviewers to inspect and verify.' };
      if (num <= 300) return { rating: 'moderate', label: 'Moderate Strain', meaning: 'Requires dedicated review focus and careful inspection.' };
      return { rating: 'risky', label: 'High Review Burden', meaning: 'High volume and high scatter. Prime candidate for bugs slipping through.' };
    },
  },

  // ------------------------------------------------------------
  // 3. Contributor Experience Features
  // ------------------------------------------------------------
  exp: {
    name: 'exp',
    label: 'Developer Commits',
    category: 'developer',
    unit: 'commits',
    simpleDefinition: 'Total lifetime commits the author has merged into this repository.',
    whyItMatters: 'Experienced repository contributors know architectural conventions and edge cases.',
    safeRange: '> 30 commits',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 50) return { rating: 'safe', label: 'Veteran', meaning: `Author is a veteran contributor with ${num} prior commits.` };
      if (num >= 10) return { rating: 'moderate', label: 'Established', meaning: `Author is familiar with the project (${num} prior commits).` };
      return { rating: 'risky', label: 'New Contributor', meaning: `Author has few prior commits (${num}). Request walkthrough with a core maintainer.` };
    },
  },
  rexp: {
    name: 'rexp',
    label: 'Recent Commits',
    category: 'developer',
    unit: 'recent commits',
    simpleDefinition: 'Time-weighted count of commits authored recently by the developer.',
    whyItMatters: 'Recent activity ensures the author is familiar with current libraries and patterns.',
    safeRange: '> 10 recent',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15) return { rating: 'safe', label: 'Active', meaning: 'Author is actively shipping code; context is fresh.' };
      if (num >= 5) return { rating: 'moderate', label: 'Moderate Pace', meaning: 'Author has moderate recent commit velocity.' };
      return { rating: 'risky', label: 'Cold Context', meaning: 'Author has not contributed recently. Check against current coding guidelines.' };
    },
  },
  sexp: {
    name: 'sexp',
    label: 'Subsystem Commits',
    category: 'developer',
    unit: 'subsystem commits',
    simpleDefinition: 'Prior commits the author made in this specific subsystem.',
    whyItMatters: 'Domain-specific familiarity with modified modules dramatically reduces bug rates.',
    safeRange: '> 8 commits',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15) return { rating: 'safe', label: 'Domain Expert', meaning: 'Author has deep domain expertise in this specific subsystem.' };
      if (num >= 4) return { rating: 'moderate', label: 'Familiar', meaning: 'Author has touched this subsystem before.' };
      return { rating: 'risky', label: 'New to Subsystem', meaning: 'Author is editing this subsystem for the first time. Request domain owner review.' };
    },
  },
  ndev: {
    name: 'ndev',
    label: 'Prior Authors on Files',
    category: 'developer',
    unit: 'developers',
    simpleDefinition: 'Count of distinct developers who previously modified these files.',
    whyItMatters: 'Files modified by many developers often suffer from mixed design patterns and code erosion.',
    safeRange: '< 8 developers',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 3) return { rating: 'safe', label: 'Strong Ownership', meaning: 'Few historical contributors. Clear ownership and consistent style.' };
      if (num <= 10) return { rating: 'moderate', label: 'Shared Ownership', meaning: 'Standard team shared ownership.' };
      return { rating: 'risky', label: 'High Turnover', meaning: `${num} prior authors touched these files. High risk of mixed paradigms.` };
    },
  },
  subsystem_familiarity: {
    name: 'subsystem_familiarity',
    label: 'Subsystem Familiarity',
    category: 'developer',
    unit: 'ratio (sexp / exp)',
    simpleDefinition: 'Share of author’s experience concentrated in this subsystem.',
    whyItMatters: 'Shows if the author is working in their core domain or venturing outside.',
    safeRange: '> 0.25 (25%)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.40) return { rating: 'safe', label: 'Core Domain', meaning: 'Author spends a large share of their time in this subsystem.' };
      if (num >= 0.15) return { rating: 'moderate', label: 'Secondary Focus', meaning: 'Moderate familiarity with this subsystem.' };
      return { rating: 'risky', label: 'Unfamiliar Domain', meaning: 'Author is working outside their primary area of expertise.' };
    },
  },
  recent_exp_ratio: {
    name: 'recent_exp_ratio',
    label: 'Recent Velocity Ratio',
    category: 'developer',
    unit: 'ratio (rexp / exp)',
    simpleDefinition: 'Proportion of total commits authored in recent sprints.',
    whyItMatters: 'Confirms author knowledge is current and actively maintained.',
    safeRange: '> 0.20',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.30) return { rating: 'safe', label: 'Recent Velocity', meaning: 'Author is actively shipping code in recent sprints.' };
      return { rating: 'moderate', label: 'Past Contributor', meaning: 'Most of author’s experience is from earlier repository history.' };
    },
  },
  exp_per_file: {
    name: 'exp_per_file',
    label: 'Experience Per File',
    category: 'developer',
    unit: 'ratio',
    simpleDefinition: 'Author experience scaled against number of files changed (exp / (nf + 1)).',
    whyItMatters: 'Large multi-file changes require greater senior context to merge safely.',
    safeRange: '> 5.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 8.0) return { rating: 'safe', label: 'Well-Matched', meaning: 'Author experience matches the scope of files modified.' };
      return { rating: 'moderate', label: 'Broad Scope', meaning: 'Broad scope of files relative to author experience level.' };
    },
  },
  exp_vs_complexity: {
    name: 'exp_vs_complexity',
    label: 'Experience vs Complexity',
    category: 'developer',
    unit: 'ratio',
    simpleDefinition: 'Balances author experience against change dispersion and entropy.',
    whyItMatters: 'Scattered changes by junior authors represent the highest statistical risk quadrant.',
    safeRange: '> 10.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15.0) return { rating: 'safe', label: 'Strong Margin', meaning: 'Strong experience buffer against change complexity.' };
      return { rating: 'risky', label: 'Low Experience Buffer', meaning: 'Complex scattered change relative to author experience. Pair with senior engineer.' };
    },
  },

  // ------------------------------------------------------------
  // 4. Code Stability & Historical Fragility Features
  // ------------------------------------------------------------
  fix: {
    name: 'fix',
    label: 'Bug Fix Commit',
    category: 'stability',
    unit: 'boolean',
    simpleDefinition: 'Whether this pull request is intended to fix an existing defect.',
    whyItMatters: 'Bug fixes are 2x to 3x more likely to introduce secondary regression bugs than feature work.',
    safeRange: '0 (Feature / Improvement)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num === 1 || val === true) {
        return { rating: 'risky', label: 'Bug Fix', meaning: 'Fixes an existing bug. Check for secondary regressions ("fix-inducing commits").' };
      }
      return { rating: 'safe', label: 'Feature / Enhancement', meaning: 'Standard feature or task. Baseline defect probability.' };
    },
  },
  age: {
    name: 'age',
    label: 'File Dormancy',
    category: 'stability',
    unit: 'days',
    simpleDefinition: 'Average days since modified files were last touched.',
    whyItMatters: 'Modifying dormant code that hasn’t changed in months frequently breaks obsolete assumptions.',
    safeRange: '< 90 days',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 45) return { rating: 'safe', label: 'Active Code', meaning: 'Recently touched code (<45 days). Tests and context are current.' };
      if (num <= 180) return { rating: 'moderate', label: 'Medium Dormancy', meaning: `Files have not changed for ~${Math.round(num)} days.` };
      return { rating: 'risky', label: 'Legacy Code', meaning: `Files were dormant for ${Math.round(num)} days. High risk of breaking hidden assumptions.` };
    },
  },
  nuc: {
    name: 'nuc',
    label: 'Historical Changes',
    category: 'stability',
    unit: 'prior revisions',
    simpleDefinition: 'Total count of historical modifications touched files have undergone.',
    whyItMatters: 'Files with high change frequency are code hotspots with recurring defect history.',
    safeRange: '< 25 revisions',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 15) return { rating: 'safe', label: 'Stable Files', meaning: 'Historically stable files with few past revisions.' };
      if (num <= 50) return { rating: 'moderate', label: 'Active Revision', meaning: 'Moderately revised files with standard change history.' };
      return { rating: 'risky', label: 'Volatile Hotspot', meaning: `Hotspot code (${num} past revisions). Known defect concentration area.` };
    },
  },
  fragility_index: {
    name: 'fragility_index',
    label: 'File Fragility Index',
    category: 'stability',
    unit: 'score',
    simpleDefinition: 'Combines file dormancy and change frequency scaled against experience ((age * nuc) / (exp + 1)).',
    whyItMatters: 'Pinpoints edits where unfamiliar developers touch old, volatile legacy files.',
    safeRange: '< 50.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 25.0) return { rating: 'safe', label: 'Low Fragility', meaning: 'Modifications are within resilient, well-maintained code.' };
      if (num <= 100.0) return { rating: 'moderate', label: 'Moderate Fragility', meaning: 'Touches code with legacy or hotspot elements.' };
      return { rating: 'risky', label: 'High Fragility', meaning: 'Modifying fragile legacy code. High regression probability; verify edge cases.' };
    },
  },
  dev_density_risk: {
    name: 'dev_density_risk',
    label: 'Author Turnover Rate',
    category: 'stability',
    unit: 'ratio',
    simpleDefinition: 'Ratio of developer turnover relative to file age (ndev / (age + 1)).',
    whyItMatters: 'Files edited by many different developers in a short timeframe exhibit highest defect density.',
    safeRange: '< 0.15',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.10) return { rating: 'safe', label: 'Stable Ownership', meaning: 'Healthy ownership turnover over time.' };
      return { rating: 'moderate', label: 'High Turnover', meaning: 'Multiple developers rapidly modifying the same files without clear owner.' };
    },
  },
  rexp_vs_sexp: {
    name: 'rexp_vs_sexp',
    label: 'Recent vs Subsystem Pace',
    category: 'stability',
    unit: 'ratio',
    simpleDefinition: 'Comparison of author’s overall recent activity against their subsystem experience.',
    whyItMatters: 'Highlights generalist pace vs domain specialist focus.',
    safeRange: '0.5 – 2.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 2.0) return { rating: 'safe', label: 'Grounded Pace', meaning: 'Recent activity aligns with subsystem experience.' };
      return { rating: 'moderate', label: 'Domain Shift', meaning: 'Author is currently pivoting into this subsystem.' };
    },
  },
};

/**
 * Helper to get a feature's definition safely by technical name.
 */
export function getFeatureDef(featureName) {
  return FEATURE_DEFINITIONS[featureName] || {
    name: featureName,
    label: featureName,
    category: 'churn',
    unit: 'raw',
    simpleDefinition: `Metric measuring ${featureName} across the pull request.`,
    whyItMatters: 'Used by the machine learning model to evaluate code change risk.',
    safeRange: 'Normal baseline',
    interpretValue: (val) => ({ rating: 'moderate', label: String(val), meaning: `Current value: ${val}` }),
  };
}
