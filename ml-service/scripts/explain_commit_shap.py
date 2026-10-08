"""
============================================================
SHAP Waterfall Plot Generator
============================================================
"""

import os
import sys
import json
import joblib
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.predictor import predictor

def main():
    print("=" * 60)
    print("  SHAP Waterfall Plot Generator")
    print("=" * 60)

    if not SHAP_AVAILABLE:
        print("❌ SHAP is not available.")
        return

    MODEL_PATH = os.path.join(BASE_DIR, "model", "xgboost_model.pkl")
    if not os.path.exists(MODEL_PATH):
        print("❌ Base XGBoost model not found. Cannot compute SHAP.")
        return

    base_model = joblib.load(MODEL_PATH)
    explainer = shap.TreeExplainer(base_model)

    # High Risk Commit Raw Features
    # ["ns", "nd", "nf", "entropy", "la", "ld", "lt", "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp"]
    commit_raw = [5, 8, 15, 3.5, 850, 45, 1200, 1, 15, 2, 2, 5, 1, 1]
    
    # Transform to 22 features using predictor
    feature_array = predictor.transform_features(commit_raw)
    feature_names = predictor.feature_columns

    print("  Computing SHAP values...")
    shap_values = explainer(feature_array)
    
    PLOT_PATH = os.path.join(BASE_DIR, "plots", "10_commit_shap_waterfall.png")
    os.makedirs(os.path.dirname(PLOT_PATH), exist_ok=True)
    
    # Generate Waterfall Plot
    # Ensure it's a single explanation object for the waterfall plot
    if len(shap_values.shape) > 1:
        single_shap = shap_values[0]
    else:
        single_shap = shap_values

    # Set feature names
    single_shap.feature_names = feature_names

    plt.figure(figsize=(10, 8))
    shap.plots.waterfall(single_shap, show=False)
    plt.title("SHAP Waterfall: High-Risk Refactor Commit", fontsize=14, fontweight="bold")
    plt.tight_layout()
    plt.savefig(PLOT_PATH, dpi=150)
    plt.close()
    
    print(f"  ✅ SHAP Waterfall Plot saved to: {PLOT_PATH}\n")

if __name__ == "__main__":
    main()
