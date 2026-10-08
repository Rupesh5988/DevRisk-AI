"""
============================================================
Proof of Calibration: Reliability Diagram & Brier Score
============================================================
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.calibration import calibration_curve

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "calibrated_model.pkl")
COLUMNS_PATH = os.path.join(BASE_DIR, "model", "feature_columns.json")
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")
PLOT_PATH = os.path.join(BASE_DIR, "plots", "09_calibration_proof.png")

LOG_SCALE_FEATURES = ["la", "ld", "lt", "exp", "rexp", "sexp", "age", "nuc"]

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
    print("  Generating Calibration Proof...")
    print("=" * 60)

    # 1. Load Artifacts
    calibrated_model = joblib.load(MODEL_PATH)
    with open(COLUMNS_PATH, "r") as f:
        feature_columns = json.load(f)

    # 2. Recreate Test Set
    df = pd.read_csv(DATA_PATH)
    df = engineer_features(df)
    
    X = df[feature_columns].values
    y = df["buggy"].values
    
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Predict & Compute Metrics
    y_prob = calibrated_model.predict_proba(X_test)[:, 1]
    
    brier_score = brier_score_loss(y_test, y_prob)
    auc_roc = roc_auc_score(y_test, y_prob)

    print(f"  📊 Test Brier Score Loss: {brier_score:.4f} (Closer to 0 is better)")
    print(f"  📊 Test AUC-ROC:          {auc_roc:.4f}")

    # 4. Generate Calibration Curve
    prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=10, strategy='uniform')

    os.makedirs(os.path.dirname(PLOT_PATH), exist_ok=True)
    plt.figure(figsize=(8, 6))
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly Calibrated (Ideal)")
    plt.plot(prob_pred, prob_true, "s-", color="#3b82f6", label=f"Calibrated XGBoost\n(Brier={brier_score:.3f})")
    plt.xlabel("Mean Predicted Probability", fontsize=12)
    plt.ylabel("Actual Fraction of Positives (Buggy)", fontsize=12)
    plt.title("Reliability Diagram (Calibration Proof)", fontsize=14, fontweight="bold")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOT_PATH, dpi=150)
    plt.close()
    
    print(f"  ✅ Saved Calibration Plot to: {PLOT_PATH}")

if __name__ == "__main__":
    main()
