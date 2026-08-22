// ============================================================
// ML Service Client
// ============================================================
// HTTP client that calls the Python FastAPI micro-service
// for risk prediction (XGBoost) and explainability (SHAP).
//
// Endpoints called:
//   POST /predict  → returns { risk_score, risk_label }
//   POST /explain  → returns { shap_values, explanations }
// ============================================================

const axios = require('axios');
const { FEATURE_ORDER, buildExplanation, getRiskLabel } = require('../utils/featureNames');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends a feature vector to the Python ML service for risk prediction.
 *
 * @param {Object} features - Object with all 14 feature values
 *   e.g. { ns: 3, nd: 2, nf: 5, entropy: 0.72, la: 500, ld: 30, ... }
 * @returns {Object} { risk_score: number (0-100), risk_label: string }
 */
async function predictRisk(features) {
  try {
    // Convert feature object to ordered array matching model's training order
    const featureVector = FEATURE_ORDER.map((name) => features[name] || 0);

    const response = await axios.post(`${ML_BASE_URL}/predict`, {
      features: featureVector,
    }, {
      timeout: 10000, // 10-second timeout
    });

    return {
      risk_score: response.data.risk_score,
      risk_label: response.data.risk_label || getRiskLabel(response.data.risk_score),
    };
  } catch (err) {
    console.error('[MLService] Prediction request failed:', err.message);

    // If the ML service is down, return a fallback response
    // rather than crashing the entire webhook pipeline
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      console.warn('[MLService] ML service is unavailable — returning fallback score');
      return {
        risk_score: -1, // -1 indicates ML service was unavailable
        risk_label: 'UNKNOWN',
      };
    }
    throw err;
  }
}

/**
 * Sends a feature vector to the Python ML service for SHAP explanation.
 *
 * @param {Object} features - Object with all 14 feature values
 * @returns {Array} Array of explanation objects:
 *   [{ feature_name, shap_value, feature_value, explanation }]
 */
async function getExplanation(features) {
  try {
    const featureVector = FEATURE_ORDER.map((name) => features[name] || 0);

    const response = await axios.post(`${ML_BASE_URL}/explain`, {
      features: featureVector,
    }, {
      timeout: 15000, // SHAP can be slower than prediction
    });

    // If the Python service returns pre-built explanations, use them
    if (response.data.explanations) {
      return response.data.explanations;
    }

    // Otherwise, build explanations from raw SHAP values
    if (response.data.shap_values) {
      const shapValues = response.data.shap_values;
      return FEATURE_ORDER.map((name, index) => ({
        feature_name: name,
        shap_value: shapValues[index] || 0,
        feature_value: features[name] || 0,
        explanation: buildExplanation(name, shapValues[index] || 0, features[name] || 0),
      }));
    }

    return [];
  } catch (err) {
    console.error('[MLService] Explanation request failed:', err.message);

    // If ML service is down, build basic explanations from feature values alone
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      console.warn('[MLService] ML service unavailable — generating basic explanations');
      return FEATURE_ORDER.map((name) => ({
        feature_name: name,
        shap_value: 0,
        feature_value: features[name] || 0,
        explanation: `${name}: ${features[name] || 0} (ML service unavailable for SHAP analysis)`,
      }));
    }
    throw err;
  }
}

/**
 * Health check — pings the Python ML service.
 * @returns {boolean} true if the service is reachable
 */
async function healthCheck() {
  try {
    const response = await axios.get(`${ML_BASE_URL}/health`, { timeout: 3000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

module.exports = { predictRisk, getExplanation, healthCheck };
