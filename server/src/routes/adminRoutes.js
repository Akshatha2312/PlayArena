const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getAdminProfile } = require('../controllers/profileController');

const router = express.Router();

// GET /api/v1/admin/profile
router.get('/profile', authenticate, authorize('admin'), getAdminProfile);

module.exports = router;
