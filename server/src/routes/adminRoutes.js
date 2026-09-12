const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getAdminProfile } = require('../controllers/profileController');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Profile Route
router.get('/profile', authenticate, authorize('admin'), getAdminProfile);

// Admin Game Management Routes
router.post('/games', authenticate, authorize('admin'), gameController.createGame);
router.get('/games', authenticate, authorize('admin'), gameController.getAllGames);
router.get('/games/:id', authenticate, authorize('admin'), gameController.getGameById);
router.patch('/games/:id', authenticate, authorize('admin'), gameController.updateGame);
router.delete('/games/:id', authenticate, authorize('admin'), gameController.deleteGame);

module.exports = router;
