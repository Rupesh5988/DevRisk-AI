"""
============================================================
XGBoost Predictor Module
============================================================
Loads the trained model and provides prediction functions.
Handles model loading, feature validation, and risk scoring.
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

LOG_SCALE_INDICES = [4, 5, 6, 9, 10, 11, 12, 13]  # la, ld, lt, age, nuc, exp, rexp, sexp


class Predictor:
    """
    Wraps the trained XGBoost model for risk prediction.
    Loads model from disk on initialization.
    """

    def __init__(self):
        self.model = None
        self.feature_columns = RAW_FEATURE_COLUMNS
        self.training_metrics = {}
        self._load_model()

    def _load_model(self):
        """Load the trained model and metadata from disk."""
        if not os.path.exists(MODEL_PATH):
            print(f"[Predictor] ⚠️  Model not found at: {MODEL_PATH}")
            print(f"[Predictor]    Run `python train_model.py` to train the model first.")
            return

        try:
            self.model = joblib.load(MODEL_PATH)
            print(f"[Predictor] ✅ Model loaded from: {MODEL_PATH}")
        except Exception as e:
            print(f"[Predictor] ❌ Failed to load model: {e}")
            return

        # Load feature column order
        if os.path.exists(COLUMNS_PATH):
            with open(COLUMNS_PATH, "r") as f:
                self.feature_columns = json.load(f)

        # Load training metrics
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, "r") as f:
                self.training_metrics = json.load(f)
            print(f"[Predictor] 📊 Training AUC-ROC: {self.training_metrics.get('auc_roc', 'N/A')}")

    @property
    def is_loaded(self) -> bool:
        """Check if the model is loaded and ready for predictions."""
        return self.model is not None

    def predict(self, features: list[float]) -> dict:
        """
        Predict the risk score for a given feature vector.

        Args:
            features: List of 14 float values in the order defined by FEATURE_COLUMNS.

        Returns:
            dict with:
                - risk_score (float): 0-100 percentage
                - risk_label (str): LOW, MEDIUM, or HIGH
                - confidence (float): Raw probability from model (0.0 to 1.0)
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Run train_model.py first.")

        # Transform 14 raw features to 18 transformed features
        feature_array = self.transform_features(features)

        # Get probability of class 1 (buggy)
        probability = float(self.model.predict_proba(feature_array)[0][1])

        # Convert to 0-100 risk score
        risk_score = round(probability * 100, 1)

        # Determine risk label
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
        """Apply the same ratio engineering and log1p scaling used in training."""
        if len(features) != 14:
            raise ValueError(f"Expected 14 features, got {len(features)}")
            
        # Copy to avoid mutating the original input
        raw = list(features)
        
        # Extract specific features by known index positions
        entropy = raw[3]
        la = raw[4]
        ld = raw[5]
        lt = raw[6]
        nf = raw[2]
        ndev = raw[8]
        age = raw[9]
        exp = raw[11]
        rexp = raw[12]
        sexp = raw[13]
        
        # 1. Calculate Primary Ratios
        churn_density = (la + ld) / (lt + 1)
        la_ratio = la / (la + ld + 1e-5)
        exp_per_file = exp / (nf + 1)
        recent_exp_ratio = rexp / (exp + 1)
        
        # 2. Advanced Interactions
        exp_vs_complexity = exp_per_file / (entropy + 1e-5)
        subsystem_familiarity = sexp / (exp + 1e-5)
        churn_intensity = (la + ld) * entropy
        dev_density_risk = ndev / (age + 1)
        
        # Append new features
        raw.extend([
            churn_density, la_ratio, exp_per_file, recent_exp_ratio,
            exp_vs_complexity, subsystem_familiarity, churn_intensity, dev_density_risk
        ])
        
        # 3. Log Scaling on specific raw features
        for idx in LOG_SCALE_INDICES:
            raw[idx] = float(np.log1p(raw[idx]))
            
        return np.array(raw).reshape(1, -1)


# Singleton instance
predictor = Predictor()
