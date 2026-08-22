"""
============================================================
Pydantic Schemas — Request & Response Models
============================================================
Defines the data contracts for the FastAPI endpoints.
============================================================
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class PredictRequest(BaseModel):
    """Request body for POST /predict"""
    features: List[float] = Field(
        ...,
        min_length=14,
        max_length=14,
        description="Ordered list of 14 ApacheJIT features: [ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp]",
        json_schema_extra={"example": [3, 2, 5, 0.72, 500, 30, 1200, 0, 4, 300, 12, 2, 1, 0]},
    )


class PredictResponse(BaseModel):
    """Response body for POST /predict"""
    risk_score: float = Field(..., description="Risk score from 0 to 100")
    risk_label: str = Field(..., description="Risk label: LOW, MEDIUM, or HIGH")
    confidence: float = Field(..., description="Model prediction probability (0.0 to 1.0)")


class ExplanationItem(BaseModel):
    """A single SHAP feature explanation."""
    feature_name: str
    shap_value: float
    feature_value: float
    explanation: str


class ExplainRequest(BaseModel):
    """Request body for POST /explain"""
    features: List[float] = Field(
        ...,
        min_length=14,
        max_length=14,
        description="Ordered list of 14 ApacheJIT features",
    )


class ExplainResponse(BaseModel):
    """Response body for POST /explain"""
    shap_values: List[float] = Field(..., description="Raw SHAP values for each feature")
    explanations: List[ExplanationItem] = Field(..., description="Human-readable explanations")
    base_value: float = Field(..., description="Base prediction value (average model output)")


class HealthResponse(BaseModel):
    """Response body for GET /health"""
    status: str
    model_loaded: bool
    model_type: str
    features_count: int
    training_date: Optional[str] = None
    auc_roc: Optional[float] = None


class ModelInfoResponse(BaseModel):
    """Response body for GET /model-info"""
    model_type: str
    features: List[str]
    training_metrics: dict
    training_date: Optional[str] = None
