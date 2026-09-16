const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const waitlistController = require('../controllers/waitlistController');

const router = express.Router();

// Strict RBAC: Waitlist endpoints are customer-protected
router.use(authenticate, authorize('customer'));

router.post('/', waitlistController.createWaitlistEntry);
router.get('/', waitlistController.getUserWaitlists);
router.get('/:id', waitlistController.getUserWaitlistById);
router.delete('/:id', waitlistController.leaveWaitlist);

module.exports = router;
