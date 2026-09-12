const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const User = require('../models/User');
const emailService = require('./emailService');

/**
 * Creates an in-app notification and dispatches an email idempotently.
 */
const sendNotification = async ({
  userId,
  type,
  title,
  message,
  relatedBookingId = null,
  relatedPaymentId = null,
  eventKey = null,
  emailData = {},
}) => {
  let notification;

  try {
    notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedBookingId,
      relatedPaymentId,
      eventKey,
      channel: 'both',
    });

    await notification.save();
  } catch (error) {
    // Duplicate key error (code 11000) indicates this event has already been notified.
    if (error.code === 11000 || error.name === 'MongoServerError') {
      console.log(`[NotificationService] Duplicate notification suppressed for eventKey: ${eventKey}`);
      return { duplicate: true, status: 'skipped' };
    }
    // Handle offline Mongoose buffering / connection error gracefully
    if (error.name === 'MongooseError' || (error.message && error.message.includes('buffering timed out'))) {
      console.log(`[NotificationService] Database unavailable. Skipping persistent notification for eventKey: ${eventKey}`);
      return { duplicate: false, status: 'skipped' };
    }
    console.error('[NotificationService] Error creating notification:', error.message);
    throw error;
  }

  // Look up user email for email dispatch
  try {
    const user = await User.findById(userId).select('email name');
    if (user && user.email) {
      const emailPayload = {
        userName: user.name,
        title,
        message,
        ...emailData,
      };

      const emailResult = await emailService.sendEmail({
        to: user.email,
        type,
        data: emailPayload,
      });

      notification.emailStatus = emailResult.status || 'skipped';
      await notification.save();
    }
  } catch (emailErr) {
    console.error('[NotificationService] Non-fatal error sending notification email:', emailErr.message);
    // Failure to send email must NOT corrupt business transaction state or throw
  }

  return { duplicate: false, notification };
};

/**
 * Triggered when a booking becomes confirmed.
 */
const notifyBookingConfirmed = async (booking) => {
  if (!booking) return null;

  if (typeof booking.populate === 'function') {
    try {
      await booking.populate(['userId', 'gameId', 'resourceId']);
    } catch (e) {}
  }
  const user = booking.userId || {};
  const game = booking.gameId || {};
  const resource = booking.resourceId || {};

  const eventKey = `booking:${booking._id}:confirmed`;
  const title = 'Booking Confirmed!';
  const message = `Your booking for ${game ? game.name : 'Game'} on ${booking.bookingDate} (${booking.startTime} - ${booking.endTime}) is confirmed.`;

  return sendNotification({
    userId: user._id || user,
    type: 'booking_confirmed',
    title,
    message,
    relatedBookingId: booking._id,
    eventKey,
    emailData: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference || booking._id.toString().slice(-6).toUpperCase(),
      gameName: game ? game.name : 'N/A',
      resourceName: resource ? resource.name : 'N/A',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationMinutes: booking.durationMinutes,
      totalAmount: booking.totalAmount,
    },
  });
};

/**
 * Triggered when a payment is verified / paid.
 */
const notifyPaymentSuccess = async (payment, booking) => {
  if (!payment) return null;

  const userId = payment.userId;
  const eventKey = `payment:${payment._id}:success`;
  const title = 'Payment Successful';
  const message = `Payment of ₹${payment.amount} for Booking #${booking ? (booking.bookingReference || booking._id) : 'N/A'} was successfully processed.`;

  return sendNotification({
    userId,
    type: 'payment_success',
    title,
    message,
    relatedBookingId: payment.bookingId,
    relatedPaymentId: payment._id,
    eventKey,
    emailData: {
      paymentId: payment.providerPaymentId || payment._id.toString(),
      bookingId: payment.bookingId,
      bookingReference: booking ? (booking.bookingReference || booking._id.toString().slice(-6).toUpperCase()) : 'N/A',
      amount: payment.amount,
    },
  });
};

/**
 * Triggered when a booking is cancelled.
 */
const notifyBookingCancelled = async (booking) => {
  if (!booking) return null;

  if (typeof booking.populate === 'function') {
    try {
      await booking.populate(['userId', 'gameId']);
    } catch (e) {}
  }
  const user = booking.userId || {};
  const game = booking.gameId || {};

  const eventKey = `booking:${booking._id}:cancelled`;
  const title = 'Booking Cancelled';
  const message = `Your booking for ${game ? game.name : 'Game'} on ${booking.bookingDate} (${booking.startTime} - ${booking.endTime}) has been cancelled.`;

  return sendNotification({
    userId: user._id || user,
    type: 'booking_cancelled',
    title,
    message,
    relatedBookingId: booking._id,
    eventKey,
    emailData: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference || (booking._id ? booking._id.toString().slice(-6).toUpperCase() : 'N/A'),
      gameName: game ? game.name : 'N/A',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
    },
  });
};

/**
 * Triggered for an upcoming booking reminder (e.g. 24h prior).
 */
const notifyBookingReminder = async (booking) => {
  if (!booking) return null;

  if (typeof booking.populate === 'function') {
    try {
      await booking.populate(['userId', 'gameId', 'resourceId']);
    } catch (e) {}
  }
  const user = booking.userId || {};
  const game = booking.gameId || {};
  const resource = booking.resourceId || {};

  const eventKey = `booking:${booking._id}:reminder`;
  const title = 'Upcoming Booking Reminder';
  const message = `Reminder: You have an upcoming session for ${game ? game.name : 'Game'} on ${booking.bookingDate} (${booking.startTime} - ${booking.endTime}).`;

  return sendNotification({
    userId: user._id || user,
    type: 'booking_reminder',
    title,
    message,
    relatedBookingId: booking._id,
    eventKey,
    emailData: {
      bookingId: booking._id,
      bookingReference: booking.bookingReference || booking._id.toString().slice(-6).toUpperCase(),
      gameName: game ? game.name : 'N/A',
      resourceName: resource ? resource.name : 'N/A',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
    },
  });
};

/**
 * Idempotent scheduler process to trigger reminders for upcoming confirmed bookings.
 * Qualifies confirmed bookings starting within the next ~24 hours that haven't been reminded.
 */
const processUpcomingReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
  const todayDateStr = now.toISOString().split('T')[0];

  // Find eligible confirmed bookings for today or tomorrow
  const eligibleBookings = await Booking.find({
    status: 'confirmed',
    bookingDate: { $in: [todayDateStr, tomorrowDateStr] },
  });

  let sentCount = 0;
  let skippedCount = 0;

  for (const booking of eligibleBookings) {
    const result = await notifyBookingReminder(booking);
    if (result && result.duplicate) {
      skippedCount++;
    } else if (result && !result.duplicate) {
      sentCount++;
    }
  }

  return { processed: eligibleBookings.length, sentCount, skippedCount };
};

/**
 * Customer notification queries
 */
const getUserNotifications = async (userId, options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (options.isRead !== undefined) {
    filter.isRead = options.isRead === 'true' || options.isRead === true;
  }

  const notifications = await Notification.find(filter)
    .populate('relatedBookingId', 'bookingReference status bookingDate startTime endTime gameId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return count;
};

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount };
};

module.exports = {
  sendNotification,
  notifyBookingConfirmed,
  notifyPaymentSuccess,
  notifyBookingCancelled,
  notifyBookingReminder,
  processUpcomingReminders,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
