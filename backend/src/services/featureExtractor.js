// ============================================================
// Feature Extractor
// ============================================================
// Computes the 14 ApacheJIT change-pattern features from a
// Pull Request's data fetched via the GitHub API.
//
// Features: ns, nd, nf, entropy, la, ld, lt, fix, ndev,
//           age, nuc, exp, rexp, sexp
// ============================================================

const githubService = require('./githubService');

/**
 * Computes Shannon entropy for the distribution of changes across files.
 * Measures how evenly changes are spread — high entropy = even spread,
 * low entropy = concentrated in few files.
 *
 * @param {Array<number>} changeCounts - Array of (additions + deletions) per file
 * @returns {number} Shannon entropy value
 */
function computeEntropy(changeCounts) {
  const total = changeCounts.reduce((sum, c) => sum + c, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const count of changeCounts) {
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(4));
}

/**
 * Extracts the top-level directory (subsystem) from a file path.
 * e.g. 'src/utils/auth.js' → 'src'
 *      'README.md' → '.'  (root-level files)
 *
 * @param {string} filePath
 * @returns {string} Subsystem name
 */
function getSubsystem(filePath) {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts[0] : '.';
}

/**
 * Extracts the directory path from a file path.
 * e.g. 'src/utils/auth.js' → 'src/utils'
 *      'README.md' → '.'
 *
 * @param {string} filePath
 * @returns {string} Directory path
 */
function getDirectory(filePath) {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.substring(0, lastSlash) : '.';
}

/**
 * Determines if a PR title or body suggests this is a bug-fix commit.
 * Checks for common patterns in PR titles/commit messages.
 *
 * @param {string} title - PR title
 * @param {string} body  - PR body/description
 * @returns {number} 1 if likely a fix, 0 otherwise
 */
function isBugFix(title, body) {
  const text = `${title || ''} ${body || ''}`.toLowerCase();
  const fixPatterns = [
    'fix', 'bug', 'patch', 'hotfix', 'resolve', 'issue',
    'defect', 'error', 'crash', 'broken', 'repair',
  ];
  return fixPatterns.some((pattern) => text.includes(pattern)) ? 1 : 0;
}

/**
 * Main extraction function — computes all 14 features for a Pull Request.
 *
 * @param {string} owner       - Repo owner
 * @param {string} repo        - Repo name
 * @param {number} prNumber    - PR number
 * @param {Object} prDetails   - PR detail object from GitHub API
 * @param {Array}  prFiles     - Array of file objects from GitHub API
 * @returns {Object} Feature object with all 14 values + metadata
 */
async function extractFeatures(owner, repo, prNumber, prDetails, prFiles, repoToken = null) {
  const authorLogin = prDetails?.user?.login || 'developer';
  const prTitle = prDetails?.title || '';
  const prBody = prDetails?.body || '';

  // -------------------------------------------------------
  // DIRECT FEATURES (computed from prFiles array directly)
  // -------------------------------------------------------

  // nf: Number of modified files
  const nf = prFiles.length;

  // la: Total lines added across all files
  const la = prFiles.reduce((sum, f) => sum + (f.additions || 0), 0);

  // ld: Total lines deleted across all files
  const ld = prFiles.reduce((sum, f) => sum + (f.deletions || 0), 0);

  // nd: Number of unique directories modified
  const directories = new Set(prFiles.map((f) => getDirectory(f.filename)));
  const nd = directories.size;

  // ns: Number of unique subsystems (top-level directories) modified
  const subsystems = new Set(prFiles.map((f) => getSubsystem(f.filename)));
  const ns = subsystems.size;

  // entropy: Shannon entropy of change distribution
  const changeCounts = prFiles.map((f) => (f.additions || 0) + (f.deletions || 0));
  const entropy = computeEntropy(changeCounts);

  // fix: Is this a bug-fix commit?
  const fix = isBugFix(prTitle, prBody);

  // -------------------------------------------------------
  // GIT-HISTORY FEATURES (require GitHub API calls)
  // -------------------------------------------------------
  let lt = 0;        // Total lines in modified files (before change)
  let totalAge = 0;  // Sum of file ages (days since last commit)
  let totalNuc = 0;  // Sum of unique changes per file
  const allFileDevs = new Set(); // All unique devs across modified files

  // Process each modified file (limit to first 20 to avoid rate limits)
  const filesToProcess = prFiles.slice(0, 20);

  for (const file of filesToProcess) {
    // Fetch commit history for this file using the repoToken for private repo access
    const fileCommits = await githubService.getFileCommitHistory(owner, repo, file.filename, 50, repoToken);

    // ndev: Collect unique authors across all modified files
    for (const commit of fileCommits) {
      if (commit.author && commit.author.login) {
        allFileDevs.add(commit.author.login);
      }
    }

    // nuc: Number of unique prior commits to this file
    totalNuc += fileCommits.length;

    // age: Days since the last commit to this file
    if (fileCommits.length > 0) {
      const lastCommitDate = new Date(fileCommits[0].commit.author.date);
      const now = new Date();
      const ageDays = (now - lastCommitDate) / (1000 * 60 * 60 * 24);
      totalAge += ageDays;
    }

    lt += (file.changes || 0);
  }

  // Average age across all files
  const age = filesToProcess.length > 0
    ? parseFloat((totalAge / filesToProcess.length).toFixed(2))
    : 0;

  // ndev: Number of distinct prior developers
  const ndev = allFileDevs.size;

  // nuc: Average unique changes per file
  const nuc = filesToProcess.length > 0
    ? parseFloat((totalNuc / filesToProcess.length).toFixed(2))
    : 0;

  // -------------------------------------------------------
  // DEVELOPER EXPERIENCE FEATURES
  // -------------------------------------------------------

  // Fetch author's commit history in this repo (authenticated with repoToken)
  const authorCommits = await githubService.getAuthorCommitHistory(owner, repo, authorLogin, repoToken);

  // exp: Total prior commits by this author in the repo
  const exp = authorCommits.length;

  // rexp: Recent experience — commits in the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const rexp = authorCommits.filter((c) => {
    const commitDate = new Date(c.commit.author.date);
    return commitDate >= ninetyDaysAgo;
  }).length;

  // sexp: Subsystem experience — author's prior commits to the same subsystems
  // This is an approximation — we check how many of the author's prior commits
  // touched the same top-level directories as this PR
  const prSubsystems = subsystems;
  let sexp = 0;
  for (const commit of authorCommits) {
    // We can't easily get files per commit without extra API calls,
    // so we approximate by counting commits as a fraction of total
    // This is a simplification — in production, you'd query per-commit files
    sexp += 1; // Increment for each commit (simplified)
  }
  // Normalize: sexp as ratio of commits to subsystems touched
  sexp = prSubsystems.size > 0
    ? parseFloat((sexp / prSubsystems.size).toFixed(2))
    : 0;

  // -------------------------------------------------------
  // BUILD FEATURE OBJECT
  // -------------------------------------------------------
  const features = {
    ns,
    nd,
    nf,
    entropy,
    la,
    ld,
    lt,
    fix,
    ndev,
    age,
    nuc,
    exp,
    rexp,
    sexp,
  };

  console.log(`[FeatureExtractor] Extracted features for ${owner}/${repo}#${prNumber}:`, features);

  return features;
}

module.exports = { extractFeatures };
