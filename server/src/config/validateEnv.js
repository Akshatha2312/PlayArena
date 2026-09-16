/**
 * Production Environment Variables & Secrets Validation.
 * Ensures the application fails fast if deployed with insecure placeholders or missing secrets.
 */

const INSECURE_PLACEHOLDERS = [
  'your_secret',
  'change_me',
  'example',
  'test',
  'mock',
  'your_test_key',
  'your_jwt_secret_here',
  'your_test_key_id',
  'your_test_key_secret',
  'your_test_webhook_secret',
  'your_ai_api_key_here'
];

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.log('[Environment] Running in non-production mode (' + (process.env.NODE_ENV || 'development') + '). Skipping strict secret validation.');
    return;
  }

  console.log('[Environment Audit] Validating production environment configuration...');

  const requiredVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = [];
  const insecure = [];

  for (const v of requiredVars) {
    const val = process.env[v];
    if (!val) {
      missing.push(v);
    } else if (INSECURE_PLACEHOLDERS.some(p => val.toLowerCase().includes(p))) {
      insecure.push(v);
    }
  }

  // Razorpay validation if production payments enabled
  if (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET) {
    if (INSECURE_PLACEHOLDERS.some(p => (process.env.RAZORPAY_KEY_ID || '').toLowerCase().includes(p))) {
      insecure.push('RAZORPAY_KEY_ID');
    }
    if (INSECURE_PLACEHOLDERS.some(p => (process.env.RAZORPAY_KEY_SECRET || '').toLowerCase().includes(p))) {
      insecure.push('RAZORPAY_KEY_SECRET');
    }
  }

  // AI validation if AI enabled in production
  if (process.env.AI_ENABLED === 'true' && process.env.AI_PROVIDER !== 'mock') {
    if (!process.env.AI_API_KEY || INSECURE_PLACEHOLDERS.some(p => (process.env.AI_API_KEY || '').toLowerCase().includes(p))) {
      insecure.push('AI_API_KEY');
    }
  }

  if (missing.length > 0) {
    console.error(`[FATAL SECURITY ERROR] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (insecure.length > 0) {
    console.error(`[FATAL SECURITY ERROR] The following variables use insecure default placeholders in production: ${insecure.join(', ')}`);
    console.error(`[FATAL SECURITY ERROR] Please update your production .env file with secure cryptographically generated keys.`);
    process.exit(1);
  }

  console.log('[Environment Audit] Production environment configuration passed security validation.');
}

module.exports = validateEnv;
