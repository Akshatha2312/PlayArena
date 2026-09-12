const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Customer Protected Booking Endpoints
router.post('/', authenticate, authorize('customer'), bookingController.createBooking);
router.get('/', authenticate, authorize('customer'), bookingController.getUserBookings);
router.get('/:id', authenticate, authorize('customer'), bookingController.getUserBookingById);
router.patch('/:id/cancel', authenticate, authorize('customer'), bookingController.cancelUserBooking);

module.exports = router;
