// ============================================================
// DevRisk AI Security & AST Vulnerability Scanner
// ============================================================
// Scans git diffs, changed files, and code patches for critical
// security vulnerabilities, hardcoded secrets, injection vectors,
// and unsafe execution patterns. Augments JIT churn metrics with
// semantic vulnerability intelligence.
// ============================================================

const VULNERABILITY_RULES = [
  {
    id: 'RCE_EXEC',
    name: 'Remote Code Execution (RCE)',
    category: 'Injection / Command Execution',
    severity: 'CRITICAL',
    cvss: 9.8,
    impact: 35,
    patterns: [
      /(?:child_process\s*\.\s*(?:exec|execSync)|(?<![a-zA-Z0-9_])exec|execSync)\s*\(\s*([a-zA-Z0-9_$.]+|`[^`]*\${[^}]+}[^`]*`|['"][^'"]*['"]\s*\+\s*[a-zA-Z0-9_$]+)/,
      /(?:child_process\s*\.\s*spawn|(?<![a-zA-Z0-9_])spawn)\s*\([^,]+,\s*\{[^}]*shell\s*:\s*true/i,
      /(?:os\.system|subprocess\.Popen|subprocess\.call|subprocess\.run)\s*\([^)]*shell\s*=\s*True/i,
      /(?:os\.system|subprocess\.Popen|subprocess\.call|subprocess\.run)\s*\(\s*(f['"][^'"]*\{[^}]+\}['"]|[a-zA-Z0-9_]+)/i,
    ],
    description: 'Unsanitized execution of external shell commands via child_process or system execution. Allows an attacker to run arbitrary shell/terminal commands on the host server.',
    remediation: 'Avoid executing arbitrary shell commands. If required, use child_process.execFile() or spawn() without shell: true and with strict argument whitelisting.',
  },
  {
    id: 'SQL_INJECTION',
    name: 'SQL Injection (SQLi)',
    category: 'Database Security',
    severity: 'CRITICAL',
    cvss: 9.0,
    impact: 25,
    patterns: [
      /(?:query|execute|raw)\s*\(\s*`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|FROM|WHERE)[^`]*\$\{[^}]+\}[^`]*`/i,
      /(?:query|execute|raw)\s*\(\s*(['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|FROM|WHERE)[^'"]*['"]\s*\+\s*[a-zA-Z0-9_$.]+)/i,
      /(?:query|execute)\s*\(\s*f['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|FROM|WHERE)[^'"]*\{[^}]+\}/i,
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\s+(?:WHERE|SET|VALUES)\s+.*(?:['"]\s*\+\s*[a-zA-Z0-9_$.]+|\$\{[a-zA-Z0-9_$.]+\})/i,
    ],
    description: 'Unescaped template literal or string concatenation detected inside a SQL query. Allows an attacker to read, modify, or drop database tables and bypass authentication.',
    remediation: 'Use parameterized queries ($1, $2 in pg, or ? in mysql) with values passed separately in an arguments array.',
  },
  {
    id: 'SECRET_STRIPE',
    name: 'Hardcoded API Secret (Stripe)',
    category: 'Secret Leakage',
    severity: 'CRITICAL',
    cvss: 8.5,
    impact: 20,
    patterns: [
      /(?:sk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,})/,
      /(?:STRIPE_SECRET_KEY|stripe_key)\s*[:=]\s*["'](sk_live_[^"']+)["']/i,
    ],
    description: 'Live Stripe production secret API key committed directly to source code. Exposes payment processing accounts and customer financial data.',
    remediation: 'Immediately revoke the exposed key in the Stripe Dashboard. Migrate all keys to environment variables (.env / cloud secret manager).',
  },
  {
    id: 'SECRET_AWS',
    name: 'Hardcoded Cloud Credentials (AWS)',
    category: 'Secret Leakage',
    severity: 'CRITICAL',
    cvss: 9.0,
    impact: 25,
    patterns: [
      /(?:AKIA[0-9A-Z]{16})/,
      /(?:AWS_SECRET_ACCESS_KEY|aws_secret_key)\s*[:=]\s*["']([0-9a-zA-Z/+=]{40})["']/i,
    ],
    description: 'AWS Access Key ID or Secret Access Key committed in source code. Can lead to total infrastructure takeover, data loss, and unauthorized cloud compute charges.',
    remediation: 'Revoke compromised IAM credentials in the AWS Console immediately. Use IAM Roles (EC2/ECS/Lambda) or AWS Secrets Manager.',
  },
  {
    id: 'SECRET_GITHUB_TOKEN',
    name: 'Hardcoded GitHub Token',
    category: 'Secret Leakage',
    severity: 'HIGH',
    cvss: 8.2,
    impact: 20,
    patterns: [
      /(?:ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})/,
    ],
    description: 'GitHub Personal Access Token hardcoded in repository code. Enables unauthorized repository access and CI/CD workflow tampering.',
    remediation: 'Revoke the token from GitHub Settings -> Developer Settings -> Personal Access Tokens and store it in environment variables.',
  },
  {
    id: 'DANGEROUS_EVAL',
    name: 'Arbitrary Code Evaluation (eval / Function)',
    category: 'Code Injection',
    severity: 'HIGH',
    cvss: 8.0,
    impact: 15,
    patterns: [
      /(?<![a-zA-Z0-9_.])eval\s*\(\s*([a-zA-Z0-9_$.]+|`[^`]*\${[^}]+}[^`]*`)/,
      /new\s+Function\s*\([^)]*([a-zA-Z0-9_$.]+)\s*\)/,
      /vm\.runIn(?:NewContext|ThisContext)\s*\(/,
    ],
    description: 'Dynamic execution of JavaScript via eval() or new Function(). In-process code evaluation can read process memory, environment secrets, and compromise server integrity.',
    remediation: 'Never use eval() or new Function() with dynamic expressions. Use secure expression parsers (e.g. mathjs, expr-eval) or strictly typed handlers.',
  },
  {
    id: 'PRIVATE_KEY',
    name: 'Hardcoded Private Key',
    category: 'Secret Leakage',
    severity: 'CRITICAL',
    cvss: 9.5,
    impact: 30,
    patterns: [
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    ],
    description: 'Cryptographic private key certificate hardcoded into repository diff.',
    remediation: 'Revoke certificate immediately and generate a new key pair. Never commit private keys to git.',
  },
];

/**
 * Scans a file patch (git diff chunk) or full file content for security vulnerabilities.
 * Focuses especially on added lines (starting with '+').
 *
 * @param {string} content - Raw patch or file content
 * @param {string} filename - Name of the file being scanned
 * @returns {Array<object>} List of detected vulnerabilities
 */
function scanContent(content, filename = 'code.js') {
  if (!content || typeof content !== 'string') return [];

  const findings = [];
  const lines = content.split('\n');

  // Check if this looks like a git patch (contains lines starting with + or -)
  const isPatch = lines.some((l) => l.startsWith('+++') || l.startsWith('---') || (l.startsWith('+') && !l.startsWith('+++')));

  lines.forEach((line, index) => {
    // If it's a patch, only inspect added lines (lines starting with + but not header +++)
    let testLine = line;
    let isAddedLine = true;
    if (isPatch) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        testLine = line.substring(1);
        isAddedLine = true;
      } else if (line.startsWith('-')) {
        // Deleted line, skip
        isAddedLine = false;
      } else {
        // Context line
        testLine = line;
        isAddedLine = false;
      }
    }

    if (!isAddedLine && isPatch) return;

    // Test each rule against the line
    for (const rule of VULNERABILITY_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(testLine)) {
          // Avoid duplicate findings of same rule on the same line
          const alreadyFound = findings.some(
            (f) => f.vulnerability_type === rule.name && f.line_number === index + 1 && f.file_path === filename
          );
          if (!alreadyFound) {
            findings.push({
              vulnerability_type: rule.name,
              severity: rule.severity,
              cvss_score: rule.cvss,
              impact_score: rule.impact,
              file_path: filename,
              line_number: index + 1,
              snippet: testLine.trim().slice(0, 200),
              description: rule.description,
              remediation: rule.remediation,
              category: rule.category,
            });
          }
          break; // Stop testing other patterns for this rule on this line
        }
      }
    }
  });

  return findings;
}

/**
 * Scans all PR files and computes composite security risk score.
 *
 * @param {Array<object>} prFiles - Array of PR file objects (with .filename and .patch)
 * @returns {object} { vulnerabilities, security_risk_score, has_critical, total_cvss }
 */
function scanPRFiles(prFiles = []) {
  const allVulnerabilities = [];

  for (const file of prFiles) {
    const filename = file.filename || 'unknown';
    // Use patch if available, or file content
    const content = file.patch || file.content || '';
    if (content) {
      const findings = scanContent(content, filename);
      allVulnerabilities.push(...findings);
    }
  }

  // Calculate composite security score
  let baseSecurityScore = 0;
  let hasCritical = false;

  for (const vuln of allVulnerabilities) {
    baseSecurityScore += (vuln.impact_score || 20);
    if (vuln.severity === 'CRITICAL' || vuln.cvss_score >= 9.0) {
      hasCritical = true;
    }
  }

  // If any critical vulnerability exists, ensure security risk score is at least 90%
  if (hasCritical) {
    baseSecurityScore = Math.max(90, baseSecurityScore);
  }

  // Cap at 98% (allowing 2% margin)
  const securityRiskScore = Math.min(98, Math.round(baseSecurityScore));

  return {
    vulnerabilities: allVulnerabilities,
    security_risk_score: securityRiskScore,
    has_critical: hasCritical,
    vulnerability_count: allVulnerabilities.length,
  };
}

module.exports = {
  scanContent,
  scanPRFiles,
  VULNERABILITY_RULES,
};
