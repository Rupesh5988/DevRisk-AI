"""
============================================================
DevRisk AI — Baseline Model Comparison & Paired Bootstrap
============================================================
Evaluates:
1. Churn-Only Model (Logistic Regression on total churn: la + ld)
2. Full Logistic Regression (StandardScaler + L2 penalty on all 28 features)
3. DevRisk AI Calibrated Ensemble (XGBoost + Random Forest)

Protocol:
- Same 80/20 chronological split on ApacheJIT (N=21,335 test commits)
- Fit-on-train-only (scalers fitted strictly on X_train)
- Fair Calibration: All models calibrated with Platt Sigmoid (cv=3)
- Paired Bootstrap Test: 500-resample paired differences (Delta AUC) with 95% CIs
============================================================
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
)
import joblib

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_total.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "calibrated_model.pkl")
OUTPUT_METRICS_PATH = os.path.join(BASE_DIR, "model", "baseline_comparison_metrics.json")

RAW_FEATURE_COLUMNS = [
    "ns", "nd", "nf", "entropy", "la", "ld", "lt",
    "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp",
]

ENGINEERED_FEATURE_COLUMNS = RAW_FEATURE_COLUMNS + [
    "churn_density", "la_ratio", "exp_per_file", "recent_exp_ratio",
    "exp_vs_complexity", "subsystem_familiarity", "churn_intensity", "dev_density_risk",
    "diffusion_factor", "churn_asymmetry", "churn_per_file", "fragility_index",
    "subsystem_entropy", "rexp_vs_sexp"
]

LOG_SCALE_FEATURES = ["exp", "rexp", "sexp", "age", "nuc", "churn_per_file", "fragility_index"]
LABEL_COLUMN = "buggy"


def load_and_prep_data():
    print(f"[1] Loading dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    column_map = {"ent": "entropy", "aexp": "exp", "arexp": "rexp", "asexp": "sexp"}
    df = df.rename(columns=column_map).fillna(0)

    if "author_date" in df.columns:
        df = df.sort_values(by="author_date").reset_index(drop=True)

    if "lt" not in df.columns:
        df["lt"] = df["la"] + df["ld"]

    # Feature engineering (identical row-wise formulas)
    df["churn_density"] = (df["la"] + df["ld"]) / (df["lt"] + 1.0)
    df["la_ratio"] = df["la"] / (df["la"] + df["ld"] + 1e-5)
    df["exp_per_file"] = df["exp"] / (df["nf"] + 1.0)
    df["recent_exp_ratio"] = df["rexp"] / (df["exp"] + 1.0)
    df["exp_vs_complexity"] = df["exp_per_file"] / (df["entropy"] + 1e-5)
    df["subsystem_familiarity"] = df["sexp"] / (df["exp"] + 1e-5)
    df["churn_intensity"] = (df["la"] + df["ld"]) * df["entropy"]
    df["dev_density_risk"] = df["ndev"] / (df["age"] + 1.0)
    df["diffusion_factor"] = (df["nd"] * df["ns"]) / (df["nf"] + 1.0)
    df["churn_asymmetry"] = np.abs(df["la"] - df["ld"]) / (df["la"] + df["ld"] + 1.0)
    df["churn_per_file"] = (df["la"] + df["ld"]) / (df["nf"] + 1.0)
    df["fragility_index"] = (df["age"] * df["nuc"]) / (df["exp"] + 1.0)
    df["subsystem_entropy"] = df["entropy"] / (df["ns"] + 1.0)
    df["rexp_vs_sexp"] = (df["rexp"] + 1.0) / (df["sexp"] + 1.0)

    for col in LOG_SCALE_FEATURES:
        if col in df.columns:
            df[col] = np.log1p(df[col].clip(lower=0))

    X = df[ENGINEERED_FEATURE_COLUMNS].values
    y = df[LABEL_COLUMN].values.astype(int)
    churn = (df["la"] + df["ld"]).values.reshape(-1, 1)

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    churn_train, churn_test = churn[:split_idx], churn[split_idx:]

    print(f"    Total samples: {len(df):,} | Train: {len(X_train):,} | Test: {len(X_test):,}")
    print(f"    Test defect prevalence: {y_test.mean()*100:.2f}% ({y_test.sum():,} / {len(y_test):,})")
    return (X_train, X_test, y_train, y_test, churn_train, churn_test)


def bootstrap_auc_ci(y_true, y_prob, n_bootstraps=500, alpha=0.05, seed=42):
    rng = np.random.RandomState(seed)
    bootstrapped_scores = []
    n = len(y_true)

    for _ in range(n_bootstraps):
        indices = rng.randint(0, n, n)
        if len(np.unique(y_true[indices])) < 2:
            continue
        score = roc_auc_score(y_true[indices], y_prob[indices])
        bootstrapped_scores.append(score)

    sorted_scores = np.array(sorted(bootstrapped_scores))
    lower = np.percentile(sorted_scores, (alpha / 2.0) * 100)
    upper = np.percentile(sorted_scores, (1.0 - alpha / 2.0) * 100)
    return float(lower), float(upper)


def paired_bootstrap_test(y_true, prob_a, prob_b, n_bootstraps=500, alpha=0.05, seed=42):
    """
    Computes paired difference in ROC-AUC (AUC_a - AUC_b) across bootstrap resamples.
    Returns: (mean_diff, lower_ci, upper_ci, p_val_diff_le_0)
    """
    rng = np.random.RandomState(seed)
    diffs = []
    n = len(y_true)

    for _ in range(n_bootstraps):
        indices = rng.randint(0, n, n)
        if len(np.unique(y_true[indices])) < 2:
            continue
        score_a = roc_auc_score(y_true[indices], prob_a[indices])
        score_b = roc_auc_score(y_true[indices], prob_b[indices])
        diffs.append(score_a - score_b)

    sorted_diffs = np.array(sorted(diffs))
    mean_diff = float(np.mean(sorted_diffs))
    lower = float(np.percentile(sorted_diffs, (alpha / 2.0) * 100))
    upper = float(np.percentile(sorted_diffs, (1.0 - alpha / 2.0) * 100))
    p_val = float(np.mean(sorted_diffs <= 0))
    return round(mean_diff, 4), round(lower, 4), round(upper, 4), round(p_val, 4)


def run_benchmark():
    X_train, X_test, y_train, y_test, churn_train, churn_test = load_and_prep_data()

    train_prevalence = float(y_train.mean())
    test_prevalence = float(y_test.mean())
    prevalence = test_prevalence
    brier_train_prior = float(np.mean(y_test * ((1.0 - train_prevalence) ** 2) + (1.0 - y_test) * (train_prevalence ** 2)))
    brier_test_prior = test_prevalence * (1.0 - test_prevalence)
    print(f"\n[2] Empirical Baselines & Prevalence:")
    print(f"    - Historical Train Defect Prevalence: {train_prevalence*100:.2f}%")
    print(f"    - Future Test Defect Prevalence:       {prevalence*100:.2f}%")
    print(f"    - Train-Prevalence Prior Brier Loss:   {brier_train_prior:.4f}")
    print(f"    - Test-Prevalence Prior Brier Loss:    {brier_test_prior:.4f} (conservative)")
    print(f"    - Random Guess ROC-AUC: 0.5000 | PR-AUC: {prevalence:.4f}")

    results = {}

    # Model 1: Churn-Only Baseline (Platt Calibrated on Train)
    print("\n[3] Training Baseline 1: Churn-Only Logistic Regression (Platt Calibrated)...")
    scaler_churn = StandardScaler()
    churn_tr_scaled = scaler_churn.fit_transform(np.log1p(churn_train))
    churn_te_scaled = scaler_churn.transform(np.log1p(churn_test))

    base_lr_churn = LogisticRegression(class_weight="balanced", random_state=42)
    cal_lr_churn = CalibratedClassifierCV(estimator=base_lr_churn, method="sigmoid", cv=3)
    cal_lr_churn.fit(churn_tr_scaled, y_train)
    prob_churn = cal_lr_churn.predict_proba(churn_te_scaled)[:, 1]

    auc_churn = float(roc_auc_score(y_test, prob_churn))
    prauc_churn = float(average_precision_score(y_test, prob_churn))
    brier_churn = float(brier_score_loss(y_test, prob_churn))
    ci_lower_churn, ci_upper_churn = bootstrap_auc_ci(y_test, prob_churn, n_bootstraps=500)

    results["churn_only"] = {
        "name": "Churn-Only (la + ld)",
        "auc_roc": round(auc_churn, 4),
        "auc_roc_95ci": [round(ci_lower_churn, 4), round(ci_upper_churn, 4)],
        "pr_auc": round(prauc_churn, 4),
        "brier_score": round(brier_churn, 4),
        "bss_vs_train_prior": round(1.0 - (brier_churn / brier_train_prior), 4),
        "bss_vs_test_prior": round(1.0 - (brier_churn / brier_test_prior), 4),
    }

    # Model 2: Logistic Regression (All 28 features, Platt Calibrated on Train)
    print("\n[4] Training Baseline 2: Standard Logistic Regression (All 28 features, Platt Calibrated)...")
    scaler_full = StandardScaler()
    X_train_scaled = scaler_full.fit_transform(X_train)
    X_test_scaled = scaler_full.transform(X_test)

    base_lr_full = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    cal_lr_full = CalibratedClassifierCV(estimator=base_lr_full, method="sigmoid", cv=3)
    cal_lr_full.fit(X_train_scaled, y_train)
    prob_lr = cal_lr_full.predict_proba(X_test_scaled)[:, 1]

    auc_lr = float(roc_auc_score(y_test, prob_lr))
    prauc_lr = float(average_precision_score(y_test, prob_lr))
    brier_lr = float(brier_score_loss(y_test, prob_lr))
    ci_lower_lr, ci_upper_lr = bootstrap_auc_ci(y_test, prob_lr, n_bootstraps=500)

    results["logistic_regression"] = {
        "name": "Standard Logistic Regression",
        "auc_roc": round(auc_lr, 4),
        "auc_roc_95ci": [round(ci_lower_lr, 4), round(ci_upper_lr, 4)],
        "pr_auc": round(prauc_lr, 4),
        "brier_score": round(brier_lr, 4),
        "bss_vs_train_prior": round(1.0 - (brier_lr / brier_train_prior), 4),
        "bss_vs_test_prior": round(1.0 - (brier_lr / brier_test_prior), 4),
    }

    # Model 3: DevRisk Calibrated Ensemble
    print("\n[5] Evaluating Model 3: DevRisk AI Calibrated Ensemble...")
    if os.path.exists(MODEL_PATH):
        ensemble = joblib.load(MODEL_PATH)
        prob_ensemble = ensemble.predict_proba(X_test)[:, 1]
        auc_ens = float(roc_auc_score(y_test, prob_ensemble))
        prauc_ens = float(average_precision_score(y_test, prob_ensemble))
        brier_ens = float(brier_score_loss(y_test, prob_ensemble))
        ci_lower_ens, ci_upper_ens = bootstrap_auc_ci(y_test, prob_ensemble, n_bootstraps=500)

        # Paired Bootstrap Tests (Ensemble vs Baselines)
        diff_churn, diff_c_lo, diff_c_hi, p_churn = paired_bootstrap_test(y_test, prob_ensemble, prob_churn, n_bootstraps=500)
        diff_lr, diff_lr_lo, diff_lr_hi, p_lr = paired_bootstrap_test(y_test, prob_ensemble, prob_lr, n_bootstraps=500)

        p_churn_str = "< 0.002" if p_churn == 0 else f"{p_churn:.4f}"
        p_lr_str = "< 0.002" if p_lr == 0 else f"{p_lr:.4f}"

        results["calibrated_ensemble"] = {
            "name": "DevRisk Calibrated Ensemble (XGB+RF)",
            "auc_roc": round(auc_ens, 4),
            "auc_roc_95ci": [round(ci_lower_ens, 4), round(ci_upper_ens, 4)],
            "pr_auc": round(prauc_ens, 4),
            "brier_score": round(brier_ens, 4),
            "bss_vs_train_prior": round(1.0 - (brier_ens / brier_train_prior), 4),
            "bss_vs_test_prior": round(1.0 - (brier_ens / brier_test_prior), 4),
        }

        paired_comparison = {
            "ensemble_vs_churn": {
                "delta_auc": diff_churn,
                "delta_auc_95ci": [diff_c_lo, diff_c_hi],
                "p_value_display": p_churn_str,
                "p_value_raw": p_churn,
            },
            "ensemble_vs_logistic_regression": {
                "delta_auc": diff_lr,
                "delta_auc_95ci": [diff_lr_lo, diff_lr_hi],
                "p_value_display": p_lr_str,
                "p_value_raw": p_lr,
            }
        }
        results["paired_bootstrap_tests"] = paired_comparison
    else:
        print("    ⚠️ Calibrated model pkl not found at model/calibrated_model.pkl")

    # Output comparison table
    print("\n" + "=" * 94)
    print("  EMPIRICAL BASELINE COMPARISON (Held-Out ApacheJIT Split, N=21,335)")
    print("  All models evaluated on identical chronological 80/20 split & Platt calibrated")
    print("=" * 94)
    print(f"{'Model Architecture':<36} | {'ROC-AUC [95% CI]':<22} | {'PR-AUC':<8} | {'Brier':<8} | {'BSS (Train)':<12} | {'BSS (Test)':<10}")
    print("-" * 94)
    for key in ["churn_only", "logistic_regression", "calibrated_ensemble"]:
        if key in results:
            data = results[key]
            ci_str = f"{data['auc_roc']:.3f} [{data['auc_roc_95ci'][0]:.3f}–{data['auc_roc_95ci'][1]:.3f}]"
            print(f"{data['name']:<36} | {ci_str:<22} | {data['pr_auc']:<8.3f} | {data['brier_score']:<8.3f} | {data['bss_vs_train_prior']:<+12.3f} | {data['bss_vs_test_prior']:<+10.3f}")
    print("=" * 94)

    if "paired_bootstrap_tests" in results:
        pb = results["paired_bootstrap_tests"]
        print("\n" + "=" * 94)
        print("  PAIRED BOOTSTRAP TEST FOR ROC-AUC DIFFERENCE (500 resamples)")
        print("=" * 94)
        c_test = pb["ensemble_vs_churn"]
        lr_test = pb["ensemble_vs_logistic_regression"]
        print(f"  Ensemble vs Churn-Only: ΔAUC = {c_test['delta_auc']:+.4f} [95% CI: {c_test['delta_auc_95ci'][0]:+.4f} to {c_test['delta_auc_95ci'][1]:+.4f}] (p {c_test['p_value_display']})")
        print(f"  Ensemble vs Logistic Regression: ΔAUC = {lr_test['delta_auc']:+.4f} [95% CI: {lr_test['delta_auc_95ci'][0]:+.4f} to {lr_test['delta_auc_95ci'][1]:+.4f}] (p {lr_test['p_value_display']})")
        print("=" * 94 + "\n")

    with open(OUTPUT_METRICS_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"✅ Baseline comparison saved to {OUTPUT_METRICS_PATH}\n")


if __name__ == "__main__":
    run_benchmark()
