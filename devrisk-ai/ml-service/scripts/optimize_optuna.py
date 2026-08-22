"""
============================================================
DevRisk AI — Optuna Hyperparameter Optimization
============================================================
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
import optuna
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import confusion_matrix
import xgboost as xgb

warnings.filterwarnings("ignore")

# ============================================================
# Configuration
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

RAW_FEATURE_COLUMNS = [
    "ns", "nd", "nf", "entropy", "la", "ld", "lt",
    "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp",
]

LOG_SCALE_FEATURES = ["la", "ld", "lt", "exp", "rexp", "sexp", "age", "nuc"]
LABEL_COLUMN = "buggy"
COST_FN = 5.0
COST_FP = 1.0

def load_and_engineer_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH).fillna(0)
    
    # Temporal Sort
    if "author_date" in df.columns:
        df = df.sort_values(by="author_date").reset_index(drop=True)

    # Group-wise Feature Normalization (Z-score by project)
    if "project" in df.columns:
        for col in ["la", "ld", "lt", "entropy"]:
            if col in df.columns:
                df[col] = df.groupby("project")[col].transform(lambda x: (x - x.mean()) / (x.std() + 1e-5))
    
    # Advanced Interactions
    df["churn_density"] = (df["la"] + df["ld"]) / (df["lt"] + 1)
    df["la_ratio"] = df["la"] / (df["la"] + df["ld"] + 1e-5)
    df["exp_per_file"] = df["exp"] / (df["nf"] + 1)
    df["recent_exp_ratio"] = df["rexp"] / (df["exp"] + 1)
    
    df["exp_vs_complexity"] = df["exp_per_file"] / (df["entropy"] + 1e-5)
    df["subsystem_familiarity"] = df["sexp"] / (df["exp"] + 1e-5)
    df["churn_intensity"] = (df["la"] + df["ld"]) * df["entropy"]
    df["dev_density_risk"] = df["ndev"] / (df["age"] + 1)
    
    engineered_columns = RAW_FEATURE_COLUMNS.copy()
    engineered_columns += [
        "churn_density", "la_ratio", "exp_per_file", "recent_exp_ratio",
        "exp_vs_complexity", "subsystem_familiarity", "churn_intensity", "dev_density_risk"
    ]
    
    # Ensure no negative values before log scale (since standardization could create negatives)
    # Actually, if we standardized la, ld, lt, we shouldn't log scale them again.
    # Let's only log scale the non-standardized ones
    cols_to_log = ["exp", "rexp", "sexp", "age", "nuc"]
    for col in cols_to_log:
        # clip at 0
        df[col] = df[col].clip(lower=0)
        df[col] = np.log1p(df[col])
        
    X = df[engineered_columns].values
    y = df[LABEL_COLUMN].values
    
    # Calculate scale pos weight
    buggy_count = y.sum()
    clean_count = len(y) - buggy_count
    scale_pos_weight = clean_count / max(buggy_count, 1)
    
    return X, y, scale_pos_weight

def objective(trial, X, y, scale_pos_weight):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 150, 500, step=50),
        "max_depth": trial.suggest_int("max_depth", 3, 9),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "colsample_bylevel": trial.suggest_float("colsample_bylevel", 0.5, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "gamma": trial.suggest_float("gamma", 0.0, 1.0),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.0, 5.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 0.0, 5.0),
        "scale_pos_weight": scale_pos_weight,
        "eval_metric": "logloss",
        "random_state": 42,
        "use_label_encoder": False,
        "n_jobs": -1
    }
    
    # TimeSeriesSplit Walk-Forward Validation
    tscv = TimeSeriesSplit(n_splits=3) # Use 3 splits for speed in optimization
    
    total_cost = 0
    fold_count = 0
    
    for train_idx, val_idx in tscv.split(X):
        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]
        
        model = xgb.XGBClassifier(**params)
        model.fit(X_train, y_train, verbose=False)
        
        y_prob = model.predict_proba(X_val)[:, 1]
        
        # Optimize threshold per fold
        best_thresh_cost = float('inf')
        for thresh in [0.3, 0.4, 0.5, 0.6, 0.7]:
            preds = (y_prob >= thresh).astype(int)
            tn, fp, fn, tp = confusion_matrix(y_val, preds).ravel()
            cost = (COST_FN * fn) + (COST_FP * fp)
            if cost < best_thresh_cost:
                best_thresh_cost = cost
                
        total_cost += best_thresh_cost
        fold_count += 1
        
    return total_cost / fold_count

if __name__ == "__main__":
    print("Loading data...")
    X, y, scale_pos_weight = load_and_engineer_data()
    print(f"Data shape: {X.shape}, Scale Pos Weight: {scale_pos_weight:.2f}")
    
    study = optuna.create_study(direction="minimize")
    
    # For testing, we use a small number of trials. For production, increase n_trials to 50.
    n_trials = 5
    print(f"Starting Optuna optimization ({n_trials} trials)...")
    study.optimize(lambda trial: objective(trial, X, y, scale_pos_weight), n_trials=n_trials)
    
    best_params = study.best_params
    print("Best params found:")
    print(best_params)
    
    with open(os.path.join(MODEL_DIR, "optuna_best_params.json"), "w") as f:
        json.dump(best_params, f, indent=4)
    print("Saved best params to model/optuna_best_params.json")
