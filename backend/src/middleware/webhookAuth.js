// ============================================================
// GitHub Webhook Signature Verification Middleware
// ============================================================
// GitHub signs every webhook payload with HMAC-SHA256 using
// the secret you set when configuring the webhook.
// This middleware verifies that signature to prevent spoofing.
//
// Header: X-Hub-Signature-256 = sha256=<hex-digest>
// ============================================================

const crypto = require('crypto');

/**
 * Express middleware that validates the GitHub webhook signature.
 * If GITHUB_WEBHOOK_SECRET is not set, validation is skipped
 * (useful during development).
 */
function verifyWebhookSignature(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  // Skip verification if no secret is configured (dev mode)
  if (!secret) {
    console.warn('[WebhookAuth] No GITHUB_WEBHOOK_SECRET set — skipping signature verification');
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[WebhookAuth] Missing X-Hub-Signature-256 header');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // req.body must be the raw buffer for HMAC to work correctly.
  // We handle this in index.js by using express.json() with a verify callback.
  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('[WebhookAuth] rawBody not available — ensure express.json verify callback is set');
    return res.status(500).json({ error: 'Server configuration error: raw body not captured' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  // Timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.warn('[WebhookAuth] Invalid webhook signature — request rejected');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = { verifyWebhookSignature };
