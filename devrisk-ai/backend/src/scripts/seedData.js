// ============================================================
// DevRisk AI — Database Seeder Script
// ============================================================
// Populates PostgreSQL with realistic development repositories,
// Pull Requests (HIGH, MEDIUM, and LOW risk), complete AST
// dependency graphs, 14 change metrics, and SHAP explanations.
// ============================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'raren',
  database: process.env.PG_DATABASE || 'devrisk_ai',
});

async function seed() {
  console.log('============================================');
  console.log('   DevRisk AI — Seeding Database');
  console.log('============================================');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get or create primary user
    const bcrypt = require('bcryptjs');
    const demoPasswordHash = await bcrypt.hash('password123', 10);

    let userRes = await client.query('SELECT id FROM users LIMIT 1');
    let userId;
    if (userRes.rows.length === 0) {
      const newUser = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name)
        VALUES ('Honrao', 'rupeshhonrao88@gmail.com', $1, 'Rupesh Honrao')
        RETURNING id
      `, [demoPasswordHash]);
      userId = newUser.rows[0].id;
      console.log(`[Seed] Created primary user (ID: ${userId})`);
    } else {
      userId = userRes.rows[0].id;
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [demoPasswordHash, userId]);
      console.log(`[Seed] Using existing user (ID: ${userId}) — password reset to password123`);
    }

    // 2. Insert or update core repository
    const repoRes = await client.query(`
      INSERT INTO repositories (user_id, github_url, name, owner, language)
      VALUES ($1, 'https://github.com/Rupesh5988/DevRisk-AI', 'DevRisk-AI', 'Rupesh5988', 'JavaScript')
      ON CONFLICT (user_id, github_url) DO UPDATE
      SET name = 'DevRisk-AI', owner = 'Rupesh5988', language = 'JavaScript'
      RETURNING id
    `, [userId]);
    const mainRepoId = repoRes.rows[0].id;

    // Additional repo for microservices
    const repo2Res = await client.query(`
      INSERT INTO repositories (user_id, github_url, name, owner, language)
      VALUES ($1, 'https://github.com/Rupesh5988/Ecommerce-Microservices', 'Ecommerce-Microservices', 'Rupesh5988', 'TypeScript')
      ON CONFLICT (user_id, github_url) DO UPDATE
      SET name = 'Ecommerce-Microservices', owner = 'Rupesh5988', language = 'TypeScript'
      RETURNING id
    `, [userId]);
    const serviceRepoId = repo2Res.rows[0].id;

    console.log(`[Seed] Repositories ready: DevRisk-AI (ID: ${mainRepoId}), Ecommerce-Microservices (ID: ${serviceRepoId})`);

    // 3. Define Seed Pull Requests
    const prSeedData = [
      {
        repo_id: mainRepoId,
        pr_number: 101,
        title: 'Refactor Core JWT Authentication and Session Management',
        author: 'juniordev_alex',
        risk_score: 84.5,
        risk_label: 'HIGH',
        additions: 420,
        deletions: 115,
        files_changed: 8,
        status: 'open',
        github_url: 'https://github.com/Rupesh5988/DevRisk-AI/pull/101',
        features: {
          ns: 5, nd: 4, nf: 8, entropy: 1.65, la: 420, ld: 115, lt: 750,
          fix: 1, ndev: 12, age: 140, nuc: 18, exp: 3, rexp: 1, sexp: 0
        },
        edges: [
          { source: 'src/controllers/authController.js', target: 'src/services/authService.js' },
          { source: 'src/services/authService.js', target: 'src/models/userModel.js' },
          { source: 'src/services/authService.js', target: 'src/utils/tokenHelper.js' },
          { source: 'src/models/userModel.js', target: 'src/config/database.js' },
          { source: 'src/controllers/userController.js', target: 'src/services/authService.js' },
          { source: 'src/middleware/authMiddleware.js', target: 'src/utils/tokenHelper.js' },
          { source: 'src/routes/authRoutes.js', target: 'src/controllers/authController.js' }
        ],
        explanations: [
          { name: 'fix', shap: 2.5607, val: 1.0, exp: 'This is a bug-fix commit touching core security logic — elevated regression risk' },
          { name: 'exp', shap: 1.8214, val: 3.0, exp: 'Developer has only 3 prior commits — limited experience with this repository' },
          { name: 'entropy', shap: 1.4502, val: 1.65, exp: 'Edits are scattered unevenly across multiple sensitive subsystems (entropy: 1.65)' },
          { name: 'la', shap: 1.1235, val: 420.0, exp: '420 lines added — large addition in security critical path' },
          { name: 'sexp', shap: 0.9421, val: 0.0, exp: 'Developer has zero prior commits to the authentication subsystem' }
        ]
      },
      {
        repo_id: mainRepoId,
        pr_number: 102,
        title: 'Integrate Stripe Webhook & Payment Routing Engine',
        author: 'sarah_backend',
        risk_score: 54.2,
        risk_label: 'MEDIUM',
        additions: 180,
        deletions: 45,
        files_changed: 4,
        status: 'open',
        github_url: 'https://github.com/Rupesh5988/DevRisk-AI/pull/102',
        features: {
          ns: 2, nd: 2, nf: 4, entropy: 0.85, la: 180, ld: 45, lt: 420,
          fix: 0, ndev: 4, age: 45, nuc: 6, exp: 25, rexp: 8, sexp: 4
        },
        edges: [
          { source: 'src/controllers/paymentController.js', target: 'src/services/stripeService.js' },
          { source: 'src/services/stripeService.js', target: 'src/config/stripeConfig.js' },
          { source: 'src/controllers/orderController.js', target: 'src/services/stripeService.js' },
          { source: 'src/services/stripeService.js', target: 'src/utils/logger.js' }
        ],
        explanations: [
          { name: 'la', shap: 0.9521, val: 180.0, exp: '180 lines added to external financial processing module' },
          { name: 'exp', shap: -0.7812, val: 25.0, exp: 'Developer has 25 prior commits — established domain familiarity' },
          { name: 'ns', shap: 0.6514, val: 2.0, exp: 'Touches 2 subsystems: order management and external billing' },
          { name: 'fix', shap: -0.5210, val: 0.0, exp: 'New feature integration — not patching an active regression' }
        ]
      },
      {
        repo_id: mainRepoId,
        pr_number: 103,
        title: 'Update API Documentation, Readme and Fix Header Typo',
        author: 'docs_contributor',
        risk_score: 12.4,
        risk_label: 'LOW',
        additions: 15,
        deletions: 4,
        files_changed: 2,
        status: 'closed',
        github_url: 'https://github.com/Rupesh5988/DevRisk-AI/pull/103',
        features: {
          ns: 1, nd: 1, nf: 2, entropy: 0.20, la: 15, ld: 4, lt: 120,
          fix: 0, ndev: 2, age: 8, nuc: 1, exp: 40, rexp: 12, sexp: 10
        },
        edges: [
          { source: 'docs/apiGuide.js', target: 'src/utils/constants.js' }
        ],
        explanations: [
          { name: 'la', shap: -1.2514, val: 15.0, exp: 'Only 15 lines modified — minimal risk surface' },
          { name: 'nf', shap: -0.9821, val: 2.0, exp: 'Only 2 files changed — tightly scoped modification' },
          { name: 'fix', shap: -0.8510, val: 0.0, exp: 'Non-fix documentation update — zero regression hazard' }
        ]
      },
      {
        repo_id: serviceRepoId,
        pr_number: 201,
        title: 'Migrate Database Pool to Distributed Read-Replicas',
        author: 'db_architect',
        risk_score: 79.1,
        risk_label: 'HIGH',
        additions: 310,
        deletions: 240,
        files_changed: 6,
        status: 'open',
        github_url: 'https://github.com/Rupesh5988/Ecommerce-Microservices/pull/201',
        features: {
          ns: 4, nd: 3, nf: 6, entropy: 1.40, la: 310, ld: 240, lt: 1100,
          fix: 1, ndev: 9, age: 210, nuc: 22, exp: 15, rexp: 3, sexp: 1
        },
        edges: [
          { source: 'src/config/database.js', target: 'src/utils/logger.js' },
          { source: 'src/models/userModel.js', target: 'src/config/database.js' },
          { source: 'src/models/orderModel.js', target: 'src/config/database.js' },
          { source: 'src/services/healthCheck.js', target: 'src/config/database.js' }
        ],
        explanations: [
          { name: 'ld', shap: 2.1524, val: 240.0, exp: 'Large deletion (240 lines) in core database connection manager' },
          { name: 'entropy', shap: 1.3412, val: 1.40, exp: 'Broad cross-service coupling touched across 4 subsystems' },
          { name: 'age', shap: 1.1205, val: 210.0, exp: 'Modified files have not been touched in ~210 days — fragile legacy logic' }
        ]
      },
      {
        repo_id: serviceRepoId,
        pr_number: 202,
        title: 'Implement Redis Caching Layer for Profile Endpoints',
        author: 'alex_senior',
        risk_score: 48.7,
        risk_label: 'MEDIUM',
        additions: 95,
        deletions: 20,
        files_changed: 3,
        status: 'open',
        github_url: 'https://github.com/Rupesh5988/Ecommerce-Microservices/pull/202',
        features: {
          ns: 2, nd: 2, nf: 3, entropy: 0.70, la: 95, ld: 20, lt: 310,
          fix: 0, ndev: 5, age: 30, nuc: 4, exp: 18, rexp: 5, sexp: 2
        },
        edges: [
          { source: 'src/services/cacheService.js', target: 'src/config/redisConfig.js' },
          { source: 'src/controllers/userController.js', target: 'src/services/cacheService.js' }
        ],
        explanations: [
          { name: 'la', shap: 0.4210, val: 95.0, exp: 'Moderate additions (95 lines) to caching service' },
          { name: 'exp', shap: -0.5610, val: 18.0, exp: 'Author has solid experience across the codebase' }
        ]
      },
      {
        repo_id: mainRepoId,
        pr_number: 104,
        title: 'Add Unit & Integration Test Suite for User Validation',
        author: 'qa_lead',
        risk_score: 18.3,
        risk_label: 'LOW',
        additions: 120,
        deletions: 10,
        files_changed: 3,
        status: 'merged',
        github_url: 'https://github.com/Rupesh5988/DevRisk-AI/pull/104',
        features: {
          ns: 1, nd: 1, nf: 3, entropy: 0.40, la: 120, ld: 10, lt: 250,
          fix: 0, ndev: 3, age: 12, nuc: 2, exp: 60, rexp: 20, sexp: 15
        },
        edges: [
          { source: 'tests/userValidation.test.js', target: 'src/utils/validator.js' },
          { source: 'tests/userValidation.test.js', target: 'src/models/userModel.js' }
        ],
        explanations: [
          { name: 'exp', shap: -1.3410, val: 60.0, exp: 'Author is a top contributor with 60 commits' },
          { name: 'entropy', shap: -0.7210, val: 0.40, exp: 'Edits are isolated cleanly in the test directory' }
        ]
      }
    ];

    for (const prData of prSeedData) {
      // Upsert PR
      const prRes = await client.query(`
        INSERT INTO pull_requests (repo_id, pr_number, title, author, risk_score, risk_label,
                                   additions, deletions, files_changed, status, github_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (repo_id, pr_number) DO UPDATE
        SET title = $3, author = $4, risk_score = $5, risk_label = $6,
            additions = $7, deletions = $8, files_changed = $9, status = $10, github_url = $11
        RETURNING id
      `, [
        prData.repo_id, prData.pr_number, prData.title, prData.author,
        prData.risk_score, prData.risk_label, prData.additions, prData.deletions,
        prData.files_changed, prData.status, prData.github_url
      ]);
      const prId = prRes.rows[0].id;

      // Upsert Features
      const f = prData.features;
      await client.query(`
        INSERT INTO pr_features (pr_id, ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (pr_id) DO UPDATE
        SET ns = $2, nd = $3, nf = $4, entropy = $5, la = $6, ld = $7, lt = $8,
            fix = $9, ndev = $10, age = $11, nuc = $12, exp = $13, rexp = $14, sexp = $15
      `, [prId, f.ns, f.nd, f.nf, f.entropy, f.la, f.ld, f.lt, f.fix, f.ndev, f.age, f.nuc, f.exp, f.rexp, f.sexp]);

      // Insert Dependency Edges
      await client.query('DELETE FROM dependency_edges WHERE pr_id = $1', [prId]);
      for (const edge of prData.edges) {
        await client.query(`
          INSERT INTO dependency_edges (repo_id, pr_id, source_file, target_file)
          VALUES ($1, $2, $3, $4)
        `, [prData.repo_id, prId, edge.source, edge.target]);
      }

      // Insert SHAP Explanations
      await client.query('DELETE FROM shap_explanations WHERE pr_id = $1', [prId]);
      for (const exp of prData.explanations) {
        await client.query(`
          INSERT INTO shap_explanations (pr_id, feature_name, shap_value, feature_value, explanation)
          VALUES ($1, $2, $3, $4, $5)
        `, [prId, exp.name, exp.shap, exp.val, exp.exp]);
      }

      console.log(`  ✅ Seeded PR #${prData.pr_number}: ${prData.title} (${prData.risk_label} - ${prData.risk_score}%) with ${prData.edges.length} edges`);
    }

    await client.query('COMMIT');
    console.log('============================================');
    console.log('   🎉 Database Seeding Complete!');
    console.log('============================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] ❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
