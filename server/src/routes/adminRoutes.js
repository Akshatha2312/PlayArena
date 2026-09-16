const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getAdminProfile } = require('../controllers/profileController');
const gameController = require('../controllers/gameController');
const resourceController = require('../controllers/resourceController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// EVERY endpoint in this router strictly enforces authenticate + authorize('admin')
router.use(authenticate, authorize('admin'));

// Profile Route
router.get('/profile', getAdminProfile);

// Dashboard Summary
router.get('/dashboard', adminController.getDashboardSummary);

// Game Management Routes
router.post('/games', gameController.createGame);
router.get('/games', gameController.getAllGames);
router.get('/games/:id', gameController.getGameById);
router.patch('/games/:id', gameController.updateGame);
router.delete('/games/:id', gameController.deleteGame);

// Resource Management Routes
router.get('/resources', adminController.getAllResources);
router.post('/games/:gameId/resources', resourceController.createResource);
router.get('/games/:gameId/resources', resourceController.getResourcesByGame);
router.get('/resources/:id', resourceController.getResourceById);
router.patch('/resources/:id', resourceController.updateResource);
router.delete('/resources/:id', resourceController.deleteResource);

// Booking Management Routes
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);

// Customer Management Routes
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerById);

// Staff Management Routes
router.get('/staff', adminController.getStaffList);
router.post('/staff', adminController.createStaffUser);
router.patch('/staff/:id', adminController.updateStaffUser);

// Payment Management Routes
router.get('/payments', adminController.getAllPayments);
router.get('/payments/:id', adminController.getPaymentById);

// Analytics Routes
const analyticsRoutes = require('./analyticsRoutes');
router.use('/analytics', analyticsRoutes);

module.exports = router;
