const staffService = require('../services/staffService');

/**
 * GET /api/v1/staff/dashboard
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await staffService.getDashboardSummary();
    return res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/staff/bookings
 */
const getSchedule = async (req, res, next) => {
  try {
    const schedule = await staffService.getSchedule(req.query);
    return res.status(200).json({
      status: 'success',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/staff/bookings/:id
 */
const getBookingDetails = async (req, res, next) => {
  try {
    const booking = await staffService.getBookingDetails(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/check-in/lookup
 */
const lookupBooking = async (req, res, next) => {
  try {
    const { query } = req.body;
    const bookings = await staffService.lookupBooking(query);
    return res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/bookings/:id/check-in
 */
const performCheckIn = async (req, res, next) => {
  try {
    const booking = await staffService.performCheckIn(req.params.id, req.user.userId);
    return res.status(200).json({
      status: 'success',
      message: 'Booking checked in successfully',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/bookings/:id/start
 */
const startSession = async (req, res, next) => {
  try {
    const booking = await staffService.startSession(req.params.id, req.user.userId);
    return res.status(200).json({
      status: 'success',
      message: 'Session started successfully',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/bookings/:id/complete
 */
const completeSession = async (req, res, next) => {
  try {
    const booking = await staffService.completeSession(req.params.id, req.user.userId);
    return res.status(200).json({
      status: 'success',
      message: 'Session completed successfully',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/bookings/:id/no-show
 */
const markNoShow = async (req, res, next) => {
  try {
    const booking = await staffService.markNoShow(req.params.id, req.user.userId);
    return res.status(200).json({
      status: 'success',
      message: 'Booking marked as no-show',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/v1/staff/walk-in
 */
const createWalkInBooking = async (req, res, next) => {
  try {
    const booking = await staffService.createWalkInBooking(req.user.userId, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Walk-in booking created successfully',
      data: { booking },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getSchedule,
  getBookingDetails,
  lookupBooking,
  performCheckIn,
  startSession,
  completeSession,
  markNoShow,
  createWalkInBooking,
};
