require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('./src/app');
const User = require('./src/models/User');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const Booking = require('./src/models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'play_arena_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runPhase7Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 7 STAFF OPERATIONS INTEGRATION TESTS');
  console.log('==================================================');

  // Set up in-memory collections for offline execution
  const inMemoryUsers = new Map();
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();
  const inMemoryBookings = new Map();

  const customerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const mockCustomer = new User({
    _id: customerId,
    name: 'Customer User',
    email: 'customer.phase7@playarena.com',
    phone: '9876543210',
    role: 'customer',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
  });
  inMemoryUsers.set(customerId.toString(), mockCustomer);

  const mockStaff = new User({
    _id: staffId,
    name: 'Staff Operator',
    email: 'staff.phase7@playarena.com',
    phone: '9876543211',
    role: 'staff',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
  });
  inMemoryUsers.set(staffId.toString(), mockStaff);

  const mockAdmin = new User({
    _id: adminId,
    name: 'Admin Controller',
    email: 'admin.phase7@playarena.com',
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

  User.find = function (query = {}) {
    let list = Array.from(inMemoryUsers.values());
    if (query.$or) {
      list = list.filter((u) => {
        return query.$or.some((cond) => {
          if (cond.email && u.email.toLowerCase().includes(cond.email.$regex.toLowerCase())) return true;
          if (cond.phone && u.phone.includes(cond.phone.$regex)) return true;
          if (cond.name && u.name.toLowerCase().includes(cond.name.$regex.toLowerCase())) return true;
          return false;
        });
      });
    }
    return {
      select: async function () {
        return list;
      },
    };
  };

  User.findOne = async function (query = {}) {
    const list = Array.from(inMemoryUsers.values());
    if (query.email) {
      return list.find((u) => u.email.toLowerCase() === query.email.toLowerCase()) || null;
    }
    return null;
  };

  const customerToken = generateToken(mockCustomer);
  const staffToken = generateToken(mockStaff);
  const adminToken = generateToken(mockAdmin);

  // Setup Game & Resource
  const gameId = new mongoose.Types.ObjectId();
  const resourceId = new mongoose.Types.ObjectId();

  const testGame = new Game({
    _id: gameId,
    title: 'Phase 7 Badminton',
    description: 'Badminton Court for Staff Operations Test',
    category: 'badminton',
    basePricePerHour: 400,
    minBookingDurationMinutes: 60,
    maxBookingDurationMinutes: 120,
    bookingIntervalMinutes: 60,
    isActive: true,
  });
  inMemoryGames.set(gameId.toString(), testGame);

  const testResource = new Resource({
    _id: resourceId,
    gameId: gameId,
    name: 'Staff Court 1',
    status: 'available',
    isActive: true,
  });
  inMemoryResources.set(resourceId.toString(), testResource);

  // Mongoose Game & Resource Mocking
  Game.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return inMemoryGames.get(id.toString()) || null;
  };

  Resource.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return inMemoryResources.get(id.toString()) || null;
  };

  Resource.find = function () {
    return {
      populate: async function () {
        return Array.from(inMemoryResources.values()).map((r) => {
          const rObj = new Resource(r.toObject());
          rObj.gameId = inMemoryGames.get(r.gameId.toString());
          return rObj;
        });
      },
    };
  };

  // Mongoose Booking Mocking
  Booking.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    inMemoryBookings.set(this._id.toString(), this);
    return this;
  };

  function createPopulatedBooking(b) {
    if (!b) return null;
    const bObj = new Booking(b.toObject ? b.toObject() : b);
    bObj.userId = inMemoryUsers.get(b.userId.toString()) || { _id: b.userId, name: 'Customer User', email: 'cust@test.com', phone: '9876543210' };
    bObj.gameId = inMemoryGames.get(b.gameId.toString()) || { _id: b.gameId, title: 'Phase 7 Badminton' };
    bObj.resourceId = inMemoryResources.get(b.resourceId.toString()) || { _id: b.resourceId, name: 'Staff Court 1' };
    bObj.save = async function () {
      inMemoryBookings.set(this._id.toString(), this);
      return this;
    };
    return bObj;
  }

  Booking.findById = function (id) {
    const makeChainable = (doc) => ({
      populate: function () {
        return makeChainable(doc);
      },
      then: (resolve) => resolve(doc ? createPopulatedBooking(doc) : null),
      catch: (reject) => {},
    });
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return makeChainable(null);
    const doc = inMemoryBookings.get(id.toString());
    return makeChainable(doc);
  };

  Booking.findOne = function (query = {}) {
    let list = Array.from(inMemoryBookings.values());
    let match = list.find((b) => {
      if (query._id && b._id.toString() !== query._id.toString()) return false;
      if (query.resourceId && b.resourceId.toString() !== query.resourceId.toString()) return false;
      if (query.status && query.status.$in && !query.status.$in.includes(b.status)) return false;
      if (query.startAt && query.startAt.$lt && new Date(b.startAt) >= new Date(query.startAt.$lt)) return false;
      if (query.endAt && query.endAt.$gt && new Date(b.endAt) <= new Date(query.endAt.$gt)) return false;
      return true;
    });

    const makeChainable = (doc) => ({
      populate: function () {
        return makeChainable(doc);
      },
      then: (resolve) => resolve(doc ? createPopulatedBooking(doc) : null),
    });
    return makeChainable(match);
  };

  Booking.find = function (query = {}) {
    let list = Array.from(inMemoryBookings.values());

    if (query.startAt && query.startAt.$gte && query.startAt.$lte) {
      list = list.filter(
        (b) => new Date(b.startAt) >= new Date(query.startAt.$gte) && new Date(b.startAt) <= new Date(query.startAt.$lte)
      );
    }

    if (query.status) {
      if (query.status.$in) {
        list = list.filter((b) => query.status.$in.includes(b.status));
      } else {
        list = list.filter((b) => b.status === query.status);
      }
    }

    if (query.$or) {
      list = list.filter((b) => {
        return query.$or.some((cond) => {
          if (cond._id && b._id.toString() === cond._id.toString()) return true;
          if (cond.userId && cond.userId.$in && cond.userId.$in.some((uId) => uId.toString() === b.userId.toString())) return true;
          return false;
        });
      });
    }

    const chainable = {
      select: function () {
        return chainable;
      },
      populate: function () {
        return chainable;
      },
      sort: function () {
        return chainable;
      },
      skip: function () {
        return chainable;
      },
      limit: function () {
        return list.map(createPopulatedBooking);
      },
      then: (resolve) => resolve(list.map(createPopulatedBooking)),
    };
    return chainable;
  };

  Booking.countDocuments = async function () {
    return inMemoryBookings.size;
  };

  Booking.findOneAndUpdate = async function (query = {}, update = {}, options = {}) {
    const list = Array.from(inMemoryBookings.values());
    const doc = list.find((b) => {
      if (query._id && b._id.toString() !== query._id.toString()) return false;
      if (query.status && b.status !== query.status) return false;
      return true;
    });
    if (!doc) return null;
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    inMemoryBookings.set(doc._id.toString(), doc);
    const populated = createPopulatedBooking(doc);
    populated.populate = async function () {
      return populated;
    };
    return populated;
  };

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
  console.log('1. STAFF AUTHENTICATION & RBAC SECURITY BOUNDARY');
  console.log('--------------------------------------------------');

  // Test 1: Unauthenticated request to staff dashboard -> 401
  const res1 = await request(app).get('/api/v1/staff/dashboard');
  assert(res1.status === 401, '1. Unauthenticated request to /staff/dashboard returns 401 Unauthorized');

  // Test 2: Customer token attempting staff dashboard -> 403
  const res2 = await request(app)
    .get('/api/v1/staff/dashboard')
    .set('Authorization', `Bearer ${customerToken}`);
  assert(res2.status === 403, '2. Customer token attempting staff dashboard returns 403 Forbidden');

  // Test 3: Staff token accessing staff dashboard -> 200 OK
  const res3 = await request(app)
    .get('/api/v1/staff/dashboard')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(res3.status === 200 && res3.body.status === 'success', '3. Staff token accessing staff dashboard returns 200 OK');

  // Test 4: Admin token accessing staff dashboard -> 200 OK
  const res4 = await request(app)
    .get('/api/v1/staff/dashboard')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(res4.status === 200 && res4.body.status === 'success', '4. Admin token accessing staff dashboard returns 200 OK');

  // Test 5: Staff token attempting admin-only endpoint -> 403
  const res5 = await request(app)
    .get('/api/v1/admin/games')
    .set('Authorization', `Bearer ${staffToken}`);
  assert(res5.status === 403, '5. Staff token attempting admin-only endpoint returns 403 Forbidden');

  console.log('\n--------------------------------------------------');
  console.log("2. DASHBOARD & TODAY'S SCHEDULE");
  console.log('--------------------------------------------------');

  const now = new Date();
  const startAt1 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0));
  const endAt1 = new Date(startAt1.getTime() + 60 * 60 * 1000);

  const startAt2 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const endAt2 = new Date(startAt2.getTime() + 60 * 60 * 1000);

  const b1Id = new mongoose.Types.ObjectId();
  const booking1 = new Booking({
    _id: b1Id,
    userId: customerId,
    gameId: gameId,
    resourceId: resourceId,
    startAt: startAt1,
    endAt: endAt1,
    durationMinutes: 60,
    pricePerHourAtBooking: 400,
    totalAmount: 400,
    status: 'confirmed',
  });
  await booking1.save();

  const b2Id = new mongoose.Types.ObjectId();
  const booking2 = new Booking({
    _id: b2Id,
    userId: customerId,
    gameId: gameId,
    resourceId: resourceId,
    startAt: startAt2,
    endAt: endAt2,
    durationMinutes: 60,
    pricePerHourAtBooking: 400,
    totalAmount: 400,
    status: 'confirmed',
  });
  await booking2.save();

  // Test 6: Get schedule for today -> 200 OK
  const res6 = await request(app)
    .get(`/api/v1/staff/bookings?date=${startAt1.toISOString().split('T')[0]}`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res6.status === 200 && res6.body.data.bookings.length >= 2,
    '6. GET /staff/bookings returns today schedule populated with customer & resource'
  );

  console.log('\n--------------------------------------------------');
  console.log('3. LOOKUP & BOOKING DETAILS');
  console.log('--------------------------------------------------');

  // Test 7: Lookup booking by ID
  const res7 = await request(app)
    .post('/api/v1/staff/check-in/lookup')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ query: b1Id.toString() });
  assert(
    res7.status === 200 && res7.body.data.bookings.length === 1,
    '7. Lookup by Booking ID returns matching booking'
  );

  // Test 8: Lookup booking by customer email
  const res8 = await request(app)
    .post('/api/v1/staff/check-in/lookup')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ query: 'customer.phase7' });
  assert(
    res8.status === 200 && res8.body.data.bookings.length >= 1,
    '8. Lookup by customer email substring returns matching bookings'
  );

  // Test 9: Get single booking details
  const res9 = await request(app)
    .get(`/api/v1/staff/bookings/${b1Id.toString()}`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res9.status === 200 && res9.body.data.booking._id === b1Id.toString(),
    '9. GET /staff/bookings/:id returns complete details'
  );

  console.log('\n--------------------------------------------------');
  console.log('4. SESSION STATE TRANSITIONS');
  console.log('--------------------------------------------------');

  // Test 10: Check in booking (confirmed -> checked_in)
  const res10 = await request(app)
    .post(`/api/v1/staff/bookings/${b1Id.toString()}/check-in`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res10.status === 200 && res10.body.data.booking.status === 'checked_in',
    '10. POST /staff/bookings/:id/check-in transitions status from confirmed to checked_in'
  );

  // Test 11: Start session (checked_in -> in_progress)
  const res11 = await request(app)
    .post(`/api/v1/staff/bookings/${b1Id.toString()}/start`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res11.status === 200 && res11.body.data.booking.status === 'in_progress',
    '11. POST /staff/bookings/:id/start transitions status from checked_in to in_progress'
  );

  // Test 12: Complete session (in_progress -> completed)
  const res12 = await request(app)
    .post(`/api/v1/staff/bookings/${b1Id.toString()}/complete`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res12.status === 200 && res12.body.data.booking.status === 'completed',
    '12. POST /staff/bookings/:id/complete transitions status from in_progress to completed'
  );

  // Test 13: Invalid state transition (completed -> checked_in) -> 400 Bad Request
  const res13 = await request(app)
    .post(`/api/v1/staff/bookings/${b1Id.toString()}/check-in`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res13.status === 400,
    '13. Invalid transition from completed to checked_in rejected with 400 Bad Request'
  );

  // Test 14: Mark no-show (confirmed -> no_show)
  const res14 = await request(app)
    .post(`/api/v1/staff/bookings/${b2Id.toString()}/no-show`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res14.status === 200 && res14.body.data.booking.status === 'no_show',
    '14. POST /staff/bookings/:id/no-show transitions confirmed booking to no_show'
  );

  // Test 15: Invalid state transition (no_show -> in_progress) -> 400 Bad Request
  const res15 = await request(app)
    .post(`/api/v1/staff/bookings/${b2Id.toString()}/start`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(
    res15.status === 400,
    '15. Invalid transition from no_show to in_progress rejected with 400 Bad Request'
  );

  console.log('\n--------------------------------------------------');
  console.log('5. WALK-IN CREATION & CONCURRENCY PROTECTION');
  console.log('--------------------------------------------------');

  const walkInStartAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 14, 0, 0));
  const walkInDate = walkInStartAt.toISOString().split('T')[0];

  // Test 16: Staff creates walk-in booking for open slot
  const res16 = await request(app)
    .post('/api/v1/staff/walk-in')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      gameId: gameId.toString(),
      resourceId: resourceId.toString(),
      date: walkInDate,
      startTime: '14:00',
      durationMinutes: 60,
      customerEmail: 'customer.phase7@playarena.com',
    });
  assert(
    res16.status === 201 && res16.body.data.booking.status === 'checked_in',
    '16. POST /staff/walk-in creates walk-in booking and auto-checks in'
  );

  // Test 17: Competing walk-in for exact same time slot rejected with 409 Conflict
  const res17 = await request(app)
    .post('/api/v1/staff/walk-in')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      gameId: gameId.toString(),
      resourceId: resourceId.toString(),
      date: walkInDate,
      startTime: '14:00',
      durationMinutes: 60,
    });
  assert(
    res17.status === 409,
    '17. Overlapping walk-in request is rejected with 409 Conflict (concurrency protection enforced)'
  );

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
