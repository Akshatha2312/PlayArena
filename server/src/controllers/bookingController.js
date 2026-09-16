const bookingService = require('../services/bookingService');

/**
 * Handles HTTP GET request to check availability for a Resource.
 */
const getAvailability = async (req, res, next) => {
  try {
    const { gameId, resourceId } = req.params;
    const { date, startTime, startAt, durationMinutes } = req.query || {};

    const availability = await bookingService.checkAvailability(gameId, resourceId, {
      date,
      startTime,
      startAt,
      durationMinutes,
    });

    return res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP POST request for customer booking creation.
 */
const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const booking = await bookingService.createBooking(userId, req.body || {});

    return res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    if (error.statusCode === 409 || error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: error.message || 'Booking conflict: requested time interval is unavailable',
      });
    }

    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP GET request for customer to view their own bookings list.
 */
const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { status, page, limit } = req.query || {};

    const result = await bookingService.getUserBookings(userId, { status, page, limit });

    return res.status(200).json({
      status: 'success',
      data: {
        bookings: result.bookings,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles HTTP GET request for customer to view a single booking by ID.
 */
const getUserBookingById = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;

    const booking = await bookingService.getUserBookingById(userId, id);

    return res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP PATCH request for customer to cancel their own booking.
 */
const cancelUserBooking = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;
    const { cancellationReason } = req.body || {};

    const booking = await bookingService.cancelUserBooking(userId, id, cancellationReason);

    return res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        status: 'fail',
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Handles HTTP GET request for customer to retrieve their booking QR code payload.
 */
const getBookingQR = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;

    const booking = await bookingService.getUserBookingById(userId, id);
    const qrService = require('../services/qrService');

    const qrToken = qrService.generateQRToken(booking._id, userId);
    const validity = qrService.getQRValidityState(booking);

    return res.status(200).json({
      status: 'success',
      data: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference || booking._id.toString().slice(-6).toUpperCase(),
        qrToken,
        validity,
      },
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Handles HTTP PATCH request for customer to reschedule an eligible booking.
 */
const rescheduleUserBooking = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;

    const booking = await bookingService.rescheduleUserBooking(userId, id, req.body || {});

    return res.status(200).json({
      status: 'success',
      message: 'Booking rescheduled successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        status: 'fail',
        message: error.message || 'Conflict: the requested time slot is unavailable',
      });
    }

    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = {
  getAvailability,
  createBooking,
  getUserBookings,
  getUserBookingById,
  cancelUserBooking,
  rescheduleUserBooking,
  getBookingQR,
};
