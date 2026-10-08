// ============================================================
// Ground Truth & Model Validation Routes
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();
const gt      = require('../controllers/groundTruthController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Ground Truth — per PR
router.get('/ground-truth/pr/:prId',              gt.getGroundTruthByPR);
router.post('/ground-truth/analyze/:prId',         gt.analyzeGroundTruth);
router.get('/ground-truth/repository/:repositoryId', gt.getGroundTruthByRepo);

// Model Validation — aggregate metrics
router.get('/model-validation/summary',            gt.getValidationSummary);
router.get('/model-validation/confusion-matrix',   gt.getConfusionMatrix);
router.get('/model-validation/calibration',        gt.getCalibration);
router.get('/model-validation/threshold-analysis', gt.getThresholdAnalysis);

// Explanation Validation — per PR SHAP
router.get('/explanation-validation/:prId',        gt.getExplanationValidation);

module.exports = router;
