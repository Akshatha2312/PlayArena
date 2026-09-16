const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { sensitiveApiLimiter } = require('../middleware/rateLimiter');
const {
  getCustomerInvoices,
  getCustomerInvoiceById,
  getInvoiceByBookingId,
  getAdminInvoices,
  getAdminInvoiceById,
} = require('../controllers/invoiceController');

// All invoice endpoints require authentication
router.use(authenticate);

// Admin endpoints (place before /:id parametric route to avoid route collisions)
router.get('/admin/all', authorize('admin'), sensitiveApiLimiter, getAdminInvoices);
router.get('/admin/:id', authorize('admin'), sensitiveApiLimiter, getAdminInvoiceById);

// Customer endpoints
router.get('/', authorize('customer'), sensitiveApiLimiter, getCustomerInvoices);
router.get('/booking/:bookingId', authorize('customer'), sensitiveApiLimiter, getInvoiceByBookingId);
router.get('/:id', authorize('customer'), sensitiveApiLimiter, getCustomerInvoiceById);

module.exports = router;
