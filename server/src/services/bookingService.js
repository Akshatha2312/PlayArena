const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Game = require('../models/Game');
const Resource = require('../models/Resource');
const notificationService = require('./notificationService');

/**
 * Active booking statuses that occupy a physical resource time slot.
 */
const OCCUPIED_STATUSES = ['confirmed', 'pending', 'checked_in', 'in_progress'];

/**
 * Per-resource in-memory queue locks to serialize concurrent booking creation requests
 * per physical bookable resource, eliminating TOCTOU race conditions.
 */
const resourceLocks = new Map();

const acquireResourceLock = async (resourceId) => {
  const key = resourceId.toString();
  while (resourceLocks.get(key)) {
    await resourceLocks.get(key);
  }
  let release;
  const lockPromise = new Promise((resolve) => {
    release = resolve;
  });
  resourceLocks.set(key, lockPromise);
  return () => {
    if (resourceLocks.get(key) === lockPromise) {
      resourceLocks.delete(key);
    }
    release();
  };
};

/**
 * Helper to parse date, time, and duration into UTC Date objects.
 * Supports date string ("YYYY-MM-DD") + startTime ("HH:mm") or direct ISO startAt timestamp.
 */
const parseInterval = (dateStr, startTimeStr, startAtInput, durationMinutes) => {
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
 * Checks if a resource has an overlapping booking for the half-open interval [startAt, endAt).
 * Overlap condition: existing.startAt < requested.endAt AND existing.endAt > requested.startAt
 */
const isResourceOverlapping = async (resourceId, startAt, endAt, excludeBookingId = null, session = null) => {
  const query = {
    resourceId,
    status: { $in: OCCUPIED_STATUSES },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  let findQuery = Booking.findOne(query);
  if (session) {
    findQuery = findQuery.session(session);
  }

  const overlappingBooking = await findQuery;
  return !!overlappingBooking;
};

/**
 * Checks booking availability for a resource and time slot.
 */
const checkAvailability = async (gameId, resourceId, options = {}) => {
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
    const error = new Error('Game is currently inactive');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(resourceId);
  if (!resource || resource.gameId.toString() !== gameId.toString()) {
    const error = new Error('Resource not found or does not belong to the selected Game');
    error.statusCode = 404;
    throw error;
  }

  if (resource.isActive === false) {
    const error = new Error('Resource is currently inactive');
    error.statusCode = 400;
    throw error;
  }

  if (resource.status !== 'available') {
    const error = new Error(`Resource is currently ${resource.status.replace('_', ' ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Parse time & validate duration against Game configuration
  const { startAt, endAt, durationMinutes } = parseInterval(
    options.date,
    options.startTime,
    options.startAt,
    options.durationMinutes
  );

  if (durationMinutes < game.minBookingDurationMinutes) {
    const error = new Error(`Booking duration must be at least ${game.minBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (durationMinutes > game.maxBookingDurationMinutes) {
    const error = new Error(`Booking duration cannot exceed ${game.maxBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (durationMinutes % game.bookingIntervalMinutes !== 0) {
    const error = new Error(`Booking duration must follow ${game.bookingIntervalMinutes}-minute increments`);
    error.statusCode = 400;
    throw error;
  }

  const hasOverlap = await isResourceOverlapping(resource._id, startAt, endAt);

  return {
    available: !hasOverlap,
    gameId: game._id,
    resourceId: resource._id,
    startAt,
    endAt,
    durationMinutes,
  };
};

/**
 * Creates a new Booking for a customer with per-resource concurrency locking to prevent TOCTOU double-booking.
 */
const createBooking = async (userId, payload = {}) => {
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
    const error = new Error('Cannot book an inactive game');
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
    const error = new Error('Cannot book an inactive resource');
    error.statusCode = 400;
    throw error;
  }

  if (resource.status !== 'available') {
    const error = new Error(`Resource is currently ${resource.status.replace('_', ' ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Parse time & validate duration rules
  const { startAt, endAt, durationMinutes: duration } = parseInterval(
    date,
    startTime,
    inputStartAt,
    durationMinutes
  );

  if (duration < game.minBookingDurationMinutes) {
    const error = new Error(`Booking duration must be at least ${game.minBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (duration > game.maxBookingDurationMinutes) {
    const error = new Error(`Booking duration cannot exceed ${game.maxBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (duration % game.bookingIntervalMinutes !== 0) {
    const error = new Error(`Booking duration must follow ${game.bookingIntervalMinutes}-minute increments`);
    error.statusCode = 400;
    throw error;
  }

  // Acquire per-resource queue lock to serialize interval validation & insertion for this resource
  const releaseLock = await acquireResourceLock(resource._id);

  try {
    // Attempt Mongoose session transaction if database supports transactions (Replica Set / Atlas)
    let session = null;
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.client) {
        session = await mongoose.startSession();
      }
    } catch (e) {
      session = null;
    }

    if (session) {
      try {
        let savedBooking;
        await session.withTransaction(async () => {
          const hasOverlap = await isResourceOverlapping(resource._id, startAt, endAt, null, session);
          if (hasOverlap) {
            const error = new Error('The requested resource is already booked for this time interval');
            error.statusCode = 409;
            throw error;
          }

          const effectivePricePerHour =
            resource.customPricePerHour !== undefined && resource.customPricePerHour !== null
              ? resource.customPricePerHour
              : game.basePricePerHour;

          const totalAmount = Math.round(effectivePricePerHour * (duration / 60) * 100) / 100;

          const booking = new Booking({
            userId,
            gameId: game._id,
            resourceId: resource._id,
            startAt,
            endAt,
            durationMinutes: duration,
            pricePerHourAtBooking: effectivePricePerHour,
            totalAmount,
            status: 'confirmed',
          });

          savedBooking = await booking.save({ session });
        });
        return savedBooking;
      } finally {
        session.endSession();
      }
    } else {
      // Fallback for standalone DB / test suite: per-resource queue lock serialization
      const hasOverlap = await isResourceOverlapping(resource._id, startAt, endAt);
      if (hasOverlap) {
        const error = new Error('The requested resource is already booked for this time interval');
        error.statusCode = 409;
        throw error;
      }

      const effectivePricePerHour =
        resource.customPricePerHour !== undefined && resource.customPricePerHour !== null
          ? resource.customPricePerHour
          : game.basePricePerHour;

      const totalAmount = Math.round(effectivePricePerHour * (duration / 60) * 100) / 100;

      const booking = new Booking({
        userId,
        gameId: game._id,
        resourceId: resource._id,
        startAt,
        endAt,
        durationMinutes: duration,
        pricePerHourAtBooking: effectivePricePerHour,
        totalAmount,
        status: 'confirmed',
      });

      const savedBooking = await booking.save();
      return savedBooking;
    }
  } finally {
    releaseLock();
  }
};

/**
 * Retrieves bookings for the authenticated user with optional status filtering & pagination.
 */
const getUserBookings = async (userId, queryOptions = {}) => {
  const filter = { userId };

  if (queryOptions.status) {
    filter.status = queryOptions.status;
  }

  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ startAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single booking belonging to the authenticated user.
 */
const getUserBookingById = async (userId, bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  return booking;
};

/**
 * Cancels a booking belonging to the authenticated user.
 */
const cancelUserBooking = async (userId, bookingId, cancellationReason = '') => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === 'cancelled') {
    const error = new Error('Booking is already cancelled');
    error.statusCode = 400;
    throw error;
  }

  if (booking.status === 'completed') {
    const error = new Error('Completed bookings cannot be cancelled');
    error.statusCode = 400;
    throw error;
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = userId;
  booking.cancellationReason = typeof cancellationReason === 'string' ? cancellationReason.trim() : '';

  const updatedBooking = await booking.save();

  // Safely trigger cancellation notification and waitlist processing
  try {
    await notificationService.notifyBookingCancelled(updatedBooking);
  } catch (notifErr) {
    console.error('[bookingService] Non-fatal notification trigger error in cancelUserBooking:', notifErr.message);
  }

  try {
    const waitlistService = require('./waitlistService');
    await waitlistService.processWaitlistOnCancellation(updatedBooking);
  } catch (wlErr) {
    console.error('[bookingService] Non-fatal waitlist processing error in cancelUserBooking:', wlErr.message);
  }

  return updatedBooking;
};

/**
 * Reschedules an eligible booking belonging to the authenticated user.
 * Enforces per-resource concurrency locking, interval availability checks, and server-calculated pricing.
 */
const rescheduleUserBooking = async (userId, bookingId, payload = {}) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const eligibleStatuses = ['confirmed', 'pending', 'checked_in'];
  if (!eligibleStatuses.includes(booking.status)) {
    const error = new Error(`Bookings with status '${booking.status}' cannot be rescheduled`);
    error.statusCode = 400;
    throw error;
  }

  const targetResourceId = payload.resourceId || booking.resourceId;
  if (!mongoose.Types.ObjectId.isValid(targetResourceId)) {
    const error = new Error('Invalid Resource ID format');
    error.statusCode = 400;
    throw error;
  }

  const game = await Game.findById(booking.gameId);
  if (!game || game.isActive === false) {
    const error = new Error('Associated Game is inactive or not found');
    error.statusCode = 400;
    throw error;
  }

  const resource = await Resource.findById(targetResourceId);
  if (!resource || resource.gameId.toString() !== game._id.toString()) {
    const error = new Error('Resource not found or does not belong to the booking Game');
    error.statusCode = 404;
    throw error;
  }

  if (resource.isActive === false || resource.status !== 'available') {
    const error = new Error('Resource is currently inactive or not available');
    error.statusCode = 400;
    throw error;
  }

  const durationMinutes = payload.durationMinutes || booking.durationMinutes;

  const { startAt: newStartAt, endAt: newEndAt, durationMinutes: newDuration } = parseInterval(
    payload.date,
    payload.startTime,
    payload.startAt,
    durationMinutes
  );

  if (newDuration < game.minBookingDurationMinutes) {
    const error = new Error(`Booking duration must be at least ${game.minBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (newDuration > game.maxBookingDurationMinutes) {
    const error = new Error(`Booking duration cannot exceed ${game.maxBookingDurationMinutes} minutes`);
    error.statusCode = 400;
    throw error;
  }

  if (newDuration % game.bookingIntervalMinutes !== 0) {
    const error = new Error(`Booking duration must follow ${game.bookingIntervalMinutes}-minute increments`);
    error.statusCode = 400;
    throw error;
  }

  // Acquire per-resource queue lock for concurrency protection
  const releaseLock = await acquireResourceLock(resource._id);

  try {
    const hasOverlap = await isResourceOverlapping(resource._id, newStartAt, newEndAt, booking._id);
    if (hasOverlap) {
      const error = new Error('The requested time slot is not available for this resource');
      error.statusCode = 409;
      throw error;
    }

    // Server-calculated pricing
    const effectivePricePerHour =
      resource.customPricePerHour !== undefined && resource.customPricePerHour !== null
        ? resource.customPricePerHour
        : game.basePricePerHour;

    const newTotalAmount = Math.round(effectivePricePerHour * (newDuration / 60) * 100) / 100;

    // Record audit details before mutating schedule
    booking.rescheduledFromStartAt = booking.startAt;
    booking.rescheduledFromEndAt = booking.endAt;

    booking.startAt = newStartAt;
    booking.endAt = newEndAt;
    booking.durationMinutes = newDuration;
    booking.resourceId = resource._id;
    booking.pricePerHourAtBooking = effectivePricePerHour;
    booking.totalAmount = newTotalAmount;

    booking.isRescheduled = true;
    booking.rescheduledAt = new Date();
    booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
    booking.rescheduledBy = userId;

    const updatedBooking = await booking.save();

    // Trigger notification and socket events
    try {
      await notificationService.notifyBookingRescheduled(updatedBooking);
    } catch (notifErr) {
      console.error('[bookingService] Error sending reschedule notification:', notifErr.message);
    }

    try {
      const socketService = require('./socketService');
      socketService.broadcastBookingRescheduled(updatedBooking);
    } catch (sockErr) {
      console.error('[bookingService] Error broadcasting reschedule socket event:', sockErr.message);
    }

    return updatedBooking;
  } finally {
    releaseLock();
  }
};

module.exports = {
  checkAvailability,
  createBooking,
  getUserBookings,
  getUserBookingById,
  cancelUserBooking,
  rescheduleUserBooking,
  isResourceOverlapping,
};
