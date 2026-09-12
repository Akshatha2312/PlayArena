const express = require('express');
const catalogController = require('../controllers/catalogController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Public Customer Catalog Routes
router.get('/', catalogController.getGames);
router.get('/:id', catalogController.getGameById);
router.get('/:gameId/resources', catalogController.getGameResources);

// Resource Booking Availability Check Endpoint
router.get('/:gameId/resources/:resourceId/availability', bookingController.getAvailability);

module.exports = router;
