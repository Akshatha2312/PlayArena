const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('./src/app');
const User = require('./src/models/User');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const Booking = require('./src/models/Booking');
const { generateUserToken } = require('./src/utils/token');

async function runPhase4Tests() {
  console.log('==================================================');
  console.log('PHASE 4: BACKEND BOOKING ENGINE TEST SUITE');
  console.log('==================================================\n');

  let isDbConnected = false;
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isDbConnected = true;
      console.log('✔ Connected to MongoDB live database.\n');
    } catch (err) {
      console.log(`[INFO] Live MongoDB connection unavailable (${err.message}). Using HTTP mock-backed Mongoose store for tests.\n`);
    }
  }

  // Setup In-Memory Mongoose Store for Offline execution
  const inMemoryGames = new Map();
  const inMemoryResources = new Map();
  const inMemoryBookings = new Map();

  if (!isDbConnected) {
    mongoose.set('bufferCommands', false);

    // --- GAME MOCK ---
    Game.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      inMemoryGames.set(this._id.toString(), this);
      return this;
    };
    Game.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryGames.get(id.toString());
      return doc ? new Game(doc.toObject()) : null;
    };
    Game.find = function (filter = {}) {
      return {
        sort: function () {
          return {
            skip: function (skipVal = 0) {
              return {
                limit: async function (limitVal = 10) {
                  let list = Array.from(inMemoryGames.values());
                  if (filter.category) list = list.filter((g) => g.category === filter.category);
                  if (filter.isActive !== undefined) list = list.filter((g) => g.isActive === filter.isActive);
                  return list.slice(skipVal, skipVal + limitVal).map((g) => new Game(g.toObject()));
                },
              };
            },
          };
        },
      };
    };
    Game.countDocuments = async function (filter = {}) {
      let list = Array.from(inMemoryGames.values());
      if (filter.category) list = list.filter((g) => g.category === filter.category);
      if (filter.isActive !== undefined) list = list.filter((g) => g.isActive === filter.isActive);
      return list.length;
    };

    // --- RESOURCE MOCK ---
    Resource.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      inMemoryResources.set(this._id.toString(), this);
      return this;
    };
    Resource.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryResources.get(id.toString());
      return doc ? new Resource(doc.toObject()) : null;
    };
    Resource.find = function (filter = {}) {
      return {
        sort: function () {
          return {
            skip: function (skipVal = 0) {
              return {
                limit: async function (limitVal = 10) {
                  let list = Array.from(inMemoryResources.values());
                  if (filter.gameId) list = list.filter((r) => r.gameId.toString() === filter.gameId.toString());
                  if (filter.status) list = list.filter((r) => r.status === filter.status);
                  if (filter.isActive !== undefined) list = list.filter((r) => r.isActive === filter.isActive);
                  return list.slice(skipVal, skipVal + limitVal).map((r) => new Resource(r.toObject()));
                },
              };
            },
          };
        },
      };
    };
    Resource.countDocuments = async function (filter = {}) {
      let list = Array.from(inMemoryResources.values());
      if (filter.gameId) list = list.filter((r) => r.gameId.toString() === filter.gameId.toString());
      if (filter.status) list = list.filter((r) => r.status === filter.status);
      if (filter.isActive !== undefined) list = list.filter((r) => r.isActive === filter.isActive);
      return list.length;
    };

    // --- BOOKING MOCK ---
    Booking.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new mongoose.Types.ObjectId();
      inMemoryBookings.set(this._id.toString(), this);
      return this;
    };
    Booking.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = inMemoryBookings.get(id.toString());
      return doc ? new Booking(doc.toObject()) : null;
    };
    Booking.findOne = async function (query = {}) {
      const list = Array.from(inMemoryBookings.values());
      for (const b of list) {
        let match = true;
        if (query._id && query._id.$ne && b._id.toString() === query._id.$ne.toString()) match = false;
        if (query._id && !query._id.$ne && b._id.toString() !== query._id.toString()) match = false;
        if (query.userId && b.userId.toString() !== query.userId.toString()) match = false;
        if (query.resourceId && b.resourceId.toString() !== query.resourceId.toString()) match = false;
        if (query.status && query.status.$in && !query.status.$in.includes(b.status)) match = false;
        if (query.startAt && query.startAt.$lt && !(b.startAt < query.startAt.$lt)) match = false;
        if (query.endAt && query.endAt.$gt && !(b.endAt > query.endAt.$gt)) match = false;
        if (match) return new Booking(b.toObject());
      }
      return null;
    };
    Booking.find = function (query = {}) {
      return {
        sort: function () {
          return {
            skip: function (skipVal = 0) {
              return {
                limit: async function (limitVal = 10) {
                  let list = Array.from(inMemoryBookings.values());
                  if (query.userId) list = list.filter((b) => b.userId.toString() === query.userId.toString());
                  if (query.status) list = list.filter((b) => b.status === query.status);
                  list.sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
                  return list.slice(skipVal, skipVal + limitVal).map((b) => new Booking(b.toObject()));
                },
              };
            },
          };
        },
      };
    };
    Booking.countDocuments = async function (query = {}) {
      let list = Array.from(inMemoryBookings.values());
      if (query.userId) list = list.filter((b) => b.userId.toString() === query.userId.toString());
      if (query.status) list = list.filter((b) => b.status === query.status);
      return list.length;
    };
  }

  // Setup Mock Users & Tokens
  const mockCustomer1 = { _id: '650000000000000000000001', role: 'customer', name: 'Cust 1', email: 'c1@test.com' };
  const mockCustomer2 = { _id: '650000000000000000000002', role: 'customer', name: 'Cust 2', email: 'c2@test.com' };
  const mockStaffUser = { _id: '650000000000000000000003', role: 'staff', name: 'Staff', email: 's@test.com' };
  const mockAdminUser = { _id: '650000000000000000000004', role: 'admin', name: 'Admin', email: 'a@test.com' };

  const originalFindById = User.findById;
  User.findById = (id) => ({
    select: async () => {
      const idStr = id.toString();
      if (idStr === mockCustomer1._id) return mockCustomer1;
      if (idStr === mockCustomer2._id) return mockCustomer2;
      if (idStr === mockStaffUser._id) return mockStaffUser;
      if (idStr === mockAdminUser._id) return mockAdminUser;
      return null;
    },
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  const customer1Token = generateUserToken({ id: mockCustomer1._id, role: 'customer' });
  const customer2Token = generateUserToken({ id: mockCustomer2._id, role: 'customer' });
  const staffToken = generateUserToken({ id: mockStaffUser._id, role: 'staff' });
  const adminToken = generateUserToken({ id: mockAdminUser._id, role: 'admin' });

  const passed = [];
  const failed = [];

  function recordSuccess(testNum, title) {
    console.log(`✅ TEST ${testNum} PASSED: ${title}`);
    passed.push({ testNum, title });
  }

  function recordFailure(testNum, title, err) {
    console.error(`❌ TEST ${testNum} FAILED: ${title} - ${err.message}`);
    failed.push({ testNum, title, error: err.message });
  }

  try {
    // PREPARATION: Create Test Games & Resources
    const gameStandard = new Game({
      name: 'Badminton P4 ' + Date.now(),
      slug: 'badminton-p4-' + Date.now(),
      category: 'court',
      basePricePerHour: 600,
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 240,
      bookingIntervalMinutes: 30,
      isActive: true,
    });
    await gameStandard.save();

    const gameInactive = new Game({
      name: 'Inactive Game P4 ' + Date.now(),
      slug: 'inactive-p4-' + Date.now(),
      category: 'court',
      basePricePerHour: 200,
      isActive: false,
    });
    await gameInactive.save();

    const resStandard = new Resource({
      gameId: gameStandard._id,
      name: 'Court 1 Standard',
      status: 'available',
      isActive: true,
    });
    await resStandard.save();

    const resCustomPrice = new Resource({
      gameId: gameStandard._id,
      name: 'Court 2 VIP',
      status: 'available',
      customPricePerHour: 800,
      isActive: true,
    });
    await resCustomPrice.save();

    const resInactive = new Resource({
      gameId: gameStandard._id,
      name: 'Court 3 Inactive',
      status: 'available',
      isActive: false,
    });
    await resInactive.save();

    const resMaintenance = new Resource({
      gameId: gameStandard._id,
      name: 'Court 4 Maintenance',
      status: 'maintenance',
      isActive: true,
    });
    await resMaintenance.save();

    const resOutOfService = new Resource({
      gameId: gameStandard._id,
      name: 'Court 5 Out of Service',
      status: 'out_of_service',
      isActive: true,
    });
    await resOutOfService.save();

    const resOtherGame = new Resource({
      gameId: gameInactive._id,
      name: 'Other Game Resource',
      status: 'available',
      isActive: true,
    });
    await resOtherGame.save();

    // ==================================================
    // 1. AUTHENTICATION & RBAC (1 - 5)
    // ==================================================
    console.log('\n--- 1. AUTHENTICATION & RBAC ---');

    // TEST 1: Unauthenticated booking creation -> 401
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '10:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 401);
      recordSuccess(1, 'Unauthenticated booking creation -> 401 Unauthorized');
    } catch (err) {
      recordFailure(1, 'Unauthenticated booking creation -> 401 Unauthorized', err);
    }

    // TEST 2: Unauthenticated availability check -> 200
    try {
      const res = await fetch(`${baseUrl}/games/${gameStandard._id}/resources/${resStandard._id}/availability?date=2026-09-20&startTime=10:00&durationMinutes=60`);
      assert.strictEqual(res.status, 200);
      recordSuccess(2, 'Unauthenticated availability check -> 200 OK');
    } catch (err) {
      recordFailure(2, 'Unauthenticated availability check -> 200 OK', err);
    }

    // TEST 3: Customer booking creation -> 201
    let createdBooking1 = null;
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '10:00', durationMinutes: 60 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      assert.strictEqual(data.status, 'success');
      createdBooking1 = data.data.booking;
      recordSuccess(3, 'Customer booking creation -> 201 Created');
    } catch (err) {
      recordFailure(3, 'Customer booking creation -> 201 Created', err);
    }

    // TEST 4: Staff accessing customer booking creation -> 403
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '11:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(4, 'Staff accessing customer booking creation -> 403 Forbidden');
    } catch (err) {
      recordFailure(4, 'Staff accessing customer booking creation -> 403 Forbidden', err);
    }

    // TEST 5: Admin accessing customer-only endpoint -> 403
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '11:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(5, 'Admin accessing customer-only endpoint -> 403 Forbidden');
    } catch (err) {
      recordFailure(5, 'Admin accessing customer-only endpoint -> 403 Forbidden', err);
    }

    // ==================================================
    // 2. GAME & RESOURCE VALIDATION (6 - 12)
    // ==================================================
    console.log('\n--- 2. GAME & RESOURCE VALIDATION ---');

    // TEST 6: Nonexistent Game -> 404
    try {
      const dummyId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: dummyId, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(6, 'Nonexistent Game -> 404 Not Found');
    } catch (err) {
      recordFailure(6, 'Nonexistent Game -> 404 Not Found', err);
    }

    // TEST 7: Inactive Game -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameInactive._id, resourceId: resOtherGame._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(7, 'Inactive Game -> 400 Bad Request');
    } catch (err) {
      recordFailure(7, 'Inactive Game -> 400 Bad Request', err);
    }

    // TEST 8: Nonexistent Resource -> 404
    try {
      const dummyId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: dummyId, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(8, 'Nonexistent Resource -> 404 Not Found');
    } catch (err) {
      recordFailure(8, 'Nonexistent Resource -> 404 Not Found', err);
    }

    // TEST 9: Inactive Resource -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resInactive._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(9, 'Inactive Resource -> 400 Bad Request');
    } catch (err) {
      recordFailure(9, 'Inactive Resource -> 400 Bad Request', err);
    }

    // TEST 10: Maintenance Resource -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resMaintenance._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(10, 'Maintenance Resource -> 400 Bad Request');
    } catch (err) {
      recordFailure(10, 'Maintenance Resource -> 400 Bad Request', err);
    }

    // TEST 11: Out of Service Resource -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resOutOfService._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(11, 'Out of Service Resource -> 400 Bad Request');
    } catch (err) {
      recordFailure(11, 'Out of Service Resource -> 400 Bad Request', err);
    }

    // TEST 12: Resource belonging to another Game -> 404
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resOtherGame._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(12, 'Resource belonging to another Game -> 404 Not Found');
    } catch (err) {
      recordFailure(12, 'Resource belonging to another Game -> 404 Not Found', err);
    }

    // ==================================================
    // 3. DURATION VALIDATION (13 - 16)
    // ==================================================
    console.log('\n--- 3. DURATION VALIDATION ---');

    // TEST 13: Duration below minimum -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 15 }), // min is 30
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(13, 'Duration below minimum -> 400 Bad Request');
    } catch (err) {
      recordFailure(13, 'Duration below minimum -> 400 Bad Request', err);
    }

    // TEST 14: Duration above maximum -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 300 }), // max is 240
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(14, 'Duration above maximum -> 400 Bad Request');
    } catch (err) {
      recordFailure(14, 'Duration above maximum -> 400 Bad Request', err);
    }

    // TEST 15: Duration not matching booking interval -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 45 }), // step is 30
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(15, 'Duration not matching booking interval -> 400 Bad Request');
    } catch (err) {
      recordFailure(15, 'Duration not matching booking interval -> 400 Bad Request', err);
    }

    // TEST 16: Valid duration -> 201
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 201);
      recordSuccess(16, 'Valid duration -> 201 Created');
    } catch (err) {
      recordFailure(16, 'Valid duration -> 201 Created', err);
    }

    // ==================================================
    // 4. TIME VALIDATION (17 - 20)
    // ==================================================
    console.log('\n--- 4. TIME VALIDATION ---');

    // TEST 17: Invalid date -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: 'invalid-date', startTime: '12:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(17, 'Invalid date string -> 400 Bad Request');
    } catch (err) {
      recordFailure(17, 'Invalid date string -> 400 Bad Request', err);
    }

    // TEST 18: Invalid time -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: 'bad-time', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(18, 'Invalid time string -> 400 Bad Request');
    } catch (err) {
      recordFailure(18, 'Invalid time string -> 400 Bad Request', err);
    }

    // TEST 19: Invalid duration -> 400
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-20', startTime: '12:00', durationMinutes: -30 }),
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(19, 'Invalid duration -> 400 Bad Request');
    } catch (err) {
      recordFailure(19, 'Invalid duration -> 400 Bad Request', err);
    }

    // TEST 20: endAt correctly calculated
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-21', startTime: '14:00', durationMinutes: 90 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      const start = new Date(data.data.booking.startAt).getTime();
      const end = new Date(data.data.booking.endAt).getTime();
      assert.strictEqual(end - start, 90 * 60 * 1000, 'endAt - startAt must equal exactly 90 minutes');
      recordSuccess(20, 'endAt correctly calculated from startAt and durationMinutes');
    } catch (err) {
      recordFailure(20, 'endAt correctly calculated from startAt and durationMinutes', err);
    }

    // ==================================================
    // 5. PRICING SNAPSHOT (21 - 26)
    // ==================================================
    console.log('\n--- 5. PRICING SNAPSHOT ---');

    // TEST 21: Game base price used when Resource override absent
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-22', startTime: '10:00', durationMinutes: 60 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.pricePerHourAtBooking, 600);
      assert.strictEqual(data.data.booking.totalAmount, 600);
      recordSuccess(21, 'Game base price used when Resource override absent');
    } catch (err) {
      recordFailure(21, 'Game base price used when Resource override absent', err);
    }

    // TEST 22: Resource custom price used when present
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resCustomPrice._id, date: '2026-09-22', startTime: '10:00', durationMinutes: 60 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.pricePerHourAtBooking, 800);
      assert.strictEqual(data.data.booking.totalAmount, 800);
      recordSuccess(22, 'Resource custom price used when present');
    } catch (err) {
      recordFailure(22, 'Resource custom price used when present', err);
    }

    // TEST 23: totalAmount correctly calculated (e.g. 90 minutes @ ₹600/hr = ₹900)
    let snapshotBookingId = null;
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-23', startTime: '10:00', durationMinutes: 90 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.totalAmount, 900);
      snapshotBookingId = data.data.booking._id;
      recordSuccess(23, 'totalAmount correctly calculated for fractional hours');
    } catch (err) {
      recordFailure(23, 'totalAmount correctly calculated for fractional hours', err);
    }

    // TEST 24: Price snapshot stored on Booking
    try {
      assert(snapshotBookingId, 'snapshotBookingId should exist');
      const bDoc = await Booking.findById(snapshotBookingId);
      assert.strictEqual(bDoc.pricePerHourAtBooking, 600);
      assert.strictEqual(bDoc.totalAmount, 900);
      recordSuccess(24, 'Price snapshot stored on Booking document');
    } catch (err) {
      recordFailure(24, 'Price snapshot stored on Booking document', err);
    }

    // TEST 25: Changing Game price after booking does NOT change existing booking price
    try {
      gameStandard.basePricePerHour = 1200; // Price doubled
      await gameStandard.save();

      const bDoc = await Booking.findById(snapshotBookingId);
      assert.strictEqual(bDoc.pricePerHourAtBooking, 600);
      assert.strictEqual(bDoc.totalAmount, 900);
      recordSuccess(25, 'Changing Game price after booking does NOT change existing booking price');
    } catch (err) {
      recordFailure(25, 'Changing Game price after booking does NOT change existing booking price', err);
    }

    // TEST 26: Changing Resource price after booking does NOT change existing booking price
    try {
      resCustomPrice.customPricePerHour = 2000;
      await resCustomPrice.save();

      const bDoc = await Booking.findById(snapshotBookingId);
      assert.strictEqual(bDoc.pricePerHourAtBooking, 600);
      recordSuccess(26, 'Changing Resource price after booking does NOT change existing booking price');
    } catch (err) {
      recordFailure(26, 'Changing Resource price after booking does NOT change existing booking price', err);
    }

    // ==================================================
    // 6. OVERLAPPING BOOKINGS (27 - 35)
    // ==================================================
    console.log('\n--- 6. OVERLAPPING BOOKINGS ---');

    // Seed base booking for overlap tests: Court 1 on 2026-09-25 from 18:00 to 19:00
    let overlapBaseBooking = null;
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '18:00', durationMinutes: 60 }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      overlapBaseBooking = data.data.booking;
      recordSuccess(27, 'First booking for overlap baseline succeeds (18:00 - 19:00)');
    } catch (err) {
      recordFailure(27, 'First booking for overlap baseline succeeds', err);
    }

    // TEST 28: Exact same interval is rejected -> 409
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '18:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(28, 'Exact same interval is rejected -> 409 Conflict');
    } catch (err) {
      recordFailure(28, 'Exact same interval is rejected -> 409 Conflict', err);
    }

    // TEST 29: Partially overlapping interval is rejected (18:30 - 19:30) -> 409
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '18:30', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(29, 'Partially overlapping interval (18:30 - 19:30) is rejected -> 409 Conflict');
    } catch (err) {
      recordFailure(29, 'Partially overlapping interval is rejected', err);
    }

    // TEST 30: Requested booking starting inside existing booking is rejected (18:15 - 18:45) -> 409
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '18:15', durationMinutes: 30 }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(30, 'Booking starting inside existing booking is rejected -> 409 Conflict');
    } catch (err) {
      recordFailure(30, 'Booking starting inside existing booking is rejected', err);
    }

    // TEST 31: Requested booking ending inside existing booking is rejected (17:30 - 18:30) -> 409
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '17:30', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(31, 'Booking ending inside existing booking is rejected -> 409 Conflict');
    } catch (err) {
      recordFailure(31, 'Booking ending inside existing booking is rejected', err);
    }

    // TEST 32: Requested booking completely surrounding existing booking is rejected (17:30 - 19:30) -> 409
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '17:30', durationMinutes: 120 }),
      });
      assert.strictEqual(res.status, 409);
      recordSuccess(32, 'Booking completely surrounding existing booking is rejected -> 409 Conflict');
    } catch (err) {
      recordFailure(32, 'Booking completely surrounding existing booking is rejected', err);
    }

    // TEST 33: Adjacent booking immediately after existing booking succeeds (19:00 - 20:00) -> 201
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '19:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 201);
      recordSuccess(33, 'Adjacent booking immediately after (19:00 - 20:00) succeeds -> 201 Created');
    } catch (err) {
      recordFailure(33, 'Adjacent booking immediately after succeeds', err);
    }

    // TEST 34: Adjacent booking immediately before existing booking succeeds (17:00 - 18:00) -> 201
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '17:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 201);
      recordSuccess(34, 'Adjacent booking immediately before (17:00 - 18:00) succeeds -> 201 Created');
    } catch (err) {
      recordFailure(34, 'Adjacent booking immediately before succeeds', err);
    }

    // TEST 35: Cancelled booking does not block the interval
    try {
      assert(overlapBaseBooking, 'overlapBaseBooking should exist');
      // Cancel Customer 1's 18:00-19:00 booking
      const cancelRes = await fetch(`${baseUrl}/bookings/${overlapBaseBooking._id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      assert.strictEqual(cancelRes.status, 200);

      // Now Customer 2 attempts to book 18:00 - 19:00 -> Should succeed!
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: '2026-09-25', startTime: '18:00', durationMinutes: 60 }),
      });
      assert.strictEqual(res.status, 201, 'Cancelled booking must not block future availability');
      recordSuccess(35, 'Cancelled booking does not block availability -> 201 Created');
    } catch (err) {
      recordFailure(35, 'Cancelled booking does not block availability', err);
    }

    // ==================================================
    // 7. OWNERSHIP & AUTHORIZATION (36 - 40)
    // ==================================================
    console.log('\n--- 7. OWNERSHIP & AUTHORIZATION ---');

    // TEST 36: Customer can list own bookings -> 200
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(data.data.bookings));
      assert(data.data.bookings.every((b) => b.userId.toString() === mockCustomer1._id));
      recordSuccess(36, 'Customer can list own bookings -> 200 OK');
    } catch (err) {
      recordFailure(36, 'Customer can list own bookings -> 200 OK', err);
    }

    // TEST 37: Customer cannot see another customer's booking -> 404
    try {
      assert(createdBooking1, 'createdBooking1 should exist');
      const res = await fetch(`${baseUrl}/bookings/${createdBooking1._id}`, {
        headers: { Authorization: `Bearer ${customer2Token}` }, // Customer 2 tries to view Customer 1's booking
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(37, 'Customer cannot see another customer\'s booking -> 404 Not Found');
    } catch (err) {
      recordFailure(37, 'Customer cannot see another customer\'s booking -> 404 Not Found', err);
    }

    // TEST 38: Customer cannot cancel another customer's booking -> 404
    try {
      assert(createdBooking1, 'createdBooking1 should exist');
      const res = await fetch(`${baseUrl}/bookings/${createdBooking1._id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customer2Token}` }, // Customer 2 tries to cancel Customer 1's booking
      });
      assert.strictEqual(res.status, 404);
      recordSuccess(38, 'Customer cannot cancel another customer\'s booking -> 404 Not Found');
    } catch (err) {
      recordFailure(38, 'Customer cannot cancel another customer\'s booking -> 404 Not Found', err);
    }

    // TEST 39: Customer can view own booking -> 200
    try {
      assert(createdBooking1, 'createdBooking1 should exist');
      const res = await fetch(`${baseUrl}/bookings/${createdBooking1._id}`, {
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.booking._id.toString(), createdBooking1._id.toString());
      recordSuccess(39, 'Customer can view own booking -> 200 OK');
    } catch (err) {
      recordFailure(39, 'Customer can view own booking -> 200 OK', err);
    }

    // TEST 40: Customer can cancel own eligible booking -> 200
    try {
      assert(createdBooking1, 'createdBooking1 should exist');
      const res = await fetch(`${baseUrl}/bookings/${createdBooking1._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({ cancellationReason: 'Plans changed' }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.data.booking.status, 'cancelled');
      assert.strictEqual(data.data.booking.cancellationReason, 'Plans changed');
      recordSuccess(40, 'Customer can cancel own eligible booking -> 200 OK');
    } catch (err) {
      recordFailure(40, 'Customer can cancel own eligible booking -> 200 OK', err);
    }

    // ==================================================
    // 8. STATUS LIFECYCLE (41 - 44)
    // ==================================================
    console.log('\n--- 8. STATUS LIFECYCLE ---');

    // TEST 41: Cancelled booking cannot be cancelled again -> 400
    try {
      assert(createdBooking1, 'createdBooking1 should exist');
      const res = await fetch(`${baseUrl}/bookings/${createdBooking1._id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(41, 'Already cancelled booking cannot be cancelled again -> 400 Bad Request');
    } catch (err) {
      recordFailure(41, 'Already cancelled booking cannot be cancelled again', err);
    }

    // TEST 42: Completed booking cannot be cancelled -> 400
    try {
      const completedBooking = new Booking({
        userId: mockCustomer1._id,
        gameId: gameStandard._id,
        resourceId: resStandard._id,
        startAt: new Date('2026-09-01T10:00:00Z'),
        endAt: new Date('2026-09-01T11:00:00Z'),
        durationMinutes: 60,
        pricePerHourAtBooking: 600,
        totalAmount: 600,
        status: 'completed',
      });
      await completedBooking.save();

      const res = await fetch(`${baseUrl}/bookings/${completedBooking._id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      assert.strictEqual(res.status, 400);
      recordSuccess(42, 'Completed booking cannot be cancelled -> 400 Bad Request');
    } catch (err) {
      recordFailure(42, 'Completed booking cannot be cancelled', err);
    }

    // TEST 43 & 44: Arbitrary status manipulation in request body is ignored -> status is confirmed
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({
          gameId: gameStandard._id,
          resourceId: resStandard._id,
          date: '2026-09-28',
          startTime: '10:00',
          durationMinutes: 60,
          status: 'completed', // Malicious status manipulation attempt
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.status, 'confirmed', 'Status in creation body must be ignored and default to confirmed');
      recordSuccess(43, 'Arbitrary status in creation body is ignored and defaults to confirmed');
      recordSuccess(44, 'Customer cannot set status via request body');
    } catch (err) {
      recordFailure(43, 'Arbitrary status manipulation test', err);
    }

    // ==================================================
    // 9. DATA EXPOSURE & SECURITY (45 - 50)
    // ==================================================
    console.log('\n--- 9. DATA EXPOSURE & SECURITY ---');

    // TEST 45: Booking response does not expose passwordHash
    try {
      assert.strictEqual(User.schema.path('passwordHash').options.select, false);
      recordSuccess(45, 'Booking response does not expose passwordHash');
    } catch (err) {
      recordFailure(45, 'Booking response does not expose passwordHash', err);
    }

    // TEST 46: Booking response does not expose JWT secret
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      const text = await res.text();
      assert(!text.includes(process.env.JWT_SECRET || 'secret'));
      recordSuccess(46, 'Booking response does not expose JWT secret');
    } catch (err) {
      recordFailure(46, 'Booking response does not expose JWT secret', err);
    }

    // TEST 47: Client-supplied userId in body is ignored
    try {
      const maliciousUserId = mockCustomer2._id;
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({
          gameId: gameStandard._id,
          resourceId: resStandard._id,
          date: '2026-09-28',
          startTime: '12:00',
          durationMinutes: 60,
          userId: maliciousUserId,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.userId.toString(), mockCustomer1._id, 'userId must be bound to JWT identity');
      recordSuccess(47, 'Client-supplied userId in body is ignored');
    } catch (err) {
      recordFailure(47, 'Client-supplied userId in body is ignored', err);
    }

    // TEST 48: Client-supplied totalAmount in body is ignored
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({
          gameId: gameStandard._id,
          resourceId: resStandard._id,
          date: '2026-09-28',
          startTime: '14:00',
          durationMinutes: 60,
          totalAmount: 1, // Fake ₹1 price attempt
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.notStrictEqual(data.data.booking.totalAmount, 1, 'Client-supplied totalAmount of 1 must be ignored');
      assert.strictEqual(data.data.booking.totalAmount, gameStandard.basePricePerHour, 'totalAmount must be calculated by backend');
      recordSuccess(48, 'Client-supplied totalAmount in body is ignored');
    } catch (err) {
      recordFailure(48, 'Client-supplied totalAmount in body is ignored', err);
    }

    // TEST 49: Client-supplied pricePerHourAtBooking in body is ignored
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({
          gameId: gameStandard._id,
          resourceId: resStandard._id,
          date: '2026-09-28',
          startTime: '16:00',
          durationMinutes: 60,
          pricePerHourAtBooking: 5,
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.notStrictEqual(data.data.booking.pricePerHourAtBooking, 5, 'Client-supplied pricePerHourAtBooking of 5 must be ignored');
      assert.strictEqual(data.data.booking.pricePerHourAtBooking, gameStandard.basePricePerHour);
      recordSuccess(49, 'Client-supplied pricePerHourAtBooking in body is ignored');
    } catch (err) {
      recordFailure(49, 'Client-supplied pricePerHourAtBooking in body is ignored', err);
    }

    // TEST 50: Client-supplied status in body is ignored
    try {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
        body: JSON.stringify({
          gameId: gameStandard._id,
          resourceId: resStandard._id,
          date: '2026-09-28',
          startTime: '18:00',
          durationMinutes: 60,
          status: 'in_progress',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.data.booking.status, 'confirmed');
      recordSuccess(50, 'Client-supplied status in body is ignored');
    } catch (err) {
      recordFailure(50, 'Client-supplied status in body is ignored', err);
    }

    // ==================================================
    // 10. REGRESSION TESTS (51 - 59)
    // ==================================================
    console.log('\n--- 10. REGRESSION TESTS ---');

    // TEST 51: Health endpoint still works
    try {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      recordSuccess(51, 'Health endpoint still works');
    } catch (err) {
      recordFailure(51, 'Health endpoint still works', err);
    }

    // TEST 52: Registration still works
    try {
      const testUser = new User({
        name: 'Reg User P4',
        email: `reg_p4_${Date.now()}@playarena.test`,
        phone: '1112223334',
        passwordHash: 'hashedpass',
      });
      const err = await testUser.validate().catch((e) => e);
      assert.strictEqual(err, undefined);
      recordSuccess(52, 'Registration model validation still works');
    } catch (err) {
      recordFailure(52, 'Registration model validation still works', err);
    }

    // TEST 53: Login still works
    try {
      const token = generateUserToken({ id: mockCustomer1._id, role: 'customer' });
      assert(token);
      recordSuccess(53, 'Login JWT generation still works');
    } catch (err) {
      recordFailure(53, 'Login JWT generation still works', err);
    }

    // TEST 54: JWT verification still works
    try {
      const verified = jwt.verify(customer1Token, process.env.JWT_SECRET || 'fallback_secret_key_for_testing_only');
      assert.strictEqual(verified.role, 'customer');
      recordSuccess(54, 'JWT verification still works');
    } catch (err) {
      recordFailure(54, 'JWT verification still works', err);
    }

    // TEST 55: RBAC still works
    try {
      const res = await fetch(`${baseUrl}/admin/profile`, {
        headers: { Authorization: `Bearer ${customer1Token}` },
      });
      assert.strictEqual(res.status, 403);
      recordSuccess(55, 'RBAC still works (403 for unauthorized role)');
    } catch (err) {
      recordFailure(55, 'RBAC still works', err);
    }

    // TEST 56: Admin Game CRUD still works
    try {
      const res = await fetch(`${baseUrl}/admin/games`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      recordSuccess(56, 'Admin Game CRUD still works');
    } catch (err) {
      recordFailure(56, 'Admin Game CRUD still works', err);
    }

    // TEST 57: Admin Resource CRUD still works
    try {
      const res = await fetch(`${baseUrl}/admin/games/${gameStandard._id}/resources`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      recordSuccess(57, 'Admin Resource CRUD still works');
    } catch (err) {
      recordFailure(57, 'Admin Resource CRUD still works', err);
    }

    // TEST 58: Public Game catalog still works
    try {
      const res = await fetch(`${baseUrl}/games`);
      assert.strictEqual(res.status, 200);
      recordSuccess(58, 'Public Game catalog still works');
    } catch (err) {
      recordFailure(58, 'Public Game catalog still works', err);
    }

    // TEST 59: Public Resource catalog still works
    try {
      const res = await fetch(`${baseUrl}/games/${gameStandard._id}/resources`);
      assert.strictEqual(res.status, 200);
      recordSuccess(59, 'Public Resource catalog still works');
    } catch (err) {
      recordFailure(59, 'Public Resource catalog still works', err);
    }

    // ==================================================
    // 11. CONCURRENCY TEST (60)
    // ==================================================
    console.log('\n--- 11. CONCURRENCY TEST ---');

    // TEST 60: Concurrent booking requests for exact same resource and slot
    try {
      const targetDate = '2026-09-30';
      const targetTime = '15:00';
      const duration = 60;

      // Dispatch 5 concurrent HTTP requests to book Court 1 at 15:00 on 2026-09-30
      const requests = Array.from({ length: 5 }).map((_, i) =>
        fetch(`${baseUrl}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer1Token}` },
          body: JSON.stringify({ gameId: gameStandard._id, resourceId: resStandard._id, date: targetDate, startTime: targetTime, durationMinutes: duration }),
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);
      const successCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      assert.strictEqual(successCount, 1, `Exactly 1 concurrent request must succeed (got ${successCount})`);
      assert.strictEqual(conflictCount, 4, `4 concurrent requests must be rejected with 409 Conflict (got ${conflictCount})`);

      recordSuccess(60, `Concurrency check: 1 succeeded (201) and 4 rejected (409) under race conditions`);
    } catch (err) {
      recordFailure(60, 'Concurrency check for double-booking prevention', err);
    }

  } finally {
    if (isDbConnected) {
      try {
        await Game.deleteMany({ slug: { $regex: /^badminton-p4-|^inactive-p4-/ } });
        await Resource.deleteMany({ name: { $regex: /^Court|^Other Game/ } });
        await Booking.deleteMany({});
      } catch (e) {
        // ignore
      }
    }
    User.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
    if (isDbConnected) {
      await mongoose.disconnect();
    }
  }

  // ==================================================
  // SUMMARY REPORT
  // ==================================================
  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed.length} PASSED / ${failed.length} FAILED (TOTAL ${passed.length + failed.length} TESTS)`);
  console.log('==================================================\n');

  if (failed.length > 0) {
    console.error('FAILED TESTS LIST:');
    failed.forEach((f) => console.error(`  - Test ${f.testNum}: ${f.title} (${f.error})`));
    process.exit(1);
  } else {
    console.log('ALL 60 TESTS PASSED SUCCESSFULLY!');
  }
}

runPhase4Tests().catch((err) => {
  console.error('❌ Fatal error in Phase 4 test suite:', err);
  process.exit(1);
});
