const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getAdminProfile } = require('../controllers/profileController');
const gameController = require('../controllers/gameController');
const resourceController = require('../controllers/resourceController');

const router = express.Router();

// Profile Route
router.get('/profile', authenticate, authorize('admin'), getAdminProfile);

// Admin Game Management Routes
router.post('/games', authenticate, authorize('admin'), gameController.createGame);
router.get('/games', authenticate, authorize('admin'), gameController.getAllGames);
router.get('/games/:id', authenticate, authorize('admin'), gameController.getGameById);
router.patch('/games/:id', authenticate, authorize('admin'), gameController.updateGame);
router.delete('/games/:id', authenticate, authorize('admin'), gameController.deleteGame);

// Admin Resource Management Routes
router.post('/games/:gameId/resources', authenticate, authorize('admin'), resourceController.createResource);
router.get('/games/:gameId/resources', authenticate, authorize('admin'), resourceController.getResourcesByGame);
router.get('/resources/:id', authenticate, authorize('admin'), resourceController.getResourceById);
router.patch('/resources/:id', authenticate, authorize('admin'), resourceController.updateResource);
router.delete('/resources/:id', authenticate, authorize('admin'), resourceController.deleteResource);

module.exports = router;
