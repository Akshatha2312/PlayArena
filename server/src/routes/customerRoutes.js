const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getCustomerProfile } = require('../controllers/profileController');

const router = express.Router();

// GET /api/v1/customer/profile
router.get('/profile', authenticate, authorize('customer'), getCustomerProfile);

module.exports = router;
