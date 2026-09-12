const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getStaffProfile } = require('../controllers/profileController');
const {
  getDashboardSummary,
  getSchedule,
  getBookingDetails,
  lookupBooking,
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

// Lookup & Details
router.post('/check-in/lookup', lookupBooking);
router.get('/bookings/:id', getBookingDetails);

// Session State Transitions & Walk-In
router.post('/bookings/:id/check-in', performCheckIn);
router.post('/bookings/:id/start', startSession);
router.post('/bookings/:id/complete', completeSession);
router.post('/bookings/:id/no-show', markNoShow);
router.post('/walk-in', createWalkInBooking);

module.exports = router;

