// ============================================================
// DevRisk AI — Feature Definitions & Value Interpretation Engine
// ============================================================
// Plain-English definitions, risk rationale, and dynamic value
// interpreters for all 28 machine learning metrics (14 raw + 14 engineered).
// ============================================================

export const FEATURE_CATEGORIES = {
  churn: {
    id: 'churn',
    name: 'Code Churn & Size',
    icon: '📝',
    color: '#3b82f6',
    description: 'Volume and density of code modifications introduced by this pull request.',
  },
  architecture: {
    id: 'architecture',
    name: 'Architectural Spread & Dispersion',
    icon: '🏛️',
    color: '#8b5cf6',
    description: 'How widely the code changes touch different files, directories, and architectural subsystems.',
  },
  developer: {
    id: 'developer',
    name: 'Developer Context & Familiarity',
    icon: '👤',
    color: '#10b981',
    description: 'Author experience level and prior familiarity with the modified code modules.',
  },
  stability: {
    id: 'stability',
    name: 'Code Stability & Historical Fragility',
    icon: '🛡️',
    color: '#f59e0b',
    description: 'Historical defect records, file age, and previous modification frequency.',
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
    simpleDefinition: 'Total number of new lines of code added in this pull request.',
    whyItMatters: 'Large additions introduce new logic and increase the surface area where regressions or bugs can hide.',
    safeRange: '< 100 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 50) return { rating: 'safe', label: 'Minimal', meaning: 'Very small change (+50 lines or less); easy to review and low risk.' };
      if (num <= 250) return { rating: 'moderate', label: 'Moderate', meaning: 'Standard feature or refactor; manageable for a thorough review.' };
      return { rating: 'risky', label: 'High Churn', meaning: `Large addition (+${num} lines); consider breaking into smaller, atomic pull requests.` };
    },
  },
  ld: {
    name: 'ld',
    label: 'Lines Deleted',
    category: 'churn',
    unit: 'lines',
    simpleDefinition: 'Total number of lines removed from existing files.',
    whyItMatters: 'Deleting code can inadvertently break implicit dependencies, callers, or undocumented edge cases.',
    safeRange: '< 80 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 30) return { rating: 'safe', label: 'Low', meaning: 'Minor cleanup or removal of dead code.' };
      if (num <= 150) return { rating: 'moderate', label: 'Moderate', meaning: 'Noticeable code removal; verify that all callers and unit tests still pass.' };
      return { rating: 'risky', label: 'Heavy Deletion', meaning: `Substantial deletions (-${num} lines); high risk of breaking dependent functions.` };
    },
  },
  lt: {
    name: 'lt',
    label: 'Lines in Modified Files',
    category: 'churn',
    unit: 'lines',
    simpleDefinition: 'Total combined lines of code inside the files touched by this PR.',
    whyItMatters: 'Modifying massive files ("God classes") carries higher blast radius and ripple-effect risks.',
    safeRange: '< 1,500 lines',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 600) return { rating: 'safe', label: 'Compact Files', meaning: 'Changes are within small, well-bounded modules with localized scope.' };
      if (num <= 2500) return { rating: 'moderate', label: 'Medium Files', meaning: 'Average-sized modules; standard blast radius.' };
      return { rating: 'risky', label: 'Monolithic Files', meaning: `Modifying files spanning ${num.toLocaleString()} lines; high risk of unexpected side effects.` };
    },
  },
  churn_density: {
    name: 'churn_density',
    label: 'Churn Density',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Ratio of lines changed relative to the total lines in the touched files ((la + ld) / lt).',
    whyItMatters: 'Rewriting a huge percentage of an existing file fundamentally alters its behavior and increases regression risks.',
    safeRange: '< 0.30 (30%)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.20) return { rating: 'safe', label: 'Surgical', meaning: 'Surgical modification affecting only a small portion of the target files.' };
      if (num <= 0.60) return { rating: 'moderate', label: 'Noticeable', meaning: 'Significant rewrite of the target files (20%–60% replaced).' };
      return { rating: 'risky', label: 'Overhaul', meaning: 'Major overhaul; over 60% of the target files were rewritten.' };
    },
  },
  la_ratio: {
    name: 'la_ratio',
    label: 'Addition vs Deletion Ratio',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Proportion of the total change that consists of new additions (la / (la + ld)).',
    whyItMatters: 'Distinguishes purely additive PRs from refactorings or cleanups.',
    safeRange: 'Balanced (0.30 – 0.80)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.85) return { rating: 'moderate', label: 'Purely Additive', meaning: 'Almost all new code; verify test coverage for new execution paths.' };
      if (num <= 0.20) return { rating: 'moderate', label: 'Mainly Deletions', meaning: 'Primarily removing code; verify no active features were removed.' };
      return { rating: 'safe', label: 'Balanced Churn', meaning: 'Healthy balance between adding new code and refactoring existing code.' };
    },
  },
  churn_per_file: {
    name: 'churn_per_file',
    label: 'Average Churn Per File',
    category: 'churn',
    unit: 'lines/file',
    simpleDefinition: 'Average number of modified lines per affected file ((la + ld) / nf).',
    whyItMatters: 'Indicates whether changes are spread thinly across many files or heavily concentrated in a few.',
    safeRange: '< 60 lines/file',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 40) return { rating: 'safe', label: 'Light per file', meaning: 'Modest modifications per file; easy for peer reviewers to inspect.' };
      if (num <= 120) return { rating: 'moderate', label: 'Medium per file', meaning: 'Moderate alterations in each touched file.' };
      return { rating: 'risky', label: 'Heavy per file', meaning: `Average of ${Math.round(num)} lines changed per file; high reviewer cognitive load.` };
    },
  },
  churn_asymmetry: {
    name: 'churn_asymmetry',
    label: 'Churn Asymmetry',
    category: 'churn',
    unit: 'ratio',
    simpleDefinition: 'Magnitude of difference between additions and deletions (|la - ld| / (la + ld)).',
    whyItMatters: 'Extreme asymmetry indicates either pure addition of new functionality or wholesale removal of old modules.',
    safeRange: '0.20 – 0.70',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.40) return { rating: 'safe', label: 'Symmetric Refactor', meaning: 'Equal lines added and removed; typical of steady-state refactoring.' };
      return { rating: 'moderate', label: 'Asymmetric', meaning: 'One-sided change; either introducing large logic or pruning large blocks.' };
    },
  },

  // ------------------------------------------------------------
  // 2. Architectural Footprint & Dispersion Features
  // ------------------------------------------------------------
  nf: {
    name: 'nf',
    label: 'Files Modified',
    category: 'architecture',
    unit: 'files',
    simpleDefinition: 'Total count of distinct files modified in this pull request.',
    whyItMatters: 'Touching many files expands the review surface and increases cross-module regression probability.',
    safeRange: '1 – 4 files',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 3) return { rating: 'safe', label: 'Focused', meaning: `Touches only ${num} file(s); localized and easy to test.` };
      if (num <= 8) return { rating: 'moderate', label: 'Multi-file', meaning: `Touches ${num} files; requires cross-file review attention.` };
      return { rating: 'risky', label: 'Wide Footprint', meaning: `Touches ${num} files; high complexity with widespread impact.` };
    },
  },
  nd: {
    name: 'nd',
    label: 'Directories Touched',
    category: 'architecture',
    unit: 'directories',
    simpleDefinition: 'Number of distinct folders/directories containing modified files.',
    whyItMatters: 'Changes that cross folder boundaries often cross architectural layers (e.g., UI, backend, database).',
    safeRange: '1 – 2 directories',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1) return { rating: 'safe', label: 'Single Directory', meaning: 'Changes are strictly confined to a single directory package.' };
      if (num <= 3) return { rating: 'moderate', label: 'Multi-Folder', meaning: `Touches ${num} distinct directories.` };
      return { rating: 'risky', label: 'Scattered', meaning: `Modifications touch ${num} directories; crosses package boundaries.` };
    },
  },
  ns: {
    name: 'ns',
    label: 'Subsystems Modified',
    category: 'architecture',
    unit: 'subsystems',
    simpleDefinition: 'Count of top-level modules/subsystems affected by this pull request.',
    whyItMatters: 'Cross-subsystem pull requests break modular boundaries and have the highest rate of defect escapes.',
    safeRange: '1 subsystem',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1) return { rating: 'safe', label: 'Single Subsystem', meaning: 'Localized within one architectural domain.' };
      if (num === 2) return { rating: 'moderate', label: 'Cross-Domain', meaning: 'Touches 2 subsystems; ensure contract interfaces are preserved.' };
      return { rating: 'risky', label: 'Broad Architectural Spread', meaning: `Spans ${num} subsystems; high likelihood of contract violations.` };
    },
  },
  entropy: {
    name: 'entropy',
    label: 'Change Entropy (Dispersion)',
    category: 'architecture',
    unit: 'bits (0.0 – 1.0)',
    simpleDefinition: 'Measures how unevenly distributed modifications are across the touched files.',
    whyItMatters: 'High entropy means changes are scattered haphazardly; low entropy means changes are cleanly concentrated.',
    safeRange: '< 0.50',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.35) return { rating: 'safe', label: 'Orderly / Concentrated', meaning: 'Changes are concentrated orderly within primary target files.' };
      if (num <= 0.70) return { rating: 'moderate', label: 'Moderate Scatter', meaning: 'Changes are moderately distributed across files.' };
      return { rating: 'risky', label: 'Scattered Modifications', meaning: 'Modifications are dispersed irregularly across files; hard to track.' };
    },
  },
  diffusion_factor: {
    name: 'diffusion_factor',
    label: 'Diffusion Factor',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Composite metric of directory and subsystem spread normalized by file count ((nd * ns) / (nf + 1)).',
    whyItMatters: 'Identifies changes that touch very few files but scatter them across opposing ends of the architecture.',
    safeRange: '< 1.5',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 1.0) return { rating: 'safe', label: 'Cohesive', meaning: 'Files belong to logically co-located modules.' };
      if (num <= 2.5) return { rating: 'moderate', label: 'Diffused', meaning: 'Noticeable architectural diffusion across folders.' };
      return { rating: 'risky', label: 'Highly Diffused', meaning: 'High cross-cutting footprint; multiple layer interactions.' };
    },
  },
  subsystem_entropy: {
    name: 'subsystem_entropy',
    label: 'Subsystem Entropy',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Entropy normalized by the number of modified subsystems.',
    whyItMatters: 'Detects whether architectural spread is planned or chaotic.',
    safeRange: '< 0.40',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.30) return { rating: 'safe', label: 'Structured', meaning: 'Clean subsystem boundary alignment.' };
      return { rating: 'moderate', label: 'Complex Dispersion', meaning: 'Non-trivial spread across subsystem boundaries.' };
    },
  },
  churn_intensity: {
    name: 'churn_intensity',
    label: 'Churn Intensity',
    category: 'architecture',
    unit: 'score',
    simpleDefinition: 'Total churn multiplied by entropy ((la + ld) * entropy).',
    whyItMatters: 'Quantifies the total cognitive strain on the code reviewer.',
    safeRange: '< 150',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 80) return { rating: 'safe', label: 'Low Review Strain', meaning: 'Easy for reviewers to follow and verify.' };
      if (num <= 300) return { rating: 'moderate', label: 'Moderate Strain', meaning: 'Requires dedicated review focus.' };
      return { rating: 'risky', label: 'Intense Review Burden', meaning: 'High volume and high scatter; prime candidate for bugs to slip through.' };
    },
  },

  // ------------------------------------------------------------
  // 3. Developer Experience & Familiarity Features
  // ------------------------------------------------------------
  exp: {
    name: 'exp',
    label: 'Total Developer Experience',
    category: 'developer',
    unit: 'prior commits',
    simpleDefinition: 'Total number of commits the author previously contributed to this repository.',
    whyItMatters: 'Experienced repository contributors are familiar with architectural conventions and edge cases.',
    safeRange: '> 30 commits',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 50) return { rating: 'safe', label: 'Veteran', meaning: `Author is a veteran contributor with ${num} prior commits.` };
      if (num >= 10) return { rating: 'moderate', label: 'Established', meaning: `Author is familiar with the project (${num} prior commits).` };
      return { rating: 'risky', label: 'New Contributor', meaning: `Author has few prior commits (${num}); extra code review diligence advised.` };
    },
  },
  rexp: {
    name: 'rexp',
    label: 'Recent Experience',
    category: 'developer',
    unit: 'weighted commits',
    simpleDefinition: 'Time-decayed count of commits authored recently by the developer.',
    whyItMatters: 'Recent activity ensures the developer is up-to-date with recent refactorings and library upgrades.',
    safeRange: '> 10 recent',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15) return { rating: 'safe', label: 'Active', meaning: 'Author is currently active in the codebase; context is fresh.' };
      if (num >= 5) return { rating: 'moderate', label: 'Moderate', meaning: 'Author has moderate recent commit velocity.' };
      return { rating: 'risky', label: 'Cold Context', meaning: 'Author has not contributed recently; conventions may have evolved.' };
    },
  },
  sexp: {
    name: 'sexp',
    label: 'Subsystem Experience',
    category: 'developer',
    unit: 'subsystem commits',
    simpleDefinition: 'Number of prior commits the author made in this specific subsystem.',
    whyItMatters: 'Domain-specific knowledge in the exact files being modified dramatically cuts defect rates.',
    safeRange: '> 8 commits',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15) return { rating: 'safe', label: 'Domain Expert', meaning: 'Author has deep domain expertise in this specific subsystem.' };
      if (num >= 4) return { rating: 'moderate', label: 'Familiar', meaning: 'Author has touched this subsystem before.' };
      return { rating: 'risky', label: 'First-Time Domain', meaning: 'Author has rarely or never touched this subsystem before.' };
    },
  },
  ndev: {
    name: 'ndev',
    label: 'Prior Authors of Modified Files',
    category: 'developer',
    unit: 'developers',
    simpleDefinition: 'Number of distinct developers who previously modified these files.',
    whyItMatters: 'Files modified by dozens of developers often suffer from code erosion and mixed design patterns ("too many cooks").',
    safeRange: '< 8 developers',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 3) return { rating: 'safe', label: 'Strong Ownership', meaning: 'Few historical contributors; clear ownership and consistent style.' };
      if (num <= 10) return { rating: 'moderate', label: 'Shared Ownership', meaning: 'Standard team shared ownership.' };
      return { rating: 'risky', label: 'High Developer Turnover', meaning: `${num} prior developers touched these files; high risk of mixed paradigms.` };
    },
  },
  subsystem_familiarity: {
    name: 'subsystem_familiarity',
    label: 'Subsystem Familiarity Ratio',
    category: 'developer',
    unit: 'ratio (sexp / exp)',
    simpleDefinition: 'Percentage of the author’s total experience dedicated to this specific subsystem.',
    whyItMatters: 'Shows if the author is working in their primary area of expertise or venturing outside.',
    safeRange: '> 0.25 (25%)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.40) return { rating: 'safe', label: 'Primary Focus', meaning: 'The author spends a large share of their time in this subsystem.' };
      if (num >= 0.15) return { rating: 'moderate', label: 'Secondary Focus', meaning: 'Moderate familiarity with this subsystem.' };
      return { rating: 'risky', label: 'Unfamiliar Territory', meaning: 'Author is working in an unfamiliar area of the codebase.' };
    },
  },
  recent_exp_ratio: {
    name: 'recent_exp_ratio',
    label: 'Recent Experience Ratio',
    category: 'developer',
    unit: 'ratio (rexp / exp)',
    simpleDefinition: 'Proportion of total experience contributed in the recent past.',
    whyItMatters: 'Ensures the developer’s knowledge is current and actively maintained.',
    safeRange: '> 0.20',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 0.30) return { rating: 'safe', label: 'Recent Velocity', meaning: 'Author is actively shipping code in recent sprints.' };
      return { rating: 'moderate', label: 'Historical Contributor', meaning: 'Much of author’s experience is older.' };
    },
  },
  exp_per_file: {
    name: 'exp_per_file',
    label: 'Experience Per File',
    category: 'developer',
    unit: 'exp / (nf + 1)',
    simpleDefinition: 'Author experience scaled against the number of files changed in this PR.',
    whyItMatters: 'Large multi-file changes require greater senior developer context to execute safely.',
    safeRange: '> 5.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 8.0) return { rating: 'safe', label: 'Well-Matched', meaning: 'Developer experience is well-matched to the scope of files changed.' };
      return { rating: 'moderate', label: 'High Scope for Experience', meaning: 'Broad scope of files relative to developer experience.' };
    },
  },
  exp_vs_complexity: {
    name: 'exp_vs_complexity',
    label: 'Experience vs. Complexity',
    category: 'developer',
    unit: 'ratio',
    simpleDefinition: 'Balances developer experience against change dispersion and entropy.',
    whyItMatters: 'Highly scattered changes made by less experienced authors represent the highest statistical risk quadrant.',
    safeRange: '> 10.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num >= 15.0) return { rating: 'safe', label: 'High Competency Margin', meaning: 'Strong experience buffer against change complexity.' };
      return { rating: 'risky', label: 'Low Experience Buffer', meaning: 'Complex scattered change relative to author experience.' };
    },
  },

  // ------------------------------------------------------------
  // 4. Code Stability & Historical Fragility Features
  // ------------------------------------------------------------
  fix: {
    name: 'fix',
    label: 'Is Bug Fix Commit',
    category: 'stability',
    unit: 'boolean (0 or 1)',
    simpleDefinition: 'Flag indicating whether this pull request is intended to fix an existing defect.',
    whyItMatters: 'Historical studies show that bug fixes are 2x to 3x more likely to introduce secondary regression bugs than feature commits.',
    safeRange: '0 (Feature / Improvement)',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num === 1 || val === true) {
        return { rating: 'risky', label: 'Bug Fix (High Recurrence Risk)', meaning: 'This PR fixes an existing bug; beware of secondary regression bugs ("fix-inducing commits").' };
      }
      return { rating: 'safe', label: 'New Feature / Task', meaning: 'Standard feature or enhancement commit; baseline defect probability.' };
    },
  },
  age: {
    name: 'age',
    label: 'Average File Age',
    category: 'stability',
    unit: 'days',
    simpleDefinition: 'Average time in days since the modified files were last touched.',
    whyItMatters: 'Modifying dormant files that haven’t been changed in months or years frequently reactivates latent bugs.',
    safeRange: '< 90 days',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 45) return { rating: 'safe', label: 'Active Code', meaning: 'Recently touched code; tests and context are current.' };
      if (num <= 180) return { rating: 'moderate', label: 'Medium Age', meaning: `Files have not changed for ~${Math.round(num)} days.` };
      return { rating: 'risky', label: 'Dormant Legacy Code', meaning: `Files were dormant for ${Math.round(num)} days; high risk of breaking obsolete assumptions.` };
    },
  },
  nuc: {
    name: 'nuc',
    label: 'Number of Unique Changes',
    category: 'stability',
    unit: 'prior revisions',
    simpleDefinition: 'Total count of historical modifications the touched files have undergone.',
    whyItMatters: 'Files with high historical change frequency are hot spots ("bug hotspots") in the system.',
    safeRange: '< 25 prior revisions',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 15) return { rating: 'safe', label: 'Stable Files', meaning: 'Historically stable files with few past revisions.' };
      if (num <= 50) return { rating: 'moderate', label: 'Active Revision', meaning: 'Moderately revised files.' };
      return { rating: 'risky', label: 'Volatile Hotspot', meaning: `High-churn hotspot (${num} past revisions); known defect concentration area.` };
    },
  },
  fragility_index: {
    name: 'fragility_index',
    label: 'File Fragility Index',
    category: 'stability',
    unit: 'index score',
    simpleDefinition: 'Compound index combining file dormancy and historical change frequency scaled against experience ((age * nuc) / (exp + 1)).',
    whyItMatters: 'Pinpoints modifications where unfamiliar developers touch old, volatile legacy files.',
    safeRange: '< 50.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 25.0) return { rating: 'safe', label: 'Low Fragility', meaning: 'Changes are within well-maintained, resilient code.' };
      if (num <= 100.0) return { rating: 'moderate', label: 'Moderate Fragility', meaning: 'Contains legacy or hotspot code elements.' };
      return { rating: 'risky', label: 'High Fragility', meaning: 'Modifying fragile legacy code; high regression probability.' };
    },
  },
  dev_density_risk: {
    name: 'dev_density_risk',
    label: 'Developer Density Risk',
    category: 'stability',
    unit: 'ratio (ndev / (age + 1))',
    simpleDefinition: 'Ratio of developer turnover relative to file age.',
    whyItMatters: 'Files edited by many different developers in a short timeframe exhibit the highest bug density.',
    safeRange: '< 0.15',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 0.10) return { rating: 'safe', label: 'Low Contention', meaning: 'Healthy ownership turnover over time.' };
      return { rating: 'moderate', label: 'High Contention', meaning: 'Multiple developers rapidly modifying the same files.' };
    },
  },
  rexp_vs_sexp: {
    name: 'rexp_vs_sexp',
    label: 'Recent vs. Subsystem Velocity',
    category: 'stability',
    unit: 'ratio ((rexp + 1) / (sexp + 1))',
    simpleDefinition: 'Comparison of author’s overall recent pace against their specific subsystem footprint.',
    whyItMatters: 'Highlights generalist velocity vs specialist focus.',
    safeRange: '0.5 – 2.0',
    interpretValue: (val) => {
      const num = Number(val) || 0;
      if (num <= 2.0) return { rating: 'safe', label: 'Grounded Velocity', meaning: 'Recent activity aligns with domain history.' };
      return { rating: 'moderate', label: 'Rapid Pivot', meaning: 'Author is currently switching into this subsystem.' };
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
