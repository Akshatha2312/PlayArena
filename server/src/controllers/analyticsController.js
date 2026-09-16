const analyticsService = require('../services/analyticsService');

/**
 * GET /api/v1/admin/analytics/overview
 */
const getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverview(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
 * GET /api/v1/admin/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getRevenueAnalytics(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
 * GET /api/v1/admin/analytics/bookings
 */
const getBookingsAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getBookingsAnalytics(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
 * GET /api/v1/admin/analytics/games
 */
const getGameAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getGameAnalytics(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
 * GET /api/v1/admin/analytics/resources
 */
const getResourceAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getResourceAnalytics(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
 * GET /api/v1/admin/analytics/customers
 */
const getCustomerAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getCustomerAnalytics(req.query);
    return res.status(200).json({
      status: 'success',
      data,
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
  getOverview,
  getRevenueAnalytics,
  getBookingsAnalytics,
  getGameAnalytics,
  getResourceAnalytics,
  getCustomerAnalytics,
};
