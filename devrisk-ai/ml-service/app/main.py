"""
============================================================
DevRisk AI — FastAPI ML Service
============================================================
REST API server that provides:
  POST /predict  → Risk score prediction (0-100%)
  POST /explain  → SHAP feature explanations
  GET  /health   → Service health check
  GET  /model-info → Model metadata and training metrics

Runs on port 8000 by default.

Usage:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Or directly:
    python -m app.main
============================================================
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    PredictRequest, PredictResponse,
    ExplainRequest, ExplainResponse,
    HealthResponse, ModelInfoResponse,
)
from .predictor import predictor
from .explainer import explainer

# ============================================================
# FastAPI App Initialization
# ============================================================

app = FastAPI(
    title="DevRisk AI — ML Service",
    description=(
        "Machine Learning API for predicting risky code changes in Pull Requests. "
        "Uses XGBoost trained on the ApacheJIT dataset with SHAP explainability."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",     # ReDoc at /redoc
)

# CORS — allow the Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Endpoints
# ============================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint.
    Returns model loading status and basic metadata.
    """
    return HealthResponse(
        status="ok" if predictor.is_loaded else "degraded",
        model_loaded=predictor.is_loaded,
        model_type="XGBoostClassifier",
        features_count=len(predictor.feature_columns),
        training_date=predictor.training_metrics.get("training_date"),
        auc_roc=predictor.training_metrics.get("auc_roc"),
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["System"])
async def model_info():
    """
    Returns detailed information about the trained model,
    including feature list, hyperparameters, and evaluation metrics.
    """
    return ModelInfoResponse(
        model_type="XGBoostClassifier",
        features=predictor.feature_columns,
        training_metrics=predictor.training_metrics,
        training_date=predictor.training_metrics.get("training_date"),
    )


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_risk(request: PredictRequest):
    """
    Predict the risk score for a Pull Request.

    Accepts a vector of 14 ApacheJIT features and returns:
    - **risk_score**: 0-100 percentage
    - **risk_label**: LOW (< 40%), MEDIUM (40-70%), HIGH (> 70%)
    - **confidence**: Raw model probability

    Feature order: [ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp]
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Train the model first with: python train_model.py"
        )

    try:
        result = predictor.predict(request.features)
        return PredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/explain", response_model=ExplainResponse, tags=["Explainability"])
async def explain_prediction(request: ExplainRequest):
    """
    Generate SHAP explanations for a prediction.

    Returns per-feature SHAP values and plain-English explanations
    describing why the model assigned its risk score.

    Feature order: [ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp]
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Train the model first."
        )

    if not explainer.is_ready:
        raise HTTPException(
            status_code=503,
            detail="SHAP explainer is not initialized."
        )

    try:
        result = explainer.explain(request.features)
        return ExplainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


# ============================================================
# Standalone runner
# ============================================================

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  DevRisk AI — ML Service Starting")
    print("=" * 50)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
