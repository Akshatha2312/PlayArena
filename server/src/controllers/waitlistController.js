const waitlistService = require('../services/waitlistService');

/**
 * POST /api/v1/waitlist
 */
const createWaitlistEntry = async (req, res, next) => {
  try {
    const entry = await waitlistService.createWaitlistEntry(req.user.userId, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Joined waitlist successfully',
      data: { waitlist: entry },
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
 * GET /api/v1/waitlist
 */
const getUserWaitlists = async (req, res, next) => {
  try {
    const data = await waitlistService.getUserWaitlists(req.user.userId, req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/waitlist/:id
 */
const getUserWaitlistById = async (req, res, next) => {
  try {
    const entry = await waitlistService.getUserWaitlistById(req.user.userId, req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { waitlist: entry },
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
 * DELETE /api/v1/waitlist/:id
 */
const leaveWaitlist = async (req, res, next) => {
  try {
    const entry = await waitlistService.leaveWaitlist(req.user.userId, req.params.id);
    return res.status(200).json({
      status: 'success',
      message: 'Left waitlist successfully',
      data: { waitlist: entry },
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
  createWaitlistEntry,
  getUserWaitlists,
  getUserWaitlistById,
  leaveWaitlist,
};
