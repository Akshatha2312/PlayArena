const notificationService = require('../services/notificationService');

/**
 * GET /api/v1/notifications
 * Customer listing of notifications.
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page, limit, isRead } = req.query;

    const data = await notificationService.getUserNotifications(userId, { page, limit, isRead });

    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count
 * Returns number of unread notifications for authenticated customer.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const unreadCount = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      status: 'success',
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(userId, id);

    return res.status(200).json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all notifications for customer as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/notifications/trigger-reminders
 * Dev/Admin trigger endpoint for testing upcoming booking reminder processing.
 */
const triggerReminders = async (req, res, next) => {
  try {
    const result = await notificationService.processUpcomingReminders();

    return res.status(200).json({
      status: 'success',
      message: 'Reminder processing completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  triggerReminders,
};
