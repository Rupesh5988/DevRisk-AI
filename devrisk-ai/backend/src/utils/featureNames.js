// ============================================================
// Feature Names, Descriptions & SHAP-to-English Mappings
// ============================================================
// Central reference for the 14 ApacheJIT change-pattern metrics
// and 14 domain-engineered JIT features (total 28 metrics).
// Used by the feature extractor, simulator, and SHAP explanation builder.
// ============================================================

/**
 * Ordered list of raw feature names expected by the ML service.
 * MUST match the training order exactly.
 */
const FEATURE_ORDER = [
  'ns', 'nd', 'nf', 'entropy', 'la', 'ld', 'lt',
  'fix', 'ndev', 'age', 'nuc', 'exp', 'rexp', 'sexp',
];

/**
 * Full list of 28 features (raw + domain engineered) evaluated by the model.
 */
const ALL_FEATURE_COLUMNS = [
  ...FEATURE_ORDER,
  'churn_density', 'la_ratio', 'exp_per_file', 'recent_exp_ratio',
  'exp_vs_complexity', 'subsystem_familiarity', 'churn_intensity', 'dev_density_risk',
  'diffusion_factor', 'churn_asymmetry', 'churn_per_file', 'fragility_index',
  'subsystem_entropy', 'rexp_vs_sexp',
];

/**
 * Human-readable descriptions for each feature.
 */
const FEATURE_DESCRIPTIONS = {
  ns:                   'Number of modified subsystems (top-level directories)',
  nd:                   'Number of modified directories',
  nf:                   'Number of modified files',
  entropy:              'Spread of changes across files (Shannon entropy)',
  la:                   'Total lines added',
  ld:                   'Total lines deleted',
  lt:                   'Total lines of code in modified files (before change)',
  fix:                  'Whether this commit is a bug-fix (1 = yes, 0 = no)',
  ndev:                 'Number of distinct prior developers on modified files',
  age:                  'Average age of modified files in days since last change',
  nuc:                  'Number of unique prior changes to modified files',
  exp:                  'Developer experience — total prior commits in this repo',
  rexp:                 'Recent developer experience — commits in the last 90 days',
  sexp:                 'Subsystem experience — prior commits to these subsystems',
  churn_density:        'Proportion of lines modified relative to file size',
  la_ratio:             'Addition ratio — fraction of churn that is new code',
  exp_per_file:         'Developer familiarity normalized per modified file',
  recent_exp_ratio:     'Freshness of developer activity (recent vs lifetime commits)',
  exp_vs_complexity:    'Developer experience relative to Shannon change entropy',
  subsystem_familiarity:'Domain expertise in touched subsystems',
  churn_intensity:      'Change blast radius (total churn multiplied by entropy)',
  dev_density_risk:     'Developer turnover / ownership fragmentation per file age',
  diffusion_factor:     'Cross-architectural diffusion across directories & subsystems',
  churn_asymmetry:      'Net imbalance between additions and deletions (rewrite volatility)',
  churn_per_file:       'Average lines changed per modified file',
  fragility_index:      'Unstable legacy files touched by low-experience author',
  subsystem_entropy:    'Entropy concentration across subsystems',
  rexp_vs_sexp:         'Author repo activity without matching subsystem domain expertise',
};

/**
 * Templates for converting SHAP values into plain-English explanations.
 */
const SHAP_TEMPLATES = {
  ns: {
    positive: 'Changes span {value} subsystems — wide spread increases risk',
    negative: 'Changes are contained within {value} subsystem(s) — focused change',
  },
  nd: {
    positive: 'Modifications touch {value} directories — scattered changes are riskier',
    negative: 'Only {value} directory(ies) modified — well-contained change',
  },
  nf: {
    positive: '{value} files modified — more files means more risk surface',
    negative: 'Only {value} file(s) changed — minimal scope',
  },
  entropy: {
    positive: 'Changes are unevenly distributed (entropy: {value}) — concentrated edits in few files',
    negative: 'Changes are evenly spread (entropy: {value}) — balanced modification',
  },
  la: {
    positive: '{value} lines added — large additions often introduce bugs',
    negative: 'Only {value} lines added — small, manageable addition',
  },
  ld: {
    positive: '{value} lines deleted — large deletions can break existing dependencies',
    negative: 'Only {value} lines removed — minimal disruption',
  },
  lt: {
    positive: 'Modified files contain {value} total lines — changing large files has more side effects',
    negative: 'Modified files are relatively small ({value} lines) — lower risk surface',
  },
  fix: {
    positive: 'This is a bug-fix commit — bug fixes sometimes introduce regressions',
    negative: 'This is a feature/non-fix commit — typically lower regression risk',
  },
  ndev: {
    positive: '{value} different developers have previously touched these files — inconsistent coding styles',
    negative: 'Only {value} developer(s) have worked on these files — consistent codebase',
  },
  age: {
    positive: 'Files haven\'t been modified in ~{value} days — stale files are fragile',
    negative: 'Files were recently updated (~{value} days ago) — actively maintained',
  },
  nuc: {
    positive: 'Files have {value} prior unique changes — frequently changed files are unstable',
    negative: 'Files have only {value} prior change(s) — stable files',
  },
  exp: {
    positive: 'Developer has only {value} prior commits — limited experience with this repo',
    negative: 'Developer has {value} prior commits — experienced contributor',
  },
  rexp: {
    positive: 'Developer has only {value} commits in the last 90 days — not recently active here',
    negative: 'Developer has {value} recent commits — actively working on this repo',
  },
  sexp: {
    positive: 'Developer has only {value} commits to these subsystems — unfamiliar territory',
    negative: 'Developer has {value} commits to these subsystems — knows this area well',
  },
  churn_density: {
    positive: 'High churn density ({value}) — large portion of file contents rewritten',
    negative: 'Low churn density ({value}) — minimal surgical modification',
  },
  la_ratio: {
    positive: 'High addition ratio ({value}) — heavy influx of new logic',
    negative: 'Balanced addition ratio ({value}) — standard modification',
  },
  exp_per_file: {
    positive: 'Low author experience per file ({value}) — contributor is stretched thin',
    negative: 'High author experience per file ({value}) — author knows these files thoroughly',
  },
  recent_exp_ratio: {
    positive: 'Low recent activity ratio ({value}) — author commits were mostly in the past',
    negative: 'High recent activity ratio ({value}) — author is actively engaged',
  },
  exp_vs_complexity: {
    positive: 'Change complexity exceeds author track record ({value})',
    negative: 'Author experience comfortably covers change complexity ({value})',
  },
  subsystem_familiarity: {
    positive: 'Low subsystem familiarity ({value}) — modifying unfamiliar components',
    negative: 'High subsystem familiarity ({value}) — expert in this subsystem',
  },
  churn_intensity: {
    positive: 'High churn blast radius ({value}) — high volume of edits in complex zones',
    negative: 'Low churn blast radius ({value}) — localized edits in simple zones',
  },
  dev_density_risk: {
    positive: 'High author turnover relative to file age ({value}) — fragmented ownership',
    negative: 'Low author turnover ({value}) — clear code ownership',
  },
  diffusion_factor: {
    positive: 'High architectural diffusion ({value}) — changes span multiple subsystems across few files',
    negative: 'Low architectural diffusion ({value}) — changes well localized within component boundaries',
  },
  churn_asymmetry: {
    positive: 'High churn asymmetry ({value}) — massive one-sided edit indicates rewrite volatility',
    negative: 'Balanced churn symmetry ({value}) — symmetric edits indicate routine refactor',
  },
  churn_per_file: {
    positive: 'High churn per file ({value}) — dense modifications concentrated per file',
    negative: 'Low churn per file ({value}) — lightweight edits per file',
  },
  fragility_index: {
    positive: 'High codebase fragility ({value}) — unstable legacy files modified by newer author',
    negative: 'Low fragility ({value}) — stable code modified by experienced contributor',
  },
  subsystem_entropy: {
    positive: 'Subsystem edits are unevenly concentrated ({value})',
    negative: 'Subsystem edits are evenly distributed ({value})',
  },
  rexp_vs_sexp: {
    positive: 'Author is active elsewhere but has little experience in these specific subsystems ({value})',
    negative: 'Author recent experience aligns with these specific subsystems ({value})',
  },
};

/**
 * Builds a plain-English explanation for a single SHAP value.
 */
function buildExplanation(featureName, shapValue, featureValue) {
  const templates = SHAP_TEMPLATES[featureName];
  if (!templates) return `Feature "${featureName}" contributed ${shapValue > 0 ? 'positively' : 'negatively'} to risk`;

  const direction = shapValue >= 0 ? 'positive' : 'negative';
  const displayValue = typeof featureValue === 'number'
    ? (Number.isInteger(featureValue) ? featureValue : parseFloat(featureValue.toFixed(2)))
    : featureValue;

  return templates[direction].replace('{value}', displayValue);
}

/**
 * Risk label thresholds.
 */
function getRiskLabel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  FEATURE_ORDER,
  ALL_FEATURE_COLUMNS,
  FEATURE_DESCRIPTIONS,
  SHAP_TEMPLATES,
  buildExplanation,
  getRiskLabel,
};
