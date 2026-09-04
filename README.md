# 🛡️ DevRisk AI — Autonomous Pull Request Risk Analyzer & JIT Defect Prevention

[![Python](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.13-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express-4.19-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7%2B-EB3C00?style=flat&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io)
[![TreeSHAP](https://img.shields.io/badge/Explainability-TreeSHAP-blueviolet?style=flat)](https://shap.readthedocs.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **DevRisk AI** is an enterprise-grade, Just-In-Time (JIT) defect prediction and automated code review platform. By combining **calibrated machine learning ensembles (XGBoost + Random Forest)** with **TreeSHAP explainability**, DevRisk AI evaluates every pull request across your GitHub repositories in real time, predicts post-release regression risk (0–100%), enforces automated CI/CD merge-gate controls, and pinpoints the exact files and lines driving risk so engineering teams can refactor before merging to production.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [Machine Learning Architecture](#-machine-learning-architecture)
3. [System Architecture](#-system-architecture)
4. [Project Structure](#-project-structure)
5. [Prerequisites](#-prerequisites)
6. [Quick Start (Single-Click Launch)](#-quick-start-single-click-launch)
7. [Manual Installation & Setup](#-manual-installation--setup)
   - [1. Database Configuration (PostgreSQL)](#1-database-configuration-postgresql)
   - [2. Python ML Microservice (Port 8000)](#2-python-ml-microservice-port-8000)
   - [3. Node.js Backend API (Port 3001)](#3-nodejs-backend-api-port-3001)
   - [4. React Vite Frontend (Port 3000)](#4-react-vite-frontend-port-3000)
8. [Environment Variables](#-environment-variables)
9. [API Reference](#-api-reference)
10. [Feature Metrics Dictionary (28 Features)](#-feature-metrics-dictionary-28-features)
11. [Model Retraining & Calibration](#-model-retraining--calibration)
12. [License & Acknowledgments](#-license--acknowledgments)

---

## 🚀 Key Features

* **Multi-Repository Live Monitoring**: Connect GitHub repositories and ingest pull requests automatically via webhooks or manual repository onboarding.
* **Calibrated Soft-Voting Ensemble**: High-precision defect risk scoring powered by an ensemble of Calibrated XGBoost and Tuned Random Forest with Isotonic probability calibration.
* **Explainable AI with TreeSHAP**: Instant waterfall breakdowns and beeswarm plots identifying the exact top-risk contributors (e.g., high code entropy, junior dev on legacy files, large blast radius).
* **Interactive What-If Playground**: Developer sandbox allowing engineers to load any existing tracked PR or preset scenario and adjust 14 interactive sliders in real time to simulate how diff modifications impact regression risk.
* **Built-in 28-Metric Feature Dictionary**: In-app glossary with plain-English definitions, safe baselines, and an interactive **Live Value Tester** for all ApacheJIT metrics.
* **CI/CD Quality Gate Automation**: Configurable risk thresholds (`Approved`, `Senior Review Required`, `Blocked`) with cost-sensitive penalization (5x penalty for false negatives).
* **AST Dependency & Blast Radius Graph**: Interactive visualization of impacted modules, downstream blast reach, and external library couplings.
* **Dual Theme UI Engine**: Polished Dark & Light modes with glassmorphism, responsive navigation, and accessible high-contrast design tokens.
* **Automated GitHub Markdown PR Comments**: One-click generation of formatted markdown review summaries ready to post to GitHub discussions.

---

## 🧠 Machine Learning Architecture

```
                                    +-----------------------------------------+
                                    |    28-Feature ApacheJIT Vector Extractor |
                                    |   (Code Churn, Spread, History, Exper.) |
                                    +--------------------+--------------------+
                                                         |
                                       +-----------------+-----------------+
                                       |                                   |
                                       v                                   v
                        +----------------------------+      +----------------------------+
                        |      XGBoost Booster       |      |     Random Forest Classifier|
                        |   (Max Depth 6, eta 0.08)  |      |   (n_estimators 150, balanced)|
                        +--------------+-------------+      +--------------+-------------+
                                       |                                   |
                                       +-----------------+-----------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |     CalibratedClassifierCV (Isotonic)   |
                                    |      True Well-Calibrated Probabilities |
                                    +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |         TreeSHAP Explainer (< 3ms)      |
                                    |       Local Waterfall & Global Ranking  |
                                    +-----------------------------------------+
```

### 1. The Ensemble Model
* **XGBoost Classifier**: Captures non-linear feature interactions across code churn, entropy, and temporal decay with early stopping.
* **Random Forest Classifier**: Ensemble of balanced decision trees reducing variance and preventing overfitting on edge-case commits.
* **Soft-Voting Ensemble**: Averages calibrated predicted probabilities to ensure robust, generalizes-well predictions across diverse repositories.

### 2. Probability Calibration
Raw tree models often produce uncalibrated, over-confident probabilities near 0 and 1. DevRisk AI utilizes **Isotonic Regression** (`CalibratedClassifierCV`), guaranteeing that a predicted risk of `80%` genuinely corresponds to 80 defect-prone PRs out of 100 in historical evaluation.

### 3. Cost-Sensitive Quality Gates
In enterprise software engineering, the cost of a **False Negative** (a bug escaping to production) is drastically higher than a **False Positive** (a senior engineer spending 10 extra minutes reviewing safe code). DevRisk AI applies a **5:1 asymmetric loss weight**, ensuring high recall on defect-prone commits.

---

## 🏗️ System Architecture

```
  +--------------------+             +--------------------+
  |  GitHub Webhooks   |             | Developer Browser  |
  +---------+----------+             +---------+----------+
            |                                  |
            v                                  v
+-----------------------------------------------------------------+
|             Express.js / Node.js API Gateway (Port 3001)        |
|  - JWT Authentication          - Webhook Receiver               |
|  - PostgreSQL Database Client  - Microservice Reverse Proxy     |
+-------------------+------------------------------+--------------+
                    |                              |
                    v                              v
+--------------------------------+   +----------------------------+
|     PostgreSQL 14 Database     |   | Python FastAPI (Port 8000) |
|  - Repositories & PRs          |   |  - Calibrated ML Ensemble  |
|  - Change Features & SHAP Logs |   |  - Fast TreeSHAP Engine    |
|  - Users & CI/CD Audit Gates   |   |  - Real-Time Simulation    |
+--------------------------------+   +----------------------------+
```

---

## 📁 Project Structure

```
DevRisk-AI/
├── devrisk-ai/
│   ├── backend/                     # Node.js Express Backend Service
│   │   ├── src/
│   │   │   ├── config/              # PostgreSQL pool & database connection
│   │   │   ├── controllers/         # PR, Repository, and Analytics handlers
│   │   │   ├── middleware/          # Auth, Validation, & Error handling
│   │   │   ├── routes/              # Express REST API routes
│   │   │   ├── utils/               # Feature names and GitHub webhook parsers
│   │   │   └── index.js             # Server entrypoint (Port 3001)
│   │   ├── package.json
│   │   └── .env.example
│   │
│   ├── frontend/                    # React 18 + Vite Web Application
│   │   ├── src/
│   │   │   ├── components/          # Reusable UI widgets, Risk Gauge, PRTable, ShapCard
│   │   │   ├── context/             # AuthContext, ThemeContext (Dark/Light)
│   │   │   ├── pages/               # Dashboard, Simulator, Repositories, PRDetail, Settings
│   │   │   ├── services/            # Axios API client
│   │   │   ├── utils/               # 28-Metric Feature Definitions & Value Interpretations
│   │   │   ├── App.jsx              # Router configuration
│   │   │   └── index.css            # Complete design system & custom CSS variables
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── ml-service/                  # Python FastAPI ML Microservice
│       ├── app/
│       │   ├── explainer.py         # TreeSHAP Shapley value computation engine
│       │   ├── main.py              # FastAPI application entrypoint (Port 8000)
│       │   ├── predictor.py         # Calibrated ensemble inference pipeline
│       │   └── schemas.py           # Pydantic request/response schemas
│       ├── model/                   # Serialized model pickles & metadata
│       │   ├── calibrated_model.pkl # Trained Soft-Voting Ensemble model
│       │   ├── feature_columns.json # Feature ordering schema
│       │   └── training_metrics.json# Validation performance metrics
│       ├── plots/                   # Generated evaluation & calibration plots
│       ├── requirements.txt         # Python dependencies
│       └── train_model.py           # End-to-end model training script
│
├── start-all.bat                    # Windows Command-Line Multi-Service Launcher
├── start-all.ps1                    # PowerShell Platform Orchestrator
├── .gitignore                       # Repository ignore configuration
└── README.md                        # Documentation & Project Guide
```

---

## ⚙️ Prerequisites

Before running DevRisk AI, ensure you have the following installed:

1. **Python**: Version `3.11` or `3.13` ([Download Python](https://python.org))
2. **Node.js**: Version `18.x` or `20.x` ([Download Node.js](https://nodejs.org))
3. **PostgreSQL**: Version `14` or higher ([Download PostgreSQL](https://www.postgresql.org))
4. **Git**: ([Download Git](https://git-scm.com))

---

## ⚡ Quick Start (Single-Click Launch)

For Windows users, complete startup orchestration is provided via `start-all.bat` or `start-all.ps1`.

### Option A: Windows Batch Launcher
Double-click `start-all.bat` or run in CMD:
```cmd
start-all.bat
```

### Option B: PowerShell Launcher
Run in PowerShell:
```powershell
.\start-all.ps1
```

The script automatically starts all 3 microservices in separate background windows:
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **What-If Playground Sandbox**: [http://localhost:3000/simulator](http://localhost:3000/simulator)
* **Backend REST API**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
* **ML Microservice Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Manual Installation & Setup

### 1. Database Configuration (PostgreSQL)

1. Open `psql` or pgAdmin and create the database:
   ```sql
   CREATE DATABASE devrisk_ai;
   CREATE USER devrisk_user WITH ENCRYPTED PASSWORD 'devrisk_pass';
   GRANT ALL PRIVILEGES ON DATABASE devrisk_ai TO devrisk_user;
   ```
2. Initialize tables using the schema located in `devrisk-ai/backend/src/config/schema.sql` (or allow the backend auto-migration to run on first start).

---

### 2. Python ML Microservice (Port 8000)

1. Navigate to the ML service directory:
   ```bash
   cd devrisk-ai/ml-service
   ```
2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS / Linux:
   source venv/bin/activate
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server with Uvicorn:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Verify: Open [http://localhost:8000/docs](http://localhost:8000/docs) to view the interactive OpenAPI documentation.*

---

### 3. Node.js Backend API (Port 3001)

1. Navigate to the backend directory:
   ```bash
   cd devrisk-ai/backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (see [Environment Variables](#-environment-variables) below).
4. Start the backend service:
   ```bash
   node src/index.js
   ```
   *Verify: Open [http://localhost:3001/api/health](http://localhost:3001/api/health) to confirm database connectivity.*

---

### 4. React Vite Frontend (Port 3000)

1. Navigate to the frontend directory:
   ```bash
   cd devrisk-ai/frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Verify: Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 🔑 Environment Variables

### Backend Configuration (`devrisk-ai/backend/.env`)
```env
PORT=3001
NODE_ENV=development

# Database Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=devrisk_ai
DB_USER=devrisk_user
DB_PASSWORD=devrisk_pass

# ML Microservice Endpoint
ML_SERVICE_URL=http://localhost:8000

# Authentication
JWT_SECRET=super_secret_jwt_key_devrisk_ai_2026
JWT_EXPIRES_IN=7d

# GitHub Webhook Integration (Optional)
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_key
GITHUB_TOKEN=your_personal_access_token_for_private_repos
```

### Frontend Configuration (`devrisk-ai/frontend/.env`)
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 📡 API Reference

### Backend API (`http://localhost:3001/api`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck and PostgreSQL connectivity status |
| `POST` | `/auth/register` | Register new reviewer / engineer account |
| `POST` | `/auth/login` | Authenticate user and receive JWT bearer token |
| `GET` | `/repos` | List all tracked GitHub repositories |
| `POST` | `/repos` | Onboard a new repository URL |
| `GET` | `/prs` | List all evaluated pull requests (with risk filters & pagination) |
| `GET` | `/prs/:id` | Get full PR report with 28 ApacheJIT metrics & SHAP explanations |
| `POST` | `/prs/simulate` | Run on-the-fly counterfactual risk simulation & save to database |
| `GET` | `/analytics/summary` | Overall system metrics (high risk block rate, safe approvals, trends) |

### ML Microservice (`http://localhost:8000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns ML engine status, loaded model version, and calibration info |
| `POST` | `/predict` | Ingests feature vector; returns defect probability (0–100%) and CI/CD gate |
| `POST` | `/explain` | Computes TreeSHAP values for all metrics (< 3ms latency) |
| `POST` | `/simulate` | Runs end-to-end prediction, SHAP waterfall, and blast radius calculation |

---

## 📖 Feature Metrics Dictionary (28 Features)

DevRisk AI assesses code changes across 28 multi-dimensional metrics derived from the ApacheJIT defect mining standard:

### 1. Code Churn & Volume (Size)
* **`la` (Lines Added)**: Number of newly added code lines. Large additions increase defect surface area.
* **`ld` (Lines Deleted)**: Number of removed code lines. Deletions may alter implicit callers or edge cases.
* **`lt` (Lines in Files)**: Total length of affected files before modification.
* **`entropy` (Change Entropy)**: Dispersion of edits across files. High entropy indicates uncoordinated, scattered modifications.

### 2. Architectural Footprint & Spread (Diffusion)
* **`nf` (Files Changed)**: Count of modified files.
* **`nd` (Directories Changed)**: Directory spread of changes.
* **`ns` (Subsystems Changed)**: High-level architectural subsystems modified.
* **`ast_dep` (AST Dependencies)**: Number of abstract syntax tree modules impacted.
* **`blast_reach` (Blast Radius Reach)**: Downstream callers and importers affected.

### 3. Developer Context & Experience
* **`ndev` (Prior File Developers)**: Number of distinct engineers who previously modified these files.
* **`exp` (Developer Experience)**: Total past pull requests submitted by the author.
* **`rexp` (Recent Experience)**: Activity and commits within the last 90 days.
* **`sexp` (Subsystem Experience)**: Author's past experience in this specific subsystem.

### 4. Temporal & Historical Factors
* **`age` (File Age)**: Days since the files were last modified. Editing stale code carries higher regression risk.
* **`nuc` (Unique Changes)**: Historical commit frequency of the touched files.
* **`fix` (Defect Fix Flag)**: Boolean indicating whether this PR is an emergency patch or hotfix.

*(Inspect the full interactive explainer with live interpretations by clicking **`Metrics Guide 28`** in the web dashboard!)*

---

## 🔄 Model Retraining & Calibration

To retrain the ML ensemble on new commit data:

1. Navigate to `devrisk-ai/ml-service`:
   ```bash
   cd devrisk-ai/ml-service
   ```
2. Run the end-to-end training and evaluation script:
   ```bash
   python train_model.py
   ```
3. The script executes:
   * Data loading and cleaning
   * SMOTE / Class-weight balancing
   * Hyperparameter tuning for **XGBoost** and **Random Forest**
   * Soft-Voting Ensemble construction
   * Isotonic probability calibration
   * Generation of evaluation plots (`plots/01_confusion_matrix_calibrated_ensemble.png`, `plots/02_shap_summary_beeswarm.png`, etc.)
   * Serialization of models to `model/calibrated_model.pkl` and `model/xgboost_model.pkl`

---

## 👥 Contributors & Acknowledgments

* **Author**: Rupesh ([@Rupesh5988](https://github.com/Rupesh5988))
* **Repository**: [https://github.com/Rupesh5988/DevRisk-AI](https://github.com/Rupesh5988/DevRisk-AI)
* **Methodology**: Built on the foundations of Just-In-Time (JIT) Software Defect Prediction research (Kamei et al., McIntosh et al.) and modern Explainable AI (Lundberg et al., TreeSHAP).

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
