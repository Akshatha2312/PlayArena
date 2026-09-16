const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { sensitiveApiLimiter } = require('../middleware/rateLimiter');
const {
  getPublicVenueLayout,
  getAdminVenueLayout,
  updateResourceLocation,
} = require('../controllers/venueController');

// Public venue layout route
router.get('/layout', getPublicVenueLayout);

// Admin venue layout routes
router.get('/admin/layout', authenticate, authorize('admin'), sensitiveApiLimiter, getAdminVenueLayout);
router.patch('/admin/resources/:resourceId/location', authenticate, authorize('admin'), sensitiveApiLimiter, updateResourceLocation);

module.exports = router;
