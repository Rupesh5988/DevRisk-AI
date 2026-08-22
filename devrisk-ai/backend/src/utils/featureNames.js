// ============================================================
// Feature Names, Descriptions & SHAP-to-English Mappings
// ============================================================
// Central reference for the 14 ApacheJIT change-pattern features.
// Used by the feature extractor and the SHAP explanation builder.
// ============================================================

/**
 * Ordered list of feature names expected by the XGBoost model.
 * MUST match the training order exactly.
 */
const FEATURE_ORDER = [
  'ns', 'nd', 'nf', 'entropy', 'la', 'ld', 'lt',
  'fix', 'ndev', 'age', 'nuc', 'exp', 'rexp', 'sexp',
];

/**
 * Human-readable descriptions for each feature.
 */
const FEATURE_DESCRIPTIONS = {
  ns:      'Number of modified subsystems (top-level directories)',
  nd:      'Number of modified directories',
  nf:      'Number of modified files',
  entropy: 'Spread of changes across files (Shannon entropy)',
  la:      'Total lines added',
  ld:      'Total lines deleted',
  lt:      'Total lines of code in modified files (before change)',
  fix:     'Whether this commit is a bug-fix (1 = yes, 0 = no)',
  ndev:    'Number of distinct prior developers on modified files',
  age:     'Average age of modified files in days since last change',
  nuc:     'Number of unique prior changes to modified files',
  exp:     'Developer experience — total prior commits in this repo',
  rexp:    'Recent developer experience — commits in the last 90 days',
  sexp:    'Subsystem experience — prior commits to these subsystems',
};

/**
 * Templates for converting SHAP values into plain-English explanations.
 * Each feature has templates for when it pushes risk UP vs DOWN.
 *
 * Usage: pick the template based on sign of SHAP value, then
 *        interpolate the actual feature value.
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
    positive: 'This is a bug-fix commit — bug fixes sometimes introduce new bugs',
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
};

/**
 * Builds a plain-English explanation for a single SHAP value.
 * @param {string}  featureName  - One of the 14 feature keys (e.g. 'la')
 * @param {number}  shapValue    - The SHAP attribution value (positive = increases risk)
 * @param {number}  featureValue - The actual value of the feature for this PR
 * @returns {string} Human-readable explanation sentence
 */
function buildExplanation(featureName, shapValue, featureValue) {
  const templates = SHAP_TEMPLATES[featureName];
  if (!templates) return `Feature "${featureName}" contributed ${shapValue > 0 ? 'positively' : 'negatively'} to risk`;

  const direction = shapValue >= 0 ? 'positive' : 'negative';
  const displayValue = typeof featureValue === 'number' ? Math.round(featureValue) : featureValue;

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
  FEATURE_DESCRIPTIONS,
  SHAP_TEMPLATES,
  buildExplanation,
  getRiskLabel,
};
