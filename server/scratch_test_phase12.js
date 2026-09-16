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
const Payment = require('./src/models/Payment');

async function runPhase12AnalyticsTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 12 ANALYTICS & REPORTING TEST SUITE');
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

  // Setup Mock Database Objects
  const customerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Analytics Customer',
    email: 'cust.analytics@playarena.com',
    role: 'customer',
  };
  const staffUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Analytics Staff',
    email: 'staff.analytics@playarena.com',
    role: 'staff',
  };
  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Analytics Admin',
    email: 'admin.analytics@playarena.com',
    role: 'admin',
  };

  const usersMap = new Map([
    [customerUser._id.toString(), customerUser],
    [staffUser._id.toString(), staffUser],
    [adminUser._id.toString(), adminUser],
  ]);

  User.findById = function (id) {
    const makeChainable = (doc) => ({
      select: function () {
        return makeChainable(doc);
      },
      then: (resolve) => resolve(doc || null),
    });
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return makeChainable(null);
    return makeChainable(usersMap.get(id.toString()));
  };

  const customerToken = generateUserToken({ id: customerUser._id, role: customerUser.role });
  const staffToken = generateUserToken({ id: staffUser._id, role: staffUser.role });
  const adminToken = generateUserToken({ id: adminUser._id, role: adminUser.role });

  // Mock Database Aggregation & Query methods
  const mockBookingAgg = [
    {
      _id: null,
      totalBookings: 10,
      confirmed: 4,
      checkedIn: 1,
      inProgress: 1,
      completed: 3,
      cancelled: 1,
      noShow: 0,
      totalDuration: 600,
      totalValue: 5000,
    },
  ];

  const mockPaymentAgg = [
    {
      _id: null,
      totalRevenue: 4500,
      successfulPaymentsCount: 9,
    },
  ];

  Booking.aggregate = async function (pipeline) {
    // Check if hourly or trend or game lookup
    const pipelineStr = JSON.stringify(pipeline);
    if (pipelineStr.includes('$hour')) {
      return [
        { _id: 10, bookingCount: 2 },
        { _id: 18, bookingCount: 5 },
      ];
    }
    if (pipelineStr.includes('confirmed')) {
      return mockBookingAgg;
    }
    return [];
  };

  Payment.aggregate = async function (pipeline) {
    const pipelineStr = JSON.stringify(pipeline);
    if (pipelineStr.includes('dateFormat') || pipelineStr.includes('dateToString')) {
      return [
        {
          _id: '2026-09-01',
          totalRevenue: 2000,
          successfulCount: 4,
          failedCount: 0,
          cancelledCount: 0,
        },
        {
          _id: '2026-09-02',
          totalRevenue: 2500,
          successfulCount: 5,
          failedCount: 1,
          cancelledCount: 0,
        },
      ];
    }
    return mockPaymentAgg;
  };

  User.countDocuments = async function (filter) {
    if (filter && filter.role === 'customer') {
      return 25;
    }
    return 10;
  };

  Game.countDocuments = async function () {
    return 5;
  };

  Resource.countDocuments = async function () {
    return 12;
  };

  Game.aggregate = async function () {
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Badminton',
        category: 'court',
        basePricePerHour: 400,
        isActive: true,
        totalBookings: 8,
        completedBookings: 6,
        cancelledBookings: 1,
        noShowBookings: 1,
        totalDurationMinutes: 480,
        totalRevenue: 3200,
        avgBookingDuration: 60,
        avgBookingValue: 400,
      },
    ];
  };

  Resource.aggregate = async function () {
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Court 1',
        code: 'BAD-01',
        status: 'available',
        isActive: true,
        gameName: 'Badminton',
        totalBookings: 5,
        completedBookings: 4,
        cancelledBookings: 1,
        noShowBookings: 0,
        totalBookedMinutes: 300,
        totalRevenue: 2000,
      },
    ];
  };

  try {
    // 1. RBAC Tests
    console.log('\n--- Section 1: RBAC & Security Boundaries ---');
    const unauthRes = await request(app).get('/api/v1/admin/analytics/overview');
    assert(unauthRes.status === 401, 'Unauthenticated request to analytics/overview returns 401');

    const customerRes = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${customerToken}`);
    assert(customerRes.status === 403, 'Customer request to analytics/overview returns 403 Forbidden');

    const staffRes = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffRes.status === 403, 'Staff request to analytics/overview returns 403 Forbidden');

    const adminRes = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminRes.status === 200, 'Admin request to analytics/overview returns 200 OK');

    // 2. Date Range Validation Tests
    console.log('\n--- Section 2: Date Range Validation ---');
    const invalidPresetRes = await request(app)
      .get('/api/v1/admin/analytics/overview?preset=invalidPreset')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(invalidPresetRes.status === 400, 'Invalid preset returns 400 Bad Request');

    const missingCustomDatesRes = await request(app)
      .get('/api/v1/admin/analytics/overview?preset=custom')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(missingCustomDatesRes.status === 400, 'Custom preset without dates returns 400 Bad Request');

    const invalidDateRes = await request(app)
      .get('/api/v1/admin/analytics/overview?preset=custom&startDate=bad-date&endDate=2026-09-01')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(invalidDateRes.status === 400, 'Malformed custom date returns 400 Bad Request');

    const reversedDateRes = await request(app)
      .get('/api/v1/admin/analytics/overview?preset=custom&startDate=2026-09-10&endDate=2026-09-01')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(reversedDateRes.status === 400, 'startDate > endDate returns 400 Bad Request');

    const excessiveRangeRes = await request(app)
      .get('/api/v1/admin/analytics/overview?preset=custom&startDate=2024-01-01&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(excessiveRangeRes.status === 400, 'Date range > 366 days returns 400 Bad Request');

    // 3. Analytics Endpoints Data Integrity Tests
    console.log('\n--- Section 3: Analytics Endpoint Responses & Calculation Integrity ---');
    
    // Overview Endpoint
    const overviewData = adminRes.body.data;
    assert(overviewData.bookings.totalBookings === 10, 'Overview returns correct totalBookings');
    assert(overviewData.bookings.cancellationRate === 10, 'Overview calculates cancellationRate correctly (1/10 = 10%)');
    assert(overviewData.revenue.totalRevenue === 4500, 'Overview returns correct totalRevenue from payments');
    assert(overviewData.catalog.activeCustomers === 25, 'Overview returns correct customer counts');

    // Revenue Endpoint
    const revenueRes = await request(app)
      .get('/api/v1/admin/analytics/revenue?preset=last30days')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(revenueRes.status === 200, 'Admin can access GET /api/v1/admin/analytics/revenue');
    assert(revenueRes.body.data.summary.totalRevenue === 4500, 'Revenue summary calculates total revenue correctly');
    assert(Array.isArray(revenueRes.body.data.trend), 'Revenue trend returns an array');

    // Bookings Endpoint
    const bookingsRes = await request(app)
      .get('/api/v1/admin/analytics/bookings?preset=last7days')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(bookingsRes.status === 200, 'Admin can access GET /api/v1/admin/analytics/bookings');
    assert(Array.isArray(bookingsRes.body.data.statusBreakdown), 'Bookings status breakdown is an array');

    // Game Analytics Endpoint
    const gameRes = await request(app)
      .get('/api/v1/admin/analytics/games?page=1&limit=10&sortBy=totalBookings')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(gameRes.status === 200, 'Admin can access GET /api/v1/admin/analytics/games');
    assert(gameRes.body.data.games[0].name === 'Badminton', 'Game analytics returns game details correctly');
    assert(gameRes.body.data.games[0].totalRevenue === 3200, 'Game analytics calculates total revenue');

    // Resource Analytics Endpoint
    const resourceRes = await request(app)
      .get('/api/v1/admin/analytics/resources?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(resourceRes.status === 200, 'Admin can access GET /api/v1/admin/analytics/resources');
    assert(resourceRes.body.data.resources[0].name === 'Court 1', 'Resource analytics returns resource name correctly');
    assert(resourceRes.body.data.resources[0].bookedHours === 5, 'Resource analytics calculates bookedHours (300 mins = 5 hrs)');

    // Customer Analytics Endpoint
    const customerAggRes = await request(app)
      .get('/api/v1/admin/analytics/customers?preset=last30days')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(customerAggRes.status === 200, 'Admin can access GET /api/v1/admin/analytics/customers');
    assert(customerAggRes.body.data.summary.totalCustomers === 25, 'Customer analytics returns total customer count');
    assert(customerAggRes.body.data.hourlyDistribution.length === 24, 'Customer peak hours returns 24 hourly buckets');

    // 4. Privacy & Credentials Leak Check
    console.log('\n--- Section 4: Privacy & Security Audit ---');
    const responseJson = JSON.stringify(overviewData);
    assert(!responseJson.includes('passwordHash'), 'No passwordHash exposed in analytics response');
    assert(!responseJson.includes('token'), 'No tokens exposed in analytics response');
    assert(!responseJson.includes('secret'), 'No secrets exposed in analytics response');

  } catch (err) {
    console.error('Unhandled Test Error:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`PHASE 12 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase12AnalyticsTests();
