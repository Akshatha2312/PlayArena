const rateLimit = require('express-rate-limit');

/**
 * Custom handler for rate limit exceeded responses to ensure consistent JSON API format.
 */
const rateLimitHandler = (req, res, next, options) => {
  res.status(429).json({
    status: 'fail',
    message: options.message || 'Too many requests from this IP, please try again later.',
  });
};

/**
 * Helper to skip rate limiting during automated test runs.
 */
const skipTestRequests = () => {
  return process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';
};

/**
 * Strict limiter for login and registration endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  handler: rateLimitHandler,
  skip: skipTestRequests,
});

/**
 * Medium limiter for sensitive endpoints (payments, QR verification, notifications).
 */
const sensitiveApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests to this sensitive API endpoint. Please try again later.',
  handler: rateLimitHandler,
  skip: skipTestRequests,
});

/**
 * General API limiter for general backend routes.
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'API rate limit exceeded. Please slow down your requests.',
  handler: rateLimitHandler,
  skip: skipTestRequests,
});

/**
 * Dedicated limiter for AI Assistant endpoints.
 */
const aiApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: 'AI Assistant request limit exceeded. Please wait a few minutes before asking more questions.',
  handler: rateLimitHandler,
  skip: skipTestRequests,
});

module.exports = {
  authLimiter,
  sensitiveApiLimiter,
  generalApiLimiter,
  aiApiLimiter,
};

