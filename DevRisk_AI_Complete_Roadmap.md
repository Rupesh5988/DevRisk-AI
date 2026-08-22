# DevRisk AI — Complete Project Understanding & Build Roadmap

> **DevRisk AI: Predicting Risky Code Changes in Pull Requests using Machine Learning**
>
> This document is your single source of truth — it explains **what** the project is, **why** it matters, **how** every piece works, and gives you a **week-by-week roadmap** to build it from scratch.

---

## Table of Contents

1. [What is DevRisk AI? (The Big Picture)](#1-what-is-devrisk-ai-the-big-picture)
2. [The Core Problem — Explained Simply](#2-the-core-problem--explained-simply)
3. [How DevRisk AI Solves It — End-to-End Flow](#3-how-devrisk-ai-solves-it--end-to-end-flow)
4. [The Dataset — ApacheJIT Explained](#4-the-dataset--apachejit-explained)
5. [The Machine Learning Model — XGBoost + SMOTE](#5-the-machine-learning-model--xgboost--smote)
6. [SHAP — Why & How Explanations Work](#6-shap--why--how-explanations-work)
7. [Complete Tech Stack — What, Why & How Each Is Used](#7-complete-tech-stack--what-why--how-each-is-used)
8. [System Architecture — Deep Dive](#8-system-architecture--deep-dive)
9. [Dependency Graph — What & Why](#9-dependency-graph--what--why)
10. [Database Design](#10-database-design)
11. [API Design — All Endpoints](#11-api-design--all-endpoints)
12. [Frontend Dashboard — What It Shows](#12-frontend-dashboard--what-it-shows)
13. [Complete Build Roadmap — Week by Week](#13-complete-build-roadmap--week-by-week)
14. [Folder Structure](#14-folder-structure)
15. [Key Interview / Viva Questions](#15-key-interview--viva-questions)

---

## 1. What is DevRisk AI? (The Big Picture)

**DevRisk AI is a tool that automatically tells developers how risky their code change is, the moment they open a Pull Request on GitHub.**

Think of it like a **security scanner, but for code quality**. When a developer pushes code and opens a PR:

1. GitHub sends a **webhook** (a notification) to our server
2. Our server **analyzes the change** — how many lines were modified? how old is the file? is the developer experienced with this part of the code?
3. A **machine learning model** (XGBoost) takes these metrics and predicts a **Risk Score from 0% to 100%**
4. A **SHAP explainer** tells the developer **WHY** it's risky — e.g., *"This file hasn't been touched in 300 days and you're changing 500 lines"*
5. Everything is shown on a **React dashboard** with graphs and dependency maps

**The key insight:** We don't analyze the *code itself* (we don't parse C++ or Java syntax). We analyze the *pattern of the change* — and research proves these patterns are strong predictors of bugs.

---

## 2. The Core Problem — Explained Simply

### The Developer's Daily Life:
```
Developer writes code → Opens Pull Request on GitHub → Senior dev reviews it → Approves/Rejects
```

### What goes wrong:
- Senior devs are **overwhelmed** — they get 20-30 PRs per day
- They **miss risky changes** because they can't deeply review everything
- Some PRs look small but touch **critical files** that affect the entire system
- Bugs get merged → discovered in production → costs $$$ to fix

### What DevRisk AI does:
```
Developer opens PR → DevRisk AI instantly says:
  "⚠️ Risk Score: 78% — HIGH RISK"
  "Reasons:"
  "  1. You modified 12 files across 5 directories (high spread)"
  "  2. You have only 2 prior commits to this module (low experience)"
  "  3. The main file was last changed 200 days ago (stale file)"
```

Now the senior dev knows **which PRs to focus on** and **what to look for**.

---

## 3. How DevRisk AI Solves It — End-to-End Flow

Here's what happens step by step when a developer opens a PR:

```
┌─────────────┐     Webhook POST      ┌──────────────────┐
│   GitHub     │ ──────────────────►   │  Node.js Server  │
│  (PR Event)  │                       │  (Express API)   │
└─────────────┘                       └────────┬─────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Step 1: Fetch PR    │
                                    │  data via GitHub API │
                                    │  (files, diffs, author)│
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Step 2: Extract     │
                                    │  Change Features     │
                                    │  (14 metrics)        │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Step 3: Parse       │
                                    │  Dependency Graph    │
                                    │  (JS repos only)     │
                                    └──────────┬──────────┘
                                               │
                              HTTP POST        │
                    ┌──────────────────────────▼──────────┐
                    │  Python FastAPI Service              │
                    │  ┌─────────────┐  ┌──────────────┐  │
                    │  │  XGBoost    │  │  SHAP        │  │
                    │  │  Model      │──►  Explainer   │  │
                    │  │  (predict)  │  │  (explain)   │  │
                    │  └─────────────┘  └──────────────┘  │
                    └──────────────────┬──────────────────┘
                                       │
                                       │  Risk Score + Explanations
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  PostgreSQL: Store results           │
                    │  MongoDB: Store raw webhook log      │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  React Dashboard                     │
                    │  • Risk score gauge                  │
                    │  • SHAP explanation cards             │
                    │  • Dependency graph (React Flow)     │
                    │  • Historical charts (Recharts)      │
                    └─────────────────────────────────────┘
```

---

## 4. The Dataset — ApacheJIT Explained

### What is ApacheJIT?

ApacheJIT is a **publicly available research dataset** created by Kondo et al. (2020). It contains **~60,000 real code commits** from **9 Apache open-source projects** (like Apache Camel, Apache Kafka, etc.).

### Why this dataset?

- It's the **gold standard** for Just-In-Time (JIT) defect prediction research
- Every commit is labeled as either **buggy (1)** or **clean (0)**
- It provides **pre-computed change-pattern features** — exactly what we need
- It's **language-agnostic** — the features are about the *change pattern*, not the code syntax

### The 14 Features in the Dataset:

| # | Feature Name | What It Means | Why It Matters |
|---|---|---|---|
| 1 | `ns` | Number of modified subsystems | Changes spanning many subsystems = higher risk |
| 2 | `nd` | Number of modified directories | Wide directory spread = harder to review |
| 3 | `nf` | Number of modified files | More files = more chances for bugs |
| 4 | `entropy` | Distribution of changes across files | Uneven changes (dumping all changes in one file) = risky |
| 5 | `la` | Lines added | Large additions often introduce bugs |
| 6 | `ld` | Lines deleted | Large deletions can break dependencies |
| 7 | `lt` | Lines of code in modified files (before change) | Changing large files = more side effects |
| 8 | `fix` | Whether the commit is a bug fix | Bug-fix commits sometimes introduce new bugs |
| 9 | `ndev` | Number of prior developers on modified files | Files with many past developers = inconsistent code |
| 10 | `age` | Average age of modified files (days) | Old untouched files are fragile |
| 11 | `nuc` | Number of unique changes to modified files | Frequently changed files = unstable |
| 12 | `exp` | Developer experience (total prior commits) | Junior developers make more mistakes |
| 13 | `rexp` | Recent developer experience (commits in last period) | Recently active developer = more familiar |
| 14 | `sexp` | Subsystem-specific developer experience | Experience in THIS specific area of code |

### Label:
- `buggy = 1` → This commit was later found to have introduced a bug
- `buggy = 0` → This commit was clean

### Class Imbalance Problem:
The dataset is **heavily imbalanced** — roughly **80% clean, 20% buggy**. If we train a model naively, it will just predict "clean" for everything and get 80% accuracy (but catch 0% of bugs).

**Solution: SMOTE (Synthetic Minority Oversampling Technique)**
- SMOTE creates **synthetic buggy samples** by interpolating between existing buggy commits
- This gives the model a balanced 50/50 split to learn from
- Applied **only on training data** (never on test data — that would be data leakage!)

### Where to get it:
- GitHub: https://github.com/nickkwas/ApacheJIT (or search "ApacheJIT dataset")
- The data comes as CSV files — one per Apache project
- You'll combine them into one dataset for training

---

## 5. The Machine Learning Model — XGBoost + SMOTE

### Why XGBoost?

| Option | Verdict | Why |
|---|---|---|
| Logistic Regression | ❌ Too simple | Can't capture non-linear feature interactions |
| Random Forest | ⚠️ Decent | Works but slower, less accurate on tabular data |
| **XGBoost** | ✅ **Best choice** | State-of-the-art for tabular data, handles imbalance well, fast, explainable with SHAP |
| Deep Learning (LSTM/Transformer) | ❌ Overkill | We have only 14 features and 60K rows — DL needs way more data and gives no interpretability |

### Training Pipeline:

```
┌───────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐
│ Load CSV   │────►│ Clean &   │────►│ SMOTE      │────►│ Train/Test│
│ ApacheJIT  │     │ Normalize │     │ (balance)  │     │ Split     │
└───────────┘     └───────────┘     └────────────┘     └─────┬─────┘
                                                             │
                                                   ┌────────▼────────┐
                                                   │  Train XGBoost  │
                                                   │  Classifier     │
                                                   └────────┬────────┘
                                                             │
                                                   ┌────────▼────────┐
                                                   │  Evaluate:      │
                                                   │  AUC-ROC, F1,   │
                                                   │  Precision,     │
                                                   │  Recall         │
                                                   └────────┬────────┘
                                                             │
                                                   ┌────────▼────────┐
                                                   │  Save model as  │
                                                   │  model.pkl      │
                                                   └─────────────────┘
```

### Training Code Overview (Python):

```python
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
from imblearn.over_sampling import SMOTE
import joblib

# 1. Load dataset
df = pd.read_csv("apachejit_combined.csv")

# 2. Separate features and label
X = df[['ns','nd','nf','entropy','la','ld','lt','fix','ndev','age','nuc','exp','rexp','sexp']]
y = df['buggy']

# 3. Train-test split (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# 4. Apply SMOTE only on training data
smote = SMOTE(random_state=42)
X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)

# 5. Train XGBoost
model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=1,  # Already balanced via SMOTE
    eval_metric='logloss',
    random_state=42
)
model.fit(X_train_balanced, y_train_balanced)

# 6. Evaluate
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]
print(f"AUC-ROC: {roc_auc_score(y_test, y_prob):.4f}")
print(classification_report(y_test, y_pred))

# 7. Save model
joblib.dump(model, "xgboost_model.pkl")
```

### Expected Performance:
| Metric | Expected Range |
|---|---|
| AUC-ROC | 0.75 – 0.83 |
| Precision | 0.65 – 0.78 |
| Recall | 0.70 – 0.85 |
| F1 Score | 0.68 – 0.80 |

---

## 6. SHAP — Why & How Explanations Work

### The Problem with ML:
XGBoost gives you a number: *"Risk = 78%"*. But **WHY** is it 78%? Without an explanation, developers won't trust or use the tool.

### What is SHAP?
**SHAP (SHapley Additive exPlanations)** is based on game theory. It answers: *"How much did each feature contribute to this specific prediction?"*

### How It Works (Intuitively):
Imagine you're predicting risk for a PR with these features:
- Lines added = 500
- Developer experience = 2 commits
- File age = 300 days

SHAP calculates:
```
Base prediction (average risk):     45%
+ Lines added = 500:               +15%   (large change → riskier)
+ Developer experience = 2:       +12%   (inexperienced → riskier)
+ File age = 300 days:             + 8%   (stale file → riskier)
+ Other features combined:         - 2%   (slightly reduce risk)
                                   ─────
Final prediction:                   78%
```

### What We Show the User:
```
⚠️ Risk Score: 78% — HIGH RISK

Top Risk Factors:
🔴 Lines Added (500) — contributed +15% to risk
   "This change adds a very large amount of new code"

🔴 Developer Experience (2 commits) — contributed +12% to risk
   "You have very few prior commits to these files"

🟡 File Age (300 days) — contributed +8% to risk
   "The modified files haven't been changed in almost a year"
```

### SHAP Code Overview:
```python
import shap

# Load the trained model
model = joblib.load("xgboost_model.pkl")

# Create SHAP explainer
explainer = shap.TreeExplainer(model)

# For a single PR's features:
feature_vector = [[500, 2, 300, ...]]  # the 14 features
shap_values = explainer.shap_values(feature_vector)

# shap_values is an array like: [+0.15, +0.12, +0.08, -0.02, ...]
# Each value = that feature's contribution to the prediction
```

### Converting SHAP Values to English:
We write a mapping function:
```python
FEATURE_EXPLANATIONS = {
    "la": {
        "high": "This change adds a very large amount of new code",
        "medium": "A moderate amount of new code was added",
        "low": "Only a small amount of code was added"
    },
    "exp": {
        "high": "The developer is highly experienced with these files",
        "medium": "The developer has moderate experience here",
        "low": "The developer has very few prior commits to these files"
    },
    # ... for all 14 features
}
```

---

## 7. Complete Tech Stack — What, Why & How Each Is Used

### Backend 1: Node.js + Express (The Brain)

| Aspect | Detail |
|---|---|
| **What** | JavaScript server framework |
| **Why** | Perfect for handling webhooks (event-driven, async I/O). GitHub webhooks are just HTTP POST requests — Express handles these natively |
| **Role in project** | 1. Receives webhook from GitHub. 2. Calls GitHub REST API to get PR details. 3. Extracts the 14 features from the PR data. 4. Parses JS dependency graphs. 5. Sends features to Python ML service. 6. Stores results in databases. 7. Serves API to React frontend |

### Backend 2: Python + FastAPI (The ML Brain)

| Aspect | Detail |
|---|---|
| **What** | Python web framework for APIs (ultra-fast, async) |
| **Why** | XGBoost and SHAP are Python libraries — we need Python to run the ML model. FastAPI is modern, auto-generates docs, and is blazing fast |
| **Role in project** | 1. Loads the trained XGBoost model from `model.pkl`. 2. Receives feature vector from Node.js via HTTP POST. 3. Runs prediction → returns risk score. 4. Runs SHAP → returns feature explanations |

### Why Two Backends?
```
"Can't we do everything in Python?"
```
You COULD, but:
- Node.js is **much better** at handling webhooks and real-time events (non-blocking I/O)
- GitHub's SDK and webhook libraries are more mature in JavaScript
- Separating ML from the web server follows **microservice architecture** — looks great in interviews
- The Python service can be independently scaled if needed

### ML Stack: XGBoost + SHAP + SMOTE

| Library | Purpose |
|---|---|
| `xgboost` | The ML model — gradient-boosted decision trees |
| `shap` | Explains individual predictions using game theory |
| `imbalanced-learn` (SMOTE) | Balances the dataset (oversamples buggy commits) |
| `scikit-learn` | Train/test split, evaluation metrics |
| `pandas` / `numpy` | Data loading and manipulation |
| `joblib` | Saving/loading the trained model |

### Frontend: React + React Flow + Recharts

| Library | Purpose |
|---|---|
| `React` | UI framework — component-based, industry standard |
| `React Flow` | Interactive node-based graphs — used for **dependency visualization** (shows which files import which files) |
| `Recharts` | Beautiful charts — used for **risk score history**, **feature importance bar charts**, and **trend lines** |
| `Axios` | HTTP client to call our Node.js API |

### Databases:

| Database | What It Stores | Why This DB |
|---|---|---|
| **PostgreSQL** | PR metadata (id, repo, author, score, date), feature values, dependency graph edges, SHAP values | Structured relational data with complex queries. Graph edges need JOIN operations |
| **MongoDB** | Raw webhook JSON payloads, raw GitHub API responses | Unstructured JSON blobs of varying shape — MongoDB handles schema-less data natively |

### DevOps & Integration:

| Tool | Purpose |
|---|---|
| **GitHub Webhooks** | Triggers our system automatically when a PR is opened/updated |
| **GitHub REST API** | Fetches PR details (files changed, diffs, commit history, author info) |
| **ngrok** (development) | Tunnels localhost to the internet so GitHub webhooks can reach your local machine during development |
| **Docker** (optional) | Containerize the Python ML service for clean deployment |

---

## 8. System Architecture — Deep Dive

### The Three-Server Architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│                                                                  │
│  ┌────────────┐           ┌────────────────┐                     │
│  │  GitHub    │           │  Developer's   │                     │
│  │  Cloud     │           │  Browser       │                     │
│  └─────┬──────┘           └───────┬────────┘                     │
│        │ Webhook POST             │ HTTP GET/POST                │
└────────┼──────────────────────────┼──────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER 1: Node.js Express (Port 3001)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐       │
│  │ Webhook      │ │ Feature      │ │ Dependency         │       │
│  │ Controller   │ │ Extractor    │ │ Parser (AST)       │       │
│  └──────┬───────┘ └──────┬───────┘ └────────┬───────────┘       │
│         │                │                   │                   │
│  ┌──────▼───────┐ ┌──────▼───────┐ ┌────────▼───────────┐       │
│  │ GitHub API   │ │ PR API       │ │ Graph API          │       │
│  │ Service      │ │ Controller   │ │ Controller         │       │
│  └──────────────┘ └──────────────┘ └────────────────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP POST /predict
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER 2: Python FastAPI (Port 8000)                            │
│  ┌──────────────┐ ┌──────────────┐                               │
│  │ XGBoost      │ │ SHAP         │                               │
│  │ Predictor    │ │ Explainer    │                               │
│  └──────────────┘ └──────────────┘                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATABASES                                                       │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │  PostgreSQL      │  │  MongoDB         │                      │
│  │  (Structured)    │  │  (Raw Logs)      │                      │
│  └──────────────────┘  └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SERVER 3: React Dev Server (Port 3000)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Dashboard    │ │ PR Detail    │ │ Dependency   │             │
│  │ Page         │ │ Page         │ │ Graph Page   │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Dependency Graph — What & Why

### What is it?
When files `import` or `require` other files, they create a **dependency tree**. If you modify `utils.js`, and 15 other files import `utils.js`, those 15 files are all potentially affected.

### Example:
```javascript
// auth.js
const db = require('./database');        // auth depends on database
const crypto = require('./utils/crypto'); // auth depends on crypto

// server.js  
const auth = require('./auth');          // server depends on auth
const routes = require('./routes');       // server depends on routes
```

If someone modifies `database.js`, the dependency graph shows:
```
database.js  ◄── auth.js  ◄── server.js
                              └── routes.js
```

**3 files are potentially affected by a change to 1 file!**

### How We Parse It:
1. Fetch all `.js` files in the PR's repository from GitHub API
2. Use **regex or a simple AST parser** to find `require('...')` and `import ... from '...'` statements
3. Build an **adjacency list** (node = file, edge = "imports")
4. Store edges in PostgreSQL
5. Visualize with React Flow on the frontend

### Why Only JS/Node.js?
- Each language has different import syntax (`import` in Java, `#include` in C++, `from x import y` in Python)
- Supporting all languages = massive scope creep
- JS is chosen as a **proof of concept** — the architecture is extensible

---

## 10. Database Design

### PostgreSQL Tables:

```sql
-- Table 1: Repositories being tracked
CREATE TABLE repositories (
    id          SERIAL PRIMARY KEY,
    github_url  VARCHAR(500) NOT NULL UNIQUE,
    name        VARCHAR(200),
    owner       VARCHAR(200),
    language    VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Table 2: Pull Request records
CREATE TABLE pull_requests (
    id              SERIAL PRIMARY KEY,
    repo_id         INTEGER REFERENCES repositories(id),
    pr_number       INTEGER NOT NULL,
    title           VARCHAR(500),
    author          VARCHAR(200),
    risk_score      FLOAT,
    risk_label      VARCHAR(20),  -- 'LOW', 'MEDIUM', 'HIGH'
    additions       INTEGER,
    deletions       INTEGER,
    files_changed   INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(repo_id, pr_number)
);

-- Table 3: Feature values for each PR (what was fed to the model)
CREATE TABLE pr_features (
    id          SERIAL PRIMARY KEY,
    pr_id       INTEGER REFERENCES pull_requests(id),
    ns          FLOAT,  -- subsystems modified
    nd          FLOAT,  -- directories modified
    nf          FLOAT,  -- files modified
    entropy     FLOAT,  -- change entropy
    la          FLOAT,  -- lines added
    ld          FLOAT,  -- lines deleted
    lt          FLOAT,  -- lines in modified files
    fix         FLOAT,  -- is fix commit
    ndev        FLOAT,  -- number of prior developers
    age         FLOAT,  -- file age in days
    nuc         FLOAT,  -- unique changes count
    exp         FLOAT,  -- developer experience
    rexp        FLOAT,  -- recent experience
    sexp        FLOAT   -- subsystem experience
);

-- Table 4: SHAP explanation values for each PR
CREATE TABLE shap_explanations (
    id              SERIAL PRIMARY KEY,
    pr_id           INTEGER REFERENCES pull_requests(id),
    feature_name    VARCHAR(50),
    shap_value      FLOAT,
    feature_value   FLOAT,
    explanation     TEXT   -- plain-English sentence
);

-- Table 5: Dependency graph edges
CREATE TABLE dependency_edges (
    id          SERIAL PRIMARY KEY,
    repo_id     INTEGER REFERENCES repositories(id),
    source_file VARCHAR(500),  -- the file that imports
    target_file VARCHAR(500),  -- the file being imported
    pr_id       INTEGER REFERENCES pull_requests(id)
);
```

### MongoDB Collection:

```javascript
// Collection: webhook_logs
{
    _id: ObjectId("..."),
    event_type: "pull_request",
    action: "opened",
    received_at: ISODate("2026-08-15T10:30:00Z"),
    raw_payload: { /* entire GitHub webhook JSON — can be 5000+ lines */ },
    processed: true
}
```

---

## 11. API Design — All Endpoints

### Node.js Express API (Port 3001):

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/webhook` | Receives GitHub webhook payload |
| `GET` | `/api/repos` | List all tracked repositories |
| `POST` | `/api/repos` | Add a new repository to track |
| `GET` | `/api/repos/:id/prs` | Get all PRs for a repository |
| `GET` | `/api/prs/:id` | Get full detail of a single PR (score, features, SHAP) |
| `GET` | `/api/prs/:id/graph` | Get dependency graph for a PR |
| `GET` | `/api/analytics/overview` | Dashboard stats (total PRs, avg risk, risk distribution) |
| `GET` | `/api/analytics/trends` | Risk score over time for charts |

### Python FastAPI (Port 8000):

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/predict` | Receives 14-feature vector, returns `{ risk_score, risk_label }` |
| `POST` | `/explain` | Receives 14-feature vector, returns `{ shap_values, explanations }` |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/model-info` | Returns model metadata (accuracy, training date, etc.) |

### Example API Flow:

```
# 1. GitHub sends webhook
POST /api/webhook
Body: { action: "opened", pull_request: { number: 42, ... } }

# 2. Node.js extracts features and calls Python
POST http://localhost:8000/predict
Body: { features: [3, 2, 5, 0.72, 500, 30, 1200, 0, 4, 300, 12, 2, 1, 0] }

# 3. Python responds
Response: { risk_score: 0.78, risk_label: "HIGH" }

# 4. Node.js calls SHAP endpoint
POST http://localhost:8000/explain
Body: { features: [3, 2, 5, 0.72, 500, 30, 1200, 0, 4, 300, 12, 2, 1, 0] }

# 5. Python responds
Response: {
    shap_values: [0.05, 0.03, 0.08, 0.02, 0.15, 0.01, ...],
    explanations: [
        { feature: "la", value: 500, shap: 0.15, text: "Very large code addition" },
        { feature: "exp", value: 2, shap: 0.12, text: "Low developer experience" },
        ...
    ]
}

# 6. React frontend fetches the report
GET /api/prs/42
Response: { risk_score: 78, risk_label: "HIGH", features: {...}, shap: [...], graph: {...} }
```

---

## 12. Frontend Dashboard — What It Shows

### Page 1: Dashboard (Home)
- **Summary cards**: Total PRs analyzed, Average risk score, High-risk count today
- **Risk distribution pie chart**: Low / Medium / High (Recharts)
- **Recent PRs table**: Sortable by risk score, date, repo
- **Risk trend line chart**: How risk scores have changed over time (Recharts)

### Page 2: PR Detail
- **Risk Score Gauge**: Large circular gauge showing 0-100% (color-coded: green → yellow → red)
- **SHAP Explanation Cards**: Top 5 risk factors with plain-English descriptions and contribution bars
- **Files Changed List**: Files modified in this PR with per-file risk indicators
- **Raw Feature Values Table**: All 14 features and their values

### Page 3: Dependency Graph
- **React Flow graph**: Interactive node-based visualization
  - Each **node** = a file in the repository
  - Each **edge** = an import/require relationship
  - Modified files are highlighted in **red/orange**
  - Files affected by the change are highlighted in **yellow**
- Users can **zoom, pan, drag** nodes around
- Click a node to see its file details

### Page 4: Repository Settings
- Add/remove tracked repositories
- Configure webhook URL
- View webhook delivery history

---

## 13. Complete Build Roadmap — Week by Week

### Phase 1: Foundation & Research (Weeks 1–3)

#### Week 1: Setup & Dataset
- [ ] Set up Git repository and project folder structure
- [ ] Install all dependencies (Node.js, Python, PostgreSQL, MongoDB)
- [ ] Download ApacheJIT dataset from GitHub
- [ ] Explore the dataset in Jupyter Notebook — understand each feature
- [ ] Clean the data: handle missing values, remove duplicates
- [ ] Combine per-project CSVs into one master CSV
- [ ] Visualize class distribution (buggy vs clean)

#### Week 2: ML Model Training
- [ ] Implement SMOTE balancing on training data
- [ ] Train XGBoost classifier
- [ ] Hyperparameter tuning (GridSearchCV or RandomizedSearch)
- [ ] Evaluate: AUC-ROC, Precision, Recall, F1, Confusion Matrix
- [ ] Save final model as `xgboost_model.pkl`
- [ ] Implement SHAP explainer and test on sample predictions
- [ ] Generate SHAP summary plots and feature importance charts

#### Week 3: Literature Survey & Documentation
- [ ] Read Kamei et al. (2013) paper
- [ ] Read Kondo et al. (2020) ApacheJIT paper
- [ ] Read Lundberg et al. (2017) SHAP paper
- [ ] Document findings in literature review

---

### Phase 2: Design & Architecture (Weeks 4–5)

#### Week 4: Backend Architecture
- [ ] Design PostgreSQL schema (all 5 tables)
- [ ] Design MongoDB collection structure
- [ ] Design Node.js API endpoints (RESTful)
- [ ] Design Python FastAPI endpoints
- [ ] Create UML diagrams (use-case, class, sequence, activity, deployment)
- [ ] Finalize system architecture diagram

#### Week 5: Frontend Design
- [ ] Design wireframes for all 4 pages (Dashboard, PR Detail, Graph, Settings)
- [ ] Choose color scheme and typography
- [ ] Plan component hierarchy (React component tree)
- [ ] Set up React project with routing (React Router)

---

### Phase 3: Implementation (Weeks 6–10)

#### Week 6: Python ML Service
- [ ] Create FastAPI project structure
- [ ] Implement `/predict` endpoint (load model, accept features, return score)
- [ ] Implement `/explain` endpoint (SHAP values + English explanations)
- [ ] Implement `/health` and `/model-info` endpoints
- [ ] Write SHAP-to-English translation function
- [ ] Test all endpoints with Postman/curl

#### Week 7: Node.js Backend — Core
- [ ] Create Express project structure
- [ ] Set up PostgreSQL connection (use `pg` or Sequelize ORM)
- [ ] Set up MongoDB connection (use Mongoose)
- [ ] Implement webhook receiver (`POST /api/webhook`)
- [ ] Implement GitHub API service (fetch PR details, files, diffs, author history)
- [ ] Test webhook with ngrok + a real GitHub repo

#### Week 8: Node.js Backend — Feature Extraction & Integration
- [ ] Implement Feature Extractor module (compute all 14 features from PR data)
- [ ] Implement Dependency Parser (scan JS files for import/require)
- [ ] Connect Node.js → FastAPI (send features, receive score + SHAP)
- [ ] Store results in PostgreSQL
- [ ] Store raw webhooks in MongoDB
- [ ] Implement all remaining API endpoints

#### Week 9: React Frontend — Core
- [ ] Set up React project (Vite or Create React App)
- [ ] Install React Flow, Recharts, Axios, React Router
- [ ] Build Dashboard page (summary cards, pie chart, recent PRs table, trend chart)
- [ ] Build PR Detail page (risk gauge, SHAP cards, files list)
- [ ] Connect frontend to Node.js API

#### Week 10: React Frontend — Dependency Graph & Polish
- [ ] Build Dependency Graph page with React Flow
- [ ] Implement node highlighting (modified files in red, affected in yellow)
- [ ] Build Repository Settings page
- [ ] Add loading states, error handling, empty states
- [ ] Responsive design (mobile/tablet)
- [ ] Dark mode (optional but impressive)

---

### Phase 4: Testing & Validation (Weeks 11–14)

#### Week 11: Integration Testing
- [ ] End-to-end test: create a real PR → verify webhook → verify score → verify dashboard
- [ ] Test with multiple repositories
- [ ] Test with non-JS repositories (should still get risk score, no dependency graph)
- [ ] Load test: send 50 webhooks rapidly

#### Week 12: ML Validation
- [ ] Cross-validation (5-fold) on ApacheJIT dataset
- [ ] Compare performance with/without SMOTE
- [ ] Compare XGBoost vs Random Forest vs Logistic Regression (for documentation)
- [ ] Generate all evaluation charts (ROC curve, confusion matrix, SHAP summary)

#### Week 13: Bug Fixes & Edge Cases
- [ ] Handle webhook retries from GitHub
- [ ] Handle PRs with 0 file changes
- [ ] Handle API rate limiting from GitHub
- [ ] Handle Python service being down (graceful degradation)
- [ ] Security: validate webhook signatures from GitHub

#### Week 14: User Testing
- [ ] Have 2-3 classmates use the tool on their repos
- [ ] Collect feedback on dashboard usability
- [ ] Fix UX issues

---

### Phase 5: Documentation & Submission (Weeks 15–17)

#### Week 15: Report Writing
- [ ] Write final project report (IEEE format)
- [ ] Include all diagrams, screenshots, evaluation results
- [ ] Prepare synopsis (already done in LaTeX!)

#### Week 16: Presentation
- [ ] Create project PPT (15-20 slides)
- [ ] Prepare live demo script
- [ ] Practice presentation (time it: 15 min)

#### Week 17: Final Submission
- [ ] Final code cleanup and comments
- [ ] Record demo video
- [ ] Submit report, code, and demo
- [ ] Prepare for viva questions

---

## 14. Folder Structure

```
devrisk-ai/
├── README.md
├── docker-compose.yml          (optional: orchestrates all services)
│
├── ml-service/                 ← Python FastAPI (ML Model)
│   ├── app/
│   │   ├── main.py             (FastAPI app entry point)
│   │   ├── predictor.py        (XGBoost prediction logic)
│   │   ├── explainer.py        (SHAP explanation logic)
│   │   ├── feature_names.py    (Feature name constants)
│   │   └── explanations.py     (SHAP-to-English mapping)
│   ├── model/
│   │   └── xgboost_model.pkl   (Trained model file)
│   ├── notebooks/
│   │   ├── 01_data_exploration.ipynb
│   │   ├── 02_model_training.ipynb
│   │   └── 03_shap_analysis.ipynb
│   ├── data/
│   │   └── apachejit_combined.csv
│   ├── requirements.txt
│   └── Dockerfile
│
├── backend/                    ← Node.js Express (API Server)
│   ├── src/
│   │   ├── index.js            (Express app entry point)
│   │   ├── config/
│   │   │   ├── db.js           (PostgreSQL connection)
│   │   │   └── mongo.js        (MongoDB connection)
│   │   ├── controllers/
│   │   │   ├── webhookController.js
│   │   │   ├── prController.js
│   │   │   ├── repoController.js
│   │   │   └── analyticsController.js
│   │   ├── services/
│   │   │   ├── githubService.js    (GitHub API calls)
│   │   │   ├── featureExtractor.js (Compute 14 metrics)
│   │   │   ├── dependencyParser.js (Parse JS imports)
│   │   │   └── mlService.js        (Call Python FastAPI)
│   │   ├── models/
│   │   │   ├── Repository.js
│   │   │   ├── PullRequest.js
│   │   │   └── WebhookLog.js   (Mongoose model)
│   │   └── routes/
│   │       ├── webhookRoutes.js
│   │       ├── prRoutes.js
│   │       ├── repoRoutes.js
│   │       └── analyticsRoutes.js
│   ├── package.json
│   └── .env
│
├── frontend/                   ← React (Dashboard UI)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PRDetail.jsx
│   │   │   ├── DependencyGraph.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── RiskGauge.jsx
│   │   │   ├── ShapCard.jsx
│   │   │   ├── PRTable.jsx
│   │   │   ├── TrendChart.jsx
│   │   │   ├── PieChart.jsx
│   │   │   └── GraphView.jsx
│   │   ├── services/
│   │   │   └── api.js          (Axios API client)
│   │   └── styles/
│   │       └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── docs/
    ├── DevRisk_AI_Synopsis.tex
    ├── wce_logo.png
    └── screenshots/
```

---

## 15. Key Interview / Viva Questions

### About the Project:
1. **"Why not analyze the code directly instead of change patterns?"**
   → Language-agnostic metrics are proven by Kamei et al. (2013) to be as effective as code-level analysis. They also work across ALL languages without needing a parser for each.

2. **"Why XGBoost and not a neural network?"**
   → Tabular data with 14 features and 60K rows. XGBoost is the gold standard for this scale. Deep learning needs 100x more data and provides no interpretability.

3. **"What if the model gives a false positive (says risky but it's safe)?"**
   → That's why we show SHAP explanations. A reviewer can quickly see the reasons and decide for themselves. We aim for 65-78% precision — some false positives are acceptable because the cost of missing a real bug is much higher.

4. **"How is this different from existing tools like SonarQube?"**
   → SonarQube does static code analysis (finds code smells). We do change-level risk prediction (predicts if a specific PR will introduce bugs). They're complementary, not competing.

### About the Tech:
5. **"Why two separate backends?"**
   → Microservice architecture. Node.js is event-driven (perfect for webhooks). Python has ML libraries. Separation of concerns.

6. **"What is SMOTE? Why not just use `scale_pos_weight`?"**
   → SMOTE creates synthetic samples. `scale_pos_weight` only adjusts the loss function. SMOTE gives the model more diverse training examples to learn from.

7. **"Can this work for private repositories?"**
   → Yes, if the GitHub webhook is configured with a personal access token. The tool doesn't store source code — only metadata.

### About the Dataset:
8. **"How do you know a commit is buggy?"**
   → The ApacheJIT dataset uses the SZZ algorithm — it traces back from bug-fix commits to find the commit that originally introduced the bug.

9. **"Can you retrain on our own company's data?"**
   → Yes. The feature extraction pipeline outputs the same 14 features for any Git repository. You'd just need to label your own commits as buggy/clean using the SZZ approach.

---

> **You now have everything you need to understand, explain, and build DevRisk AI from scratch. Start with Phase 1, Week 1. Good luck! 🚀**
