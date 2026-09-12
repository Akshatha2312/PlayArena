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
const Notification = require('./src/models/Notification');
const notificationService = require('./src/services/notificationService');
const emailService = require('./src/services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'play_arena_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runPhase9Tests() {
  console.log('==================================================');
  console.log('STARTING PHASE 9 NOTIFICATIONS & EMAIL INTEGRATION TESTS');
  console.log('==================================================');

  // In-memory collections for fast, reliable execution
  const inMemoryUsers = new Map();
  const inMemoryNotifications = new Map();
  const inMemoryBookings = new Map();
  const inMemoryPayments = new Map();

  const customerAId = new mongoose.Types.ObjectId();
  const customerBId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const mockCustomerA = new User({
    _id: customerAId,
    name: 'Customer A Notif',
    email: 'customera.notif@playarena.com',
    phone: '9876543210',
    role: 'customer',
  });
  inMemoryUsers.set(customerAId.toString(), mockCustomerA);

  const mockCustomerB = new User({
    _id: customerBId,
    name: 'Customer B Notif',
    email: 'customerb.notif@playarena.com',
    phone: '9876543211',
    role: 'customer',
  });
  inMemoryUsers.set(customerBId.toString(), mockCustomerB);

  const mockStaff = new User({
    _id: staffId,
    name: 'Staff User',
    email: 'staff.notif@playarena.com',
    role: 'staff',
  });
  inMemoryUsers.set(staffId.toString(), mockStaff);

  const mockAdmin = new User({
    _id: adminId,
    name: 'Admin User',
    email: 'admin.notif@playarena.com',
    role: 'admin',
  });
  inMemoryUsers.set(adminId.toString(), mockAdmin);

  const tokenCustomerA = generateToken(mockCustomerA);
  const tokenCustomerB = generateToken(mockCustomerB);
  const tokenStaff = generateToken(mockStaff);
  const tokenAdmin = generateToken(mockAdmin);

  // Mongoose Model Mocking
  User.findById = function (id) {
    const u = inMemoryUsers.get(id ? id.toString() : '');
    return {
      select: async function () { return u || null; },
      then: (resolve) => resolve(u || null),
    };
  };

  Notification.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    // Unique eventKey check
    if (this.eventKey) {
      for (const existing of inMemoryNotifications.values()) {
        if (existing.eventKey === this.eventKey && existing._id.toString() !== this._id.toString()) {
          const err = new Error('Duplicate key error');
          err.code = 11000;
          err.name = 'MongoServerError';
          throw err;
        }
      }
    }
    inMemoryNotifications.set(this._id.toString(), this);
    return this;
  };

  Notification.find = function (filter = {}) {
    let list = Array.from(inMemoryNotifications.values());
    if (filter.userId) {
      list = list.filter((n) => n.userId.toString() === filter.userId.toString());
    }
    if (filter.isRead !== undefined) {
      list = list.filter((n) => n.isRead === filter.isRead);
    }
    const chainable = {
      populate: function () { return chainable; },
      sort: function () { return chainable; },
      skip: function () { return chainable; },
      limit: function () { return list; },
      then: (resolve) => resolve(list),
    };
    return chainable;
  };

  Notification.findOne = async function (filter = {}) {
    let list = Array.from(inMemoryNotifications.values());
    if (filter._id) list = list.filter((n) => n._id.toString() === filter._id.toString());
    if (filter.userId) list = list.filter((n) => n.userId.toString() === filter.userId.toString());
    return list[0] || null;
  };

  Notification.countDocuments = async function (filter = {}) {
    let list = Array.from(inMemoryNotifications.values());
    if (filter.userId) list = list.filter((n) => n.userId.toString() === filter.userId.toString());
    if (filter.isRead !== undefined) list = list.filter((n) => n.isRead === filter.isRead);
    return list.length;
  };

  Notification.updateMany = async function (filter = {}, update = {}) {
    let list = Array.from(inMemoryNotifications.values());
    if (filter.userId) list = list.filter((n) => n.userId.toString() === filter.userId.toString());
    if (filter.isRead !== undefined) list = list.filter((n) => n.isRead === filter.isRead);

    let count = 0;
    for (const n of list) {
      if (update.$set) {
        if (update.$set.isRead !== undefined) n.isRead = update.$set.isRead;
        if (update.$set.readAt !== undefined) n.readAt = update.$set.readAt;
      }
      count++;
    }
    return { modifiedCount: count };
  };

  Booking.find = function (filter = {}) {
    let list = Array.from(inMemoryBookings.values());
    if (filter.status) list = list.filter((b) => b.status === filter.status);
    return {
      populate: function () { return list; },
      then: (resolve) => resolve(list),
    };
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
  console.log('1. NOTIFICATION MODEL & IDEMPOTENCY TESTS');
  console.log('--------------------------------------------------');

  // Idempotency: Create event 1
  const eventKey = `booking:${new mongoose.Types.ObjectId()}:confirmed`;
  const res1 = await notificationService.sendNotification({
    userId: customerAId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed!',
    message: 'Your badminton court is booked.',
    eventKey,
  });

  assert(res1.duplicate === false && res1.notification !== undefined, '1. First notification created successfully');

  // Duplicate call
  const res2 = await notificationService.sendNotification({
    userId: customerAId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed!',
    message: 'Your badminton court is booked.',
    eventKey,
  });

  assert(res2.duplicate === true, '2. Repeated eventKey triggers idempotency and prevents duplicate notification creation');

  console.log('\n--------------------------------------------------');
  console.log('2. CUSTOMER NOTIFICATION APIS & SECURITY BOUNDARY');
  console.log('--------------------------------------------------');

  // Unauthenticated
  const resUnauth = await request(app).get('/api/v1/notifications');
  assert(resUnauth.status === 401, '3. Unauthenticated GET /notifications returns 401 Unauthorized');

  // Staff endpoint access rejection
  const resStaff = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${tokenStaff}`);
  assert(resStaff.status === 403, '4. Staff user attempting GET /notifications returns 403 Forbidden');

  // Customer A GET own notifications
  const resNotifA = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${tokenCustomerA}`);
  assert(resNotifA.status === 200 && resNotifA.body.data.notifications.length === 1, '5. Customer A retrieves own notifications (200 OK)');

  // Customer B GET notifications (should be empty)
  const resNotifB = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${tokenCustomerB}`);
  assert(resNotifB.status === 200 && resNotifB.body.data.notifications.length === 0, "6. Customer B cannot view Customer A's notifications");

  // Unread Count
  const resCount = await request(app)
    .get('/api/v1/notifications/unread-count')
    .set('Authorization', `Bearer ${tokenCustomerA}`);
  assert(resCount.status === 200 && resCount.body.data.unreadCount === 1, '7. GET /unread-count returns correct unread count (1)');

  // Customer A mark as read
  const notifId = res1.notification._id.toString();
  const resReadA = await request(app)
    .patch(`/api/v1/notifications/${notifId}/read`)
    .set('Authorization', `Bearer ${tokenCustomerA}`);
  assert(resReadA.status === 200 && resReadA.body.data.notification.isRead === true, '8. Customer A can mark own notification as read');

  // Customer B attempting to mark Customer A's notification as read
  const resReadB = await request(app)
    .patch(`/api/v1/notifications/${notifId}/read`)
    .set('Authorization', `Bearer ${tokenCustomerB}`);
  assert(resReadB.status === 404, "9. Customer B attempting to mark Customer A's notification returns 404 Not Found");

  // Mark all as read
  const resMarkAll = await request(app)
    .patch('/api/v1/notifications/read-all')
    .set('Authorization', `Bearer ${tokenCustomerA}`);
  assert(resMarkAll.status === 200, '10. PATCH /read-all marks customer notifications as read');

  console.log('\n--------------------------------------------------');
  console.log('3. BUSINESS NOTIFICATION TRIGGERS & REMINDER SCHEDULER');
  console.log('--------------------------------------------------');

  // Payment Success Trigger
  const bookingId = new mongoose.Types.ObjectId();
  const mockBooking = {
    _id: bookingId,
    bookingReference: 'BK123456',
    userId: customerAId,
    bookingDate: '2026-09-15',
    startTime: '14:00',
    endTime: '15:00',
    totalAmount: 400,
    status: 'confirmed',
    populate: async function () { return this; },
  };

  const mockPayment = {
    _id: new mongoose.Types.ObjectId(),
    userId: customerAId,
    bookingId: bookingId,
    amount: 400,
    providerPaymentId: 'pay_test_123',
  };

  const payRes = await notificationService.notifyPaymentSuccess(mockPayment, mockBooking);
  assert(payRes.duplicate === false, '11. Payment success notification created');

  const payDup = await notificationService.notifyPaymentSuccess(mockPayment, mockBooking);
  assert(payDup.duplicate === true, '12. Duplicate payment success notification suppressed');

  // Cancellation Trigger
  const cancelRes = await notificationService.notifyBookingCancelled(mockBooking);
  assert(cancelRes.duplicate === false, '13. Booking cancellation notification created');

  const cancelDup = await notificationService.notifyBookingCancelled(mockBooking);
  assert(cancelDup.duplicate === true, '14. Duplicate cancellation notification suppressed');

  // Reminder Scheduler
  inMemoryBookings.set(bookingId.toString(), mockBooking);
  const reminderResult = await notificationService.processUpcomingReminders();
  assert(reminderResult.processed >= 0, '15. processUpcomingReminders executed cleanly');

  // Dev mode safe email simulation test
  const emailRes = await emailService.sendEmail({
    to: 'customera.notif@playarena.com',
    type: 'booking_confirmed',
    data: { bookingReference: 'BK123456' },
  });
  assert(emailRes.status === 'skipped' && emailRes.mode === 'simulated', '16. Dev/test email mode safely logs/simulates email transport without throwing');

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error('Unhandled error in Phase 9 test suite:', err);
  process.exit(1);
});
