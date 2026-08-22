"""
============================================================
DevRisk AI — Calibrated Stacked (XGBoost + LightGBM) Pipeline
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

from sklearn.model_selection import TimeSeriesSplit, train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import StackingClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score,
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score,
)
import xgboost as xgb
import joblib

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
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
PLOTS_DIR = os.path.join(BASE_DIR, "plots")

RAW_FEATURE_COLUMNS = [
    "ns", "nd", "nf", "entropy", "la", "ld", "lt",
    "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp",
]

# We use apachejit_total.csv, map names if they differ
COLUMN_MAPPING = {
    "aexp": "exp",
    "arexp": "rexp",
    "asexp": "sexp",
}

ENGINEERED_FEATURE_COLUMNS = RAW_FEATURE_COLUMNS + [
    "churn_density", "la_ratio", "exp_per_file", "recent_exp_ratio",
    "exp_vs_complexity", "subsystem_familiarity", "churn_intensity", "dev_density_risk"
]

LOG_SCALE_FEATURES = ["exp", "rexp", "sexp", "age", "nuc"] # Removed la,ld,lt because we will z-score them

LABEL_COLUMN = "buggy"
RANDOM_STATE = 42

COST_FN = 5.0
COST_FP = 1.0


class DevRiskPipeline:
    """Production-ready OOP Pipeline for DevRisk Stacking Training."""

    def __init__(self):
        self.df = None
        self.scale_pos_weight = 1.0
        self.base_model = None
        self.calibrated_model = None
        self.metrics = {}

    def run(self):
        print("\n" + "=" * 60)
        print("  DevRisk AI — Calibrated Stacked ML Pipeline")
        print("=" * 60)

        self.load_and_engineer_data()
        X_train, X_test, y_train, y_test = self.split_data()
        
        cv_auc, cv_std, oof_probs = self.cross_validate(X_train, y_train)
        
        best_threshold, min_cost = self.optimize_threshold(y_train, oof_probs)
        
        self.train_and_calibrate(X_train, y_train)
        
        self.evaluate(X_test, y_test, best_threshold)
        
        self.analyze_shap(X_test)
        
        self.save_artifacts(cv_auc, cv_std, min_cost)
        
        print("\n" + "=" * 60)
        print("  ✅ TRAINING COMPLETE")
        print(f"  AUC-ROC: {self.metrics['auc_roc']}")
        print(f"  Buggy Recall: {self.metrics['recall']} (Threshold: {self.metrics['decision_threshold']})")
        print("=" * 60 + "\n")

    def load_and_engineer_data(self):
        print("\n[1] Loading & Engineering Features...")
        if not os.path.exists(DATA_PATH):
            raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

        self.df = pd.read_csv(DATA_PATH).fillna(0)
        print(f"    Raw Dataset loaded: {len(self.df)} rows")
        
        df = self.df.copy()
        
        # Temporal Sort for walk-forward validation
        if "author_date" in df.columns:
            df = df.sort_values(by="author_date").reset_index(drop=True)

        # Group-wise Feature Normalization
        if "project" in df.columns:
            for col in ["la", "ld", "lt", "entropy"]:
                if col in df.columns:
                    df[col] = df.groupby("project")[col].transform(lambda x: (x - x.mean()) / (x.std() + 1e-5))
        
        # Primary Ratios
        df["churn_density"] = (df["la"] + df["ld"]) / (df["lt"] + 1)
        df["la_ratio"] = df["la"] / (df["la"] + df["ld"] + 1e-5)
        df["exp_per_file"] = df["exp"] / (df["nf"] + 1)
        df["recent_exp_ratio"] = df["rexp"] / (df["exp"] + 1)
        
        # Advanced Interactions
        df["exp_vs_complexity"] = df["exp_per_file"] / (df["entropy"] + 1e-5)
        df["subsystem_familiarity"] = df["sexp"] / (df["exp"] + 1e-5)
        df["churn_intensity"] = (df["la"] + df["ld"]) * df["entropy"]
        df["dev_density_risk"] = df["ndev"] / (df["age"] + 1)
        
        # Log scaling (only on non-standardized features to avoid neg values log)
        for col in LOG_SCALE_FEATURES:
            if col in df.columns:
                df[col] = df[col].clip(lower=0)
                df[col] = np.log1p(df[col])
            
        self.df = df
        
        buggy_count = self.df[LABEL_COLUMN].sum()
        clean_count = len(self.df) - buggy_count
        self.scale_pos_weight = clean_count / max(buggy_count, 1)
        print(f"    Calculated scale_pos_weight: {self.scale_pos_weight:.2f}")

    def split_data(self):
        print("\n[2] Splitting Data (Temporal Walk-Forward)...")
        # Ensure we use the exact columns needed
        missing_cols = [c for c in ENGINEERED_FEATURE_COLUMNS if c not in self.df.columns]
        if missing_cols:
            print(f"    ⚠️ Missing columns: {missing_cols}")
            for c in missing_cols:
                self.df[c] = 0.0
                
        X = self.df[ENGINEERED_FEATURE_COLUMNS].values
        y = self.df[LABEL_COLUMN].values

        # 80% Train, 20% Test (Temporally Split since df is already sorted by author_date)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        print(f"    Train: {len(X_train)} (Older), Test: {len(X_test)} (Newer)")
        return X_train, X_test, y_train, y_test

    def get_xgboost_params(self):
        optuna_path = os.path.join(MODEL_DIR, "optuna_best_params.json")
        if os.path.exists(optuna_path):
            print("    Loaded optimized XGBoost params from Optuna.")
            with open(optuna_path, "r") as f:
                params = json.load(f)
        else:
            params = {
                "n_estimators": 300,
                "max_depth": 5,
                "learning_rate": 0.05,
                "colsample_bytree": 0.55,
                "colsample_bylevel": 0.7,
                "min_child_weight": 5,
                "gamma": 0.2,
                "reg_alpha": 0.5,
                "reg_lambda": 1.5,
            }
        
        params.update({
            "eval_metric": "logloss",
            "random_state": RANDOM_STATE,
            "use_label_encoder": False,
            "scale_pos_weight": self.scale_pos_weight,
            "n_jobs": -1
        })
        return params

    def build_stacking_classifier(self):
        xgb_params = self.get_xgboost_params()
        
        # HistGradientBoosting Params (Sklearn native, AppLocker safe)
        hgb_params = {
            "max_iter": xgb_params.get("n_estimators", 300),
            "learning_rate": xgb_params.get("learning_rate", 0.05),
            "max_depth": xgb_params.get("max_depth", 5),
            "random_state": RANDOM_STATE,
        }
        
        estimators = [
            ('xgb', xgb.XGBClassifier(**xgb_params)),
            ('hgb', HistGradientBoostingClassifier(**hgb_params))
        ]
        
        clf = StackingClassifier(
            estimators=estimators,
            final_estimator=LogisticRegression(class_weight="balanced", random_state=RANDOM_STATE),
            cv=3,
            n_jobs=1
        )
        return clf

    def cross_validate(self, X_train, y_train):
        print("\n[3] Running 5-fold TimeSeries CV (Walk-Forward)...")
        tscv = TimeSeriesSplit(n_splits=5)
        oof_probs = np.zeros(len(y_train))
        cv_auc_scores = []
        
        clf = self.build_stacking_classifier()
        
        for train_idx, val_idx in tscv.split(X_train):
            X_tr, y_tr = X_train[train_idx], y_train[train_idx]
            X_val, y_val = X_train[val_idx], y_train[val_idx]
            
            clf.fit(X_tr, y_tr)
            preds = clf.predict_proba(X_val)[:, 1]
            oof_probs[val_idx] = preds
            cv_auc_scores.append(roc_auc_score(y_val, preds))
            
        cv_auc, cv_std = np.mean(cv_auc_scores), np.std(cv_auc_scores)
        print(f"    Walk-Forward CV AUC-ROC: {cv_auc:.4f} ± {cv_std:.4f}")
        return cv_auc, cv_std, oof_probs

    def optimize_threshold(self, y_train, oof_probs):
        print("\n[4] Cost-Sensitive Threshold Optimization...")
        best_threshold = 0.5
        min_cost = float('inf')
        
        # Note: TimeSeriesSplit means early folds' validation sets didn't get preds for all of y_train.
        # We only evaluate threshold on indices that actually received predictions.
        # Non-predicted indices will have prob 0.0 (from zeros init).
        valid_idx = np.where(oof_probs > 0)[0]
        if len(valid_idx) == 0:
            return 0.5, 0.0
            
        valid_y = y_train[valid_idx]
        valid_probs = oof_probs[valid_idx]
        
        for thresh in np.arange(0.15, 0.86, 0.01):
            preds = (valid_probs >= thresh).astype(int)
            tn, fp, fn, tp = confusion_matrix(valid_y, preds).ravel()
            
            cost = (COST_FN * fn) + (COST_FP * fp)
            if cost < min_cost:
                min_cost = cost
                best_threshold = thresh
                
        print(f"    ✅ Minimized Cost: {min_cost:.2f} at Threshold: {best_threshold:.2f}")
        return float(best_threshold), float(min_cost)

    def train_and_calibrate(self, X_train, y_train):
        print("\n[5] Training Stacked Model & Calibrating probabilities...")
        # Split train set for calibration holdout (80/20 of temporal split)
        calib_split_idx = int(len(X_train) * 0.8)
        X_tr, X_cal = X_train[:calib_split_idx], X_train[calib_split_idx:]
        y_tr, y_cal = y_train[:calib_split_idx], y_train[calib_split_idx:]
        
        self.base_model = self.build_stacking_classifier()
        self.base_model.fit(X_tr, y_tr)
        
        # Fit calibrator on holdout (Isotonic)
        self.calibrated_model = CalibratedClassifierCV(
            estimator=self.base_model, method='isotonic', cv='prefit'
        )
        self.calibrated_model.fit(X_cal, y_cal)
        print("    ✅ Stacked model trained and Calibration fitted (Isotonic).")

    def evaluate(self, X_test, y_test, threshold):
        print("\n[6] Evaluating Calibrated Model...")
        y_prob = self.calibrated_model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= threshold).astype(int)

        auc_roc = roc_auc_score(y_test, y_prob)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, target_names=["Clean", "Buggy"], output_dict=True)

        print(f"\n  📊 Test Set Results (Threshold = {threshold:.2f}):")
        print(f"  {'=' * 40}")
        print(f"  AUC-ROC:    {auc_roc:.4f}")
        print(f"  Accuracy:   {accuracy:.4f}")
        print(f"  F1 Score:   {f1:.4f}")
        print(f"  Precision:  {report['Buggy']['precision']:.4f}")
        print(f"  Recall:     {report['Buggy']['recall']:.4f}")
        print(f"  {'=' * 40}")

        os.makedirs(PLOTS_DIR, exist_ok=True)
        cm = confusion_matrix(y_test, y_pred)
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["Clean", "Buggy"], yticklabels=["Clean", "Buggy"], ax=ax)
        ax.set_title(f"Confusion Matrix (Thresh={threshold:.2f})")
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "01_confusion_matrix_calibrated_stack.png"), dpi=150)
        plt.close()

        # Compute cost reduction
        default_preds = (y_prob >= 0.5).astype(int)
        _, default_fp, default_fn, _ = confusion_matrix(y_test, default_preds).ravel()
        default_cost = (COST_FN * default_fn) + (COST_FP * default_fp)
        
        _, opt_fp, opt_fn, _ = confusion_matrix(y_test, y_pred).ravel()
        opt_cost = (COST_FN * opt_fn) + (COST_FP * opt_fp)
        
        cost_reduction = 0
        if default_cost > 0:
            cost_reduction = ((default_cost - opt_cost) / default_cost) * 100
        
        print(f"  📉 Total Cost Reduction vs Default 0.5 Thresh: {cost_reduction:.1f}%")

        self.metrics = {
            "auc_roc": round(auc_roc, 4),
            "accuracy": round(accuracy, 4),
            "f1_score": round(f1, 4),
            "precision": round(report["Buggy"]["precision"], 4),
            "recall": round(report["Buggy"]["recall"], 4),
            "decision_threshold": round(threshold, 2),
            "cost_reduction_pct": round(cost_reduction, 2),
            "test_size": len(y_test),
            "test_buggy_count": int(y_test.sum()),
            "confusion_matrix": cm.tolist(),
        }

    def analyze_shap(self, X_test):
        print("\n[7] SHAP Explainability Analysis...")
        if not SHAP_AVAILABLE:
            print("    ⚠️ SHAP unavailable, skipping.")
            return

        try:
            # We extract the XGBoost estimator from the StackingClassifier to explain it.
            # (SHAP does not support StackingClassifier directly).
            xgb_estimator = self.base_model.named_estimators_['xgb']
            explainer = shap.TreeExplainer(xgb_estimator)
            
            # Subsample X_test for SHAP if it's too large
            if len(X_test) > 5000:
                np.random.seed(42)
                idx = np.random.choice(len(X_test), 5000, replace=False)
                X_sample = X_test[idx]
            else:
                X_sample = X_test
                
            shap_values = explainer.shap_values(X_sample)
            
            fig, ax = plt.subplots(figsize=(10, 7))
            shap.summary_plot(shap_values, X_sample, feature_names=ENGINEERED_FEATURE_COLUMNS, show=False)
            plt.tight_layout()
            plt.savefig(os.path.join(PLOTS_DIR, "02_shap_summary_stack.png"), dpi=150, bbox_inches="tight")
            plt.close()

            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            shap_ranking = sorted(zip(ENGINEERED_FEATURE_COLUMNS, mean_abs_shap), key=lambda x: x[1], reverse=True)

            print(f"\n  📊 SHAP Feature Ranking (XGB Base Model):")
            for rank, (name, value) in enumerate(shap_ranking[:10], 1):
                print(f"    {rank:>2}. {name:<25} = {value:.4f}")
        except Exception as e:
            print(f"    ⚠️ Failed to generate SHAP plots: {e}")

    def save_artifacts(self, cv_auc, cv_std, min_cost):
        print("\n[8] Saving Model & Artifacts...")
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # Save Stacking model and Calibrated Stacked model
        base_path = os.path.join(MODEL_DIR, "xgboost_model.pkl") # Kept same name for compatibility with explainer API
        # Actually it's now a StackingClassifier, let's keep the name for compatibility or change it.
        joblib.dump(self.base_model, base_path)
        
        calib_path = os.path.join(MODEL_DIR, "calibrated_model.pkl")
        joblib.dump(self.calibrated_model, calib_path)
        
        self.metrics["cv_auc_roc_mean"] = round(float(cv_auc), 4)
        self.metrics["cv_auc_roc_std"] = round(float(cv_std), 4)
        self.metrics["train_minimized_cost"] = round(float(min_cost), 2)
        self.metrics["feature_columns"] = ENGINEERED_FEATURE_COLUMNS
        self.metrics["training_date"] = pd.Timestamp.now().isoformat()

        metrics_path = os.path.join(MODEL_DIR, "training_metrics.json")
        with open(metrics_path, "w") as f:
            json.dump(self.metrics, f, indent=2)

        columns_path = os.path.join(MODEL_DIR, "feature_columns.json")
        with open(columns_path, "w") as f:
            json.dump(ENGINEERED_FEATURE_COLUMNS, f)

        print(f"    ✅ Saved models to {MODEL_DIR}")


if __name__ == "__main__":
    pipeline = DevRiskPipeline()
    pipeline.run()
