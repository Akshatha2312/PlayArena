const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const razorpayService = require('./razorpayService');
const notificationService = require('./notificationService');
const invoiceService = require('./invoiceService');

// In-memory per-booking locks to guarantee backend idempotency under rapid double-click / concurrent requests
const bookingPaymentLocks = new Map();

const acquireBookingPaymentLock = async (bookingId) => {
  const key = bookingId.toString();
  while (bookingPaymentLocks.get(key)) {
    await bookingPaymentLocks.get(key);
  }
  let release;
  const lockPromise = new Promise((resolve) => {
    release = resolve;
  });
  bookingPaymentLocks.set(key, lockPromise);
  return () => {
    if (bookingPaymentLocks.get(key) === lockPromise) {
      bookingPaymentLocks.delete(key);
    }
    release();
  };
};

/**
 * Helper to convert INR Rupees to smallest unit (Paise) safely.
 */
const convertRupeesToPaise = (amountInRupees) => {
  return Math.round(amountInRupees * 100);
};

/**
 * Creates or reuses a Razorpay order for an authenticated customer's booking.
 */
const createPaymentOrder = async (userId, bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const releaseLock = await acquireBookingPaymentLock(bookingId);

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (booking.userId.toString() !== userId.toString()) {
      const error = new Error('Access denied: You do not own this booking');
      error.statusCode = 403;
      throw error;
    }

    if (booking.status === 'cancelled') {
      const error = new Error('Cannot create payment order for a cancelled booking');
      error.statusCode = 400;
      throw error;
    }

    if (booking.status === 'completed') {
      const error = new Error('Booking is already completed');
      error.statusCode = 400;
      throw error;
    }

    // Check for an existing paid payment
    const existingPaidPayment = await Payment.findOne({
      bookingId: booking._id,
      status: 'paid',
    });

    if (existingPaidPayment) {
      const error = new Error('Booking is already paid');
      error.statusCode = 409;
      throw error;
    }

    // Idempotency: check if an active pending/created payment record already exists for this booking
    let activePayment = await Payment.findOne({
      bookingId: booking._id,
      status: { $in: ['created', 'pending'] },
    });

    if (activePayment) {
      // Reuse existing active payment order
      return {
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id',
        orderId: activePayment.providerOrderId,
        amount: convertRupeesToPaise(booking.totalAmount),
        currency: 'INR',
        bookingId: booking._id,
        paymentId: activePayment._id,
      };
    }

    // Create new order via Razorpay SDK
    const amountInPaise = convertRupeesToPaise(booking.totalAmount);
    const receipt = `rcpt_${booking._id.toString().substring(0, 18)}_${Date.now().toString().slice(-4)}`;

    let order;
    try {
      order = await razorpayService.createOrder({
        amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          bookingId: booking._id.toString(),
          userId: userId.toString(),
        },
      });
    } catch (err) {
      const providerErr = new Error(`Payment provider order creation failed: ${err.message}`);
      providerErr.statusCode = 502;
      throw providerErr;
    }

    // Create Payment record
    const payment = new Payment({
      userId,
      bookingId: booking._id,
      provider: 'razorpay',
      providerOrderId: order.id,
      amount: booking.totalAmount,
      currency: 'INR',
      status: 'created',
    });

    await payment.save();

    return {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id',
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      bookingId: booking._id,
      paymentId: payment._id,
    };
  } finally {
    releaseLock();
  }
};

/**
 * Verifies Razorpay checkout signature and confirms payment and booking.
 */
const verifyPayment = async (userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    const error = new Error('Missing Razorpay verification parameters');
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findOne({ providerOrderId: razorpay_order_id });
  if (!payment) {
    const error = new Error('Payment order record not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership check
  if (payment.userId.toString() !== userId.toString()) {
    const error = new Error('Access denied: You do not own this payment record');
    error.statusCode = 403;
    throw error;
  }

  // Idempotency: If already paid, return clean success without re-modifying state
  if (payment.status === 'paid') {
    const booking = await Booking.findById(payment.bookingId);
    return {
      status: 'success',
      message: 'Payment already verified and paid',
      payment,
      booking,
    };
  }

  // Verify HMAC SHA256 Signature
  const isValidSignature = razorpayService.verifyCheckoutSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValidSignature) {
    payment.status = 'failed';
    payment.failureReason = 'Invalid checkout signature verification failed';
    await payment.save();

    const error = new Error('Payment verification failed: Invalid signature');
    error.statusCode = 400;
    throw error;
  }

  // Verify Booking state & consistency
  const booking = await Booking.findById(payment.bookingId);
  if (!booking) {
    const error = new Error('Associated booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.userId.toString() !== userId.toString()) {
    const error = new Error('Associated booking user mismatch');
    error.statusCode = 403;
    throw error;
  }

  if (booking.status === 'cancelled') {
    payment.status = 'failed';
    payment.failureReason = 'Associated booking was cancelled before payment verification';
    await payment.save();

    const error = new Error('Cannot verify payment for a cancelled booking');
    error.statusCode = 400;
    throw error;
  }

  // Update state transactionally if DB supports sessions, or sequential safe update
  payment.status = 'paid';
  payment.providerPaymentId = razorpay_payment_id;
  payment.paidAt = new Date();

  booking.status = 'confirmed';

  await payment.save();
  await booking.save();

  // Safely trigger invoice creation & notifications (idempotent, non-blocking failure)
  try {
    await invoiceService.generateInvoiceForPayment(payment, booking);
    await notificationService.notifyPaymentSuccess(payment, booking);
    await notificationService.notifyBookingConfirmed(booking);
  } catch (notifErr) {
    console.error('[paymentService] Non-fatal invoice/notification trigger error in verifyPayment:', notifErr.message);
  }

  return {
    status: 'success',
    message: 'Payment verified and booking confirmed successfully',
    payment,
    booking,
  };
};

/**
 * Processes incoming Razorpay Webhook notification asynchronously.
 */
const handleWebhook = async (rawBody, signature) => {
  const isValidSignature = razorpayService.verifyWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValidSignature) {
    const error = new Error('Invalid webhook signature');
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch (err) {
    const error = new Error('Malformed JSON payload in webhook');
    error.statusCode = 400;
    throw error;
  }

  const event = payload.event;
  const eventId = payload.event_id || `evt_${Date.now()}`;

  // Process relevant events
  if (event === 'payment.captured' || event === 'payment.authorized') {
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      return { status: 'ignored', message: 'No payment entity found in webhook payload' };
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amountInPaise = paymentEntity.amount;
    const currency = paymentEntity.currency;
    const method = paymentEntity.method;

    if (!orderId) {
      return { status: 'ignored', message: 'No order_id found in payment entity' };
    }

    const payment = await Payment.findOne({ providerOrderId: orderId });
    if (!payment) {
      return { status: 'ignored', message: 'Payment record not found for webhook order_id' };
    }

    // Idempotency: Check if event ID was already processed for this payment
    const eventAlreadyProcessed = payment.rawWebhookEvents.some((e) => e.eventId === eventId);
    if (eventAlreadyProcessed) {
      return { status: 'success', message: 'Webhook event already processed (idempotent)' };
    }

    // Record webhook event
    payment.rawWebhookEvents.push({ eventId, eventType: event });

    // Amount & Currency Verification
    const expectedAmountPaise = convertRupeesToPaise(payment.amount);
    if (amountInPaise !== expectedAmountPaise || currency !== payment.currency) {
      payment.status = 'failed';
      payment.failureReason = `Webhook amount/currency mismatch. Expected ${expectedAmountPaise} ${payment.currency}, got ${amountInPaise} ${currency}`;
      await payment.save();
      return { status: 'fail', message: 'Amount/currency verification failed in webhook' };
    }

    // State update if not already paid
    if (payment.status !== 'paid') {
      payment.status = 'paid';
      payment.providerPaymentId = paymentId;
      payment.method = method || payment.method;
      payment.paidAt = new Date();

      const booking = await Booking.findById(payment.bookingId);
      if (booking && booking.status !== 'cancelled') {
        booking.status = 'confirmed';
        await booking.save();
      }

      await payment.save();

      // Safely trigger invoice creation & notifications (idempotent, non-blocking failure)
      try {
        await invoiceService.generateInvoiceForPayment(payment, booking);
        await notificationService.notifyPaymentSuccess(payment, booking);
        if (booking && booking.status === 'confirmed') {
          await notificationService.notifyBookingConfirmed(booking);
        }
      } catch (notifErr) {
        console.error('[paymentService] Non-fatal invoice/notification trigger error in handleWebhook:', notifErr.message);
      }

      return { status: 'success', message: 'Payment captured via webhook successfully' };
    }
  } else if (event === 'payment.failed') {
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      return { status: 'ignored', message: 'No payment entity found in webhook payload' };
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed';

    if (!orderId) {
      return { status: 'ignored', message: 'No order_id found in payment entity' };
    }

    const payment = await Payment.findOne({ providerOrderId: orderId });
    if (!payment) {
      return { status: 'ignored', message: 'Payment record not found for webhook order_id' };
    }

    const eventAlreadyProcessed = payment.rawWebhookEvents.some((e) => e.eventId === eventId);
    if (eventAlreadyProcessed) {
      return { status: 'success', message: 'Webhook event already processed (idempotent)' };
    }

    payment.rawWebhookEvents.push({ eventId, eventType: event });

    // Update payment to failed if not already paid
    if (payment.status !== 'paid') {
      payment.status = 'failed';
      payment.providerPaymentId = paymentId;
      payment.failureReason = failureReason;
    }

    await payment.save();
    return { status: 'success', message: 'Payment failure recorded via webhook successfully' };
  }

  return { status: 'ignored', message: `Unhandled event type: ${event}` };
};

/**
 * Gets payment history for authenticated customer with pagination.
 */
const getCustomerPayments = async (userId, queryOptions = {}) => {
  const page = Math.max(1, parseInt(queryOptions.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments({ userId }),
  ]);

  return {
    payments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Gets payment details by ID belonging to authenticated customer.
 */
const getCustomerPaymentById = async (userId, paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    const error = new Error('Invalid Payment ID format');
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findOne({ _id: paymentId, userId });
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getCustomerPayments,
  getCustomerPaymentById,
  convertRupeesToPaise,
};
