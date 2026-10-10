// ============================================================
// Dependency Parser
// ============================================================
// Parses JavaScript/Node.js files to extract import/require
// statements and build a cross-file dependency graph.
//
// Supports:
//   - const x = require('./path')
//   - import x from './path'
//   - import { x } from './path'
//   - import './path'
//   - require('./path')
//
// Only processes local/relative imports (starting with . or /).
// Ignores node_modules packages (e.g., 'express', 'react').
// ============================================================

const githubService = require('./githubService');

/**
 * Regex patterns for detecting import/require statements.
 * We use two patterns to cover CommonJS and ES Module syntax.
 */
const REQUIRE_PATTERN = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const IMPORT_PATTERN = /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * Checks if a file is a JavaScript/TypeScript file.
 * @param {string} filename
 * @returns {boolean}
 */
function isJSFile(filename) {
  const jsExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
  return jsExtensions.some((ext) => filename.endsWith(ext));
}

/**
 * Checks if an import path is a local/relative import (not an npm package).
 * Local imports start with './' or '../' or '/'.
 *
 * @param {string} importPath
 * @returns {boolean}
 */
function isLocalImport(importPath) {
  return importPath.startsWith('.') || importPath.startsWith('/');
}

/**
 * Resolves a relative import path to an absolute path within the repo.
 * e.g., If sourceFile = 'src/controllers/auth.js' and importPath = '../utils/db',
 *        the resolved path = 'src/utils/db'
 *
 * @param {string} sourceFile   - The file containing the import statement
 * @param {string} importPath   - The relative import path
 * @returns {string} Resolved file path (without extension, as imports often omit it)
 */
function resolveImportPath(sourceFile, importPath) {
  // Get the directory of the source file
  const sourceDir = sourceFile.substring(0, sourceFile.lastIndexOf('/')) || '.';

  // Split both paths into segments
  const baseParts = sourceDir.split('/');
  const importParts = importPath.split('/');

  const result = [...baseParts];

  for (const part of importParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      result.pop();
    } else {
      result.push(part);
    }
  }

  return result.join('/');
}

/**
 * Extracts all import/require paths from a JavaScript file's content.
 *
 * @param {string} content - The file's source code as a string
 * @returns {Array<string>} List of imported module paths
 */
function extractImports(content) {
  const imports = [];

  // Extract require() calls
  let match;
  const requireRegex = new RegExp(REQUIRE_PATTERN.source, 'g');
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Extract import statements
  const importRegex = new RegExp(IMPORT_PATTERN.source, 'g');
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Builds a dependency graph for all JavaScript files modified in a PR.
 *
 * Returns an object with:
 *   - nodes: Array of file paths (unique files involved)
 *   - edges: Array of { source, target } objects (source imports target)
 *
 * @param {string} owner     - Repo owner
 * @param {string} repo      - Repo name
 * @param {Array}  prFiles   - Array of PR file objects from GitHub API
 * @param {string} ref       - Git ref (branch/SHA) to fetch file content from
 * @returns {Object} { nodes: string[], edges: { source: string, target: string }[] }
 */
async function buildDependencyGraph(owner, repo, prFiles, ref, userToken = null) {
  const nodes = new Set();
  const edges = [];

  // Filter to JS files only
  const jsFiles = prFiles.filter((f) => isJSFile(f.filename));

  if (jsFiles.length === 0) {
    console.log('[DependencyParser] No JS files in PR — skipping dependency parsing');
    return { nodes: [], edges: [] };
  }

  console.log(`[DependencyParser] Parsing ${jsFiles.length} JS file(s) for dependencies`);

  for (const file of jsFiles) {
    const filename = file.filename;
    nodes.add(filename);

    // Skip deleted files — they have no content to parse
    if (file.status === 'removed') continue;

    // Fetch the file content from GitHub using token if provided
    const content = await githubService.getFileContent(owner, repo, filename, ref, userToken);
    if (!content) continue;

    // Extract import/require statements
    const importPaths = extractImports(content);

    for (const importPath of importPaths) {
      // Only track local/relative imports
      if (!isLocalImport(importPath)) continue;

      // Resolve the relative path
      const resolvedPath = resolveImportPath(filename, importPath);
      nodes.add(resolvedPath);

      edges.push({
        source: filename,
        target: resolvedPath,
      });
    }
  }

  const result = {
    nodes: Array.from(nodes),
    edges,
  };

  console.log(`[DependencyParser] Graph: ${result.nodes.length} nodes, ${result.edges.length} edges`);
  return result;
}

module.exports = { buildDependencyGraph, extractImports, isJSFile };
