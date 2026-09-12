require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('./src/app');
const User = require('./src/models/User');
const Booking = require('./src/models/Booking');
const qrService = require('./src/services/qrService');
const socketService = require('./src/services/socketService');
const staffService = require('./src/services/staffService');

const JWT_SECRET = process.env.JWT_SECRET || 'play_arena_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runPhase10Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 10 QR BOOKING + REALTIME TEST SUITE');
  console.log('==================================================');

  const inMemoryUsers = new Map();
  const inMemoryBookings = new Map();

  const customerAId = new mongoose.Types.ObjectId();
  const customerBId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();

  const mockCustomerA = new User({
    _id: customerAId,
    name: 'Customer A QR',
    email: 'customera.qr@playarena.com',
    role: 'customer',
  });
  inMemoryUsers.set(customerAId.toString(), mockCustomerA);

  const mockCustomerB = new User({
    _id: customerBId,
    name: 'Customer B QR',
    email: 'customerb.qr@playarena.com',
    role: 'customer',
  });
  inMemoryUsers.set(customerBId.toString(), mockCustomerB);

  const mockStaff = new User({
    _id: staffId,
    name: 'Staff Operator QR',
    email: 'staff.qr@playarena.com',
    role: 'staff',
  });
  inMemoryUsers.set(staffId.toString(), mockStaff);

  const tokenA = generateToken(mockCustomerA);
  const tokenB = generateToken(mockCustomerB);
  const tokenStaff = generateToken(mockStaff);

  // Mongoose Model Mocks
  User.findById = function (id) {
    const u = inMemoryUsers.get(id ? id.toString() : '');
    return {
      select: async function () { return u || null; },
      then: (resolve) => resolve(u || null),
    };
  };

  const bookingId = new mongoose.Types.ObjectId();
  const now = new Date();
  const startAt = new Date(now.getTime() + 10 * 60 * 1000); // starts in 10 mins
  const endAt = new Date(now.getTime() + 70 * 60 * 1000);

  const mockBooking = new Booking({
    _id: bookingId,
    userId: customerAId,
    gameId: new mongoose.Types.ObjectId(),
    resourceId: new mongoose.Types.ObjectId(),
    startAt,
    endAt,
    durationMinutes: 60,
    pricePerHourAtBooking: 400,
    totalAmount: 400,
    status: 'confirmed',
    bookingReference: 'BK-QR-1001',
  });

  inMemoryBookings.set(bookingId.toString(), mockBooking);

  Booking.findById = function (id) {
    const b = inMemoryBookings.get(id ? id.toString() : '');
    if (!b) return null;
    b.populate = async function () { return b; };
    return b;
  };

  Booking.findOne = async function (filter = {}) {
    let list = Array.from(inMemoryBookings.values());
    if (filter._id) list = list.filter((b) => b._id.toString() === filter._id.toString());
    if (filter.userId) list = list.filter((b) => b.userId.toString() === filter.userId.toString());
    return list[0] || null;
  };

  Booking.findOneAndUpdate = async function (query = {}, update = {}) {
    const b = inMemoryBookings.get(query._id ? query._id.toString() : '');
    if (!b || b.status !== query.status) {
      return null;
    }
    if (update.$set) {
      if (update.$set.status) b.status = update.$set.status;
      if (update.$set.checkedInAt) b.checkedInAt = update.$set.checkedInAt;
      if (update.$set.checkedInBy) b.checkedInBy = update.$set.checkedInBy;
    }
    b.populate = async function () { return b; };
    return b;
  };

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failedTests++;
    }
  }

  console.log('\n--------------------------------------------------');
  console.log('1. QR TOKEN GENERATION & CRYPTOGRAPHIC VERIFICATION');
  console.log('--------------------------------------------------');

  // Generate QR Token
  const qrToken = qrService.generateQRToken(bookingId, customerAId);
  assert(typeof qrToken === 'string' && qrToken.startsWith('PAQR:v1:'), '1. Valid HMAC SHA256 QR payload generated');

  // Verify Valid QR Token
  const verifiedBooking = await qrService.verifyQRToken(qrToken);
  assert(verifiedBooking && verifiedBooking._id.toString() === bookingId.toString(), '2. Valid QR token verified successfully');

  // Verify Tampered Token Rejection
  const tamperedToken = qrToken.slice(0, -5) + '99999';
  let tamperedCaught = false;
  try {
    await qrService.verifyQRToken(tamperedToken);
  } catch (err) {
    tamperedCaught = err.statusCode === 400;
  }
  assert(tamperedCaught, '3. Tampered QR signature rejected with HTTP 400');

  // QR Validity Rules
  const validity = qrService.getQRValidityState(mockBooking);
  assert(validity.eligible === true, '4. Confirmed booking in time window is eligible for QR check-in');

  console.log('\n--------------------------------------------------');
  console.log('2. CUSTOMER & STAFF QR API ENDPOINTS & RBAC');
  console.log('--------------------------------------------------');

  // Customer GET own QR
  const resGetQR = await request(app)
    .get(`/api/v1/bookings/${bookingId}/qr`)
    .set('Authorization', `Bearer ${tokenA}`);
  assert(resGetQR.status === 200 && resGetQR.body.data.qrToken !== undefined, '5. Customer A retrieves own booking QR token (200 OK)');

  // Customer B GET Customer A's QR rejected
  const resGetQRB = await request(app)
    .get(`/api/v1/bookings/${bookingId}/qr`)
    .set('Authorization', `Bearer ${tokenB}`);
  assert(resGetQRB.status === 404, "6. Customer B requesting Customer A's QR rejected (404 Not Found)");

  // Staff Verify QR API
  const resVerifyStaff = await request(app)
    .post('/api/v1/staff/check-in/verify-qr')
    .set('Authorization', `Bearer ${tokenStaff}`)
    .send({ qrPayload: qrToken });
  assert(resVerifyStaff.status === 200 && resVerifyStaff.body.data.validity.eligible === true, '7. Staff verifies customer QR pass (200 OK)');

  // Customer Attempting Staff QR Verification API -> 403 Forbidden
  const resVerifyCustomer = await request(app)
    .post('/api/v1/staff/check-in/verify-qr')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ qrPayload: qrToken });
  assert(resVerifyCustomer.status === 403, '8. Customer attempting Staff QR verification API rejected (403 Forbidden)');

  console.log('\n--------------------------------------------------');
  console.log('3. DOUBLE CHECK-IN PROTECTION & STATE ENGINE');
  console.log('--------------------------------------------------');

  // First check-in
  const checkedInBooking = await staffService.performCheckIn(bookingId, staffId);
  assert(checkedInBooking && checkedInBooking.status === 'checked_in', '9. Staff check-in transitions booking status to checked_in');

  // Duplicate Check-in Attempt -> 409 Conflict
  let dupConflict = false;
  try {
    await staffService.performCheckIn(bookingId, staffId);
  } catch (err) {
    dupConflict = err.statusCode === 409;
  }
  assert(dupConflict, '10. Double check-in protection prevents duplicate check-in (HTTP 409 Conflict)');

  // QR validity after check-in
  const postCheckInValidity = qrService.getQRValidityState(mockBooking);
  assert(postCheckInValidity.eligible === false, '11. Checked-in booking QR is no longer eligible for check-in');

  console.log('\n--------------------------------------------------');
  console.log('4. SOCKET.IO REAL-TIME BROADCAST ENGINE');
  console.log('--------------------------------------------------');

  let broadcastReceived = false;
  socketService.getEventBus().once('booking:checked_in', ({ room, payload }) => {
    if (payload.bookingId === bookingId.toString()) {
      broadcastReceived = true;
    }
  });

  socketService.broadcastCheckIn(mockBooking);
  assert(broadcastReceived, '12. Real-time check-in socket event emitted cleanly to authorized rooms');

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error('Unhandled error in Phase 10 test suite:', err);
  process.exit(1);
});
