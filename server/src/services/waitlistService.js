const mongoose = require('mongoose');
const Waitlist = require('../models/Waitlist');
const Game = require('../models/Game');
const Resource = require('../models/Resource');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

/**
 * Helper to parse date, time, and duration into UTC Date objects.
 */
const parseWaitlistInterval = (dateStr, startTimeStr, startAtInput, durationMinutes) => {
  let startAt;

  if (startAtInput) {
    startAt = new Date(startAtInput);
  } else if (dateStr && startTimeStr) {
    const trimmedDate = dateStr.trim();
    const trimmedTime = startTimeStr.trim();
    const isoString = `${trimmedDate}T${trimmedTime}:00.000Z`;
    startAt = new Date(isoString);
  } else {
    const error = new Error('Date and start time or ISO startAt timestamp are required');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(startAt.getTime())) {
    const error = new Error('Invalid date or start time format');
    error.statusCode = 400;
    throw error;
  }

  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    const error = new Error('Duration minutes must be a positive integer');
    error.statusCode = 400;
    throw error;
  }

  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
  return { startAt, endAt, durationMinutes: duration };
};

/**
 * Creates a new Waitlist entry for a customer.
 */
const createWaitlistEntry = async (userId, payload = {}) => {
  const { gameId, resourceId, date, startTime, startAt: inputStartAt, durationMinutes } = payload;

  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    const error = new Error('Invalid Game ID format');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error('Invalid Resource ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(gameId);
  if (!game) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  if (game.isActive === false) {
    const error = new Error('Cannot join waitlist for an inactive game');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(resourceId);
  if (!resource || resource.gameId.toString() !== gameId.toString()) {
    const error = new Error('Resource not found or does not belong to the specified Game');
    error.statusCode = 404;
    throw error;
  }

  if (resource.isActive === false) {
    const error = new Error('Cannot join waitlist for an inactive resource');
    error.statusCode = 400;
    throw error;
  }

  if (resource.status !== 'available') {
    const error = new Error(`Resource is currently ${resource.status.replace('_', ' ')}`);
    error.statusCode = 400;
    throw error;
  }

  const { startAt, endAt, durationMinutes: duration } = parseWaitlistInterval(
    date,
    startTime,
    inputStartAt,
    durationMinutes
  );

  if (duration < game.minBookingDurationMinutes) {
    const error = new Error(`Duration must be at least ${game.minBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (duration > game.maxBookingDurationMinutes) {
    const error = new Error(`Duration cannot exceed ${game.maxBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (duration % game.bookingIntervalMinutes !== 0) {
    const error = new Error(`Duration must follow ${game.bookingIntervalMinutes}-minute increments`);
    error.statusCode = 400;
    throw error;
  }

  // Duplicate Check: Prevents multiple active waitlists for same user + resource + interval
  const existingWaitlist = await Waitlist.findOne({
    userId,
    resourceId: resource._id,
    startAt,
    endAt,
    status: { $in: ['waiting', 'notified'] },
  });

  if (existingWaitlist) {
    const error = new Error('You are already on the active waitlist for this time slot');
    error.statusCode = 409;
    throw error;
  }

  const waitlistEntry = new Waitlist({
    userId,
    gameId: game._id,
    resourceId: resource._id,
    startAt,
    endAt,
    durationMinutes: duration,
    status: 'waiting',
  });

  try {
    const savedEntry = await waitlistEntry.save();
    return savedEntry;
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error('You are already on the active waitlist for this time slot');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Retrieves waitlist entries for authenticated user.
 */
const getUserWaitlists = async (userId, queryOptions = {}) => {
  const filter = { userId };

  if (queryOptions.status && queryOptions.status !== 'all') {
    filter.status = queryOptions.status;
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [waitlists, total] = await Promise.all([
    Waitlist.find(filter)
      .populate('gameId', 'name category')
      .populate('resourceId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Waitlist.countDocuments(filter),
  ]);

  return {
    waitlists,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves single waitlist entry belonging to user.
 */
const getUserWaitlistById = async (userId, waitlistId) => {
  if (!mongoose.Types.ObjectId.isValid(waitlistId)) {
    const error = new Error('Invalid Waitlist ID format');
    error.statusCode = 400;
    throw error;
  }

  const entry = await Waitlist.findOne({ _id: waitlistId, userId })
    .populate('gameId', 'name category basePricePerHour')
    .populate('resourceId', 'name code status');

  if (!entry) {
    const error = new Error('Waitlist entry not found');
    error.statusCode = 404;
    throw error;
  }

  return entry;
};

/**
 * Customer leaves/cancels active waitlist entry.
 */
const leaveWaitlist = async (userId, waitlistId) => {
  if (!mongoose.Types.ObjectId.isValid(waitlistId)) {
    const error = new Error('Invalid Waitlist ID format');
    error.statusCode = 400;
    throw error;
  }

  const entry = await Waitlist.findOne({ _id: waitlistId, userId });
  if (!entry) {
    const error = new Error('Waitlist entry not found');
    error.statusCode = 404;
    throw error;
  }

  if (entry.status === 'cancelled') {
    const error = new Error('Waitlist entry is already cancelled');
    error.statusCode = 400;
    throw error;
  }

  entry.status = 'cancelled';
  entry.cancelledAt = new Date();

  const updatedEntry = await entry.save();
  return updatedEntry;
};

/**
 * Processes waitlist notifications when a booking is cancelled.
 * Finds eligible waiting entry and updates status atomically.
 */
const processWaitlistOnCancellation = async (cancelledBooking) => {
  if (!cancelledBooking || !cancelledBooking.resourceId || !cancelledBooking.startAt || !cancelledBooking.endAt) {
    return null;
  }

  const resourceId = cancelledBooking.resourceId;
  const startAt = cancelledBooking.startAt;
  const endAt = cancelledBooking.endAt;

  // Find waiting entry for this slot ordered by FIFO creation
  const waitingEntries = await Waitlist.find({
    resourceId,
    status: 'waiting',
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).sort({ createdAt: 1 });

  if (!waitingEntries || waitingEntries.length === 0) {
    return null;
  }

  // Atomically claim the first waiting entry to prevent race conditions
  let notifiedEntry = null;
  for (const candidate of waitingEntries) {
    const updated = await Waitlist.findOneAndUpdate(
      { _id: candidate._id, status: 'waiting' },
      { status: 'notified', notifiedAt: new Date() },
      { new: true }
    );

    if (updated) {
      notifiedEntry = updated;
      break;
    }
  }

  if (notifiedEntry) {
    // Populate details for notification dispatch
    try {
      await notifiedEntry.populate(['userId', 'gameId', 'resourceId']);
    } catch (e) {}

    try {
      await notificationService.notifyWaitlistAvailable(notifiedEntry);
    } catch (err) {
      console.error('[waitlistService] Error sending waitlist notification:', err.message);
    }

    try {
      socketService.broadcastWaitlistAvailable(notifiedEntry);
    } catch (err) {
      console.error('[waitlistService] Error broadcasting waitlist socket event:', err.message);
    }

    return notifiedEntry;
  }

  return null;
};

module.exports = {
  createWaitlistEntry,
  getUserWaitlists,
  getUserWaitlistById,
  leaveWaitlist,
  processWaitlistOnCancellation,
};
