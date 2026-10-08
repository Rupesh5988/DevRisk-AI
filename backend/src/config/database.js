// ============================================================
// PostgreSQL Connection Pool & Table Initialization
// ============================================================
// Uses the 'pg' library directly (no ORM) for full SQL control.
// On first run, creates all required tables if they don't exist.
// ============================================================

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'devrisk_ai',
});

// Log connection events
pool.on('connect', () => {
  console.log('[PostgreSQL] Client connected to pool');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

/**
 * Creates all required tables if they do not already exist.
 * Called once on server startup.
 */
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(100) NOT NULL UNIQUE,
        email         VARCHAR(200) NOT NULL UNIQUE,
        password_hash VARCHAR(200) NOT NULL,
        full_name     VARCHAR(200),
        github_token  VARCHAR(500),
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // 1. Repositories table (linked to users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        github_url  VARCHAR(500) NOT NULL,
        name        VARCHAR(200) NOT NULL,
        owner       VARCHAR(200) NOT NULL,
        language    VARCHAR(50),
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, github_url)
      );
    `);

    // 2. Pull Requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pull_requests (
        id              SERIAL PRIMARY KEY,
        repo_id         INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        pr_number       INTEGER NOT NULL,
        title           VARCHAR(500),
        author          VARCHAR(200),
        risk_score      FLOAT,
        risk_label      VARCHAR(20),
        additions       INTEGER DEFAULT 0,
        deletions       INTEGER DEFAULT 0,
        files_changed   INTEGER DEFAULT 0,
        status          VARCHAR(20) DEFAULT 'open',
        github_url      VARCHAR(500),
        created_at      TIMESTAMP DEFAULT NOW(),
        UNIQUE(repo_id, pr_number)
      );
    `);

    // 3. PR Features table (the 14 ApacheJIT features)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pr_features (
        id      SERIAL PRIMARY KEY,
        pr_id   INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE UNIQUE,
        ns      FLOAT DEFAULT 0,
        nd      FLOAT DEFAULT 0,
        nf      FLOAT DEFAULT 0,
        entropy FLOAT DEFAULT 0,
        la      FLOAT DEFAULT 0,
        ld      FLOAT DEFAULT 0,
        lt      FLOAT DEFAULT 0,
        fix     FLOAT DEFAULT 0,
        ndev    FLOAT DEFAULT 0,
        age     FLOAT DEFAULT 0,
        nuc     FLOAT DEFAULT 0,
        exp     FLOAT DEFAULT 0,
        rexp    FLOAT DEFAULT 0,
        sexp    FLOAT DEFAULT 0
      );
    `);

    // 4. SHAP Explanations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shap_explanations (
        id              SERIAL PRIMARY KEY,
        pr_id           INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
        feature_name    VARCHAR(50) NOT NULL,
        shap_value      FLOAT NOT NULL,
        feature_value   FLOAT,
        explanation     TEXT
      );
    `);

    // 5. Dependency Edges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dependency_edges (
        id          SERIAL PRIMARY KEY,
        repo_id     INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        pr_id       INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
        source_file VARCHAR(500) NOT NULL,
        target_file VARCHAR(500) NOT NULL
      );
    `);

    // 6. Ground Truth Records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ground_truth_records (
        id                        SERIAL PRIMARY KEY,
        pr_id                     INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
        repository_id             INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        commit_sha                VARCHAR(200),
        ground_truth_status       VARCHAR(30) DEFAULT 'PENDING',
        confidence                VARCHAR(20) DEFAULT 'INSUFFICIENT',
        observation_window_days   INTEGER DEFAULT 180,
        method                    VARCHAR(100) DEFAULT 'SZZ+GITHUB',
        determined_at             TIMESTAMP,
        created_at                TIMESTAMP DEFAULT NOW(),
        updated_at                TIMESTAMP DEFAULT NOW(),
        UNIQUE(pr_id)
      );
    `);

    // 7. Ground Truth Evidence table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ground_truth_evidence (
        id                SERIAL PRIMARY KEY,
        ground_truth_id   INTEGER REFERENCES ground_truth_records(id) ON DELETE CASCADE,
        evidence_type     VARCHAR(50) NOT NULL,
        source_commit_sha VARCHAR(200),
        source_issue_id   VARCHAR(200),
        source_pr_id      VARCHAR(200),
        file_path         VARCHAR(500),
        line_reference    VARCHAR(200),
        description       TEXT,
        strength          VARCHAR(20) DEFAULT 'LOW',
        created_at        TIMESTAMP DEFAULT NOW()
      );
    `);

    // 8. Prediction Evaluations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prediction_evaluations (
        id                       SERIAL PRIMARY KEY,
        pr_id                    INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
        prediction               VARCHAR(20),
        ground_truth             VARCHAR(30),
        evaluation_result        VARCHAR(30) DEFAULT 'NOT_EVALUATED',
        model_version            VARCHAR(100),
        prediction_timestamp     TIMESTAMP,
        ground_truth_timestamp   TIMESTAMP,
        risk_score               FLOAT,
        created_at               TIMESTAMP DEFAULT NOW(),
        UNIQUE(pr_id)
      );
    `);

    // 9. Explanation Evaluations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS explanation_evaluations (
        id                 SERIAL PRIMARY KEY,
        pr_id              INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
        model_version      VARCHAR(100),
        additivity_error   FLOAT,
        faithfulness_score FLOAT,
        stability_score    FLOAT,
        top_k_features     TEXT,
        evaluation_status  VARCHAR(30) DEFAULT 'PENDING',
        created_at         TIMESTAMP DEFAULT NOW(),
        UNIQUE(pr_id)
      );
    `);

    await client.query('COMMIT');
    console.log('[PostgreSQL] All tables initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Table initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeTables };
