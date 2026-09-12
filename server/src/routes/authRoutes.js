const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public Customer Registration Route
router.post('/register', authController.register);

// Public User Login Route
router.post('/login', authController.login);

module.exports = router;

