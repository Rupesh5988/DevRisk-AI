// ============================================================
// Webhook Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyWebhookSignature } = require('../middleware/webhookAuth');
const { handleWebhook } = require('../controllers/webhookController');

// POST /api/webhook — receives GitHub webhook events
// The signature verification middleware runs before the controller
router.post('/', verifyWebhookSignature, handleWebhook);

module.exports = router;
