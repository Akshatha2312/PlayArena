const adminService = require('../services/adminService');

/**
 * GET /api/v1/admin/dashboard
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getDashboardSummary();
    return res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/resources
 */
const getAllResources = async (req, res, next) => {
  try {
    const data = await adminService.getAllResources(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/bookings
 */
const getAllBookings = async (req, res, next) => {
  try {
    const data = await adminService.getAllBookings(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const data = await adminService.getBookingById(req.params.id);
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
 * GET /api/v1/admin/customers
 */
const getCustomers = async (req, res, next) => {
  try {
    const data = await adminService.getCustomers(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/customers/:id
 */
const getCustomerById = async (req, res, next) => {
  try {
    const data = await adminService.getCustomerById(req.params.id);
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
 * GET /api/v1/admin/staff
 */
const getStaffList = async (req, res, next) => {
  try {
    const data = await adminService.getStaffList(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/staff
 */
const createStaffUser = async (req, res, next) => {
  try {
    const staff = await adminService.createStaffUser(req.user.userId, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Staff account created successfully',
      data: { staff },
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
 * PATCH /api/v1/admin/staff/:id
 */
const updateStaffUser = async (req, res, next) => {
  try {
    const staff = await adminService.updateStaffUser(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Staff account updated successfully',
      data: { staff },
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
 * GET /api/v1/admin/payments
 */
const getAllPayments = async (req, res, next) => {
  try {
    const data = await adminService.getAllPayments(req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/payments/:id
 */
const getPaymentById = async (req, res, next) => {
  try {
    const data = await adminService.getPaymentById(req.params.id);
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
  getDashboardSummary,
  getAllResources,
  getAllBookings,
  getBookingById,
  getCustomers,
  getCustomerById,
  getStaffList,
  createStaffUser,
  updateStaffUser,
  getAllPayments,
  getPaymentById,
};
