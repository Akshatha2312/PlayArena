const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { aiApiLimiter } = require('../middleware/rateLimiter');
const { processChat } = require('../controllers/aiController');

// All AI routes require authentication and strictly customer role
router.post('/chat', authenticate, authorize('customer'), aiApiLimiter, processChat);

module.exports = router;
