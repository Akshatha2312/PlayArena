const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Customer Protected Booking Endpoints
router.post('/', authenticate, authorize('customer'), bookingController.createBooking);
router.get('/', authenticate, authorize('customer'), bookingController.getUserBookings);
router.get('/:id', authenticate, authorize('customer'), validateObjectId('id'), bookingController.getUserBookingById);
router.get('/:id/qr', authenticate, authorize('customer'), validateObjectId('id'), bookingController.getBookingQR);
router.patch('/:id/cancel', authenticate, authorize('customer'), validateObjectId('id'), bookingController.cancelUserBooking);
router.patch('/:id/reschedule', authenticate, authorize('customer'), validateObjectId('id'), bookingController.rescheduleUserBooking);

module.exports = router;
