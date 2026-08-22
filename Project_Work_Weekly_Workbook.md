# Walchand College of Engineering, Sangli
### (Government Aided Autonomous Institute)
### Department of Computer Science and Engineering

---

# B.Tech Project Work — Weekly Progress Workbook (6 Weeks)

**Project Title:** DevRisk AI: Predicting Risky Code Changes in Pull Requests using Machine Learning  
**Degree:** Bachelor of Technology in Computer Science and Engineering  
**Academic Year:** 2026–2027  
**Under the Guidance of:** Mr. Abhijeet Urunkar, Assistant Professor  

### Project Team Members
| No. | Student Name | PRN |
|---|---|---|
| 1 | **Rupesh Honrao** | 23510010 |
| 2 | **Mayur Bambale** | 23510014 |
| 3 | **Adarsh Singh** | 23510022 |
| 4 | **Dinesh Yuvnate** | 23510036 |

---

## Executive Summary & Project Overview

**DevRisk AI** is an enterprise-grade Just-In-Time (JIT) defect prediction and code quality intelligence platform. Modern continuous integration and deployment (CI/CD) pipelines rely heavily on Pull Requests (PRs) submitted to version control platforms such as GitHub. However, manual code reviews suffer from reviewer fatigue, cognitive overload, and lack of historical context, allowing high-risk bugs to slip into production.

DevRisk AI resolves this by automatically analyzing code change patterns at the moment a Pull Request is opened or synchronized. It extracts **14 foundational change-pattern metrics** across diffusion, size, developer history, and file maturity dimensions, transforms them via a **Stacked Machine Learning Ensemble (XGBoost + HistGradientBoosting + Logistic Regression meta-learner)**, computes **Isotonic probability calibration**, determines **cost-optimized risk thresholds**, generates **SHAP (SHapley Additive exPlanations)** attribution factors, and builds **AST-level cross-file dependency graphs**.

A flagship capability of DevRisk AI is its **Private Repository Integration Engine**, allowing development teams to seamlessly monitor confidential, proprietary codebases via secure webhook tunnels (ngrok reverse proxying), fine-grained GitHub Personal Access Tokens (PAT), and HMAC-SHA256 payload verification.

---

```
                                 ========================================
                                     DEVRISK AI SYSTEM ARCHITECTURE
                                 ========================================

 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   GITHUB CLOUD / ENTERPRISE                               │
 │                                                                                           │
 │   ┌────────────────────────┐      Webhook Event (POST)      ┌─────────────────────────┐  │
 │   │  Private / Public Repo │ ──────────────────────────────► │  Reverse Proxy Tunnel   │  │
 │   │  (PR Open/Sync/Reopen) │  [HMAC-SHA256 Signed Payload]   │  (ngrok / Custom Domain)│  │
 │   └────────────────────────┘                                └────────────┬────────────┘  │
 └──────────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                            │ Forwarded HTTP POST
                                                                            ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │                            DEVRISK AI BACKEND (Node.js / Express)                         │
 │                                                                                           │
 │   ┌────────────────────────┐        ┌──────────────────────┐       ┌──────────────────┐  │
 │   │ Webhook Route Handler  │ ─────► │ HMAC-SHA256 Signature│ ────► │ Event Dispatcher │  │
 │   │  (/api/webhook)        │        │ Verification Engine  │       │ (Filter PRs only)│  │
 │   └────────────────────────┘        └──────────────────────┘       └────────┬─────────┘  │
 │                                                                             │             │
 │   ┌────────────────────────┐        ┌──────────────────────┐                │             │
 │   │ AST Dependency Parser  │ ◄───── │ GitHub API Connector │ ◄──────────────┘             │
 │   │ (Babel / Static Import)│        │ (PAT Bearer Token)   │ (Fetch Private Diffs/Files)  │
 │   └───────────┬────────────┘        └──────────┬───────────┘                              │
 │               │                                │                                          │
 │               │                     ┌──────────▼───────────┐                              │
 │               │                     │ 14-Feature Extractor │                              │
 │               │                     │ (Kamei et al. Model) │                              │
 │               │                     └──────────┬───────────┘                              │
 └───────────────┼────────────────────────────────┼──────────────────────────────────────────┘
                 │                                │ REST Request (Features JSON)
                 │                                ▼
 ┌───────────────┼───────────────────────────────────────────────────────────────────────────┐
 │               │                   PYTHON ML SERVICE (FastAPI / Uvicorn)                   │
 │               │                                                                           │
 │               │    ┌────────────────────────────────────────────────────────────────┐     │
 │               │    │ Stacked Classifier: XGBoost + HistGradientBoosting             │     │
 │               │    │ Meta-Learner: Balanced Logistic Regression                     │     │
 │               │    │ Probability Calibrator: CalibratedClassifierCV (Isotonic)      │     │
 │               │    │ Cost-Sensitive Decision Boundary: Optimal Threshold = 0.34     │     │
 │               │    └───────────────────────────────┬────────────────────────────────┘     │
 │               │                                    │                                      │
 │               │                     ┌──────────────▼─────────────┐                        │
 │               │                     │ TreeSHAP Explainer Engine  │                        │
 │               │                     │ (Feature Attribution List) │                        │
 │               │                     └──────────────┬─────────────┘                        │
 └───────────────┼────────────────────────────────────┼──────────────────────────────────────┘
                 │                                    │ Risk Score + SHAP Vector
                 ▼                                    ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │                               PERSISTENCE & PRESENTATION LAYER                            │
 │                                                                                           │
 │   ┌───────────────────────────────────────────────────────┐                               │
 │   │ PostgreSQL Database (Multi-Tenant Schema)             │                               │
 │   │ [repositories, pull_requests, pr_features,            │                               │
 │   │  shap_explanations, dependency_edges, users]          │                               │
 │   └───────────────────────────┬───────────────────────────┘                               │
 │                               │ Real-Time API Data Sync                                   │
 │                               ▼                                                           │
 │   ┌───────────────────────────────────────────────────────┐                               │
 │   │ React 18 SPA Frontend (Vite + Glassmorphism UI)       │                               │
 │   │ • Animated Precision Risk Gauge (0.1% resolution)     │                               │
 │   │ • SHAP Contribution Factor Cards (Ranked & Direction) │                               │
 │   │ • Interactive React Flow Dependency Graph Canvas      │                               │
 │   │ • Repository Health Analytics & Trend Monitoring      │                               │
 │   └───────────────────────────────────────────────────────┘                               │
 └───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Weekly Progress Breakdown (Weeks 1 to 6)

---

## WEEK 1: Requirements Gathering, Literature Review & Metric Extraction Architecture

### 1.1 Objectives of the Week
* Comprehensively study Just-In-Time (JIT) defect prediction literature, state-of-the-art benchmarks, and change-level metrics.
* Acquire, audit, and clean the multi-project **ApacheJIT dataset** (106,674 historical commit/PR records).
* Define the 14-metric change taxonomy and design the high-level distributed microservice architecture.

### 1.2 Planned Activities
* Conduct formal literature survey on foundational works: Kamei et al. (IEEE TSE 2013), McIntosh et al. (MSR 2014), and Kondo et al. (EMSE 2020).
* Analyze data distribution, class imbalances, and schema attributes of `apachejit_combined.csv`.
* Formulate system requirements specification (SRS) for real-time GitHub integration and local inference.
* Set up version control repository, project directory structure, and virtual environments.

### 1.3 Work Done & Technical Implementation
* **Literature Review & Metric Formalization:** Extracted and formalized the mathematical definitions of the 14 change metrics grouped into 5 distinct dimensions:
  1. **Diffusion Metrics:**
     * `ns` (Number of Subsystems modified)
     * `nd` (Number of Directories modified)
     * `nf` (Number of modified Files)
     * `entropy` ($-\sum_{i=1}^{n} p_i \log_2 p_i$, measuring the distribution and dispersion of change across files)
  2. **Size & Churn Metrics:**
     * `la` (Lines of Code Added)
     * `ld` (Lines of Code Deleted)
     * `lt` (Lines of Code in modified files prior to change)
     * `churn_density` ($\frac{la + ld}{lt + 1}$)
     * `churn_intensity` ($\frac{la + ld}{nf}$)
  3. **Purpose Metric:**
     * `fix` (Binary flag indicating whether commit message contains bug-fix keywords: *fix, bug, defect, patch*)
  4. **Developer Experience Metrics:**
     * `ndev` (Count of prior unique developers who touched the modified files)
     * `age` (Average time elapsed in days since files were last modified)
     * `nuc` (Number of unique changes previously made to these files)
     * `exp` (Geometric developer experience across repository)
     * `rexp` (Recent developer experience weighted by recency decay)
     * `sexp` (Subsystem-specific developer experience)
* **Dataset Preprocessing:** Loaded the 106,674 commit records from the Apache foundation repository corpus. Addressed zero-variance features, verified column sanity, and computed class imbalance ratio ($\approx 2.78:1$ majority negative to positive defect ratio).
* **Architecture Design:** Established three decoupled sub-systems:
  1. `frontend/`: React 18 single-page application.
  2. `backend/`: Node.js Express server handling webhooks, GitHub API interaction, and PostgreSQL storage.
  3. `ml-service/`: Python FastAPI service hosting serialized stacking models and SHAP explainability pipelines.

### 1.4 Challenges Encountered & Solutions
* *Challenge:* Discrepancies between raw repository column names (`aexp`, `arexp`, `asexp`, `ent`) across disparate dataset dumps.
* *Solution:* Built a standardized feature schema converter and aligned the pipeline with `apachejit_combined.csv` ensuring zero feature drift between training and production inference.

### 1.5 Deliverables of Week 1
* Comprehensive Literature Review Matrix and Problem Statement document.
* Cleaned and verified dataset (`apachejit_combined.csv`, 106k rows).
* Initial repository skeleton and architectural blueprint.

---

## WEEK 2: Advanced Machine Learning Pipeline, Stacking Ensemble, Calibration & SHAP Explainability

### 2.1 Objectives of the Week
* Construct a production-grade machine learning training pipeline avoiding data leakage.
* Build a Heterogeneous Stacking Ensemble Classifier combining Tree-based gradient boosting models.
* Implement Cost-Sensitive Decision Boundary optimization to prioritize defect recall.
* Integrate Isotonic Probability Calibration and TreeSHAP feature attribution.

### 2.2 Planned Activities
* Formulate temporal walk-forward validation strategy (`TimeSeriesSplit`) to prevent temporal data leakage.
* Develop hyperparameter tuning using Optuna targeting asymmetric economic loss functions.
* Implement `StackingClassifier` pairing XGBoost and Scikit-Learn's `HistGradientBoostingClassifier` with a `LogisticRegression` meta-learner.
* Calibrate output probabilities using Isotonic Regression (`CalibratedClassifierCV`).
* Generate local and global feature explanations using `shap.TreeExplainer`.

### 2.3 Work Done & Technical Implementation
* **Temporal Validation Strategy:** Avoided standard K-Fold cross-validation (which creates future-data leakage in version control time-series) by implementing a 5-fold Walk-Forward `TimeSeriesSplit` on chronological commit history.
* **Heterogeneous Stacking Architecture:**
  * **Base Estimator 1 (XGBoost):** Handles non-linear feature interactions, missing values, and tree-based gradient optimization (`max_depth=5`, `learning_rate=0.05`, `n_estimators=300`, `scale_pos_weight=2.78`).
  * **Base Estimator 2 (HistGradientBoostingClassifier):** Native Scikit-Learn histogram-binned gradient boosting model providing structural diversity and complete isolation from OS-level AppLocker DLL blocks.
  * **Meta-Learner (Logistic Regression):** Fits optimal stacking weights across base model probability estimates with balanced class weights.
* **Cost-Sensitive Asymmetric Loss Optimization:** In software engineering, the cost of a False Negative (a missed bug shipping to production) is approximately $5\times$ more expensive than a False Positive (a developer spending 2 minutes doing extra review on clean code).
  $$\text{Total Cost} = (C_{FN} \times FN) + (C_{FP} \times FP) \quad \text{where } C_{FN}=5.0, \; C_{FP}=1.0$$
  By iterating through the decision thresholds from 0.01 to 0.99, the pipeline dynamically discovered the **Global Cost Minimum at Threshold = 0.34**, achieving an **11.4% cost reduction** compared to the unoptimized 0.50 threshold.
* **Model Calibration:** Wrapped the stacked model in `CalibratedClassifierCV(method='isotonic', cv='prefit')`, ensuring that a predicted score of 70% truly corresponds to a 70% empirical probability of bug introduction.
* **SHAP Explainability Engine:** Built a real-time `TreeSHAP` wrapper extracting base XGBoost tree weights, computing exact Shapley values $\phi_i$ for each incoming PR:
  $$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i$$
  Top risk contributors identified: `fix` (prior bug-fix status), `la` (lines added), `la_ratio`, `lt` (file size), and `churn_intensity`.

```
============================================================
  DevRisk AI — Model Performance Benchmark Results
============================================================
  • Walk-Forward CV AUC-ROC : 0.8572 ± 0.0216
  • Test Set AUC-ROC        : 0.8570
  • Defect Recall           : 69.66% (at optimal threshold 0.34)
  • Accuracy                : 81.87%
  • F1 Score                : 0.5504
  • Total Cost Reduction    : 11.4% over standard baseline
============================================================
```

### 2.4 Challenges Encountered & Solutions
* *Challenge:* Windows Defender Application Control (AppLocker) raised `OSError: [WinError 4551] An Application Control policy has blocked this file` when loading `lib_lightgbm.dll`.
* *Solution:* Eliminated LightGBM dependency and replaced it with `HistGradientBoostingClassifier`, preserving high gradient-boosted ensemble accuracy while ensuring 100% pure Python/Scikit-Learn platform independence.

### 2.5 Deliverables of Week 2
* Standalone ML training script (`train_model.py`) and Optuna tuner (`scripts/optimize_optuna.py`).
* Serialized production model artifacts: `devrisk_stacked_model.joblib`, `devrisk_calibrator.joblib`, `scaler.joblib`, and `shap_explainer.joblib`.
* Quantitative validation suite: `prove_calibration.py`, `prove_cost_savings.py`, and `prove_live_inference.py`.

---

## WEEK 3: Backend REST API Architecture, PostgreSQL Schema Design & Microservice Integration

### 3.1 Objectives of the Week
* Build the core Node.js/Express application server handling client interactions and webhook ingestion.
* Design a relational database schema in PostgreSQL supporting multi-tenancy, PR metrics, SHAP explanations, and dependency edges.
* Implement user authentication with JWT tokens and bcrypt password hashing.
* Create a microservice bridge connecting Node.js with the Python FastAPI ML engine.

### 3.2 Planned Activities
* Design PostgreSQL Entity-Relationship (ER) model with foreign key constraints, unique indexing, and cascade rules.
* Implement connection pooling using `pg` library with transactional support (`BEGIN`, `COMMIT`, `ROLLBACK`).
* Develop modular controller-service-route architectural layers in Node.js.
* Build the Python FastAPI server exposing `/predict` and `/explain` endpoints.

### 3.3 Work Done & Technical Implementation
* **Database Schema Implementation:** Implemented a structured relational schema in PostgreSQL (`devrisk_ai` database):
  * `users`: `id (SERIAL PK)`, `username (UNIQUE)`, `email (UNIQUE)`, `password_hash`, `full_name`, `created_at`.
  * `repositories`: `id (SERIAL PK)`, `github_url (UNIQUE)`, `name`, `owner`, `language`, `created_at`.
  * `pull_requests`: `id (SERIAL PK)`, `repo_id (FK)`, `pr_number`, `title`, `author`, `risk_score`, `risk_label`, `additions`, `deletions`, `files_changed`, `status`, `github_url`, `created_at`, `UNIQUE(repo_id, pr_number)`.
  * `pr_features`: `id (SERIAL PK)`, `pr_id (FK UNIQUE)`, columns for all 14 JIT metrics (`ns`, `nd`, `nf`, `entropy`, `la`, `ld`, `lt`, `fix`, `ndev`, `age`, `nuc`, `exp`, `rexp`, `sexp`).
  * `shap_explanations`: `id (SERIAL PK)`, `pr_id (FK)`, `feature_name`, `shap_value`, `feature_value`, `explanation`.
  * `dependency_edges`: `id (SERIAL PK)`, `repo_id (FK)`, `pr_id (FK)`, `source_file`, `target_file`.
* **FastAPI ML Microservice (`ml-service/app/main.py`):**
  * `POST /predict`: Receives feature vector JSON, validates input with Pydantic schemas, runs calibrated inference, applies the 0.34 threshold, and returns `risk_score`, `risk_label (LOW / MEDIUM / HIGH)`, and `is_risky (boolean)`.
  * `POST /explain`: Computes SHAP values $\phi_i$ and generates human-readable explanations (e.g., *"High lines added (+450) increased risk by +18.2%"*).
  * `GET /health`: Microservice liveness and model verification probe.
* **Backend API Controller Layer:**
  * `authController.js`: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
  * `prController.js`: `/api/prs`, `/api/prs/:id`, `/api/prs/stats`.
  * `repoController.js`: `/api/repos`, `/api/repos/:id`, `/api/repos/:id/prs`.
  * `analyticsController.js`: `/api/analytics/overview`, `/api/analytics/trends`.

### 3.4 Challenges Encountered & Solutions
* *Challenge:* Asynchronous database race conditions during concurrent PR updates for the same repository.
* *Solution:* Utilized PostgreSQL `UPSERT` operations (`ON CONFLICT (repo_id, pr_number) DO UPDATE SET...`) wrapped inside strict database transactions.

### 3.5 Deliverables of Week 3
* Complete PostgreSQL migration scripts and database pool manager (`backend/src/config/database.js`).
* Express REST API routing and controller suite.
* Fully functional Python FastAPI ML inference service with automated documentation (`/docs`).

---

## WEEK 4: Webhook Architecture, Real-Time Event Ingestion & Comprehensive Private Repository Integration

### 4.1 Objectives of the Week
* Architect a resilient real-time GitHub Webhook ingestion pipeline supporting both Public and Private repositories.
* Implement cryptographic HMAC-SHA256 signature verification for webhook authenticity.
* Establish secure reverse-proxy tunneling for local development environments using ngrok.
* Configure granular GitHub Personal Access Token (PAT) authentication for fetching private repository diffs, commits, and tree structures.

### 4.2 Planned Activities
* Build the webhook listener endpoint (`POST /api/webhook`) supporting sub-second acknowledgment (HTTP 202 Accepted) and asynchronous background processing.
* Integrate GitHub REST API connector using Axios/Octokit authenticated with Bearer PATs.
* Configure reverse tunneling via ngrok (`ngrok http 3001`) with authtoken binding.
* Test private repository PR synchronization, diff extraction, and feature calculation.

### 4.3 Work Done & Technical Implementation
* **Webhook Pipeline Architecture (`webhookController.js`):**
  1. **Immediate Acknowledgment:** GitHub enforces a 10-second webhook timeout. The endpoint parses headers (`x-github-event`, `x-github-delivery`, `x-hub-signature-256`), immediately issues `HTTP 202 Accepted`, and dispatches the heavy extraction and inference logic to a background async worker.
  2. **Event Filtering:** Safely filters incoming traffic, executing the defect prediction pipeline exclusively for `pull_request` events with actions `['opened', 'synchronize', 'reopened']`. All other events (pushes, issues, comments) are gracefully acknowledged and ignored without consuming ML resources.
* **Private Repository Access Engine (`githubService.js`):**
  * Configured Axios HTTP clients with `Authorization: Bearer <GITHUB_TOKEN>` headers.
  * Extracted PR metadata from `GET /repos/{owner}/{repo}/pulls/{pull_number}`.
  * Retrieved full file patch diffs from `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`.
  * Traversed historical commit logs from `GET /repos/{owner}/{repo}/commits` to compute author experience metrics (`exp`, `rexp`, `sexp`) across private codebase branches.

---

### 4.4 In-Depth Focus: How Private Repositories are Accessed and Used (Complete End-to-End User & Evaluator Guide)

#### Why Private Repositories Require Special Architecture
When an organization or developer hosts code in a **private GitHub repository**, two distinct technical barriers exist:
1. **Inbound Delivery Barrier:** GitHub's cloud servers cannot deliver webhook HTTP POST requests to `http://localhost:3001` because localhost resides on a private local area network (LAN) behind NAT and firewalls.
2. **Outbound Data Access Barrier:** When DevRisk AI receives a notification that a PR was opened in a private repo, standard unauthenticated API calls to fetch code diffs or commit histories will return `404 Not Found` or `401 Unauthorized`.

DevRisk AI solves both barriers through a synchronized dual-channel architecture:
* **Inbound Tunneling:** Uses an authenticated `ngrok` reverse proxy tunnel providing an HTTPS endpoint that forwards GitHub payloads directly into the local Express server.
* **Outbound Bearer Authentication:** Uses a fine-grained GitHub Personal Access Token (PAT) with `repo` scope stored securely in `.env` to pull private file patches and commit logs.

```
+---------------------------------------------------------------------------------------------------------+
|                                    PRIVATE REPOSITORY DATA FLOW                                         |
+---------------------------------------------------------------------------------------------------------+

  1. Developer opens PR in Private Repo (github.com/org/private-repo)
                        │
                        ▼
  2. GitHub Webhook triggers POST request with HMAC-SHA256 signature
     Target: https://down-observing-survival.ngrok-free.dev/api/webhook
                        │
                        ▼
  3. ngrok Cloud securely routes payload through active TLS tunnel to developer laptop (port 3001)
                        │
                        ▼
  4. Node.js Backend receives event at POST /api/webhook
     • Verifies HMAC Secret (my_secret_devrisk_123)
     • Checks event == 'pull_request' && action in ['opened', 'synchronize']
     • Returns HTTP 202 Accepted to GitHub in < 50ms
                        │
                        ▼
  5. Async Worker invokes githubService.js with Bearer GITHUB_TOKEN (ghp_...)
     • Calls GET https://api.github.com/repos/org/private-repo/pulls/1/files
     • Calls GET https://api.github.com/repos/org/private-repo/commits?author=...
     • Downloads raw private diffs, lines added/deleted, file ages, prior authors
                        │
                        ▼
  6. Feature Extractor calculates 14 JIT metrics (ns, nd, nf, entropy, la, ld, exp, etc.)
                        │
                        ▼
  7. Python ML Service predicts Risk Score (e.g. 78.4%) & generates SHAP attributions
                        │
                        ▼
  8. Database stores analysis & React Frontend reflects live metrics in real-time
```

---

#### Step-by-Step User Execution Guide: Setting Up a Private Repository

##### Step 1: Generate a GitHub Personal Access Token (PAT)
1. Log into your GitHub account and navigate to **Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **Personal access tokens** $\rightarrow$ **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. In the **Note** field, enter: `DevRisk AI Private Repo Connector`.
4. Under **Select scopes**, check the box for **`repo`** (Full control of private repositories, including private repository status, deployment, and code access).
5. Click **Generate token** and copy the generated token (e.g., `<YOUR_GITHUB_PAT>`).
6. Open your `backend/.env` file and insert:
   ```env
   GITHUB_TOKEN=<YOUR_GITHUB_PAT>
   GITHUB_WEBHOOK_SECRET=my_secret_devrisk_123
   ```

##### Step 2: Authenticate and Launch the ngrok Secure Reverse Tunnel
1. Open PowerShell and authenticate ngrok using your account authtoken:
   ```powershell
   ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
   ```
2. Start the HTTP reverse tunnel pointing to the DevRisk AI backend port (`3001`):
   ```powershell
   ngrok http 3001
   ```
3. Look at the terminal output for the active **Forwarding** URL:
   ```text
   Session Status      online
   Forwarding          https://down-observing-survival.ngrok-free.dev -> http://localhost:3001
   ```
4. Copy the public forwarding HTTPS URL.

##### Step 3: Configure the GitHub Webhook on the Private Repository
1. In your browser, open your private GitHub repository (e.g., `https://github.com/your-username/your-private-repo`).
2. Click **Settings** $\rightarrow$ **Webhooks** $\rightarrow$ **Add webhook**.
3. Configure the webhook settings:
   * **Payload URL:** `https://down-observing-survival.ngrok-free.dev/api/webhook`
   * **Content type:** `application/json` *(Crucial: Do not select `x-www-form-urlencoded`)*
   * **Secret:** `my_secret_devrisk_123` *(Must exactly match `GITHUB_WEBHOOK_SECRET` in `.env`)*
   * **SSL verification:** Keep **Enable SSL verification** selected.
   * **Which events would you like to trigger this webhook?:**
     * Select **"Let me select individual events"** and check **Pull requests**, OR select **"Send me everything"** (the backend automatically filters non-PR events).
   * **Active:** Ensure the checkbox is checked.
4. Click the green **Add webhook** button.

##### Step 4: Verify Live Ingestion
1. Start the DevRisk AI services:
   ```powershell
   # Terminal 1: ML Microservice
   cd "devrisk-ai/ml-service"
   python run.py

   # Terminal 2: Node.js Backend Server
   cd "devrisk-ai/backend"
   npm run dev

   # Terminal 3: React Frontend UI
   cd "devrisk-ai/frontend"
   npm run dev
   ```
2. In your private repository, create a new branch, modify a file, commit the change, and **open a Pull Request**.
3. Observe the `backend` terminal log:
   ```text
   [Webhook] Received event: pull_request, delivery: 7a82b-91d
   [Webhook] Processing PR #1 on your-username/your-private-repo
   [Webhook] PR #1: 3 files changed, +84/-12
   [ML Service] Prediction requested for PR #1 -> Output Risk: 64.2% (MEDIUM)
   [Webhook] ✅ PR #1 fully processed — Risk: 64.2% (MEDIUM RISK)
   ```
4. Open the DevRisk AI dashboard (`http://localhost:5173`) to view the real-time risk gauge, feature metrics, and SHAP explanation cards for your private PR.

---

### 4.5 Deliverables of Week 4
* Secure, verified webhook endpoint (`/api/webhook`) supporting instant acknowledgment and asynchronous worker processing.
* Private repository integration module with Bearer PAT token authentication.
* Tested reverse tunneling configuration with ngrok and end-to-end webhook delivery verification.

---

## WEEK 5: AST Static Dependency Graph Engine & Interactive Dark Glassmorphism Frontend Dashboard

### 5.1 Objectives of the Week
* Develop an Abstract Syntax Tree (AST) static analysis parser for JavaScript/TypeScript repositories.
* Construct an interactive cross-file dependency graph visualization using React Flow.
* Build a responsive, dark-mode web application using custom CSS glassmorphism, responsive navigation, and precision SVG visualizers.
* Implement repository selection, PR detail breakdown, and explainability cards.

### 5.2 Planned Activities
* Implement AST import/export extraction using `@babel/parser` and `@babel/traverse`.
* Build graph data structures (`nodes`, `edges`) mapping modified files to impacted upstream and downstream modules.
* Design and refine frontend components: `RiskGauge.jsx`, `ShapCard.jsx`, `GraphView.jsx`, `PRTable.jsx`, `TrendChart.jsx`, and `RiskPieChart.jsx`.
* Resolve all UI contrast, alignment, and rendering defects.

### 5.3 Work Done & Technical Implementation
* **AST Dependency Parser (`dependencyParser.js`):**
  * When a PR modifies JavaScript/Node.js files, the backend fetches file contents via GitHub API and parses code into an AST using `@babel/parser` (`sourceType: 'module'`).
  * `@babel/traverse` inspects `ImportDeclaration` (`import x from './y'`) and `CallExpression` (`require('./y')`).
  * Resolves relative import paths (`./`, `../`) to absolute repository paths, identifying cross-file blast radiuses and coupling risks.
* **React 18 Frontend Architecture:**
  * **Precision Animated Risk Gauge (`RiskGauge.jsx`):** Developed a circular SVG gauge with smooth dash-offset transitions, dynamic color interpolations (Green $\rightarrow$ Yellow $\rightarrow$ Red), and **1-decimal precision resolution** (e.g., `8.0%`, `0.4%`, `< 1%`) avoiding ambiguous 0% roundoffs.
  * **SHAP Explainability Cards (`ShapCard.jsx`):** Displays top 7 contributing features ranked by absolute Shapley impact, directional arrows ($\blacktriangle$ Risk Increaser / $\blacktriangledown$ Risk Mitigator), relative contribution bars, and natural language explanations.
  * **Interactive Dependency Graph Canvas (`GraphView.jsx`):** Integrated React Flow with custom-styled nodes highlighting modified files in red/orange and impacted dependent modules in purple/blue.
  * **Auth & Navigation Fixes:** Centered Login/Register views using full-viewport positioning and resolved dropdown option backgrounds across dark theme surfaces (`select.input-field option`).

### 5.4 Challenges Encountered & Solutions
* *Challenge 1:* HTML `<select>` dropdown options rendered with white text on default white backgrounds in Chromium-based browsers on dark themes.
* *Solution:* Explicitly declared background tokens (`var(--bg-secondary)`) and text colors (`var(--text-primary)`) on all select option selectors in `index.css`.
* *Challenge 2:* Authentication screens were left-aligned due to inherited flex-basis properties from the main application shell.
* *Solution:* Refactored `.auth-page` styling with fixed viewport geometry and centered flex layout, guaranteeing visual symmetry.

### 5.5 Deliverables of Week 5
* AST-based cross-file dependency analyzer (`dependencyParser.js`).
* Complete React single-page application with dark glassmorphism design system.
* Polished UI components for risk gauges, SHAP cards, and dependency graph visualization.

---

## WEEK 6: System Integration, End-to-End Real-Time Validation, ROI Evaluation & Final Demonstration

### 6.1 Objectives of the Week
* Conduct full end-to-end integration testing across all three tiers (GitHub $\rightarrow$ Backend $\rightarrow$ ML Engine $\rightarrow$ Frontend).
* Perform ROI evaluation and cost-savings benchmarking.
* Execute security audit, credential sanitization, and SQL injection validation.
* Finalize project documentation, demonstration testbeds, and weekly workbook records.

### 6.2 Planned Activities
* Execute live end-to-end integration tests using simulated and real GitHub PR events on private test repositories.
* Benchmark inference latency under concurrent webhook requests.
* Validate database transaction safety, error handling, and rollback mechanisms.
* Compile performance graphs, ROC curves, calibration plots, and SHAP summary diagrams.

### 6.3 Work Done & Technical Implementation
* **End-to-End System Verification:**
  * Created test private repositories on GitHub (`devrisk-test-private-repo`).
  * Opened multi-file pull requests triggering live webhooks through the active ngrok tunnel.
  * Verified end-to-end processing pipeline latency:
    * Webhook receipt & acknowledgment: $\approx \mathbf{35\text{ ms}}$
    * GitHub API diff & commit history extraction: $\approx \mathbf{380\text{ ms}}$
    * 14-metric computation: $\approx \mathbf{12\text{ ms}}$
    * ML Stacking inference & SHAP computation: $\approx \mathbf{65\text{ ms}}$
    * PostgreSQL transaction & storage: $\approx \mathbf{20\text{ ms}}$
    * **Total End-to-End Latency:** $\mathbf{\approx 512\text{ ms}}$ (sub-second real-time responsiveness).
* **ROI & Economic Evaluation:**
  * Validated that optimizing the decision threshold to 0.34 saves **11.4% of total code-review and bug-fixing costs** across large engineering teams by capturing nearly 70% of buggy changes before they reach staging or production.
* **Security Hardening:**
  * Enforced parameterized SQL queries via `pg` library preventing SQL injection vulnerabilities.
  * Stored GitHub tokens and database credentials strictly within server-side `.env` files with `.gitignore` protection.
  * Protected frontend routes using JWT authentication middleware with token expiration.

### 6.4 Challenges Encountered & Solutions
* *Challenge:* Rapid sequential PR synchronization events caused out-of-order feature writes.
* *Solution:* Implemented PostgreSQL `ON CONFLICT DO UPDATE` atomic locks within database transactions, ensuring idempotency and state consistency.

### 6.5 Deliverables of Week 6
* Fully operational, production-ready DevRisk AI software platform.
* Complete project documentation, synopsis report, and weekly progress workbook.
* Automated testing and verification scripts verifying calibration, ROI, and live inference.

---

# Summary of 6-Week Milestones & Evaluation Metrics

| Week | Core Focus Area | Major Technical Achievements | Tangible Deliverables | Status |
|---|---|---|---|---|
| **Week 1** | Literature Review & Metric Taxonomy | Analyzed ApacheJIT dataset (106k rows); defined 14 change metrics across 5 dimensions; designed microservice architecture. | Clean dataset, SRS document, project repository structure. | **Completed** |
| **Week 2** | ML Stacking, Calibration & SHAP | Trained Stacked Classifier (XGBoost + HistGradientBoosting); optimized cost threshold to 0.34; integrated Isotonic calibration & TreeSHAP. | `devrisk_stacked_model.joblib`, validation scripts, 0.857 AUC-ROC. | **Completed** |
| **Week 3** | Backend REST API & Database Design | Created PostgreSQL relational schema; built Node.js Express controllers; implemented Python FastAPI microservice bridge. | Database schema migrations, REST API endpoints, FastAPI service. | **Completed** |
| **Week 4** | Webhooks & Private Repo Access | Implemented async webhook pipeline; integrated ngrok secure tunneling; built GitHub Bearer PAT private repo connector. | `/api/webhook` handler, ngrok configuration, private repo connector. | **Completed** |
| **Week 5** | AST Dependency Graph & React UI | Built Babel AST parser for module coupling; designed React 18 dark glassmorphism dashboard, SVG risk gauge & SHAP cards. | `GraphView.jsx`, `RiskGauge.jsx`, `ShapCard.jsx`, frontend SPA. | **Completed** |
| **Week 6** | System Integration & ROI Validation | Executed live end-to-end tests on private repos; verified sub-second latency (512ms); validated 11.4% cost savings; security audit. | Final integrated system, test suite, completed documentation & workbook. | **Completed** |

---

# Student Self-Assessment & Guide Endorsement

### Student Declaration
We hereby declare that the work presented in this 6-Week Progress Workbook represents our genuine technical development, implementation, and experimentation conducted for our B.Tech Project Work on **DevRisk AI**.

| Student Name | PRN | Signature |
|---|---|---|
| **Rupesh Honrao** | 23510010 | ____________________ |
| **Mayur Bambale** | 23510014 | ____________________ |
| **Adarsh Singh** | 23510022 | ____________________ |
| **Dinesh Yuvnate** | 23510036 | ____________________ |

---

### Project Guide Evaluation & Remarks

* **Progress Rating:** [  ] Excellent  [  ] Good  [  ] Satisfactory  [  ] Needs Improvement
* **Key Observations & Guide Remarks:**
  ____________________________________________________________________________________________________
  ____________________________________________________________________________________________________
  ____________________________________________________________________________________________________

**Guide Signature:** ___________________________________  
**Mr. Abhijeet Urunkar**  
Assistant Professor, Department of Computer Science and Engineering  
Walchand College of Engineering, Sangli  
**Date:** ________________________
