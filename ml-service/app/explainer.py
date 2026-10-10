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
        "positive": "Spans {value} subsystems — wide architectural spread increases defect risk",
        "negative": "Confined to {value} subsystem(s) — isolated domain scope",
    },
    "nd": {
        "positive": "Modifications touch {value} distinct directories — scattered directory footprint",
        "negative": "Restricted to {value} directory(ies) — well-contained directory scope",
    },
    "nf": {
        "positive": "{value} files modified — wide review surface and higher regression risk",
        "negative": "Only {value} file(s) modified — compact change surface",
    },
    "entropy": {
        "positive": "Scattered modifications (entropy: {value:.2f}) — edits dispersed across files",
        "negative": "Concentrated modifications (entropy: {value:.2f}) — orderly, localized edits",
    },
    "la": {
        "positive": "{value} lines added — large influx of new code",
        "negative": "Only {value} lines added — lightweight, low-risk addition",
    },
    "ld": {
        "positive": "{value} lines deleted — substantial code removal may break callers",
        "negative": "Only {value} lines deleted — routine cleanup with minimal disruption",
    },
    "lt": {
        "positive": "Modified files contain {value} total lines — large files have higher blast radius",
        "negative": "Modified files are compact ({value} total lines) — localized blast radius",
    },
    "fix": {
        "positive": "Bug fix commit — bug fixes carry 2x higher defect recurrence risk",
        "negative": "Routine task/feature commit — baseline defect probability",
    },
    "ndev": {
        "positive": "{value} prior authors on files — high contributor turnover and mixed styles",
        "negative": "Only {value} prior author(s) — clear ownership and consistent conventions",
    },
    "age": {
        "positive": "Files dormant for ~{value:.0f} days — stale code carries obsolete assumptions",
        "negative": "Files actively maintained (~{value:.0f} days ago) — current test context",
    },
    "nuc": {
        "positive": "Files revised {value} times historically — defect-prone hotspot code",
        "negative": "Only {value} historical revision(s) — historically stable code",
    },
    "exp": {
        "positive": "Author has {value} lifetime commits — new contributor to this repository",
        "negative": "Author has {value} prior commits — experienced repository contributor",
    },
    "rexp": {
        "positive": "Author has {value} recent commits in last 90 days — low recent commit velocity",
        "negative": "Author has {value} recent commits in last 90 days — active and current context",
    },
    "sexp": {
        "positive": "Author has only {value} previous commits in these subsystems — first-time domain edits",
        "negative": "Author has {value} commits in these subsystems — recognized domain specialist",
    },
    "churn_density": {
        "positive": "High churn density ({value:.2f}) — large fraction of target files rewritten",
        "negative": "Low churn density ({value:.2f}) — surgical modification without rewriting file structure",
    },
    "la_ratio": {
        "positive": "Heavily skewed towards additions ({value:.2f}) — large volume of new code paths",
        "negative": "Balanced additions and deletions ({value:.2f}) — routine refactoring pattern",
    },
    "exp_per_file": {
        "positive": "Low author experience per touched file ({value:.2f}) — author scope is spread thin",
        "negative": "High author experience per touched file ({value:.2f}) — author knows each modified file well",
    },
    "recent_exp_ratio": {
        "positive": "Low recent activity ratio ({value:.2f}) — author history is predominantly older commits",
        "negative": "High recent activity ratio ({value:.2f}) — author is actively shipping code in recent sprints",
    },
    "exp_vs_complexity": {
        "positive": "Change complexity exceeds author experience factor ({value:.2f}) — recommend senior pair review",
        "negative": "Author experience comfortably matches change complexity ({value:.2f})",
    },
    "subsystem_familiarity": {
        "positive": "Low subsystem specialization ({value:.2f}) — author editing outside core domain",
        "negative": "High subsystem specialization ({value:.2f}) — author editing within core domain",
    },
    "churn_intensity": {
        "positive": "High review strain index ({value:.2f}) — heavy volume concentrated in scattered files",
        "negative": "Low review strain index ({value:.2f}) — modest, straightforward review burden",
    },
    "dev_density_risk": {
        "positive": "High author turnover relative to file age ({value:.2f}) — lack of single code ownership",
        "negative": "Stable ownership density ({value:.2f}) — clear, consistent code stewardship",
    },
    "diffusion_factor": {
        "positive": "High architectural diffusion ({value:.2f}) — changes touch opposing ends of the architecture",
        "negative": "Low architectural diffusion ({value:.2f}) — changes stay tightly bounded within package",
    },
    "churn_asymmetry": {
        "positive": "High churn asymmetry ({value:.2f}) — one-sided rewrite indicates high volatility",
        "negative": "Balanced churn symmetry ({value:.2f}) — symmetric changes indicate routine refactoring",
    },
    "churn_per_file": {
        "positive": "High churn per file ({value:.2f}) — dense modifications concentrated per file",
        "negative": "Low churn per file ({value:.2f}) — lightweight edits per file",
    },
    "fragility_index": {
        "positive": "High code fragility ({value:.2f}) — volatile legacy code touched by newer author",
        "negative": "Low fragility ({value:.2f}) — resilient codebase touched by experienced author",
    },
    "subsystem_entropy": {
        "positive": "Subsystem modification is unevenly concentrated ({value:.2f})",
        "negative": "Subsystem modification is cleanly distributed ({value:.2f})",
    },
    "rexp_vs_sexp": {
        "positive": "Active in other repository areas but has limited history in these subsystems ({value:.2f})",
        "negative": "Recent activity aligns with domain history in these subsystems ({value:.2f})",
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
