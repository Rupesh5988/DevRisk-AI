"""
============================================================
ROI & Cost Matrix Quantification
============================================================
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "calibrated_model.pkl")
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")

LOG_SCALE_FEATURES = ["la", "ld", "lt", "exp", "rexp", "sexp", "age", "nuc"]
COST_FN = 5.0  # Production bug fix cost
COST_FP = 1.0  # Code review cost

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy().fillna(0)
    df["churn_density"] = (df["la"] + df["ld"]) / (df["lt"] + 1)
    df["la_ratio"] = df["la"] / (df["la"] + df["ld"] + 1e-5)
    df["exp_per_file"] = df["exp"] / (df["nf"] + 1)
    df["recent_exp_ratio"] = df["rexp"] / (df["exp"] + 1)
    df["exp_vs_complexity"] = df["exp_per_file"] / (df["entropy"] + 1e-5)
    df["subsystem_familiarity"] = df["sexp"] / (df["exp"] + 1e-5)
    df["churn_intensity"] = (df["la"] + df["ld"]) * df["entropy"]
    df["dev_density_risk"] = df["ndev"] / (df["age"] + 1)
    for col in LOG_SCALE_FEATURES:
        df[col] = np.log1p(df[col])
    return df

def main():
    print("=" * 60)
    print("  ROI & Cost Savings Proof")
    print("=" * 60)

    import json
    COLUMNS_PATH = os.path.join(BASE_DIR, "model", "feature_columns.json")
    with open(COLUMNS_PATH, "r") as f:
        feature_columns = json.load(f)

    calibrated_model = joblib.load(MODEL_PATH)
    
    df = pd.read_csv(DATA_PATH)
    df = engineer_features(df)
    
    X = df[feature_columns].values
    y = df["buggy"].values
    
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    y_prob = calibrated_model.predict_proba(X_test)[:, 1]

    # Evaluate default 0.50 threshold
    def_preds = (y_prob >= 0.50).astype(int)
    _, def_fp, def_fn, _ = confusion_matrix(y_test, def_preds).ravel()
    def_cost = (COST_FN * def_fn) + (COST_FP * def_fp)

    # Evaluate sweep to find true optimum on test set
    best_thresh = 0.50
    min_cost = def_cost
    
    for thresh in np.arange(0.15, 0.86, 0.01):
        preds = (y_prob >= thresh).astype(int)
        _, fp, fn, _ = confusion_matrix(y_test, preds).ravel()
        cost = (COST_FN * fn) + (COST_FP * fp)
        if cost < min_cost:
            min_cost = cost
            best_thresh = thresh

    # The pipeline selected 0.37 during CV. Let's show 0.37 performance.
    target_thresh = 0.37
    tgt_preds = (y_prob >= target_thresh).astype(int)
    _, tgt_fp, tgt_fn, _ = confusion_matrix(y_test, tgt_preds).ravel()
    tgt_cost = (COST_FN * tgt_fn) + (COST_FP * tgt_fp)
    
    saved_hours = def_cost - tgt_cost
    cost_reduction_pct = (saved_hours / def_cost) * 100 if def_cost > 0 else 0

    print(f"\n[Default Threshold: 0.50]")
    print(f"  False Positives: {def_fp} (Wasteful reviews)")
    print(f"  False Negatives: {def_fn} (Uncaught bugs)")
    print(f"  Total Cost:      {def_cost:.2f} hrs")

    print(f"\n[Optimized Threshold: {target_thresh}]")
    print(f"  False Positives: {tgt_fp} (Wasteful reviews)")
    print(f"  False Negatives: {tgt_fn} (Uncaught bugs)")
    print(f"  Total Cost:      {tgt_cost:.2f} hrs")

    print("\n" + "=" * 40)
    print(f"  Net Saved Hours:  {saved_hours:.2f} hrs")
    print(f"  Cost Reduction:   {cost_reduction_pct:.2f}%")
    print("=" * 40 + "\n")

if __name__ == "__main__":
    main()
