// ============================================================
// GitHub API Service
// ============================================================
// Wraps @octokit/rest to fetch PR details, file diffs, commit
// history, and author statistics from the GitHub REST API.
// ============================================================

const { Octokit } = require('@octokit/rest');

// Initialize Octokit
// Only use the token if it's actually configured (not the placeholder)
const token = process.env.GITHUB_TOKEN;
const isPlaceholder = !token || token.includes('your_');

const octokitOptions = {};
if (!isPlaceholder) {
  octokitOptions.auth = token;
}

const octokit = new Octokit(octokitOptions);

/**
 * Fetches the list of files changed in a Pull Request.
 * Returns an array of file objects with filename, status, additions, deletions, etc.
 *
 * GitHub API: GET /repos/{owner}/{repo}/pulls/{pull_number}/files
 *
 * @param {string} owner     - Repository owner (e.g. 'facebook')
 * @param {string} repo      - Repository name (e.g. 'react')
 * @param {number} prNumber  - Pull request number
 * @returns {Array} List of file objects
 */
async function getPRFiles(owner, repo, prNumber) {
  try {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100, // Max allowed by GitHub
    });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch PR files for ${owner}/${repo}#${prNumber}:`, err.message);
    throw err;
  }
}

/**
 * Fetches the Pull Request details (title, author, state, etc.).
 *
 * GitHub API: GET /repos/{owner}/{repo}/pulls/{pull_number}
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number} prNumber
 * @returns {Object} PR detail object
 */
async function getPRDetails(owner, repo, prNumber) {
  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch PR details for ${owner}/${repo}#${prNumber}:`, err.message);
    throw err;
  }
}

/**
 * Fetches the commit history for a specific file in a repository.
 * Used to calculate file age, number of prior developers, and unique changes.
 *
 * GitHub API: GET /repos/{owner}/{repo}/commits?path={filePath}
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath  - Relative path within the repo (e.g. 'src/utils/auth.js')
 * @param {number} perPage   - Number of commits to fetch (default: 100)
 * @returns {Array} List of commit objects for that file
 */
async function getFileCommitHistory(owner, repo, filePath, perPage = 100) {
  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      path: filePath,
      per_page: perPage,
    });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch commits for ${filePath}:`, err.message);
    return []; // Return empty rather than crashing — some files may be new
  }
}

/**
 * Fetches the overall commit history for a repository author.
 * Used to calculate developer experience (exp, rexp).
 *
 * GitHub API: GET /repos/{owner}/{repo}/commits?author={authorLogin}
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} authorLogin  - GitHub username of the PR author
 * @returns {Array} List of commit objects by this author
 */
async function getAuthorCommitHistory(owner, repo, authorLogin) {
  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      author: authorLogin,
      per_page: 100,
    });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch commits for author ${authorLogin}:`, err.message);
    return [];
  }
}

/**
 * Fetches the raw content of a file from the repository (for dependency parsing).
 * Returns the file content as a UTF-8 string.
 *
 * GitHub API: GET /repos/{owner}/{repo}/contents/{path}
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath
 * @param {string} ref  - Branch or commit SHA (default: main branch)
 * @returns {string|null} File content as string, or null if not found
 */
async function getFileContent(owner, repo, filePath, ref = undefined) {
  try {
    const params = { owner, repo, path: filePath };
    if (ref) params.ref = ref;

    const { data } = await octokit.repos.getContent(params);

    // GitHub returns base64-encoded content for files
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (err) {
    // 404 = file doesn't exist (deleted, or new file with no prior version)
    if (err.status === 404) return null;
    console.error(`[GitHubService] Failed to fetch content for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Fetches repository metadata (language, default branch, etc.).
 *
 * GitHub API: GET /repos/{owner}/{repo}
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Object} Repository metadata object
 */
async function getRepoInfo(owner, repo) {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch repo info for ${owner}/${repo}:`, err.message);
    throw err;
  }
}

/**
 * Fetches the most recent Pull Requests for a repository (open or closed).
 * Used for initial sync when adding a new repository.
 *
 * GitHub API: GET /repos/{owner}/{repo}/pulls
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number} count  - Number of PRs to fetch (default: 5)
 * @returns {Array} List of PR objects
 */
async function getRecentPRs(owner, repo, count = 5) {
  try {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: count,
    });
    return data;
  } catch (err) {
    console.error(`[GitHubService] Failed to fetch recent PRs for ${owner}/${repo}:`, err.message);
    return [];
  }
}

module.exports = {
  getPRFiles,
  getPRDetails,
  getFileCommitHistory,
  getAuthorCommitHistory,
  getFileContent,
  getRepoInfo,
  getRecentPRs,
};
