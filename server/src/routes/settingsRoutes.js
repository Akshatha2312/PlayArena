const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { sensitiveApiLimiter } = require('../middleware/rateLimiter');
const {
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/settingsController');

router.use(authenticate);

router.get('/notifications', sensitiveApiLimiter, getNotificationSettings);
router.patch('/notifications', sensitiveApiLimiter, updateNotificationSettings);

module.exports = router;
