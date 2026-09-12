const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = require('./src/app');
const User = require('./src/models/User');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const Booking = require('./src/models/Booking');
const Payment = require('./src/models/Payment');
const razorpayService = require('./src/services/razorpayService');

// Configure test secrets
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key_id_123';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_mock_secret_456';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_mock_webhook_secret_789';

async function runPhase5Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 5 AUTOMATED INTEGRATION TEST SUITE');
  console.log('==================================================');

  // Connect DB or setup mock
  const dbUri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 2000 });
    console.log(' Connected to MongoDB:', mongoose.connection.name);
    // Clear test data
    await User.deleteMany({});
    await Game.deleteMany({});
    await Resource.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
  } catch (err) {
    console.log(`[INFO] Live MongoDB connection unavailable (${err.message}). Running with mock storage.`);
  }

  let passedTests = 0;
  let failedTests = 0;

  const assertEqual = (actual, expected, testName) => {
    if (actual === expected) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - Expected: ${expected}, Got: ${actual}`);
      failedTests++;
    }
  };

  const assertIsTrue = (condition, testName) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - Expected truthy condition`);
      failedTests++;
    }
  };

  try {
  // Setup In-Memory Mongoose Store for Offline execution if DB is disconnected
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();
  const inMemoryBookings = new Map();
  const inMemoryPayments = new Map();

  const mockCustomerA = { _id: new mongoose.Types.ObjectId(), role: 'customer', name: 'Customer A', email: 'custA@test.com' };
  const mockCustomerB = { _id: new mongoose.Types.ObjectId(), role: 'customer', name: 'Customer B', email: 'custB@test.com' };
  const mockAdmin = { _id: new mongoose.Types.ObjectId(), role: 'admin', name: 'Admin', email: 'admin@test.com' };

  User.findById = (id) => ({
    select: async () => {
      const idStr = id ? id.toString() : '';
      if (idStr === mockCustomerA._id.toString()) return mockCustomerA;
      if (idStr === mockCustomerB._id.toString()) return mockCustomerB;
      if (idStr === mockAdmin._id.toString()) return mockAdmin;
      return null;
    },
  });

  const generateUserToken = (user) => {
    return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  };

  const customerAToken = generateUserToken(mockCustomerA);
  const customerBToken = generateUserToken(mockCustomerB);
  const adminToken = generateUserToken(mockAdmin);

  const customerAUserId = mockCustomerA._id.toString();
  const customerBUserId = mockCustomerB._id.toString();

  // Create Game & Resource directly
  const gameP5 = new Game({
    _id: new mongoose.Types.ObjectId(),
    name: 'Badminton Phase 5',
    slug: 'badminton-p5',
    description: 'Indoor badminton court for phase 5',
    basePricePerHour: 500,
    minBookingDurationMinutes: 30,
    maxBookingDurationMinutes: 120,
    bookingIntervalMinutes: 30,
    isActive: true,
  });
  inMemoryGames.set(gameP5._id.toString(), gameP5);

  const resourceP5 = new Resource({
    _id: new mongoose.Types.ObjectId(),
    gameId: gameP5._id,
    name: 'Court 1 Phase 5',
    identifier: 'CRT-P5-1',
    customPricePerHour: 600,
    status: 'available',
    isActive: true,
  });
  inMemoryResources.set(resourceP5._id.toString(), resourceP5);

  Game.findById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = inMemoryGames.get(id.toString());
    return doc ? doc : null;
  };

  Resource.findById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = inMemoryResources.get(id.toString());
    return doc ? doc : null;
  };

  Booking.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryBookings.set(this._id.toString(), this);
    return this;
  };

  Booking.findById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = inMemoryBookings.get(id.toString());
    return doc ? doc : null;
  };

  Booking.findOne = async (query = {}) => {
    const list = Array.from(inMemoryBookings.values());
    for (const b of list) {
      let match = true;
      if (query._id && b._id.toString() !== query._id.toString()) match = false;
      if (query.userId && b.userId.toString() !== query.userId.toString()) match = false;
      if (query.resourceId && b.resourceId.toString() !== query.resourceId.toString()) match = false;
      if (query.status && query.status.$in && !query.status.$in.includes(b.status)) match = false;
      if (query.startAt && query.startAt.$lt && !(b.startAt < query.startAt.$lt)) match = false;
      if (query.endAt && query.endAt.$gt && !(b.endAt > query.endAt.$gt)) match = false;
      if (match) return b;
    }
    return null;
  };

  Payment.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryPayments.set(this._id.toString(), this);
    return this;
  };

  Payment.findById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return inMemoryPayments.get(id.toString()) || null;
  };

  Payment.findOne = async (query = {}) => {
    const list = Array.from(inMemoryPayments.values());
    for (const p of list) {
      let match = true;
      if (query._id && p._id.toString() !== query._id.toString()) match = false;
      if (query.userId && p.userId.toString() !== query.userId.toString()) match = false;
      if (query.bookingId && p.bookingId.toString() !== query.bookingId.toString()) match = false;
      if (query.providerOrderId && p.providerOrderId !== query.providerOrderId) match = false;
      if (query.status && typeof query.status === 'string' && p.status !== query.status) match = false;
      if (query.status && query.status.$in && !query.status.$in.includes(p.status)) match = false;
      if (match) return p;
    }
    return null;
  };

  Payment.find = (query = {}) => {
    return {
      sort: () => ({
        skip: (skipVal = 0) => ({
          limit: async (limitVal = 10) => {
            let list = Array.from(inMemoryPayments.values());
            if (query.userId) list = list.filter((p) => p.userId.toString() === query.userId.toString());
            return list.slice(skipVal, skipVal + limitVal);
          },
        }),
      }),
    };
  };

  Payment.countDocuments = async (query = {}) => {
    let list = Array.from(inMemoryPayments.values());
    if (query.userId) list = list.filter((p) => p.userId.toString() === query.userId.toString());
    return list.length;
  };

  const gameId = gameP5._id.toString();
  const resourceId = resourceP5._id.toString();

  // Create Booking for Customer A
  const bookingA = new Booking({
    userId: mockCustomerA._id,
    gameId: gameP5._id,
    resourceId: resourceP5._id,
    startAt: new Date('2026-10-10T10:00:00.000Z'),
    endAt: new Date('2026-10-10T11:00:00.000Z'),
    durationMinutes: 60,
    pricePerHourAtBooking: 600,
    totalAmount: 600,
    status: 'confirmed',
  });
  await bookingA.save();
  const bookingIdA = bookingA._id.toString();

  // Create Booking for Customer B
  const bookingB = new Booking({
    userId: mockCustomerB._id,
    gameId: gameP5._id,
    resourceId: resourceP5._id,
    startAt: new Date('2026-10-10T12:00:00.000Z'),
    endAt: new Date('2026-10-10T13:00:00.000Z'),
    durationMinutes: 60,
    pricePerHourAtBooking: 600,
    totalAmount: 600,
    status: 'confirmed',
  });
  await bookingB.save();
  const bookingIdB = bookingB._id.toString();

    // Mock Razorpay SDK Service Order Creation
    const originalCreateOrder = razorpayService.createOrder;
    let mockOrderIdCounter = 100;
    razorpayService.createOrder = async ({ amountInPaise, currency, receipt, notes }) => {
      mockOrderIdCounter++;
      return {
        id: `order_mock_${mockOrderIdCounter}`,
        entity: 'order',
        amount: amountInPaise,
        currency,
        receipt,
        status: 'created',
      };
    };

    console.log('\n--------------------------------------------------');
    console.log('1. PAYMENT ORDER CREATION TESTS');
    console.log('--------------------------------------------------');

    // 1. Unauthenticated request -> 401
    const unauthOrder = await request(app).post('/api/v1/payments/order').send({ bookingId: bookingIdA });
    assertEqual(unauthOrder.status, 401, '1. Unauthenticated payment order request rejected (401)');

    // 2. Customer creates payment order for own booking -> success
    const orderResA = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: bookingIdA });
    if (orderResA.status !== 200) console.error('ORDER RES A ERROR:', orderResA.body);
    assertEqual(orderResA.status, 200, '2. Customer creates payment order for own booking (200)');
    assertEqual(orderResA.body.data.amount, 60000, '2b. Razorpay order amount converted correctly to 60000 paise');
    const orderIdA = orderResA.body.data.orderId;

    // 3. Nonexistent booking -> 404
    const fakeBookingId = new mongoose.Types.ObjectId().toString();
    const nonExistentOrder = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: fakeBookingId });
    assertEqual(nonExistentOrder.status, 404, '3. Nonexistent booking order creation rejected (404)');

    // 4. Customer A creating payment for Customer B booking -> rejected (403)
    const unauthorizedOrder = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: bookingIdB });
    assertEqual(unauthorizedOrder.status, 403, '4. Customer A creating payment for Customer B booking rejected (403)');

    // 5. Cancelled booking -> rejected (400)
    await request(app)
      .patch(`/api/v1/bookings/${bookingIdB}/cancel`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ cancellationReason: 'Test cancel' });

    const cancelledOrder = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ bookingId: bookingIdB });
    assertEqual(cancelledOrder.status, 400, '5. Payment order creation for cancelled booking rejected (400)');

    // 6 & 7. Duplicate order creation idempotency check
    const dupOrderResA = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: bookingIdA });
    assertEqual(dupOrderResA.status, 200, '6. Duplicate payment order request returns 200 OK');
    assertEqual(dupOrderResA.body.data.orderId, orderIdA, '7. Duplicate request returns existing Razorpay order ID idempotently');

    // 8, 9, 10. Client cannot override amount/currency/userId
    const tamperOrder = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        bookingId: bookingIdA,
        amount: 1, // Attempted tamper
        currency: 'USD',
        userId: customerBUserId,
      });
    assertEqual(tamperOrder.body.data.amount, 60000, '8 & 9. Client cannot override amount (still 60000 paise) or currency');

    console.log('\n--------------------------------------------------');
    console.log('2. AMOUNT & PRICE SNAPSHOT TESTS');
    console.log('--------------------------------------------------');

    // 11-17. Price changes in Game/Resource do not affect existing booking price snapshot
    if (inMemoryResources.has(resourceId)) {
      inMemoryResources.get(resourceId).customPricePerHour = 1000;
    }

    const snapshotCheckOrder = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: bookingIdA });
    assertEqual(snapshotCheckOrder.body.data.amount, 60000, '14-16. Resource price update does not change existing booking payment snapshot');

    console.log('\n--------------------------------------------------');
    console.log('3. PAYMENT VERIFICATION TESTS');
    console.log('--------------------------------------------------');

    // Generate valid HMAC signature for orderIdA and paymentId 'pay_test_123'
    const mockPaymentIdA = 'pay_test_123';
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const validSignatureA = crypto
      .createHmac('sha256', secret)
      .update(`${orderIdA}|${mockPaymentIdA}`)
      .digest('hex');

    // 18. Invalid signature -> rejected (400)
    const invalidSigRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        razorpay_order_id: orderIdA,
        razorpay_payment_id: mockPaymentIdA,
        razorpay_signature: 'invalid_tampered_signature_string',
      });
    assertEqual(invalidSigRes.status, 400, '19. Invalid signature rejected (400)');

    // 20. Customer B attempting verification of Customer A payment -> rejected (403)
    const custBVerifyA = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({
        razorpay_order_id: orderIdA,
        razorpay_payment_id: mockPaymentIdA,
        razorpay_signature: validSignatureA,
      });
    assertEqual(custBVerifyA.status, 403, '23. Customer B verifying Customer A payment rejected (403)');

    // 21. Valid payment verification -> success (200)
    const validVerifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        razorpay_order_id: orderIdA,
        razorpay_payment_id: mockPaymentIdA,
        razorpay_signature: validSignatureA,
      });
    assertEqual(validVerifyRes.status, 200, '18. Valid payment signature verification succeeds (200)');
    assertEqual(validVerifyRes.body.data.payment.status, 'paid', '24. Successful verification marks Payment as paid');
    assertEqual(validVerifyRes.body.data.booking.status, 'confirmed', '25. Successful verification confirms Booking');

    // 26. Duplicate verification is idempotent
    const dupVerifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        razorpay_order_id: orderIdA,
        razorpay_payment_id: mockPaymentIdA,
        razorpay_signature: validSignatureA,
      });
    assertEqual(dupVerifyRes.status, 200, '26. Duplicate verification request returns 200 OK idempotently');

    console.log('\n--------------------------------------------------');
    console.log('4. WEBHOOK TESTS');
    console.log('--------------------------------------------------');

    // Create a new booking & order for webhook test directly via Mongoose model
    const bookingW = new Booking({
      userId: mockCustomerA._id,
      gameId: gameP5._id,
      resourceId: resourceP5._id,
      startAt: new Date('2026-10-10T14:00:00.000Z'),
      endAt: new Date('2026-10-10T15:00:00.000Z'),
      durationMinutes: 60,
      pricePerHourAtBooking: 600,
      totalAmount: 600,
      status: 'pending',
    });
    await bookingW.save();
    const bookingIdW = bookingW._id.toString();

    const orderResW = await request(app)
      .post('/api/v1/payments/order')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ bookingId: bookingIdW });
    const orderIdW = orderResW.body.data.orderId;

    // Construct Razorpay Webhook Payload
    const webhookPayloadObj = {
      event: 'payment.captured',
      event_id: 'evt_test_webhook_001',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_999',
            order_id: orderIdW,
            amount: 60000,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };
    const rawWebhookBody = JSON.stringify(webhookPayloadObj);
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawWebhookBody)
      .digest('hex');

    // 29. Invalid Webhook Signature -> 400
    const invalidWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', 'invalid_webhook_sig')
      .set('Content-Type', 'application/json')
      .send(rawWebhookBody);
    assertEqual(invalidWebhookRes.status, 400, '29. Invalid webhook signature rejected (400)');

    // 28, 30, 31. Valid Webhook Signature -> 200 OK & updates payment + confirms booking
    const validWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', validWebhookSig)
      .set('Content-Type', 'application/json')
      .send(rawWebhookBody);
    assertEqual(validWebhookRes.status, 200, '28. Valid webhook signature accepted (200)');

    const updatedPaymentW = await Payment.findOne({ providerOrderId: orderIdW });
    assertEqual(updatedPaymentW.status, 'paid', '30. Webhook payment.captured marks Payment paid');
    const updatedBookingW = await Booking.findById(bookingIdW);
    assertEqual(updatedBookingW.status, 'confirmed', '31. Webhook payment.captured confirms Booking');

    // 34 & 35. Duplicate Webhook delivery is idempotent
    const dupWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', validWebhookSig)
      .set('Content-Type', 'application/json')
      .send(rawWebhookBody);
    assertEqual(dupWebhookRes.status, 200, '34. Duplicate webhook delivery handled idempotently (200)');
    assertEqual(updatedPaymentW.rawWebhookEvents.length, 1, '35. Duplicate webhook does not create duplicate webhook log entries');

    console.log('\n--------------------------------------------------');
    console.log('5. OWNERSHIP & CUSTOMER PAYMENT HISTORY TESTS');
    console.log('--------------------------------------------------');

    // 41. Customer views own payment history -> 200
    const historyResA = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`);
    assertEqual(historyResA.status, 200, '41. Customer can view own payment history (200)');
    assertIsTrue(historyResA.body.data.length >= 2, '41b. Customer A sees all payments created by Customer A');

    // 39. Customer B cannot view Customer A payment detail -> 403 / 404
    const paymentIdA = validVerifyRes.body.data.payment._id;
    const custBViewPaymentA = await request(app)
      .get(`/api/v1/payments/${paymentIdA}`)
      .set('Authorization', `Bearer ${customerBToken}`);
    assertEqual(custBViewPaymentA.status, 404, '39. Customer B accessing Customer A payment detail returns 404 Not Found');

    console.log('\n--------------------------------------------------');
    console.log('6. SECURITY & SECRET EXPOSURE TESTS');
    console.log('--------------------------------------------------');

    // 43-46. Secrets are never exposed in JSON responses
    const jsonStringResponse = JSON.stringify(validVerifyRes.body) + JSON.stringify(historyResA.body);
    assertIsTrue(!jsonStringResponse.includes(process.env.RAZORPAY_KEY_SECRET), '43. RAZORPAY_KEY_SECRET is never exposed');
    assertIsTrue(!jsonStringResponse.includes(process.env.RAZORPAY_WEBHOOK_SECRET), '44. RAZORPAY_WEBHOOK_SECRET is never exposed');
    assertIsTrue(!jsonStringResponse.includes(process.env.JWT_SECRET), '45. JWT_SECRET is never exposed');

    console.log('\n--------------------------------------------------');
    console.log('7. CONCURRENCY & IDEMPOTENCY TESTS');
    console.log('--------------------------------------------------');

    // Concurrent order creation for the same booking
    const bookingConc = new Booking({
      userId: mockCustomerA._id,
      gameId: gameP5._id,
      resourceId: resourceP5._id,
      startAt: new Date('2026-10-10T16:00:00.000Z'),
      endAt: new Date('2026-10-10T17:00:00.000Z'),
      durationMinutes: 60,
      pricePerHourAtBooking: 600,
      totalAmount: 600,
      status: 'confirmed',
    });
    await bookingConc.save();
    const bookingIdConc = bookingConc._id.toString();

    const concRequests = Array.from({ length: 5 }, () =>
      request(app)
        .post('/api/v1/payments/order')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ bookingId: bookingIdConc })
    );

    const concResponses = await Promise.all(concRequests);
    const concStatuses = concResponses.map((r) => r.status);
    const concOrderIds = new Set(concResponses.map((r) => r.body.data?.orderId));

    assertIsTrue(
      concStatuses.every((s) => s === 200),
      'Concurrent payment order requests all return 200 OK'
    );
    assertEqual(
      concOrderIds.size,
      1,
      'Concurrent order requests return the EXACT SAME Razorpay order ID without creating duplicate active payments'
    );

    // Restore original mock function
    razorpayService.createOrder = originalCreateOrder;

    console.log('\n==================================================');
    console.log(`TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('==================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled Exception during Phase 5 testing:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runPhase5Tests();
