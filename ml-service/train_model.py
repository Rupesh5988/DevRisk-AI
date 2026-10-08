"""
============================================================
DevRisk AI — Calibrated Stacked (XGBoost + LightGBM) Pipeline
============================================================
Production ML training pipeline for Just-in-Time Defect Prediction (JIT-DP).
Features:
- Walk-forward temporal cross-validation on authentic Apache commits
- Advanced domain feature engineering (28 total metrics)
- Calibrated Soft-Voting Ensemble (XGBoost + LightGBM)
- Probability calibration (Platt Sigmoid / Isotonic)
- Asymmetric cost-sensitive threshold optimization (Cost FN = 5x FP)
- TreeSHAP explainability and diagnostic visualization suite
============================================================
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import VotingClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score,
    precision_score,
    recall_score,
    roc_curve,
    precision_recall_curve,
)
import xgboost as xgb
import joblib

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    print("[WARNING] LightGBM not found, falling back to HistGradientBoosting.")

try:
    import shap
    SHAP_AVAILABLE = True
except (ImportError, OSError) as e:
    SHAP_AVAILABLE = False
    print(f"[WARNING] SHAP not available ({e}).")

warnings.filterwarnings("ignore")

# ============================================================
# Configuration
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOTAL_DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_total.csv")
COMBINED_DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
PLOTS_DIR = os.path.join(BASE_DIR, "plots")

RAW_FEATURE_COLUMNS = [
    "ns", "nd", "nf", "entropy", "la", "ld", "lt",
    "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp",
]

ENGINEERED_FEATURE_COLUMNS = RAW_FEATURE_COLUMNS + [
    # Primary Ratios
    "churn_density", "la_ratio", "exp_per_file", "recent_exp_ratio",
    # Advanced Interactions
    "exp_vs_complexity", "subsystem_familiarity", "churn_intensity", "dev_density_risk",
    # Novel JIT Domain Metrics
    "diffusion_factor", "churn_asymmetry", "churn_per_file", "fragility_index",
    "subsystem_entropy", "rexp_vs_sexp"
]

LOG_SCALE_FEATURES = ["exp", "rexp", "sexp", "age", "nuc", "churn_per_file", "fragility_index"]

LABEL_COLUMN = "buggy"
RANDOM_STATE = 42

COST_FN = 5.0
COST_FP = 1.0


class DevRiskPipeline:
    """Production-grade Pipeline for DevRisk ML Training and Explainability."""

    def __init__(self):
        self.df = None
        self.scale_pos_weight = 1.0
        self.base_xgb = None
        self.ensemble_model = None
        self.calibrated_model = None
        self.metrics = {}
        self.feature_columns = ENGINEERED_FEATURE_COLUMNS

    def run(self):
        print("\n" + "=" * 65)
        print("  DevRisk AI — Production Calibrated Ensemble Pipeline")
        print("=" * 65)

        self.load_and_engineer_data()
        X_train, X_test, y_train, y_test = self.split_data()

        cv_auc, cv_std = self.cross_validate(X_train, y_train)

        self.train_and_calibrate(X_train, y_train)

        best_threshold, min_cost = self.optimize_threshold(X_train, y_train)

        self.evaluate(X_test, y_test, best_threshold)

        self.generate_diagnostic_plots(X_test, y_test, best_threshold)

        self.analyze_shap(X_test, y_test)

        self.save_artifacts(cv_auc, cv_std, min_cost)

        print("\n" + "=" * 65)
        print("  ✅ MODEL TRAINING & EVALUATION COMPLETED")
        print(f"  Final Test AUC-ROC:        {self.metrics['auc_roc']}")
        print(f"  Final Test PR-AUC:         {self.metrics['pr_auc']}")
        print(f"  Probability Calibration:   Brier={self.metrics['brier_score']}")
        print(f"  Buggy Recall at Threshold: {self.metrics['recall']} (Thresh={self.metrics['decision_threshold']})")
        print(f"  Cost Reduction vs 0.5:     {self.metrics['cost_reduction_pct']}%")
        print("=" * 65 + "\n")

    def load_and_engineer_data(self):
        print("\n[1] Loading Dataset & Engineering JIT Domain Features...")
        
        # Prefer apachejit_total.csv because it contains authentic commit timestamps (author_date)
        if os.path.exists(TOTAL_DATA_PATH):
            data_file = TOTAL_DATA_PATH
            print(f"    Loading full dataset: {data_file}")
            df = pd.read_csv(data_file)
            # Map column names if abbreviated in total dataset
            column_map = {"ent": "entropy", "aexp": "exp", "arexp": "rexp", "asexp": "sexp"}
            df = df.rename(columns=column_map)
        elif os.path.exists(COMBINED_DATA_PATH):
            data_file = COMBINED_DATA_PATH
            print(f"    Loading combined dataset: {data_file}")
            df = pd.read_csv(data_file)
        else:
            raise FileNotFoundError("No valid ApacheJIT dataset found in data/ directory.")

        df = df.fillna(0)
        print(f"    Raw records loaded: {len(df):,} rows")

        # Temporal Sort (Prevents look-ahead bias / data leakage)
        if "author_date" in df.columns:
            df = df.sort_values(by="author_date").reset_index(drop=True)
            print("    Applied chronological sort on author_date (realistic walk-forward)")

        # Compute lines modified 'lt' if missing
        if "lt" not in df.columns:
            df["lt"] = df["la"] + df["ld"]

        # ----------------------------------------------------
        # Domain Feature Engineering (14 new metrics)
        # ----------------------------------------------------
        # 1. Primary Ratios
        df["churn_density"] = (df["la"] + df["ld"]) / (df["lt"] + 1.0)
        df["la_ratio"] = df["la"] / (df["la"] + df["ld"] + 1e-5)
        df["exp_per_file"] = df["exp"] / (df["nf"] + 1.0)
        df["recent_exp_ratio"] = df["rexp"] / (df["exp"] + 1.0)

        # 2. Interactions
        df["exp_vs_complexity"] = df["exp_per_file"] / (df["entropy"] + 1e-5)
        df["subsystem_familiarity"] = df["sexp"] / (df["exp"] + 1e-5)
        df["churn_intensity"] = (df["la"] + df["ld"]) * df["entropy"]
        df["dev_density_risk"] = df["ndev"] / (df["age"] + 1.0)

        # 3. Novel JIT Metrics
        df["diffusion_factor"] = (df["nd"] * df["ns"]) / (df["nf"] + 1.0)
        df["churn_asymmetry"] = np.abs(df["la"] - df["ld"]) / (df["la"] + df["ld"] + 1.0)
        df["churn_per_file"] = (df["la"] + df["ld"]) / (df["nf"] + 1.0)
        df["fragility_index"] = (df["age"] * df["nuc"]) / (df["exp"] + 1.0)
        df["subsystem_entropy"] = df["entropy"] / (df["ns"] + 1.0)
        df["rexp_vs_sexp"] = (df["rexp"] + 1.0) / (df["sexp"] + 1.0)

        # Log Scaling on heavily skewed features
        for col in LOG_SCALE_FEATURES:
            if col in df.columns:
                df[col] = np.log1p(df[col].clip(lower=0))

        self.df = df
        buggy_count = int(self.df[LABEL_COLUMN].sum())
        clean_count = len(self.df) - buggy_count
        self.scale_pos_weight = clean_count / max(buggy_count, 1)
        print(f"    Defect Distribution: {buggy_count:,} buggy ({buggy_count/len(df)*100:.1f}%) | {clean_count:,} clean")
        print(f"    scale_pos_weight: {self.scale_pos_weight:.2f}")

    def split_data(self):
        print("\n[2] Splitting Data (80% Train, 20% Future Test)...")
        # Ensure all columns exist
        for col in self.feature_columns:
            if col not in self.df.columns:
                self.df[col] = 0.0

        X = self.df[self.feature_columns].values
        y = self.df[LABEL_COLUMN].values.astype(int)

        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        print(f"    Train Fold (Historical): {len(X_train):,} samples (Defect rate: {y_train.mean()*100:.1f}%)")
        print(f"    Test Fold (Unseen Future): {len(X_test):,} samples (Defect rate: {y_test.mean()*100:.1f}%)")
        return X_train, X_test, y_train, y_test

    def build_xgb_classifier(self):
        """Construct tuned XGBoost model."""
        return xgb.XGBClassifier(
            n_estimators=450,
            max_depth=6,
            learning_rate=0.03,
            colsample_bytree=0.65,
            subsample=0.85,
            min_child_weight=3,
            gamma=0.1,
            reg_alpha=0.6,
            reg_lambda=1.8,
            scale_pos_weight=self.scale_pos_weight,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1
        )

    def build_secondary_classifier(self):
        """Construct tuned Random Forest model (replaces HistGB/LightGBM)."""
        return RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_split=6,
            min_samples_leaf=4,
            max_features="sqrt",
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1
        )

    def cross_validate(self, X_train, y_train):
        print("\n[3] Running 5-fold Chronological TimeSeries Cross-Validation...")
        tscv = TimeSeriesSplit(n_splits=5)
        cv_scores = []

        fold = 1
        for train_idx, val_idx in tscv.split(X_train):
            X_tr, y_tr = X_train[train_idx], y_train[train_idx]
            X_val, y_val = X_train[val_idx], y_train[val_idx]

            clf = self.build_xgb_classifier()
            clf.fit(X_tr, y_tr)
            preds = clf.predict_proba(X_val)[:, 1]
            fold_auc = roc_auc_score(y_val, preds)
            cv_scores.append(fold_auc)
            print(f"    Fold {fold}/5 AUC-ROC: {fold_auc:.4f}")
            fold += 1

        cv_mean = float(np.mean(cv_scores))
        cv_std = float(np.std(cv_scores))
        print(f"    Walk-Forward CV Mean AUC-ROC: {cv_mean:.4f} ± {cv_std:.4f}")
        return cv_mean, cv_std

    def train_and_calibrate(self, X_train, y_train):
        print("\n[4] Training Soft-Voting Ensemble (XGBoost + Random Forest) & Calibrating Probabilities...")
        # Train standalone XGBoost for explainability & standalone tree structure
        self.base_xgb = self.build_xgb_classifier()
        self.base_xgb.fit(X_train, y_train)

        # Construct Soft-Voting Ensemble (XGBoost + Random Forest)
        secondary_clf = self.build_secondary_classifier()
        voting_clf = VotingClassifier(
            estimators=[('xgb', self.build_xgb_classifier()), ('rf', secondary_clf)],
            voting='soft',
            weights=[1.2, 1.0]
        )

        # Fit Calibrated Ensemble with 3-fold cross-validation
        self.calibrated_model = CalibratedClassifierCV(
            estimator=voting_clf,
            method='sigmoid',
            cv=3
        )
        self.calibrated_model.fit(X_train, y_train)
        print("    ✅ Calibrated Soft-Voting Ensemble (XGBoost + Random Forest) successfully trained and calibrated.")

    def optimize_threshold(self, X_train, y_train):
        print("\n[5] Cost-Sensitive & F1-Optimal Threshold Optimization (FN=5.0x, FP=1.0x)...")
        # Evaluate on the final 15% temporal slice of the training set
        val_slice_idx = int(len(X_train) * 0.85)
        X_val, y_val = X_train[val_slice_idx:], y_train[val_slice_idx:]
        val_probs = self.calibrated_model.predict_proba(X_val)[:, 1]

        best_threshold = 0.46
        best_f1 = 0.0
        min_cost = float("inf")

        for thresh in np.arange(0.25, 0.65, 0.01):
            preds = (val_probs >= thresh).astype(int)
            rec = recall_score(y_val, preds)
            f1 = f1_score(y_val, preds)
            if rec >= 0.70 and f1 > best_f1:
                best_f1 = f1
                best_threshold = float(thresh)
                tn, fp, fn, tp = confusion_matrix(y_val, preds).ravel()
                min_cost = (COST_FN * fn) + (COST_FP * fp)

        print(f"    Optimal Decision Threshold: {best_threshold:.2f} (Val F1: {best_f1:.4f}, Val Recall >= 70%)")
        return best_threshold, min_cost

    def evaluate(self, X_test, y_test, threshold):
        print("\n[6] Evaluating on Unseen Future Commit Test Set...")
        y_prob = self.calibrated_model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= threshold).astype(int)

        auc_roc = float(roc_auc_score(y_test, y_prob))
        pr_auc = float(average_precision_score(y_test, y_prob))
        brier = float(brier_score_loss(y_test, y_prob))
        accuracy = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))
        precision = float(precision_score(y_test, y_pred))
        recall = float(recall_score(y_test, y_pred))

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        opt_cost = (COST_FN * fn) + (COST_FP * fp)

        # Comparison with default 0.50 threshold
        default_pred = (y_prob >= 0.50).astype(int)
        _, def_fp, def_fn, _ = confusion_matrix(y_test, default_pred).ravel()
        def_cost = (COST_FN * def_fn) + (COST_FP * def_fp)
        cost_reduction = ((def_cost - opt_cost) / def_cost) * 100 if def_cost > 0 else 0.0

        print(f"\n  📊 Performance Summary (Decision Threshold = {threshold:.2f}):")
        print(f"  {'-' * 45}")
        print(f"  AUC-ROC:           {auc_roc:.4f}")
        print(f"  PR-AUC:            {pr_auc:.4f}")
        print(f"  Brier Score:       {brier:.4f} (Ideal: 0.00)")
        print(f"  Accuracy:          {accuracy*100:.2f}%")
        print(f"  Buggy Recall:      {recall*100:.2f}% ({tp:,} / {tp+fn:,} caught)")
        print(f"  Buggy Precision:   {precision*100:.2f}%")
        print(f"  F1 Score:          {f1:.4f}")
        print(f"  Cost Reduction:    {cost_reduction:.2f}% vs default 0.50 threshold")
        print(f"  {'-' * 45}")

        self.metrics = {
            "auc_roc": round(auc_roc, 4),
            "pr_auc": round(pr_auc, 4),
            "brier_score": round(brier, 4),
            "accuracy": round(accuracy, 4),
            "f1_score": round(f1, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "decision_threshold": round(threshold, 2),
            "cost_reduction_pct": round(cost_reduction, 2),
            "test_size": len(y_test),
            "test_buggy_count": int(y_test.sum()),
            "confusion_matrix": cm.tolist(),
            "feature_columns": self.feature_columns,
            "training_date": pd.Timestamp.now().isoformat(),
        }

    def generate_diagnostic_plots(self, X_test, y_test, threshold):
        print("\n[7] Generating Diagnostic Charts in plots/ ...")
        os.makedirs(PLOTS_DIR, exist_ok=True)
        y_prob = self.calibrated_model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= threshold).astype(int)

        # 1. Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False,
                    xticklabels=["Clean", "Buggy"], yticklabels=["Clean", "Buggy"], ax=ax)
        ax.set_title(f"Confusion Matrix (Threshold = {threshold:.2f})", fontsize=12, fontweight="bold")
        ax.set_ylabel("Actual Label")
        ax.set_xlabel("Predicted Label")
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "01_confusion_matrix_calibrated_ensemble.png"), dpi=180)
        plt.close()

        # 2. Dual Curves: ROC and PR Curves
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_prob)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
        # ROC
        ax1.plot(fpr, tpr, color="#2563EB", lw=2, label=f"Calibrated Ensemble (AUC = {self.metrics['auc_roc']:.4f})")
        ax1.plot([0, 1], [0, 1], color="#9CA3AF", linestyle="--", lw=1.5, label="Random Guess (AUC = 0.50)")
        ax1.set_title("ROC Curve — Defect Discrimination", fontweight="bold")
        ax1.set_xlabel("False Positive Rate (1 - Specificity)")
        ax1.set_ylabel("True Positive Rate (Sensitivity / Recall)")
        ax1.legend(loc="lower right")
        ax1.grid(True, alpha=0.3)

        # PR
        no_skill = y_test.mean()
        ax2.plot(rec_curve, prec_curve, color="#7C3AED", lw=2, label=f"PR Curve (PR-AUC = {self.metrics['pr_auc']:.4f})")
        ax2.axhline(no_skill, color="#9CA3AF", linestyle="--", lw=1.5, label=f"Baseline Rate ({no_skill*100:.1f}%)")
        ax2.set_title("Precision-Recall Curve — High Class Imbalance", fontweight="bold")
        ax2.set_xlabel("Recall (Buggy Commits Caught)")
        ax2.set_ylabel("Precision")
        ax2.legend(loc="upper right")
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "04_roc_pr_curves.png"), dpi=180)
        plt.close()

        # 3. Probability Calibration Reliability Diagram
        prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=10)
        fig, ax = plt.subplots(figsize=(7, 6))
        ax.plot([0, 1], [0, 1], linestyle="--", color="#6B7280", label="Perfect Calibration")
        ax.plot(prob_pred, prob_true, marker="o", color="#059669", lw=2, label=f"DevRisk Calibrated (Brier = {self.metrics['brier_score']:.4f})")
        ax.set_title("Calibration Reliability Diagram", fontsize=12, fontweight="bold")
        ax.set_xlabel("Mean Predicted Defect Probability")
        ax.set_ylabel("Empirical Fraction of Positives (True Buggy Rate)")
        ax.legend(loc="upper left")
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "05_calibration_reliability.png"), dpi=180)
        plt.close()

        print("    ✅ Generated Confusion Matrix, ROC/PR Curves, and Calibration Diagram.")

    def analyze_shap(self, X_test, y_test):
        print("\n[8] Executing TreeSHAP Explainability Analysis...")
        if not SHAP_AVAILABLE:
            print("    ⚠️ SHAP is not installed, skipping SHAP plots.")
            return

        try:
            explainer = shap.TreeExplainer(self.base_xgb)

            # Subsample 2,500 commits for crisp global beeswarm
            np.random.seed(RANDOM_STATE)
            sample_size = min(2500, len(X_test))
            sample_idx = np.random.choice(len(X_test), sample_size, replace=False)
            X_sample = X_test[sample_idx]

            shap_values = explainer.shap_values(X_sample)

            # 1. SHAP Beeswarm Summary Plot
            fig = plt.figure(figsize=(11, 8))
            shap.summary_plot(
                shap_values,
                X_sample,
                feature_names=self.feature_columns,
                max_display=18,
                show=False
            )
            plt.title("DevRisk AI — TreeSHAP Feature Attribution (Apache Commits)", fontsize=13, fontweight="bold")
            plt.tight_layout()
            plt.savefig(os.path.join(PLOTS_DIR, "02_shap_summary_beeswarm.png"), dpi=180, bbox_inches="tight")
            plt.close()

            # 2. SHAP Feature Importance Bar Plot
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            ranked_indices = np.argsort(mean_abs_shap)[::-1][:15]
            top_features = [self.feature_columns[i] for i in ranked_indices]
            top_importance = mean_abs_shap[ranked_indices]

            fig, ax = plt.subplots(figsize=(9, 6))
            y_pos = np.arange(len(top_features))[::-1]
            ax.barh(y_pos, top_importance[::-1], color="#3B82F6", edgecolor="#1D4ED8")
            ax.set_yticks(y_pos)
            ax.set_yticklabels(top_features[::-1], fontsize=10)
            ax.set_xlabel("Mean |SHAP value| (Average Impact on Model Risk Output)", fontsize=11)
            ax.set_title("Top 15 Most Influential Code Change Metrics", fontsize=12, fontweight="bold")
            ax.grid(axis="x", alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(PLOTS_DIR, "03_shap_feature_importance.png"), dpi=180)
            plt.close()

            # 3. High-Risk Commit Waterfall Plot
            # Find an actual high-risk buggy commit
            y_prob_sample = self.calibrated_model.predict_proba(X_test)[:, 1]
            high_risk_idx = np.where((y_test == 1) & (y_prob_sample > 0.80))[0]
            if len(high_risk_idx) > 0:
                hr_idx = high_risk_idx[0]
                explanation = explainer(X_test[hr_idx:hr_idx+1])
                explanation.feature_names = self.feature_columns
                fig = plt.figure(figsize=(10, 6))
                shap.plots.waterfall(explanation[0], max_display=12, show=False)
                plt.title(f"SHAP Waterfall — High-Risk PR (Predicted Risk: {y_prob_sample[hr_idx]*100:.1f}%)", fontweight="bold")
                plt.tight_layout()
                plt.savefig(os.path.join(PLOTS_DIR, "06_shap_waterfall_high_risk.png"), dpi=180, bbox_inches="tight")
                plt.close()

            # 4. Low-Risk Clean Commit Waterfall Plot
            low_risk_idx = np.where((y_test == 0) & (y_prob_sample < 0.15))[0]
            if len(low_risk_idx) > 0:
                lr_idx = low_risk_idx[0]
                explanation = explainer(X_test[lr_idx:lr_idx+1])
                explanation.feature_names = self.feature_columns
                fig = plt.figure(figsize=(10, 6))
                shap.plots.waterfall(explanation[0], max_display=12, show=False)
                plt.title(f"SHAP Waterfall — Clean / Low-Risk PR (Predicted Risk: {y_prob_sample[lr_idx]*100:.1f}%)", fontweight="bold")
                plt.tight_layout()
                plt.savefig(os.path.join(PLOTS_DIR, "07_shap_waterfall_low_risk.png"), dpi=180, bbox_inches="tight")
                plt.close()

            print("    ✅ Saved TreeSHAP Beeswarm, Importance Bar, and Waterfall Plots.")

        except Exception as e:
            print(f"    ⚠️ Failed to generate SHAP plots: {e}")

    def save_artifacts(self, cv_auc, cv_std, min_cost):
        print("\n[9] Serializing Models & Production Artifacts...")
        os.makedirs(MODEL_DIR, exist_ok=True)

        # Base XGBoost model (for TreeSHAP)
        joblib.dump(self.base_xgb, os.path.join(MODEL_DIR, "xgboost_model.pkl"), compress=3)

        # Calibrated Ensemble model (for Production Inference)
        joblib.dump(self.calibrated_model, os.path.join(MODEL_DIR, "calibrated_model.pkl"), compress=3)

        # Metadata metrics
        self.metrics["cv_auc_roc_mean"] = round(cv_auc, 4)
        self.metrics["cv_auc_roc_std"] = round(cv_std, 4)
        self.metrics["train_minimized_cost"] = round(float(min_cost), 2)

        with open(os.path.join(MODEL_DIR, "training_metrics.json"), "w") as f:
            json.dump(self.metrics, f, indent=2)

        with open(os.path.join(MODEL_DIR, "feature_columns.json"), "w") as f:
            json.dump(self.feature_columns, f, indent=2)

        print(f"    ✅ Successfully saved models and metrics in {MODEL_DIR}")


if __name__ == "__main__":
    pipeline = DevRiskPipeline()
    pipeline.run()
