"""
============================================================
SHAP Explainer Module
============================================================
Computes SHAP values for individual predictions and converts
them into human-readable explanations.
============================================================
"""

import os
import joblib
import numpy as np
from .predictor import predictor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XGBOOST_MODEL_PATH = os.path.join(BASE_DIR, "model", "xgboost_model.pkl")

# SHAP is optional — may fail on systems where numba DLLs are blocked
try:
    import shap
    SHAP_AVAILABLE = True
except (ImportError, OSError):
    SHAP_AVAILABLE = False
    print("[Explainer] ⚠️  SHAP not available — using XGBoost feature importance fallback")

# Feature columns will be loaded dynamically from the predictor's model artifacts

# Plain-English templates for each feature
# {value} is replaced with the actual feature value
SHAP_TEMPLATES = {
    "ns": {
        "positive": "Changes span {value} subsystems — wide spread increases risk",
        "negative": "Changes are contained within {value} subsystem(s) — focused change",
    },
    "nd": {
        "positive": "Modifications touch {value} directories — scattered changes are riskier",
        "negative": "Only {value} directory(ies) modified — well-contained change",
    },
    "nf": {
        "positive": "{value} files modified — more files means more risk surface",
        "negative": "Only {value} file(s) changed — minimal scope",
    },
    "entropy": {
        "positive": "Changes are unevenly distributed (entropy: {value:.2f}) — concentrated edits",
        "negative": "Changes are evenly spread (entropy: {value:.2f}) — balanced modification",
    },
    "la": {
        "positive": "{value} lines added — large additions often introduce bugs",
        "negative": "Only {value} lines added — small, manageable addition",
    },
    "ld": {
        "positive": "{value} lines deleted — large deletions can break existing dependencies",
        "negative": "Only {value} lines removed — minimal disruption",
    },
    "lt": {
        "positive": "Modified files contain {value} total lines — changing large files has more side effects",
        "negative": "Modified files are relatively small ({value} lines) — lower risk surface",
    },
    "fix": {
        "positive": "This is a bug-fix commit — bug fixes sometimes introduce new regressions",
        "negative": "This is a feature/non-fix commit — typically lower regression risk",
    },
    "ndev": {
        "positive": "{value} different developers have previously touched these files — inconsistent styles",
        "negative": "Only {value} developer(s) have worked on these files — consistent codebase",
    },
    "age": {
        "positive": "Files haven't been modified in ~{value:.0f} days — stale files are fragile",
        "negative": "Files were recently updated (~{value:.0f} days ago) — actively maintained",
    },
    "nuc": {
        "positive": "Files have {value} prior unique changes — frequently changed files are unstable",
        "negative": "Files have only {value} prior change(s) — stable codebase",
    },
    "exp": {
        "positive": "Developer has only {value} prior commits — limited experience with this repo",
        "negative": "Developer has {value} prior commits — experienced contributor",
    },
    "rexp": {
        "positive": "Developer has only {value} commits in the last 90 days — not recently active",
        "negative": "Developer has {value} recent commits — actively working on this repo",
    },
    "sexp": {
        "positive": "Developer has only {value} commits to these subsystems — unfamiliar territory",
        "negative": "Developer has {value} commits to these subsystems — knows this area well",
    },
    "churn_density": {
        "positive": "High churn density ({value:.2f}) — many lines modified relative to file size",
        "negative": "Low churn density ({value:.2f}) — minimal disruption to file structure",
    },
    "la_ratio": {
        "positive": "High addition ratio ({value:.2f}) — mostly adding new code",
        "negative": "Low addition ratio ({value:.2f}) — mostly deleting code",
    },
    "exp_per_file": {
        "positive": "Low experience per file ({value:.2f}) — developer is stretched thin",
        "negative": "High experience per file ({value:.2f}) — developer knows these files well",
    },
    "recent_exp_ratio": {
        "positive": "Low recent experience ratio ({value:.2f}) — developer hasn't worked here recently",
        "negative": "High recent experience ratio ({value:.2f}) — developer is actively engaged",
    },
    "dev_density_risk": {
        "positive": "High developer density over time ({value:.2f}) — too many cooks in a short timeframe",
        "negative": "Low developer density ({value:.2f}) — stable, consistent ownership",
    },
    "exp_vs_complexity": {
        "positive": "Experience outweighs complexity ({value:.2f}) — developer can handle this",
        "negative": "Complexity outweighs experience ({value:.2f}) — high risk of introducing bugs",
    },
    "subsystem_familiarity": {
        "positive": "High subsystem familiarity ({value:.2f}) — expert in this domain",
        "negative": "Low subsystem familiarity ({value:.2f}) — modifying unfamiliar components",
    },
    "churn_intensity": {
        "positive": "High churn intensity ({value:.2f}) — large, complex edits",
        "negative": "Low churn intensity ({value:.2f}) — straightforward, simple edits",
    }
}


class Explainer:
    """
    Computes SHAP values and generates human-readable explanations
    for individual predictions.
    """

    def __init__(self):
        self.explainer = None
        self.base_model = None
        self.use_fallback = False
        self._initialize()

    def _initialize(self):
        """Create the SHAP TreeExplainer from the uncalibrated base model."""
        if not os.path.exists(XGBOOST_MODEL_PATH):
            print(f"[Explainer] ⚠️  Base model not found at {XGBOOST_MODEL_PATH} — explainer unavailable")
            return
            
        try:
            self.base_model = joblib.load(XGBOOST_MODEL_PATH)
            print(f"[Explainer] ✅ Loaded base model for SHAP from {XGBOOST_MODEL_PATH}")
        except Exception as e:
            print(f"[Explainer] ❌ Failed to load base model: {e}")
            return

        if not SHAP_AVAILABLE:
            print("[Explainer] ⚠️  SHAP unavailable — using feature importance fallback")
            self.use_fallback = True
            return

        try:
            self.explainer = shap.TreeExplainer(self.base_model)
            print("[Explainer] ✅ SHAP TreeExplainer initialized on base model")
        except Exception as e:
            print(f"[Explainer] ❌ SHAP init failed ({e}) — using fallback")
            self.use_fallback = True

    @property
    def is_ready(self) -> bool:
        return self.explainer is not None or self.use_fallback

    def explain(self, features: list[float]) -> dict:
        """
        Compute SHAP values and generate explanations for a prediction.

        Args:
            features: List of 14 float values.

        Returns:
            dict with:
                - shap_values: List of 14 SHAP values
                - base_value: Base prediction value
                - explanations: List of explanation dicts sorted by impact
        """
        if not self.is_ready:
            raise RuntimeError("Explainer is not initialized")

        # If SHAP is not available, use XGBoost feature importances as fallback
        if self.use_fallback:
            return self._explain_fallback(features)

        return self._explain_shap(features)

    def _explain_fallback(self, features: list[float]) -> dict:
        """Fallback explanation using XGBoost built-in feature importances."""
        importances = self.base_model.feature_importances_

        transformed_features = predictor.transform_features(features)[0]

        explanations = []
        for i, feature_name in enumerate(predictor.feature_columns):
            imp = float(importances[i])
            feat_val = transformed_features[i]
            # Use importance as a pseudo-SHAP value (positive = more important)
            direction = "positive" if imp > np.median(importances) else "negative"

            template = SHAP_TEMPLATES.get(feature_name, {}).get(direction, f"{feature_name}: {feat_val}")
            try:
                explanation_text = template.format(value=feat_val)
            except (KeyError, ValueError):
                explanation_text = template.replace("{value}", str(round(feat_val, 2)))

            explanations.append({
                "feature_name": feature_name,
                "shap_value": round(imp, 6),
                "feature_value": round(feat_val, 4),
                "explanation": explanation_text,
            })

        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        return {
            "shap_values": [round(float(v), 6) for v in importances],
            "base_value": 0.5,
            "explanations": explanations,
        }

    def _explain_shap(self, features: list[float]) -> dict:
        """Full SHAP explanation using TreeExplainer."""

        feature_array = predictor.transform_features(features)
        transformed_features = feature_array[0]

        # Compute SHAP values
        shap_values = self.explainer.shap_values(feature_array)

        # shap_values shape depends on the model type
        # For binary classification, it may be a single array or [class_0, class_1]
        if isinstance(shap_values, list):
            # Multi-output: use class 1 (buggy)
            sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        elif shap_values.ndim == 2:
            sv = shap_values[0]
        else:
            sv = shap_values

        # Get base value
        base_value = float(self.explainer.expected_value)
        if isinstance(self.explainer.expected_value, (list, np.ndarray)):
            base_value = float(self.explainer.expected_value[1]) if len(self.explainer.expected_value) > 1 else float(self.explainer.expected_value[0])

        # Build explanations
        explanations = []
        for i, feature_name in enumerate(predictor.feature_columns):
            shap_val = float(sv[i])
            feat_val = transformed_features[i]
            direction = "positive" if shap_val >= 0 else "negative"

            # Generate English explanation
            template = SHAP_TEMPLATES.get(feature_name, {}).get(direction, f"{feature_name}: {feat_val}")
            try:
                explanation_text = template.format(value=feat_val)
            except (KeyError, ValueError):
                explanation_text = template.replace("{value}", str(int(feat_val) if feat_val == int(feat_val) else round(feat_val, 2)))

            explanations.append({
                "feature_name": feature_name,
                "shap_value": round(shap_val, 6),
                "feature_value": round(feat_val, 4),
                "explanation": explanation_text,
            })

        # Sort by absolute SHAP value (biggest impact first)
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        return {
            "shap_values": [round(float(v), 6) for v in sv],
            "base_value": round(base_value, 6),
            "explanations": explanations,
        }


# Singleton instance
explainer = Explainer()
