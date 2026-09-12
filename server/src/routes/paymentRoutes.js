const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Public Webhook Route (No JWT Auth)
 * Authenticated via Razorpay HMAC signature header (x-razorpay-signature) using RAZORPAY_WEBHOOK_SECRET.
 * Must receive raw body (express.raw) for HMAC verification.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

/**
 * Protected Customer Routes (JWT Auth + 'customer' role)
 */
router.post(
  '/order',
  express.json(),
  authenticate,
  authorize('customer'),
  paymentController.createOrder
);

router.post(
  '/verify',
  express.json(),
  authenticate,
  authorize('customer'),
  paymentController.verifyPayment
);

router.get(
  '/',
  authenticate,
  authorize('customer'),
  paymentController.getMyPayments
);

router.get(
  '/:id',
  authenticate,
  authorize('customer'),
  paymentController.getPaymentById
);

module.exports = router;
