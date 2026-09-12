const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(authenticate);

// Customer endpoints (Ownership is strictly derived from req.user.userId in controller)
router.get('/', authorize('customer'), notificationController.getMyNotifications);
router.get('/unread-count', authorize('customer'), notificationController.getUnreadCount);
router.patch('/read-all', authorize('customer'), notificationController.markAllAsRead);
router.patch('/:id/read', authorize('customer'), notificationController.markAsRead);

// Dev / Admin trigger endpoint for reminder processing
router.post('/trigger-reminders', authorize('admin'), notificationController.triggerReminders);

module.exports = router;
