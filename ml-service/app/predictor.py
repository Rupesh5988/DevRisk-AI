"""
============================================================
XGBoost & Calibrated Ensemble Predictor Module
============================================================
Loads the trained calibrated ensemble model and provides
real-time risk scoring, feature transformation, and inference.
============================================================
"""

import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "calibrated_model.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "model", "training_metrics.json")
COLUMNS_PATH = os.path.join(BASE_DIR, "model", "feature_columns.json")

RAW_FEATURE_COLUMNS = [
    "ns", "nd", "nf", "entropy", "la", "ld", "lt",
    "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp",
]

# Indices in the 28-element transformed array that receive log1p scaling
LOG_SCALE_INDICES = [9, 10, 11, 12, 13, 24, 25]  # age, nuc, exp, rexp, sexp, churn_per_file, fragility_index


class Predictor:
    """
    Wraps the trained Calibrated Soft-Voting Ensemble (XGBoost + LightGBM)
    for real-time risk prediction on Pull Requests.
    """

    def __init__(self):
        self.model = None
        self.feature_columns = RAW_FEATURE_COLUMNS
        self.training_metrics = {}
        self._load_model()

    def _load_model(self):
        """Load the trained calibrated model and metadata from disk."""
        if not os.path.exists(MODEL_PATH):
            print(f"[Predictor] WARNING: Model not found at: {MODEL_PATH}")
            print(f"[Predictor]    Run `python train_model.py` to train the model first.")
            return

        try:
            self.model = joblib.load(MODEL_PATH)
            print(f"[Predictor] OK: Calibrated Ensemble model loaded from: {MODEL_PATH}")
        except Exception as e:
            print(f"[Predictor] ERROR: Failed to load model: {e}")
            return

        # Load feature column order
        if os.path.exists(COLUMNS_PATH):
            with open(COLUMNS_PATH, "r") as f:
                self.feature_columns = json.load(f)

        # Load training metrics
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, "r") as f:
                self.training_metrics = json.load(f)
            print(f"[Predictor] Training AUC-ROC: {self.training_metrics.get('auc_roc', 'N/A')}")
            print(f"[Predictor] Training Recall:  {self.training_metrics.get('recall', 'N/A')}")

    @property
    def is_loaded(self) -> bool:
        """Check if the model is loaded and ready for predictions."""
        return self.model is not None

    def predict(self, features: list[float]) -> dict:
        """
        Predict the risk score for a given feature vector.

        Args:
            features: List of 14 float values in the order defined by RAW_FEATURE_COLUMNS.

        Returns:
            dict with:
                - risk_score (float): 0-100 percentage
                - risk_label (str): LOW, MEDIUM, or HIGH
                - confidence (float): Raw probability from model (0.0 to 1.0)
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Run train_model.py first.")

        # Transform 14 raw metrics to 28 engineered domain features
        feature_array = self.transform_features(features)

        # Get calibrated probability of class 1 (buggy)
        probability = float(self.model.predict_proba(feature_array)[0][1])

        # Convert to 0-100 risk score
        risk_score = round(probability * 100, 1)

        # Determine risk label based on calibrated probability bands
        if risk_score >= 70:
            risk_label = "HIGH"
        elif risk_score >= 40:
            risk_label = "MEDIUM"
        else:
            risk_label = "LOW"

        return {
            "risk_score": risk_score,
            "risk_label": risk_label,
            "confidence": round(probability, 4),
        }

    def transform_features(self, features: list[float]) -> np.ndarray:
        """
        Apply identical domain feature engineering and log1p scaling
        as used during model training.
        Expands 14 raw ApacheJIT features to 28 engineered features.
        """
        if len(features) != 14:
            raise ValueError(f"Expected 14 raw features, got {len(features)}")

        # Copy to avoid mutating original list
        raw = [float(x) for x in features]

        ns = raw[0]
        nd = raw[1]
        nf = raw[2]
        entropy = raw[3]
        la = raw[4]
        ld = raw[5]
        lt = raw[6] if raw[6] > 0 else (la + ld)
        fix = raw[7]
        ndev = raw[8]
        age = raw[9]
        nuc = raw[10]
        exp = raw[11]
        rexp = raw[12]
        sexp = raw[13]

        # 1. Primary Ratios
        churn_density = (la + ld) / (lt + 1.0)
        la_ratio = la / (la + ld + 1e-5)
        exp_per_file = exp / (nf + 1.0)
        recent_exp_ratio = rexp / (exp + 1.0)

        # 2. Interactions
        exp_vs_complexity = exp_per_file / (entropy + 1e-5)
        subsystem_familiarity = sexp / (exp + 1e-5)
        churn_intensity = (la + ld) * entropy
        dev_density_risk = ndev / (age + 1.0)

        # 3. Novel JIT Metrics
        diffusion_factor = (nd * ns) / (nf + 1.0)
        churn_asymmetry = abs(la - ld) / (la + ld + 1.0)
        churn_per_file = (la + ld) / (nf + 1.0)
        fragility_index = (age * nuc) / (exp + 1.0)
        subsystem_entropy = entropy / (ns + 1.0)
        rexp_vs_sexp = (rexp + 1.0) / (sexp + 1.0)

        # Construct full 28-element feature vector
        vector = raw + [
            churn_density,
            la_ratio,
            exp_per_file,
            recent_exp_ratio,
            exp_vs_complexity,
            subsystem_familiarity,
            churn_intensity,
            dev_density_risk,
            diffusion_factor,
            churn_asymmetry,
            churn_per_file,
            fragility_index,
            subsystem_entropy,
            rexp_vs_sexp,
        ]

        # Apply log1p scaling to long-tailed features
        for idx in LOG_SCALE_INDICES:
            vector[idx] = float(np.log1p(max(vector[idx], 0.0)))

        return np.array(vector).reshape(1, -1)


# Singleton instance
predictor = Predictor()
