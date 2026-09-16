require('dotenv').config();
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./src/app');
const { generateUserToken } = require('./src/utils/token');

// Models
const User = require('./src/models/User');
const Booking = require('./src/models/Booking');
const Game = require('./src/models/Game');
const Resource = require('./src/models/Resource');
const Waitlist = require('./src/models/Waitlist');
const Notification = require('./src/models/Notification');

async function runPhase13TestSuit() {
  console.log('==================================================');
  console.log('STARTING PHASE 13 WAITLIST & RESCHEDULING TEST SUITE');
  console.log('==================================================\n');

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

  // Setup Mock DB & Store
  const customerA = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Customer A',
    email: 'customera.p13@playarena.com',
    role: 'customer',
  };
  const customerB = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Customer B',
    email: 'customerb.p13@playarena.com',
    role: 'customer',
  };
  const staffUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Staff Operator',
    email: 'staff.p13@playarena.com',
    role: 'staff',
  };
  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Admin User',
    email: 'admin.p13@playarena.com',
    role: 'admin',
  };

  const usersMap = new Map([
    [customerA._id.toString(), customerA],
    [customerB._id.toString(), customerB],
    [staffUser._id.toString(), staffUser],
    [adminUser._id.toString(), adminUser],
  ]);

  User.findById = function (id) {
    const makeChainable = (doc) => ({
      select: function () { return makeChainable(doc); },
      then: (resolve) => resolve(doc || null),
    });
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return makeChainable(null);
    return makeChainable(usersMap.get(id.toString()));
  };

  const customerAToken = generateUserToken({ id: customerA._id, role: customerA.role });
  const customerBToken = generateUserToken({ id: customerB._id, role: customerB.role });
  const staffToken = generateUserToken({ id: staffUser._id, role: staffUser.role });
  const adminToken = generateUserToken({ id: adminUser._id, role: adminUser.role });

  const activeGame = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Badminton',
    slug: 'badminton',
    category: 'court',
    basePricePerHour: 400,
    minBookingDurationMinutes: 30,
    maxBookingDurationMinutes: 120,
    bookingIntervalMinutes: 30,
    isActive: true,
  };

  const inactiveGame = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Inactive VR',
    slug: 'inactive-vr',
    category: 'vr',
    basePricePerHour: 500,
    minBookingDurationMinutes: 30,
    maxBookingDurationMinutes: 60,
    bookingIntervalMinutes: 30,
    isActive: false,
  };

  const activeResource = {
    _id: new mongoose.Types.ObjectId(),
    gameId: activeGame._id,
    name: 'Court 1',
    code: 'BAD-01',
    status: 'available',
    isActive: true,
  };

  const otherGameResource = {
    _id: new mongoose.Types.ObjectId(),
    gameId: new mongoose.Types.ObjectId(),
    name: 'Other Game Resource',
    status: 'available',
    isActive: true,
  };

  const maintenanceResource = {
    _id: new mongoose.Types.ObjectId(),
    gameId: activeGame._id,
    name: 'Court 2 (Maint)',
    status: 'maintenance',
    isActive: true,
  };

  const gamesMap = new Map([
    [activeGame._id.toString(), activeGame],
    [inactiveGame._id.toString(), inactiveGame],
  ]);

  const resourcesMap = new Map([
    [activeResource._id.toString(), activeResource],
    [otherGameResource._id.toString(), otherGameResource],
    [maintenanceResource._id.toString(), maintenanceResource],
  ]);

  Game.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return gamesMap.get(id.toString()) || null;
  };

  Resource.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return resourcesMap.get(id.toString()) || null;
  };

  // Mock DB Store for Bookings, Waitlists, and Notifications
  const bookingsStore = new Map();
  const waitlistsStore = new Map();
  const notificationsStore = new Map();

  Booking.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    bookingsStore.set(this._id.toString(), this);
    return this;
  };

  Booking.findById = async function (id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return bookingsStore.get(id.toString()) || null;
  };

  Booking.findOne = function (query) {
    const makeChainable = (doc) => ({
      session: function () { return makeChainable(doc); },
      then: (resolve) => resolve(doc || null),
    });

    let found = null;
    for (const b of bookingsStore.values()) {
      let matches = true;
      if (query._id) {
        if (query._id.$ne && b._id.toString() === query._id.$ne.toString()) matches = false;
        else if (!query._id.$ne && b._id.toString() !== query._id.toString()) matches = false;
      }
      if (query.userId && b.userId.toString() !== query.userId.toString()) matches = false;
      if (query.resourceId && b.resourceId.toString() !== query.resourceId.toString()) matches = false;
      if (query.status) {
        if (typeof query.status === 'string' && b.status !== query.status) matches = false;
        if (query.status.$in && !query.status.$in.includes(b.status)) matches = false;
      }
      if (query.startAt && query.startAt.$lt) {
        if (!(b.startAt < query.startAt.$lt)) matches = false;
      }
      if (query.endAt && query.endAt.$gt) {
        if (!(b.endAt > query.endAt.$gt)) matches = false;
      }
      if (matches) {
        found = b;
        break;
      }
    }
    return makeChainable(found);
  };

  Waitlist.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    waitlistsStore.set(this._id.toString(), this);
    return this;
  };

  Waitlist.findOne = function (query) {
    const makeChainable = (doc) => ({
      populate: function () { return makeChainable(doc); },
      session: function () { return makeChainable(doc); },
      then: (resolve) => resolve(doc || null),
    });

    let found = null;
    for (const w of waitlistsStore.values()) {
      let matches = true;
      if (query._id && w._id.toString() !== query._id.toString()) matches = false;
      if (query.userId && w.userId.toString() !== query.userId.toString()) matches = false;
      if (query.resourceId && w.resourceId.toString() !== query.resourceId.toString()) matches = false;
      if (query.startAt && new Date(w.startAt).getTime() !== new Date(query.startAt).getTime()) matches = false;
      if (query.endAt && new Date(w.endAt).getTime() !== new Date(query.endAt).getTime()) matches = false;
      if (query.status) {
        if (typeof query.status === 'string' && w.status !== query.status) matches = false;
        if (query.status.$in && !query.status.$in.includes(w.status)) matches = false;
      }
      if (matches) {
        found = w;
        break;
      }
    }
    return makeChainable(found);
  };

  Waitlist.find = function (query) {
    const list = [];
    for (const w of waitlistsStore.values()) {
      let matches = true;
      if (query.userId && w.userId.toString() !== query.userId.toString()) matches = false;
      if (query.resourceId && w.resourceId.toString() !== query.resourceId.toString()) matches = false;
      if (query.status) {
        if (typeof query.status === 'string' && w.status !== query.status) matches = false;
        if (query.status.$in && !query.status.$in.includes(w.status)) matches = false;
      }
      if (query.startAt && query.startAt.$lt && !(w.startAt < query.startAt.$lt)) matches = false;
      if (query.endAt && query.endAt.$gt && !(w.endAt > query.endAt.$gt)) matches = false;

      if (matches) list.push(w);
    }

    const makeChainable = (arr) => ({
      populate: function () { return makeChainable(arr); },
      sort: function () { return makeChainable(arr); },
      skip: function () { return makeChainable(arr); },
      limit: function () { return makeChainable(arr); },
      then: (resolve) => resolve(arr),
    });
    return makeChainable(list);
  };

  Waitlist.countDocuments = async function () { return waitlistsStore.size; };

  Waitlist.findOneAndUpdate = async function (query, update) {
    const entry = await Waitlist.findOne(query);
    if (!entry) return null;
    if (update.status) entry.status = update.status;
    if (update.notifiedAt) entry.notifiedAt = update.notifiedAt;
    waitlistsStore.set(entry._id.toString(), entry);
    return entry;
  };

  Notification.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    if (this.eventKey && notificationsStore.has(this.eventKey)) {
      const err = new Error('Duplicate key error');
      err.code = 11000;
      throw err;
    }
    if (this.eventKey) notificationsStore.set(this.eventKey, this);
    return this;
  };

  try {
    // --------------------------------------------------
    // SECTION 1: WAITLIST TESTS
    // --------------------------------------------------
    console.log('\n--- Section 1: Waitlist API & Business Logic ---');

    // 1. Unauthenticated waitlist create -> 401
    const unauthWl = await request(app).post('/api/v1/waitlist').send({});
    assert(unauthWl.status === 401, '1. Unauthenticated create waitlist returns 401 Unauthorized');

    // 14. Staff user accessing waitlist API -> 403
    const staffWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});
    assert(staffWl.status === 403, '14. Staff token attempting customer waitlist endpoint returns 403 Forbidden');

    // 4 & 5. Malformed IDs -> 400
    const malformedGameWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: 'badId', resourceId: activeResource._id, date: '2026-10-01', startTime: '10:00', durationMinutes: 60 });
    assert(malformedGameWl.status === 400, '4. Malformed Game ID returns 400 Bad Request');

    const malformedResourceWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: 'badId', date: '2026-10-01', startTime: '10:00', durationMinutes: 60 });
    assert(malformedResourceWl.status === 400, '5. Malformed Resource ID returns 400 Bad Request');

    // 6. Wrong game/resource relationship -> 404
    const wrongRelationWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: otherGameResource._id, date: '2026-10-01', startTime: '10:00', durationMinutes: 60 });
    assert(wrongRelationWl.status === 404, '6. Resource not belonging to Game returns 404 Not Found');

    // 7. Inactive game -> 400
    const inactiveGameWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: inactiveGame._id, resourceId: activeResource._id, date: '2026-10-01', startTime: '10:00', durationMinutes: 60 });
    assert(inactiveGameWl.status === 400, '7. Inactive game waitlist request returns 400 Bad Request');

    // 8. Maintenance resource -> 400
    const maintWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: maintenanceResource._id, date: '2026-10-01', startTime: '10:00', durationMinutes: 60 });
    assert(maintWl.status === 400, '8. Maintenance resource waitlist request returns 400 Bad Request');

    // 9. Invalid duration -> 400
    const badDurationWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-01', startTime: '10:00', durationMinutes: 15 });
    assert(badDurationWl.status === 400, '9. Duration below minBookingDuration returns 400 Bad Request');

    // 10. Invalid date format -> 400
    const badDateWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: 'invalid-date', startTime: '10:00', durationMinutes: 60 });
    assert(badDateWl.status === 400, '10. Invalid date format returns 400 Bad Request');

    // 2. Customer create waitlist -> 201
    const validWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-01', startTime: '14:00', durationMinutes: 60 });
    assert(validWl.status === 201, '2. Customer joins waitlist successfully (201 Created)');
    const createdWaitlistId = validWl.body.data.waitlist._id;

    // 3. Duplicate active waitlist -> 409
    const dupWl = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-01', startTime: '14:00', durationMinutes: 60 });
    assert(dupWl.status === 409, '3. Duplicate active waitlist entry returns 409 Conflict');

    // 11. Customer list own waitlists
    const listWl = await request(app)
      .get('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerAToken}`);
    assert(listWl.status === 200 && listWl.body.data.waitlists.length === 1, '11. Customer can list own waitlists');

    // 12. Customer B cannot read Customer A waitlist detail -> 404
    const custBReadWl = await request(app)
      .get(`/api/v1/waitlist/${createdWaitlistId}`)
      .set('Authorization', `Bearer ${customerBToken}`);
    assert(custBReadWl.status === 404, '12. Customer B reading Customer A waitlist returns 404 Not Found');

    // 13. Customer can leave active waitlist
    const leaveWl = await request(app)
      .delete(`/api/v1/waitlist/${createdWaitlistId}`)
      .set('Authorization', `Bearer ${customerAToken}`);
    assert(leaveWl.status === 200 && leaveWl.body.data.waitlist.status === 'cancelled', '13. Customer can leave active waitlist');

    // 15, 16, 17. Booking cancellation triggers waitlist notification
    // Create new waitlist for Customer B
    const wlBRes = await request(app)
      .post('/api/v1/waitlist')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-05', startTime: '16:00', durationMinutes: 60 });
    const waitlistBId = wlBRes.body.data.waitlist._id;

    // Create existing booking for Customer A on exact slot
    const createBkRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-05', startTime: '16:00', durationMinutes: 60 });
    const bookingToCancelId = createBkRes.body.data.booking._id;

    // Cancel booking -> should process waitlist & notify Customer B
    const cancelBkRes = await request(app)
      .patch(`/api/v1/bookings/${bookingToCancelId}/cancel`)
      .set('Authorization', `Bearer ${customerAToken}`);
    assert(cancelBkRes.status === 200, 'Booking cancelled successfully');

    const updatedWaitlistB = await Waitlist.findById(waitlistBId);
    assert(updatedWaitlistB && updatedWaitlistB.status === 'notified', '15. Booking cancellation updates eligible waitlist entry status to notified');

    const notifiedKey = `waitlist:${waitlistBId}:available`;
    assert(notificationsStore.has(notifiedKey), '16 & 17. Waitlist notification created with idempotent eventKey');

    // --------------------------------------------------
    // SECTION 2: BOOKING RESCHEDULING TESTS
    // --------------------------------------------------
    console.log('\n--- Section 2: Booking Rescheduling API & Business Logic ---');

    // 19. Unauthenticated reschedule -> 401
    const unauthResched = await request(app).patch(`/api/v1/bookings/${bookingToCancelId}/reschedule`).send({});
    assert(unauthResched.status === 401, '19. Unauthenticated reschedule request returns 401 Unauthorized');

    // Create an eligible confirmed booking for Customer A
    const reschedBkRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-10', startTime: '10:00', durationMinutes: 60 });
    const reschedBookingId = reschedBkRes.body.data.booking._id;

    // 21. Another customer cannot reschedule Customer A booking -> 404
    const custBResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ date: '2026-10-10', startTime: '11:00', durationMinutes: 60 });
    assert(custBResched.status === 404, '21. Customer B rescheduling Customer A booking returns 404 Not Found');

    // 22. Malformed booking ID -> 400
    const malformedBkResched = await request(app)
      .patch('/api/v1/bookings/badId/reschedule')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: '2026-10-10', startTime: '11:00', durationMinutes: 60 });
    assert(malformedBkResched.status === 400, '22. Malformed Booking ID returns 400 Bad Request');

    // 23. Cancelled booking cannot be rescheduled -> 400
    const cancelledResched = await request(app)
      .patch(`/api/v1/bookings/${bookingToCancelId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: '2026-10-10', startTime: '11:00', durationMinutes: 60 });
    assert(cancelledResched.status === 400, '23. Cancelled booking cannot be rescheduled (400 Bad Request)');

    // 24. Completed booking cannot be rescheduled -> 400
    const completedBk = await Booking.findById(reschedBookingId);
    completedBk.status = 'completed';
    await completedBk.save();
    const completedResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: '2026-10-10', startTime: '11:00', durationMinutes: 60 });
    assert(completedResched.status === 400, '24. Completed booking cannot be rescheduled (400 Bad Request)');

    // Restore booking status to confirmed for valid tests
    completedBk.status = 'confirmed';
    await completedBk.save();

    // 26. Invalid date format -> 400
    const badDateResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: 'invalid-date', startTime: '11:00', durationMinutes: 60 });
    assert(badDateResched.status === 400, '26. Invalid date format returns 400 Bad Request');

    // 27. Invalid duration -> 400
    const badDurationResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: '2026-10-10', startTime: '11:00', durationMinutes: 15 });
    assert(badDurationResched.status === 400, '27. Duration below minimum returns 400 Bad Request');

    // 28. Unavailable overlapping slot -> 409 Conflict
    // Create conflicting booking for Customer B at 15:00 - 16:00
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ gameId: activeGame._id, resourceId: activeResource._id, date: '2026-10-10', startTime: '15:00', durationMinutes: 60 });

    const conflictResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ date: '2026-10-10', startTime: '15:00', durationMinutes: 60 });
    assert(conflictResched.status === 409, '28. Unavailable overlapping time slot returns 409 Conflict');

    // 29. Wrong resource/game relationship -> 404
    const wrongResourceResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ resourceId: otherGameResource._id, date: '2026-10-10', startTime: '11:00', durationMinutes: 60 });
    assert(wrongResourceResched.status === 404, '29. Resource belonging to another Game returns 404 Not Found');

    // 20, 30, 31, 32, 33, 34, 35. Successful Reschedule with Price recalculation & Audit trail
    const validResched = await request(app)
      .patch(`/api/v1/bookings/${reschedBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        date: '2026-10-10',
        startTime: '18:00',
        durationMinutes: 120, // Extended duration -> totalAmount recalculation
        totalAmount: 5, // Client manipulation attempt -> must be ignored!
        userId: customerB._id, // Client userId manipulation attempt -> must be ignored!
      });

    assert(validResched.status === 200, '20. Customer can reschedule eligible own booking (200 OK)');
    const updatedBk = validResched.body.data.booking;

    assert(updatedBk._id === reschedBookingId.toString(), '32. Reschedule preserves exact same Booking ID');
    assert(updatedBk.isRescheduled === true && updatedBk.rescheduleCount === 1, '33. Audit history recorded (isRescheduled=true, rescheduleCount=1)');
    assert(updatedBk.rescheduledFromStartAt !== null, '33. Old startAt preserved in rescheduledFromStartAt');
    assert(updatedBk.totalAmount === 800, '30. Server recalculated totalAmount accurately (₹400/hr * 2 hrs = ₹800)');
    assert(updatedBk.userId === customerA._id.toString(), '31. Client userId manipulation attempt ignored');

    const reschedNotifKey = `booking:${reschedBookingId}:rescheduled:1`;
    assert(notificationsStore.has(reschedNotifKey), '34 & 35. Reschedule notification created with idempotent eventKey');

  } catch (err) {
    console.error('Unhandled Test Error:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`PHASE 13 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13TestSuit();
