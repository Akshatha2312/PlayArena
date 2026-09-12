const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getStaffProfile } = require('../controllers/profileController');

const router = express.Router();

// GET /api/v1/staff/profile
router.get('/profile', authenticate, authorize('staff', 'admin'), getStaffProfile);

module.exports = router;
