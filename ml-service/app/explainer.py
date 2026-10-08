"""
============================================================
SHAP Explainer Module
============================================================
Computes TreeSHAP attribution values for pull request predictions
and translates mathematical feature contributions into intuitive,
plain-English explanations for developers and code reviewers.
============================================================
"""

import os
import joblib
import numpy as np
from .predictor import predictor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XGBOOST_MODEL_PATH = os.path.join(BASE_DIR, "model", "xgboost_model.pkl")

try:
    import shap
    SHAP_AVAILABLE = True
except (ImportError, OSError):
    SHAP_AVAILABLE = False
    print("[Explainer] WARNING: SHAP not available -- using feature importance fallback")

# Plain-English templates for all 28 features (both raw & engineered domain metrics)
SHAP_TEMPLATES = {
    "ns": {
        "positive": "Changes span {value} subsystems — wide architectural spread increases defect probability",
        "negative": "Changes are contained within {value} subsystem(s) — focused, localized scope",
    },
    "nd": {
        "positive": "Modifications touch {value} distinct directories — scattered directory footprint",
        "negative": "Modifications are restricted to {value} directory(ies) — well-contained footprint",
    },
    "nf": {
        "positive": "{value} files modified — broad attack surface and higher regression likelihood",
        "negative": "Only {value} file(s) changed — minimal file surface area",
    },
    "entropy": {
        "positive": "Unevenly distributed changes (entropy: {value:.2f}) — concentrated code modifications",
        "negative": "Evenly distributed changes (entropy: {value:.2f}) — balanced, orderly modifications",
    },
    "la": {
        "positive": "{value} lines added — substantial new logic introduced",
        "negative": "Only {value} lines added — lightweight addition",
    },
    "ld": {
        "positive": "{value} lines deleted — large removals may break implicit dependencies",
        "negative": "Only {value} lines deleted — minimal disruption to existing codebase",
    },
    "lt": {
        "positive": "Modified files encompass {value} total lines — altering large files has wider blast radius",
        "negative": "Modified files are relatively compact ({value} total lines) — lower blast radius",
    },
    "fix": {
        "positive": "This commit addresses an existing defect — historical data shows bug fixes have higher recurrence risk",
        "negative": "Standard feature / non-fix commit — typical baseline defect incidence",
    },
    "ndev": {
        "positive": "{value} distinct past contributors on these files — fragmented code ownership",
        "negative": "Only {value} past contributor(s) — consistent code conventions and ownership",
    },
    "age": {
        "positive": "Files were last modified ~{value:.0f} days ago — dormant/stale files carry hidden coupling",
        "negative": "Files were actively maintained (~{value:.0f} days ago) — fresh in team memory",
    },
    "nuc": {
        "positive": "Files have undergone {value} prior revisions — defect-prone hotspot files",
        "negative": "Files have only {value} prior revision(s) — historically stable code",
    },
    "exp": {
        "positive": "Contributor has only {value} lifetime commits in this repo — unfamiliar with overall patterns",
        "negative": "Contributor has {value} prior commits — highly experienced repository contributor",
    },
    "rexp": {
        "positive": "Contributor has only {value} recent commits in last 90 days — may be out of sync with current practices",
        "negative": "Contributor has {value} recent commits — actively immersed in the codebase",
    },
    "sexp": {
        "positive": "Contributor has only {value} prior commits in these specific subsystems — unfamiliar domain",
        "negative": "Contributor has {value} commits in these subsystems — recognized domain specialist",
    },
    "churn_density": {
        "positive": "High churn density ({value:.2f}) — a large fraction of the file's contents was rewritten",
        "negative": "Low churn density ({value:.2f}) — surgical modification without rewriting file structure",
    },
    "la_ratio": {
        "positive": "Heavily skewed towards addition ({value:.2f}) — significant influx of unverified code",
        "negative": "Balanced addition/deletion ratio ({value:.2f}) — standard refactoring pattern",
    },
    "exp_per_file": {
        "positive": "Low author experience per touched file ({value:.2f}) — contributor is spread thin across files",
        "negative": "High author experience per touched file ({value:.2f}) — thoroughly familiar with each file",
    },
    "recent_exp_ratio": {
        "positive": "Low recent activity ratio ({value:.2f}) — contributor history is predominantly distant",
        "negative": "High recent activity ratio ({value:.2f}) — contributor's recent track record is strong",
    },
    "exp_vs_complexity": {
        "positive": "Change complexity exceeds contributor's experience factor ({value:.2f})",
        "negative": "Contributor's experience comfortably handles the change complexity ({value:.2f})",
    },
    "subsystem_familiarity": {
        "positive": "Low subsystem specialization ({value:.2f}) — author rarely touches these components",
        "negative": "High subsystem specialization ({value:.2f}) — author knows these components deeply",
    },
    "churn_intensity": {
        "positive": "High churn intensity ({value:.2f}) — large volume of changes concentrated in high-entropy zones",
        "negative": "Low churn intensity ({value:.2f}) — modest changes in simple, low-entropy zones",
    },
    "dev_density_risk": {
        "positive": "High author turnover rate relative to file age ({value:.2f}) — multiple authors without single owner",
        "negative": "Stable ownership density ({value:.2f}) — low author churn over file lifetime",
    },
    "diffusion_factor": {
        "positive": "High architectural diffusion ({value:.2f}) — changes span multiple subsystems across few files",
        "negative": "Low architectural diffusion ({value:.2f}) — changes remain tightly bounded within directory structure",
    },
    "churn_asymmetry": {
        "positive": "High churn asymmetry ({value:.2f}) — massive one-sided edit indicates rewrite volatility",
        "negative": "Balanced churn symmetry ({value:.2f}) — symmetric additions and removals suggest routine refactor",
    },
    "churn_per_file": {
        "positive": "High churn per file ({value:.2f}) — dense modifications concentrated per file",
        "negative": "Low churn per file ({value:.2f}) — lightweight edits per file",
    },
    "fragility_index": {
        "positive": "Elevated codebase fragility ({value:.2f}) — frequent historical revisions touched by newer author",
        "negative": "Low fragility ({value:.2f}) — stable codebase touched by experienced developer",
    },
    "subsystem_entropy": {
        "positive": "Subsystem modification is unevenly concentrated ({value:.2f})",
        "negative": "Subsystem modification is evenly distributed ({value:.2f})",
    },
    "rexp_vs_sexp": {
        "positive": "Contributor is active in other repo areas but has little experience in these specific subsystems ({value:.2f})",
        "negative": "Contributor's recent activity aligns closely with their subsystem experience ({value:.2f})",
    },
}


class Explainer:
    """
    Computes TreeSHAP feature attributions for individual PR predictions
    and produces plain-English explanations highlighting key risk drivers.
    """

    def __init__(self):
        self.explainer = None
        self.tree_model = None
        self.use_fallback = False
        self._initialize()

    def _initialize(self):
        """Initialize SHAP TreeExplainer from the serialized base XGBoost model."""
        if not os.path.exists(XGBOOST_MODEL_PATH):
            print(f"[Explainer] WARNING: Model file not found: {XGBOOST_MODEL_PATH}")
            return

        try:
            raw_model = joblib.load(XGBOOST_MODEL_PATH)
            # If wrapped in StackingClassifier or VotingClassifier, extract base estimator
            if hasattr(raw_model, "named_estimators_") and "xgb" in raw_model.named_estimators_:
                self.tree_model = raw_model.named_estimators_["xgb"]
            elif hasattr(raw_model, "estimators_") and len(raw_model.estimators_) > 0:
                self.tree_model = raw_model.estimators_[0]
            else:
                self.tree_model = raw_model

            print(f"[Explainer] OK: Loaded base XGBoost tree model from {XGBOOST_MODEL_PATH}")
        except Exception as e:
            print(f"[Explainer] ERROR: Failed to load tree model: {e}")
            return

        if not SHAP_AVAILABLE:
            print("[Explainer] WARNING: SHAP library unavailable -- using feature importance fallback")
            self.use_fallback = True
            return

        try:
            self.explainer = shap.TreeExplainer(self.tree_model)
            print("[Explainer] OK: TreeSHAP Explainer initialized successfully")
        except Exception as e:
            print(f"[Explainer] ERROR: TreeExplainer initialization failed ({e}) -- fallback enabled")
            self.use_fallback = True

    @property
    def is_ready(self) -> bool:
        return self.explainer is not None or self.use_fallback

    def explain(self, features: list[float]) -> dict:
        """
        Compute per-feature SHAP attributions for a 14-element PR vector.

        Returns:
            dict containing:
                - shap_values (list[float]): Raw attribution per feature
                - base_value (float): Expected model base output
                - explanations (list[dict]): Ranked explanations (highest impact first)
                - risk_escalators (list[dict]): Top features driving risk UP
                - safety_factors (list[dict]): Top features driving risk DOWN
        """
        if not self.is_ready:
            raise RuntimeError("SHAP Explainer is not initialized. Ensure models are trained.")

        if self.use_fallback:
            return self._explain_fallback(features)

        return self._explain_shap(features)

    def _explain_shap(self, features: list[float]) -> dict:
        """High-speed TreeSHAP computation."""
        feature_array = predictor.transform_features(features)
        transformed = feature_array[0]

        shap_vals = self.explainer.shap_values(feature_array)

        # Extract 1D array of SHAP attributions
        if isinstance(shap_vals, list):
            sv = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif shap_vals.ndim == 2:
            sv = shap_vals[0]
        else:
            sv = shap_vals

        base_val = float(self.explainer.expected_value)
        if isinstance(self.explainer.expected_value, (list, np.ndarray)):
            base_val = float(self.explainer.expected_value[1]) if len(self.explainer.expected_value) > 1 else float(self.explainer.expected_value[0])

        explanations = []
        feature_names = predictor.feature_columns

        for i, name in enumerate(feature_names):
            shap_val = float(sv[i])
            feat_val = float(transformed[i])
            direction = "positive" if shap_val >= 0 else "negative"

            template = SHAP_TEMPLATES.get(name, {}).get(direction, f"{name}: {feat_val:.2f}")
            disp_val = int(feat_val) if feat_val.is_integer() else round(feat_val, 2)

            try:
                explanation_text = template.format(value=disp_val)
            except (KeyError, ValueError):
                explanation_text = template.replace("{value}", str(disp_val))

            explanations.append({
                "feature_name": name,
                "shap_value": round(shap_val, 6),
                "feature_value": round(feat_val, 4),
                "direction": direction,
                "explanation": explanation_text,
            })

        # Rank all features by absolute SHAP impact
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # Categorize into top risk escalators and safety factors
        risk_escalators = [e for e in explanations if e["direction"] == "positive"][:5]
        safety_factors = [e for e in explanations if e["direction"] == "negative"][:5]

        return {
            "shap_values": [round(float(v), 6) for v in sv],
            "base_value": round(base_val, 6),
            "explanations": explanations,
            "risk_escalators": risk_escalators,
            "safety_factors": safety_factors,
        }

    def _explain_fallback(self, features: list[float]) -> dict:
        """Gini / Gain feature importance fallback when SHAP C-extensions are blocked."""
        importances = getattr(self.tree_model, "feature_importances_", np.ones(len(predictor.feature_columns)))
        transformed = predictor.transform_features(features)[0]

        explanations = []
        for i, name in enumerate(predictor.feature_columns):
            imp = float(importances[i])
            feat_val = float(transformed[i])
            direction = "positive" if feat_val > 0 else "negative"
            template = SHAP_TEMPLATES.get(name, {}).get(direction, f"{name}: {feat_val:.2f}")
            disp_val = int(feat_val) if feat_val.is_integer() else round(feat_val, 2)

            try:
                explanation_text = template.format(value=disp_val)
            except (KeyError, ValueError):
                explanation_text = template.replace("{value}", str(disp_val))

            explanations.append({
                "feature_name": name,
                "shap_value": round(imp, 6),
                "feature_value": round(feat_val, 4),
                "direction": direction,
                "explanation": explanation_text,
            })

        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return {
            "shap_values": [round(float(v), 6) for v in importances],
            "base_value": 0.5,
            "explanations": explanations,
            "risk_escalators": explanations[:5],
            "safety_factors": [],
        }


# Singleton instance
explainer = Explainer()
