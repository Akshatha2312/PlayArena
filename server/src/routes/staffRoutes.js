const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { getStaffProfile } = require('../controllers/profileController');
const {
  getDashboardSummary,
  getSchedule,
  getBookingDetails,
  lookupBooking,
  verifyQR,
  performCheckIn,
  startSession,
  completeSession,
  markNoShow,
  createWalkInBooking,
} = require('../controllers/staffController');

const router = express.Router();

// Every staff endpoint strictly enforces authentication + role authorization ('staff', 'admin')
router.use(authenticate, authorize('staff', 'admin'));

// Staff Profile
router.get('/profile', getStaffProfile);

// Staff Dashboard & Schedule
router.get('/dashboard', getDashboardSummary);
router.get('/bookings', getSchedule);

// Lookup & Details & QR Verification
router.post('/check-in/lookup', lookupBooking);
router.post('/check-in/verify-qr', verifyQR);
router.get('/bookings/:id', validateObjectId('id'), getBookingDetails);

// Session State Transitions & Walk-In
router.post('/bookings/:id/check-in', validateObjectId('id'), performCheckIn);
router.post('/bookings/:id/start', validateObjectId('id'), startSession);
router.post('/bookings/:id/complete', validateObjectId('id'), completeSession);
router.post('/bookings/:id/no-show', validateObjectId('id'), markNoShow);
router.post('/walk-in', createWalkInBooking);

module.exports = router;

