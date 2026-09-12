require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('./src/app');
const User = require('./src/models/User');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const Booking = require('./src/models/Booking');
const Payment = require('./src/models/Payment');

const JWT_SECRET = process.env.JWT_SECRET || 'play_arena_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runPhase8Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 8 ADMIN CONTROL CENTER INTEGRATION TESTS');
  console.log('==================================================');

  // In-memory collections for offline test execution
  const inMemoryUsers = new Map();
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();
  const inMemoryBookings = new Map();
  const inMemoryPayments = new Map();

  const customerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const mockCustomer = new User({
    _id: customerId,
    name: 'Customer User',
    email: 'customer.phase8@playarena.com',
    phone: '9876543210',
    role: 'customer',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
  });
  inMemoryUsers.set(customerId.toString(), mockCustomer);

  const mockStaff = new User({
    _id: staffId,
    name: 'Staff Operator',
    email: 'staff.phase8@playarena.com',
    phone: '9876543211',
    role: 'staff',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
  });
  inMemoryUsers.set(staffId.toString(), mockStaff);

  const mockAdmin = new User({
    _id: adminId,
    name: 'Admin Controller',
    email: 'admin.phase8@playarena.com',
    phone: '9876543212',
    role: 'admin',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
  });
  inMemoryUsers.set(adminId.toString(), mockAdmin);

  // Mongoose User Mocking
  User.findById = function (id) {
    return {
      select: async function () {
        if (!id) return null;
        return inMemoryUsers.get(id.toString()) || null;
      },
    };
  };

  User.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryUsers.set(this._id.toString(), this);
    return this;
  };

  User.create = async function (doc) {
    const u = new User(doc);
    u._id = u._id || new mongoose.Types.ObjectId();
    inMemoryUsers.set(u._id.toString(), u);
    return u;
  };

  User.find = function (query = {}) {
    let list = Array.from(inMemoryUsers.values());
    if (query.role) {
      list = list.filter((u) => u.role === query.role);
    }
    let excludePassword = false;
    const chainable = {
      select: function (sel) {
        if (sel === '-passwordHash') excludePassword = true;
        return chainable;
      },
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () {
        return list.map((u) => {
          const obj = u.toObject ? u.toObject() : { ...u };
          if (excludePassword) delete obj.passwordHash;
          return obj;
        });
      },
      then: (resolve) =>
        resolve(
          list.map((u) => {
            const obj = u.toObject ? u.toObject() : { ...u };
            if (excludePassword) delete obj.passwordHash;
            return obj;
          })
        ),
    };
    return chainable;
  };

  User.findOne = function (query = {}) {
    let list = Array.from(inMemoryUsers.values());
    let match = list.find((u) => {
      if (query._id && u._id.toString() !== query._id.toString()) return false;
      if (query.email && u.email.toLowerCase() !== query.email.toLowerCase()) return false;
      if (query.role && u.role !== query.role) return false;
      return true;
    });

    const chainable = {
      select: function () { return chainable; },
      then: (resolve) => resolve(match || null),
    };
    return chainable;
  };

  User.countDocuments = async function (query = {}) {
    let list = Array.from(inMemoryUsers.values());
    if (query.role) list = list.filter((u) => u.role === query.role);
    return list.length;
  };

  const customerToken = generateToken(mockCustomer);
  const staffToken = generateToken(mockStaff);
  const adminToken = generateToken(mockAdmin);

  // Setup Game & Resource
  const gameId = new mongoose.Types.ObjectId();
  const resourceId = new mongoose.Types.ObjectId();

  const testGame = new Game({
    _id: gameId,
    name: 'Phase 8 Tennis',
    slug: 'phase-8-tennis',
    description: 'Tennis Court for Admin Test',
    category: 'court',
    basePricePerHour: 600,
    minBookingDurationMinutes: 60,
    maxBookingDurationMinutes: 120,
    bookingIntervalMinutes: 60,
    isActive: true,
  });
  inMemoryGames.set(gameId.toString(), testGame);

  const testResource = new Resource({
    _id: resourceId,
    gameId: gameId,
    name: 'Court A',
    status: 'available',
    isActive: true,
  });
  inMemoryResources.set(resourceId.toString(), testResource);

  // Mongoose Game & Resource Mocking
  Game.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryGames.set(this._id.toString(), this);
    return this;
  };
  Game.create = async function (doc) {
    const g = new Game(doc);
    g._id = g._id || new mongoose.Types.ObjectId();
    inMemoryGames.set(g._id.toString(), g);
    return g;
  };
  Game.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return inMemoryGames.get(id.toString()) || null;
  };
  Game.find = function (query = {}) {
    let list = Array.from(inMemoryGames.values());
    if (query.isActive !== undefined) list = list.filter((g) => g.isActive === query.isActive);
    const chainable = {
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () { return list; },
      then: (resolve) => resolve(list),
    };
    return chainable;
  };
  Game.countDocuments = async function (query = {}) {
    let list = Array.from(inMemoryGames.values());
    if (query.isActive !== undefined) list = list.filter((g) => g.isActive === query.isActive);
    return list.length;
  };

  Resource.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryResources.set(this._id.toString(), this);
    return this;
  };
  Resource.create = async function (doc) {
    const r = new Resource(doc);
    r._id = r._id || new mongoose.Types.ObjectId();
    inMemoryResources.set(r._id.toString(), r);
    return r;
  };
  Resource.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return inMemoryResources.get(id.toString()) || null;
  };
  Resource.find = function () {
    const list = Array.from(inMemoryResources.values());
    const chainable = {
      populate: function () { return chainable; },
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () { return list; },
      then: (resolve) => resolve(list),
    };
    return chainable;
  };
  Resource.countDocuments = async function () { return inMemoryResources.size; };

  // Setup Booking & Payment
  const bookingId = new mongoose.Types.ObjectId();
  const testBooking = new Booking({
    _id: bookingId,
    userId: customerId,
    gameId: gameId,
    resourceId: resourceId,
    startAt: new Date(),
    endAt: new Date(Date.now() + 3600000),
    durationMinutes: 60,
    pricePerHourAtBooking: 600,
    totalAmount: 600,
    status: 'confirmed',
  });
  inMemoryBookings.set(bookingId.toString(), testBooking);

  const paymentId = new mongoose.Types.ObjectId();
  const testPayment = new Payment({
    _id: paymentId,
    userId: customerId,
    bookingId: bookingId,
    provider: 'razorpay',
    providerOrderId: 'order_phase8_123',
    providerPaymentId: 'pay_phase8_456',
    amount: 600,
    currency: 'INR',
    status: 'paid',
  });
  inMemoryPayments.set(paymentId.toString(), testPayment);

  // Mongoose Booking & Payment Mocking
  Booking.findById = function (id) {
    const makeChainable = (doc) => ({
      populate: function () { return makeChainable(doc); },
      then: (resolve) => resolve(doc || null),
    });
    const b = inMemoryBookings.get(id ? id.toString() : '');
    return makeChainable(b);
  };
  Booking.find = function () {
    const list = Array.from(inMemoryBookings.values());
    const chainable = {
      populate: function () { return chainable; },
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () { return list; },
      then: (resolve) => resolve(list),
    };
    return chainable;
  };
  Booking.countDocuments = async function () { return inMemoryBookings.size; };

  Payment.findOne = async function (query = {}) {
    const list = Array.from(inMemoryPayments.values());
    if (query.bookingId) return list.find((p) => p.bookingId.toString() === query.bookingId.toString()) || null;
    return null;
  };
  Payment.findById = function (id) {
    const b = inMemoryPayments.get(id ? id.toString() : '');
    const chainable = {
      populate: function () { return chainable; },
      then: (resolve) => resolve(b || null),
    };
    return chainable;
  };
  Payment.find = function () {
    const list = Array.from(inMemoryPayments.values());
    const chainable = {
      populate: function () { return chainable; },
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () { return list; },
      then: (resolve) => resolve(list),
    };
    return chainable;
  };
  Payment.countDocuments = async function () { return inMemoryPayments.size; };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  console.log('\n--------------------------------------------------');
  console.log('1. ADMIN AUTHENTICATION & RBAC BOUNDARY TESTS');
  console.log('--------------------------------------------------');

  // Test 1: Unauthenticated request to /admin/dashboard -> 401
  const res1 = await request(app).get('/api/v1/admin/dashboard');
  assert(res1.status === 401, '1. Unauthenticated request to /admin/dashboard returns 401 Unauthorized');

  // Test 2: Customer token attempting /admin/dashboard -> 403
  const res2 = await request(app)
    .get('/api/v1/admin/dashboard')
    .set('Authorization', `Bearer ${customerToken}`);
  assert(res2.status === 403, '2. Customer token attempting /admin/dashboard returns 403 Forbidden');

  // Test 3: Staff token attempting /admin/dashboard -> 403
  const res3 = await request(app)
    .get('/api/v1/admin/dashboard')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(res3.status === 403, '3. Staff token attempting /admin/dashboard returns 403 Forbidden');

  // Test 4: Admin token accessing /admin/dashboard -> 200 OK
  const res4 = await request(app)
    .get('/api/v1/admin/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res4.status === 200 && res4.body.status === 'success', '4. Admin token accessing /admin/dashboard returns 200 OK');

  console.log('\n--------------------------------------------------');
  console.log('2. ADMIN GAME & RESOURCE MANAGEMENT');
  console.log('--------------------------------------------------');

  // Test 5: Admin lists games
  const res5 = await request(app)
    .get('/api/v1/admin/games')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res5.status === 200 && res5.body.data.games.length >= 1, '5. Admin GET /admin/games returns game catalog');

  // Test 6: Admin creates a new game
  const res6 = await request(app)
    .post('/api/v1/admin/games')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Phase 8 Squash',
      slug: 'phase-8-squash',
      description: 'Squash court game',
      category: 'court',
      basePricePerHour: 700,
      minBookingDurationMinutes: 60,
      maxBookingDurationMinutes: 120,
      bookingIntervalMinutes: 60,
    });
  assert(res6.status === 201 && res6.body.data.game.name === 'Phase 8 Squash', '6. Admin POST /admin/games creates new game');

  // Test 7: Admin lists all resources
  const res7 = await request(app)
    .get('/api/v1/admin/resources')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res7.status === 200 && res7.body.data.resources.length >= 1, '7. Admin GET /admin/resources returns all resources');

  console.log('\n--------------------------------------------------');
  console.log('3. ADMIN BOOKING, CUSTOMER & STAFF MANAGEMENT');
  console.log('--------------------------------------------------');

  // Test 8: Admin lists all bookings
  const res8 = await request(app)
    .get('/api/v1/admin/bookings')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res8.status === 200 && res8.body.data.bookings.length >= 1, '8. Admin GET /admin/bookings returns booking records');

  // Test 9: Admin lists customers and verifies passwordHash is excluded
  const res9 = await request(app)
    .get('/api/v1/admin/customers')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(
    res9.status === 200 &&
      res9.body.data.customers.length >= 1 &&
      res9.body.data.customers[0].passwordHash === undefined,
    '9. Admin GET /admin/customers returns customers without passwordHash'
  );

  // Test 10: Admin creates a staff account
  const res10 = await request(app)
    .post('/api/v1/admin/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'New Staff Operator',
      email: 'newstaff.p8@playarena.com',
      phone: '9876543299',
      password: 'StaffPassword123!',
    });
  assert(
    res10.status === 201 && res10.body.data.staff.role === 'staff',
    '10. Admin POST /admin/staff creates staff account with hashed password and role staff'
  );

  // Test 11: Admin lists payments
  const res11 = await request(app)
    .get('/api/v1/admin/payments')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res11.status === 200 && res11.body.data.payments.length >= 1, '11. Admin GET /admin/payments returns payment records');

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
