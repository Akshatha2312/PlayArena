const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// Strict RBAC: All analytics endpoints require valid JWT authentication and 'admin' role
router.use(authenticate, authorize('admin'));

router.get('/overview', analyticsController.getOverview);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/bookings', analyticsController.getBookingsAnalytics);
router.get('/games', analyticsController.getGameAnalytics);
router.get('/resources', analyticsController.getResourceAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);

module.exports = router;
